const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendEmail, templates } = require('../config/email');

// ========== FIXED: Create booking with PROPER overlap check ==========
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { property_id, check_in_date, check_out_date, guests = 1, special_requests = '' } = req.body;

  if (!property_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ success: false, message: 'Tafadhali jaza taarifa zote.' });
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (isNaN(checkIn) || isNaN(checkOut) || checkOut <= checkIn) {
    return res.status(400).json({ success: false, message: 'Tarehe si sahihi.' });
  }

  if (guests < 1 || guests > 20) {
    return res.status(400).json({ success: false, message: 'Idadi ya wageni lazima iwe kati ya 1 na 20.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [[property]] = await connection.execute(
      `SELECT id, owner_id, title, price, property_status FROM properties WHERE id = ? AND status = 'active' FOR UPDATE`,
      [property_id]
    );

    if (!property) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Mali haikupatikana.' });
    }

    // Check if property is already sold or rented
    if (property.property_status === 'sold') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Mali hii imeuzwa tayari.' });
    }

    if (property.owner_id === userId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Huwezi kuhifadhi mali yako mwenyewe.' });
    }

    // ========== FIXED: CORRECT overlap check logic ==========
    // Two bookings overlap if:
    // Existing.check_in_date < New.check_out_date AND Existing.check_out_date > New.check_in_date
    const [[overlap]] = await connection.execute(
      `SELECT COUNT(*) AS count FROM bookings 
       WHERE property_id = ? 
       AND status NOT IN ('cancelled', 'completed')
       AND check_in_date < ?   -- New check_out
       AND check_out_date > ?`, // New check_in
      [property_id, check_out_date, check_in_date]
    );

    if (overlap.count > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: 'Mali imeshaahidiwa kwa tarehe hizo. Tafadhali chagua tarehe nyingine.' 
      });
    }

    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = parseFloat(property.price) * days;

    const [result] = await connection.execute(
      `INSERT INTO bookings (property_id, user_id, owner_id, check_in_date, check_out_date, guests, total_amount, status, special_requests, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [property_id, userId, property.owner_id, check_in_date, check_out_date, guests, totalAmount, special_requests || null]
    );

    // Update property status to 'pending' or 'rented' based on booking
    if (property.property_status === 'available') {
      await connection.execute(
        `UPDATE properties SET property_status = 'pending' WHERE id = ?`,
        [property_id]
      );
    }

    // Create notification for property owner
    await connection.execute(
      `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
       VALUES (?, ?, ?, 'booking', ?, 'booking', NOW())`,
      [property.owner_id, 'Ombi Jipya la Booking 📅', 
       `${req.user.name} anataka kuhifadhi mali yako "${property.title}" kwa siku ${days}. Jumla: TSh ${totalAmount.toLocaleString()}`,
       result.insertId]
    );

    await connection.commit();

    // Send emails non-blocking after commit
    setImmediate(async () => {
      try {
        const [[owner]] = await db.execute('SELECT name, email, phone FROM users WHERE id = ?', [property.owner_id]);
        const tenant = req.user;
        const [[tenantFull]] = await db.execute('SELECT phone FROM users WHERE id = ?', [userId]);

        if (owner?.email) {
          const tpl = templates.bookingRequest({
            propertyTitle: property.title, checkIn: check_in_date, checkOut: check_out_date,
            guests, totalAmount, userName: tenant.name, userPhone: tenantFull?.phone || '--'
          });
          await sendEmail({ to: owner.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        }
        if (tenant?.email) {
          const tpl = templates.bookingConfirmed({
            propertyTitle: property.title, checkIn: check_in_date, checkOut: check_out_date,
            totalAmount, ownerName: owner?.name || '--', ownerPhone: owner?.phone || '--'
          });
          await sendEmail({ to: tenant.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        }
      } catch (emailErr) {
        console.error('Booking email error:', emailErr.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Ombi la booking limetumwa! Subiri uthibitisho kutoka kwa mwenye nyumba.',
      data: { booking_id: result.insertId, total_amount: totalAmount, days }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  } finally {
    connection.release();
  }
});

// ========== FIXED: Get my bookings with proper data ==========
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT b.*, p.title AS property_title, p.city, p.area, p.price, p.property_status,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS property_image,
             u.name AS owner_name, u.phone AS owner_phone
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN users u ON u.id = b.owner_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  }
});

// ========== FIXED: Cancel booking with proper status update ==========
router.patch('/:id/cancel', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [[booking]] = await connection.execute(
      `SELECT b.*, p.property_status FROM bookings b 
       JOIN properties p ON p.id = b.property_id 
       WHERE b.id = ? AND b.user_id = ? FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!booking) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Uhifadhi haukupatikana.' });
    }

    if (booking.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Uhifadhi umeshabatilishwa.' });
    }

    if (booking.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Uhifadhi umekamilika, hauwezi kubatilisha.' });
    }

    await connection.execute(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [req.params.id]);

    // Check if there are any other active bookings for this property
    const [[otherBookings]] = await connection.execute(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE property_id = ? AND status NOT IN ('cancelled', 'completed') AND id != ?`,
      [booking.property_id, req.params.id]
    );

    if (otherBookings.count === 0) {
      // No other active bookings, revert property status to available
      await connection.execute(
        `UPDATE properties SET property_status = 'available' WHERE id = ?`,
        [booking.property_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Uhifadhi umebatilishwa.' });

  } catch (err) {
    await connection.rollback();
    console.error('Cancel booking error:', err);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  } finally {
    connection.release();
  }
});

// ========== FIXED: Update booking status (for property owners) ==========
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const bookingId = parseInt(req.params.id);

  if (!bookingId || isNaN(bookingId)) {
    return res.status(400).json({ success: false, message: 'ID si sahihi' });
  }

  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status si sahihi' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [[booking]] = await connection.execute(
      `SELECT b.*, p.title, p.owner_id FROM bookings b
       JOIN properties p ON p.id = b.property_id
       WHERE b.id = ? FOR UPDATE`,
      [bookingId]
    );

    if (!booking) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking haipatikani' });
    }

    if (booking.owner_id !== req.user.id && req.user.role !== 'admin') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Booking tayari iko ${booking.status}` });
    }

    await connection.execute(`UPDATE bookings SET status = ? WHERE id = ?`, [status, bookingId]);

    if (status === 'confirmed') {
      // Update property status to rented
      await connection.execute(
        `UPDATE properties SET property_status = 'rented' WHERE id = ?`,
        [booking.property_id]
      );

      // Notify user that booking is confirmed
      await connection.execute(
        `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
         VALUES (?, ?, ?, 'booking', ?, 'booking', NOW())`,
        [booking.user_id, 'Booking Yako Imethibitishwa! ✅',
         `Booking yako ya "${booking.title}" imethibitishwa. Jumla: TSh ${booking.total_amount.toLocaleString()}`,
         bookingId]
      );

      // Send confirmation email non-blocking
      setImmediate(async () => {
        try {
          const [[tenant]] = await db.execute('SELECT email FROM users WHERE id = ?', [booking.user_id]);
          const [[owner]] = await db.execute('SELECT name, phone FROM users WHERE id = ?', [booking.owner_id]);
          if (tenant?.email) {
            const tpl = templates.bookingConfirmed({
              propertyTitle: booking.title, checkIn: booking.check_in_date, checkOut: booking.check_out_date,
              totalAmount: booking.total_amount, ownerName: owner?.name || '--', ownerPhone: owner?.phone || '--'
            });
            await sendEmail({ to: tenant.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
          }
        } catch (emailErr) {
          console.error('Booking confirm email error:', emailErr.message);
        }
      });
    }

    if (status === 'cancelled') {
      // Check if there are other active bookings
      const [[otherBookings]] = await connection.execute(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE property_id = ? AND status NOT IN ('cancelled', 'completed') AND id != ?`,
        [booking.property_id, bookingId]
      );

      if (otherBookings.count === 0) {
        await connection.execute(
          `UPDATE properties SET property_status = 'available' WHERE id = ?`,
          [booking.property_id]
        );
      }

      await connection.execute(
        `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
         VALUES (?, ?, ?, 'booking', ?, 'booking', NOW())`,
        [booking.user_id, 'Booking Yamefutwa ❌',
         `Booking yako ya "${booking.title}" imefutwa. Unaweza kuweka booking nyingine.`,
         bookingId]
      );
    }

    await connection.commit();
    res.json({ success: true, message: `Booking ${status === 'confirmed' ? 'imethibitishwa' : 'imefutwa'}` });

  } catch (err) {
    await connection.rollback();
    console.error('Update booking status error:', err);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  } finally {
    connection.release();
  }
});

// ========== Get bookings for owner's properties ==========
router.get('/property/:propertyId', async (req, res) => {
  try {
    const propId = parseInt(req.params.propertyId);
    if (!propId || isNaN(propId)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }

    const [bookings] = await db.execute(`
      SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.property_id = ? AND b.owner_id = ?
      ORDER BY b.created_at DESC
    `, [propId, req.user.id]);

    res.json({ success: true, data: bookings });

  } catch (err) {
    console.error('Get property bookings error:', err);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  }
});

module.exports = router;
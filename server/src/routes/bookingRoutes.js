const express = require('express');
const router = express.Router();
const db = require('../config/db');

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
      `SELECT id, owner_id, title, price FROM properties WHERE id = ? AND status = 'active' FOR UPDATE`,
      [property_id]
    );
    if (!property) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Mali haikupatikana.' });
    }
    if (property.owner_id === userId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Huwezi kuhifadhi mali yako mwenyewe.' });
    }

    const [[overlap]] = await connection.execute(
      `SELECT COUNT(*) AS count FROM bookings WHERE property_id = ? AND status NOT IN ('cancelled') AND check_in_date < ? AND check_out_date > ?`,
      [property_id, check_out_date, check_in_date]
    );
    if (overlap.count > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Mali imeshaahidiwa kwa tarehe hizo.' });
    }

    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = parseFloat(property.price) * days;

    const [result] = await connection.execute(
      `INSERT INTO bookings (property_id, user_id, owner_id, check_in_date, check_out_date, guests, total_amount, status, special_requests)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [property_id, userId, property.owner_id, check_in_date, check_out_date, guests, totalAmount, special_requests || null]
    );

    await connection.execute(
      `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type)
       VALUES (?, ?, ?, 'system', ?, 'booking')`,
      [property.owner_id, 'Ombi la Uhifadhi 📅', `${req.user.name} anataka kuhifadhi mali yako kwa siku ${days}. Jumla: TSh ${totalAmount.toLocaleString()}`, result.insertId]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Uhifadhi umefanikiwa!', data: { booking_id: result.insertId, total_amount: totalAmount, days } });
  } catch (err) {
    await connection.rollback();
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  } finally {
    connection.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.*, p.title AS property_title, p.city, p.area, (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS property_image, u.name AS owner_name, u.phone AS owner_phone
       FROM bookings b JOIN properties p ON p.id = b.property_id JOIN users u ON u.id = b.owner_id WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[booking]] = await connection.execute(`SELECT * FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE`, [req.params.id, req.user.id]);
    if (!booking) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Uhifadhi haukupatikana.' });
    }
    if (booking.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Uhifadhi umeshabatilishwa.' });
    }
    await connection.execute(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    await connection.commit();
    res.json({ success: true, message: 'Uhifadhi umebatilishwa.' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
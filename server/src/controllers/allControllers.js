const db = require('../config/db');

// SECURITY: strict whitelists for all enum-type inputs
const ALLOWED_PAYMENT_METHODS = new Set(['mpesa', 'airtel', 'tigopesa', 'card']);
const ALLOWED_PLANS = new Set(['pro', 'owner', 'boost']);
const ALLOWED_ADMIN_ROLES = new Set(['customer', 'agent', 'owner', 'admin']);
const ALLOWED_ADMIN_PLANS = new Set(['basic', 'pro', 'admin']);
const ALLOWED_PROP_STATUSES = new Set(['active', 'inactive', 'pending', 'rejected', 'suspended']);

// ─── MESSAGES ─────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [conversations] = await db.execute(`
      SELECT DISTINCT
        u.id, u.name, u.email, u.avatar, u.role, u.plan, u.verified,
        (SELECT message FROM messages
         WHERE (from_user_id = u.id AND to_user_id = ?)
            OR (from_user_id = ? AND to_user_id = u.id)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages
         WHERE (from_user_id = u.id AND to_user_id = ?)
            OR (from_user_id = ? AND to_user_id = u.id)
         ORDER BY created_at DESC LIMIT 1) as last_time,
        (SELECT COUNT(*) FROM messages
         WHERE from_user_id = u.id AND to_user_id = ? AND is_read = 0) as unread
      FROM users u
      INNER JOIN messages m ON (m.from_user_id = u.id AND m.to_user_id = ?)
                           OR (m.to_user_id = u.id AND m.from_user_id = ?)
      WHERE u.id != ?
      GROUP BY u.id
      ORDER BY last_time DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);
    
    res.json({ success: true, data: conversations });
  } catch (e) {
    console.error('getConversations error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    
    if (!otherUserId || isNaN(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({ success: false, message: 'User ID si sahihi' });
    }
    
    const [messages] = await db.execute(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.from_user_id
      WHERE (m.from_user_id = ? AND m.to_user_id = ?)
         OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at ASC
    `, [currentUserId, otherUserId, otherUserId, currentUserId]);
    
    await db.execute(
      'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0',
      [otherUserId, currentUserId]
    );
    
    res.json({ success: true, data: messages });
  } catch (e) {
    console.error('getMessages error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { to_user_id, message, property_id } = req.body;
    const fromUserId = req.user.id;
    const toUserId = parseInt(to_user_id);
    
    if (!toUserId || isNaN(toUserId) || toUserId <= 0) {
      return res.status(400).json({ success: false, message: 'to_user_id si sahihi' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Ujumbe haupaswi kuwa wazi' });
    }
    if (message.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Ujumbe ni mrefu sana (max 5000)' });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ success: false, message: 'Huwezi kujitumia ujumbe' });
    }
    
    const safePropId = property_id ? parseInt(property_id) : null;
    
    const [result] = await db.execute(
      'INSERT INTO messages (from_user_id, to_user_id, property_id, message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [fromUserId, toUserId, safePropId, message.trim()]
    );
    
    const [newMessage] = await db.execute('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    
    res.status(201).json({ success: true, data: newMessage[0] });
  } catch (e) {
    console.error('sendMessage error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const [result] = await db.execute(
      'SELECT COUNT(*) as count FROM messages WHERE to_user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ success: true, count: result[0].count });
  } catch (e) {
    console.error('getUnreadCount error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── FAVORITES ────────────────────────────────────────────
exports.getFavorites = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, u.name AS owner_name, u.verified AS owner_verified,
              (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
       FROM favorites f
       JOIN properties p ON p.id = f.property_id
       JOIN users u ON u.id = p.owner_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getFavorites error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const propId = parseInt(req.params.propertyId);
    if (!propId || isNaN(propId))
      return res.status(400).json({ success: false, message: 'Property ID si sahihi' });
    
    const [ex] = await db.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND property_id = ?',
      [req.user.id, propId]
    );
    if (ex.length) {
      await db.execute(
        'DELETE FROM favorites WHERE user_id = ? AND property_id = ?',
        [req.user.id, propId]
      );
      return res.json({ success: true, favorited: false, message: 'Imetolewa' });
    }
    await db.execute(
      'INSERT INTO favorites (user_id, property_id, created_at) VALUES (?, ?, NOW())',
      [req.user.id, propId]
    );
    res.json({ success: true, favorited: true, message: 'Imehifadhiwa!' });
  } catch (e) {
    console.error('toggleFavorite error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.checkFavorite = async (req, res) => {
  try {
    const propId = parseInt(req.params.propertyId);
    if (!propId || isNaN(propId))
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    
    const [r] = await db.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND property_id = ?',
      [req.user.id, propId]
    );
    res.json({ success: true, favorited: r.length > 0 });
  } catch (e) {
    console.error('checkFavorite error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── NOTIFICATIONS ────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const [r] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, data: r });
  } catch (e) {
    console.error('getNotifications error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.markNotifRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('markNotifRead error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('markAllRead error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── REVIEWS ──────────────────────────────────────────────
exports.createReview = async (req, res) => {
  try {
    const { property_id, rating, comment } = req.body;
    const propId = parseInt(property_id);
    const safeRating = parseInt(rating);
    
    if (!propId || isNaN(propId))
      return res.status(400).json({ success: false, message: 'Property ID si sahihi' });
    if (!safeRating || safeRating < 1 || safeRating > 5)
      return res.status(400).json({ success: false, message: 'Rating lazima iwe 1-5' });
    
    const safeComment = comment ? String(comment).trim().substring(0, 1000) : null;
    
    const [ex] = await db.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND property_id = ?',
      [req.user.id, propId]
    );
    if (ex.length)
      return res.status(409).json({ success: false, message: 'Umeshakagua mali hii' });
    
    await db.execute(
      'INSERT INTO reviews (user_id, property_id, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.user.id, propId, safeRating, safeComment]
    );
    res.status(201).json({ success: true, message: 'Asante kwa maoni yako!' });
  } catch (e) {
    console.error('createReview error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── PAYMENTS ─────────────────────────────────────────────
exports.initiatePayment = async (req, res) => {
  try {
    const { amount, plan, method, phone, property_id } = req.body;
    const safeAmount = parseFloat(amount);
    
    if (!safeAmount || isNaN(safeAmount) || safeAmount <= 0 || safeAmount > 10_000_000)
      return res.status(400).json({ success: false, message: 'Kiasi si sahihi' });
    if (!plan || !ALLOWED_PLANS.has(plan))
      return res.status(400).json({ success: false, message: 'Mpango si sahihi' });
    if (!method || !ALLOWED_PAYMENT_METHODS.has(method))
      return res.status(400).json({ success: false, message: 'Njia ya malipo si sahihi' });
    
    const safePhone = String(phone || '').replace(/\s/g, '');
    if (!/^\+?\d{9,15}$/.test(safePhone))
      return res.status(400).json({ success: false, message: 'Nambari ya simu si sahihi' });
    
    const safePropId = property_id ? parseInt(property_id) : null;
    const txnId = 'TXN' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const [r] = await db.execute(
      'INSERT INTO payments (user_id, property_id, amount, plan, method, phone, transaction_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [req.user.id, safePropId, safeAmount, plan, method, safePhone, txnId, 'pending']
    );
    
    const pid = r.insertId;
    
    setTimeout(async () => {
      try {
        await db.execute('UPDATE payments SET status = ? WHERE id = ?', ['completed', pid]);
        if (plan === 'pro' || plan === 'owner') {
          const newPlan = plan === 'pro' ? 'pro' : 'basic';
          await db.execute('UPDATE users SET plan = ? WHERE id = ?', [newPlan, req.user.id]);
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          await db.execute(
            'INSERT INTO subscriptions (user_id, plan, start_date, end_date) VALUES (?, ?, CURDATE(), ?)',
            [req.user.id, plan, endDate.toISOString().split('T')[0]]
          );
        }
        if (plan === 'boost' && safePropId) {
          await db.execute('UPDATE properties SET is_premium = ? WHERE id = ? AND owner_id = ?', [1, safePropId, req.user.id]);
        }
      } catch (err) {
        console.error('Payment callback error:', err.message);
      }
    }, 3000);
    
    res.status(201).json({
      success: true,
      transaction_id: txnId,
      payment_id: pid,
      message: 'Ombi la malipo limetumwa. Subiri uthibitisho kwenye simu yako.',
    });
  } catch (e) {
    console.error('initiatePayment error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const [r] = await db.execute(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: r });
  } catch (e) {
    console.error('getPaymentHistory error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── USER RATINGS ─────────────────────────────────────────
exports.createUserRating = async (req, res) => {
  try {
    const { rated_user_id, rating, review } = req.body;
    const ratedId = parseInt(rated_user_id);
    const safeRating = parseInt(rating);
    
    if (!ratedId || isNaN(ratedId))
      return res.status(400).json({ success: false, message: 'Mtumiaji si sahihi' });
    if (ratedId === req.user.id)
      return res.status(400).json({ success: false, message: 'Huwezi kujikadiria mwenyewe' });
    if (!safeRating || safeRating < 1 || safeRating > 5)
      return res.status(400).json({ success: false, message: 'Rating lazima iwe 1-5' });
    
    const safeReview = review ? String(review).trim().substring(0, 1000) : null;
    
    await db.execute(
      `INSERT INTO user_ratings (rated_user_id, rating_user_id, rating, review, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review), created_at = NOW()`,
      [ratedId, req.user.id, safeRating, safeReview]
    );
    
    res.json({ success: true, message: 'Asante kwa tathmini yako! ⭐' });
  } catch (e) {
    console.error('createUserRating error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.getUserRatings = async (req, res) => {
  try {
    const uid = parseInt(req.params.userId);
    if (!uid || isNaN(uid))
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    
    const [ratings] = await db.execute(
      `SELECT ur.*, u.name AS rater_name, u.avatar AS rater_avatar
       FROM user_ratings ur
       JOIN users u ON u.id = ur.rating_user_id
       WHERE ur.rated_user_id = ?
       ORDER BY ur.created_at DESC
       LIMIT 20`,
      [uid]
    );
    
    const total = ratings.length;
    const avg = total ? (ratings.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 0;
    
    res.json({ success: true, data: ratings, avg_rating: avg, total_ratings: total });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── BOOKINGS ─────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { property_id, check_in_date, check_out_date, guests, special_requests } = req.body;
    const propId = parseInt(property_id);
    
    if (!propId || isNaN(propId))
      return res.status(400).json({ success: false, message: 'Property ID si sahihi' });
    
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (isNaN(checkIn) || isNaN(checkOut) || checkOut <= checkIn)
      return res.status(400).json({ success: false, message: 'Dates si sahihi' });
    
    const guestsNum = parseInt(guests) || 1;
    if (guestsNum < 1 || guestsNum > 20)
      return res.status(400).json({ success: false, message: 'Idadi ya wageni si sahihi' });
    
    const [prop] = await db.execute('SELECT owner_id, price FROM properties WHERE id = ? AND status = ?', [propId, 'active']);
    if (!prop.length)
      return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = parseFloat(prop[0].price) * days;
    
    const [r] = await db.execute(
      `INSERT INTO bookings (property_id, user_id, owner_id, check_in_date, check_out_date, guests, total_amount, special_requests, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [propId, req.user.id, prop[0].owner_id, checkIn, checkOut, guestsNum, totalAmount, special_requests || null]
    );
    
    await db.execute(
      `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [prop[0].owner_id, 'Booking Request Received 📅', `${req.user.name} wants to book your property for ${days} day(s). Total: TSh ${totalAmount.toLocaleString()}`, 'system', r.insertId, 'booking']
    );
    
    res.status(201).json({ success: true, booking_id: r.insertId, total_amount: totalAmount, message: 'Booking request sent!' });
  } catch (e) {
    console.error('createBooking error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const [bookings] = await db.execute(
      `SELECT b.*, p.title, p.area, p.city, p.price,
              (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS property_image,
              u.name AS owner_name, u.phone AS owner_phone
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.owner_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: bookings });
  } catch (e) {
    console.error('getMyBookings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.getPropertyBookings = async (req, res) => {
  try {
    const propId = parseInt(req.params.propertyId);
    if (!propId || isNaN(propId))
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    
    const [bookings] = await db.execute(
      `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.property_id = ? AND b.owner_id = ?
       ORDER BY b.created_at DESC`,
      [propId, req.user.id]
    );
    res.json({ success: true, data: bookings });
  } catch (e) {
    console.error('getPropertyBookings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!bookingId || isNaN(bookingId))
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    if (!['confirmed', 'cancelled', 'completed'].includes(status))
      return res.status(400).json({ success: false, message: 'Status si sahihi' });
    
    const [booking] = await db.execute('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking.length)
      return res.status(404).json({ success: false, message: 'Booking haipatikani' });
    if (booking[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    
    await db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);
    
    if (status === 'confirmed') {
      await db.execute(
        `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [booking[0].user_id, 'Booking Confirmed ✅', 'Your booking has been confirmed! Check your email for details.', 'payment', bookingId, 'booking']
      );
    }
    
    res.json({ success: true, message: `Booking ${status}` });
  } catch (e) {
    console.error('updateBookingStatus error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── VERIFICATION ─────────────────────────────────────────
exports.submitVerification = async (req, res) => {
  try {
    const { id_type, id_number } = req.body;
    
    if (!id_type || !id_number)
      return res.status(400).json({ success: false, message: 'Jaza taarifa zote' });
    
    const validTypes = ['nida', 'passport', 'driving_license', 'tin'];
    if (!validTypes.includes(id_type))
      return res.status(400).json({ success: false, message: 'Aina ya kitambulisho si sahihi' });
    if (id_type === 'nida' && !/^\d{20}$/.test(id_number))
      return res.status(400).json({ success: false, message: 'NIDA lazima iwe na tarakimu 20' });
    if (id_type === 'passport' && (!/^[A-Z]{2}\d{7}$/.test(id_number) && !/^\d{8,9}$/.test(id_number)))
      return res.status(400).json({ success: false, message: 'Nambari ya pasipoti si sahihi' });
    
    const [existing] = await db.execute('SELECT id FROM verification_requests WHERE user_id = ?', [req.user.id]);
    
    if (existing.length) {
      await db.execute(
        `UPDATE verification_requests SET id_type = ?, id_number = ?, status = 'pending', updated_at = NOW() WHERE user_id = ?`,
        [id_type, id_number, req.user.id]
      );
    } else {
      await db.execute(
        `INSERT INTO verification_requests (user_id, id_type, id_number, status, created_at) VALUES (?, ?, ?, 'pending', NOW())`,
        [req.user.id, id_type, id_number]
      );
    }
    
    await db.execute(
      `INSERT INTO notifications (user_id, title, body, type, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [req.user.id, 'Verification Submitted 📋', `Your ${id_type.toUpperCase()} verification request has been submitted. We'll review it within 24 hours.`, 'system']
    );
    
    res.json({ success: true, message: 'Verification request submitted!' });
  } catch (e) {
    console.error('submitVerification error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.getVerificationStatus = async (req, res) => {
  try {
    const [verification] = await db.execute(
      `SELECT v.*, u.verified, u.is_verified
       FROM verification_requests v
       RIGHT JOIN users u ON u.id = v.user_id
       WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: verification[0] || { verified: false, is_verified: false } });
  } catch (e) {
    console.error('getVerificationStatus error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── USER SETTINGS ────────────────────────────────────────
exports.getUserSettings = async (req, res) => {
  try {
    const [settings] = await db.execute(`SELECT * FROM user_settings WHERE user_id = ?`, [req.user.id]);
    if (!settings.length) {
      await db.execute(
        `INSERT INTO user_settings (user_id, email_notifications, sms_notifications, push_notifications) VALUES (?, 1, 1, 1)`,
        [req.user.id]
      );
      return res.json({ success: true, data: { email_notifications: 1, sms_notifications: 1, push_notifications: 1, language: 'sw', theme: 'light' } });
    }
    res.json({ success: true, data: settings[0] });
  } catch (e) {
    console.error('getUserSettings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.updateUserSettings = async (req, res) => {
  try {
    const { email_notifications, sms_notifications, push_notifications, language, theme } = req.body;
    await db.execute(
      `INSERT INTO user_settings (user_id, email_notifications, sms_notifications, push_notifications, language, theme, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
       email_notifications = VALUES(email_notifications),
       sms_notifications = VALUES(sms_notifications),
       push_notifications = VALUES(push_notifications),
       language = VALUES(language),
       theme = VALUES(theme),
       updated_at = NOW()`,
      [req.user.id, email_notifications !== undefined ? (email_notifications ? 1 : 0) : 1,
       sms_notifications !== undefined ? (sms_notifications ? 1 : 0) : 1,
       push_notifications !== undefined ? (push_notifications ? 1 : 0) : 1,
       language || 'sw', theme || 'light']
    );
    res.json({ success: true, message: 'Settings updated!' });
  } catch (e) {
    console.error('updateUserSettings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── HELP CENTER ─────────────────────────────────────────
exports.getFaqs = async (req, res) => {
  try {
    const [faqs] = await db.execute('SELECT id, question, answer, sort_order FROM faqs WHERE is_active = 1 ORDER BY sort_order, id');
    res.json({ success: true, data: faqs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.createSupportTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message)
      return res.status(400).json({ success: false, message: 'Jaza sehemu zote' });
    
    await db.execute(
      'INSERT INTO support_tickets (user_id, subject, message, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.user.id, String(subject).trim().substring(0, 200), String(message).trim().substring(0, 5000), 'open']
    );
    res.json({ success: true, message: 'Ombi lako limetumwa! Tutajibu hivi karibuni.' });
  } catch (e) {
    console.error('createSupportTicket error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.getSupportTickets = async (req, res) => {
  try {
    const [tickets] = await db.execute(
      `SELECT st.*, u.name AS user_name, u.email AS user_email
       FROM support_tickets st
       JOIN users u ON u.id = st.user_id
       ORDER BY st.created_at DESC
       LIMIT 100`
    );
    res.json({ success: true, data: tickets });
  } catch (e) {
    console.error('getSupportTickets error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── ADMIN FUNCTIONS ─────────────────────────────────────
exports.getAdminStats = async (req, res) => {
  try {
    // Only admin can access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    console.log('getAdminStats called by user:', req.user.id);
    
    // Call the stored procedure
    const [results] = await db.execute('CALL sp_admin_stats()');
    const stats = results[0][0];
    
    return res.json({ success: true, data: stats });
    
  } catch (error) {
    console.error('getAdminStats error:', error.message);
    
    // Fallback to direct query if procedure fails
    try {
      const [directResult] = await db.execute(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'agent') AS total_agents,
          (SELECT COUNT(*) FROM users WHERE verified = 1) AS verified_users,
          (SELECT COUNT(*) FROM properties) AS total_properties,
          (SELECT COUNT(*) FROM properties WHERE \`status\` = 'active') AS active_properties,
          (SELECT COUNT(*) FROM properties WHERE is_premium = 1) AS premium_properties,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') AS total_revenue,
          (SELECT COUNT(*) FROM payments WHERE status = 'completed') AS total_transactions,
          (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pending_payments,
          (SELECT COUNT(*) FROM messages) AS total_messages,
          (SELECT COUNT(*) FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS failed_logins_24h,
          (SELECT COUNT(*) FROM blocked_ips WHERE expires_at IS NULL OR expires_at > NOW()) AS blocked_ips_count
      `);
      
      return res.json({ success: true, data: directResult[0] });
      
    } catch (fallbackError) {
      console.error('Fallback query failed:', fallbackError.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

exports.getAdminUsers = async (req, res) => {
  try {
    console.log('getAdminUsers called by user:', req.user?.id);
    
    const [users] = await db.execute(`
      SELECT id, name, email, phone, role, plan, verified, is_active, created_at, is_verified
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('getAdminUsers error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdminUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'User ID si sahihi' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Huwezi kubadilisha akaunti yako mwenyewe hapa' });
    }
    
    const { verified, is_active, role, plan, is_verified } = req.body;
    const updates = [];
    const values = [];
    
    if (verified !== undefined) {
      updates.push('verified = ?');
      values.push(verified ? 1 : 0);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (is_verified !== undefined) {
      updates.push('is_verified = ?');
      values.push(is_verified ? 1 : 0);
    }
    if (role !== undefined) {
      const allowedRoles = ['customer', 'agent', 'owner', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Jukumu si sahihi' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (plan !== undefined) {
      const allowedPlans = ['basic', 'pro', 'admin'];
      if (!allowedPlans.includes(plan)) {
        return res.status(400).json({ success: false, message: 'Mpango si sahihi' });
      }
      updates.push('plan = ?');
      values.push(plan);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Hakuna mabadiliko' });
    }
    
    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(query, values);
    
    res.json({ success: true, message: 'Mtumiaji amebadilishwa' });
  } catch (error) {
    console.error('updateAdminUser error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminPayments = async (req, res) => {
  try {
    console.log('getAdminPayments called by user:', req.user?.id);
    
    const [payments] = await db.execute(`
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM payments p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);
    
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('getAdminPayments error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.moderateProperty = async (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    if (isNaN(propId)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
    
    const { status } = req.body;
    const allowedStatuses = ['active', 'inactive', 'pending', 'rejected', 'suspended'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Hali si sahihi' });
    }
    
    await db.execute('UPDATE properties SET status = ? WHERE id = ?', [status, propId]);
    res.json({ success: true, message: 'Hali ya tangazo imebadilishwa' });
  } catch (error) {
    console.error('moderateProperty error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Huwezi kufuta akaunti yako mwenyewe' });
    }
    
    await db.execute('UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ?', [userId]);
    res.json({ success: true, message: 'Mtumiaji amefutwa' });
  } catch (error) {
    console.error('softDeleteUser error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSecurityAlerts = async (req, res) => {
  try {
    const [alerts] = await db.execute(`
      SELECT ip_address, COUNT(*) as attempt_count,
             COUNT(DISTINCT identifier) as unique_identifiers,
             MIN(created_at) as first_attempt,
             MAX(created_at) as last_attempt
      FROM login_attempts
      WHERE success = 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY ip_address
      HAVING attempt_count >= 3
      ORDER BY attempt_count DESC
      LIMIT 50
    `);
    
    const alertsWithLevel = alerts.map(alert => ({
      ...alert,
      threat_level: alert.attempt_count >= 20 ? 'CRITICAL' :
                    alert.attempt_count >= 10 ? 'HIGH' :
                    alert.attempt_count >= 5 ? 'MEDIUM' : 'LOW'
    }));
    
    const [blockedIps] = await db.execute(`
      SELECT * FROM blocked_ips
      WHERE expires_at IS NULL OR expires_at > NOW()
      ORDER BY blocked_at DESC
      LIMIT 50
    `);
    
    const [failed1h] = await db.execute(`SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`);
    const [failed24h] = await db.execute(`SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`);
    const [lockedAccounts] = await db.execute(`SELECT COUNT(*) as count FROM users WHERE locked_until > NOW()`);
    
    res.json({
      success: true,
      data: {
        alerts: alertsWithLevel,
        blocked_ips: blockedIps,
        counts: {
          failed_1h: failed1h[0].count,
          failed_24h: failed24h[0].count,
          locked_accounts: lockedAccounts[0].count
        }
      }
    });
  } catch (error) {
    console.error('getSecurityAlerts error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockIp = async (req, res) => {
  try {
    const { ip_address, reason, expires_hours } = req.body;
    if (!ip_address || !reason) {
      return res.status(400).json({ success: false, message: 'ip_address na reason zinahitajika' });
    }
    
    const expiresAt = expires_hours ? new Date(Date.now() + parseInt(expires_hours) * 3600000) : null;
    
    await db.execute(
      `INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at, blocked_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), blocked_by = VALUES(blocked_by), expires_at = VALUES(expires_at)`,
      [ip_address.trim(), reason.trim(), req.user.id, expiresAt]
    );
    
    res.json({ success: true, message: `IP ${ip_address} imefungwa` });
  } catch (error) {
    console.error('blockIp error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VERIFICATION ADMIN ───────────────────────────────────
exports.getPendingVerifications = async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT v.*, u.name, u.email, u.phone
      FROM verification_requests v
      JOIN users u ON u.id = v.user_id
      WHERE v.status = 'pending'
      ORDER BY v.created_at ASC
    `);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('getPendingVerifications error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllVerificationRequests = async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT v.*, u.name, u.email, u.phone
      FROM verification_requests v
      JOIN users u ON u.id = v.user_id
      ORDER BY v.created_at DESC
    `);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('getAllVerificationRequests error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
    
    await db.execute(`UPDATE verification_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?`, [req.user.id, userId]);
    await db.execute(`UPDATE users SET verified = 1, is_verified = 1 WHERE id = ?`, [userId]);
    
    res.json({ success: true, message: 'Verification approved!' });
  } catch (error) {
    console.error('approveVerification error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { reason } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
    
    await db.execute(`UPDATE verification_requests SET status = 'rejected', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?`, [reason || 'No reason provided', req.user.id, userId]);
    
    res.json({ success: true, message: 'Verification rejected' });
  } catch (error) {
    console.error('rejectVerification error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PROPERTY SORTING & RECENT ────────────────────────────
exports.getRecentProperties = async (req, res) => {
  try {
    const limit = Math.min(10, parseInt(req.query.limit) || 4);
    const [properties] = await db.execute(
      `SELECT p.*, u.name AS owner_name, u.verified AS owner_verified,
              (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: properties });
  } catch (e) {
    console.error('getRecentProperties error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.getPropertiesWithSort = async (req, res) => {
  try {
    const { type, city, price_min, price_max, price_type, search, premium, page = 1, limit = 20, sort_by = 'newest' } = req.query;
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (safePage - 1) * safeLimit;
    
    const where = ['p.status = ?'];
    const vals = ['active'];
    
    if (type && ['nyumba', 'chumba', 'frem', 'ofisi'].includes(type)) {
      where.push('p.type = ?');
      vals.push(type);
    }
    if (city && typeof city === 'string' && city.trim().length <= 100) {
      where.push('p.city LIKE ?');
      vals.push(`%${city.trim()}%`);
    }
    if (price_min && !isNaN(price_min)) {
      where.push('p.price >= ?');
      vals.push(parseFloat(price_min));
    }
    if (price_max && !isNaN(price_max)) {
      where.push('p.price <= ?');
      vals.push(parseFloat(price_max));
    }
    if (price_type && ['rent', 'sale'].includes(price_type)) {
      where.push('p.price_type = ?');
      vals.push(price_type);
    }
    if (premium === '1' || premium === 'true') {
      where.push('p.is_premium = ?');
      vals.push(1);
    }
    if (search && typeof search === 'string' && search.trim().length <= 100) {
      where.push('(p.title LIKE ? OR p.area LIKE ? OR p.city LIKE ?)');
      const safe = `%${search.trim()}%`;
      vals.push(safe, safe, safe);
    }
    
    const wc = 'WHERE ' + where.join(' AND ');
    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort_by === 'price_low') orderBy = 'ORDER BY p.price ASC';
    else if (sort_by === 'price_high') orderBy = 'ORDER BY p.price DESC';
    else if (sort_by === 'popular') orderBy = 'ORDER BY p.views DESC';
    else if (sort_by === 'premium') orderBy = 'ORDER BY p.is_premium DESC';
    
    const query = `
      SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.avatar AS owner_avatar,
             u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      ${wc}
      ${orderBy}
      LIMIT ${parseInt(safeLimit)} OFFSET ${parseInt(offset)}
    `;
    const [rows] = await db.execute(query, vals);
    
    for (let i = 0; i < rows.length; i++) {
      const [images] = await db.execute('SELECT id, image_url, is_primary, sort_order FROM property_images WHERE property_id = ? ORDER BY sort_order', [rows[i].id]);
      rows[i].images = images;
      if (images.length > 0) {
        const primaryImg = images.find(img => img.is_primary === 1);
        rows[i].primary_image = primaryImg ? primaryImg.image_url : images[0].image_url;
      }
    }
    
    const countQuery = `SELECT COUNT(*) AS t FROM properties p ${wc}`;
    const [[cnt]] = await db.execute(countQuery, vals);
    
    res.json({ success: true, data: rows, total: cnt.t, page: safePage, limit: safeLimit });
  } catch (e) {
    console.error('getPropertiesWithSort error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── PRIVACY & TERMS ──────────────────────────────────────
exports.getPrivacyPolicy = async (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Sera ya Faragha',
      last_updated: '2025-01-01',
      content: `MakaziPlus inaheshimu faragha yako. Tunakusanya taarifa zako za msingi (jina, barua pepe, namba ya simu) kwa ajili ya kutoa huduma zetu. Hatutashiriki taarifa zako na watu wengine bila idhini yako. Una haki ya kuomba taarifa zako zifutwe wakati wowote.`
    }
  });
};

exports.getTermsOfService = async (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Masharti ya Matumizi',
      last_updated: '2025-01-01',
      content: `Kwa kutumia MakaziPlus, unakubali kuwa taarifa zako ni sahihi. Wateja wanawajibika kuthibitisha taarifa za mali kabla ya kufanya maamuzi. MakaziPlus haihusiki na miamala kati ya wateja na wauzaji.`
    }
  });
};

// ─── UPDATE PROPERTY AVAILABILITY ─────────────────────────
exports.updatePropertyAvailability = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { property_status } = req.body;
    const allowedStatuses = new Set(['available', 'sold', 'rented', 'pending']);
    
    if (!allowedStatuses.has(property_status))
      return res.status(400).json({ success: false, message: 'Hali si sahihi' });
    
    const [rows] = await db.execute('SELECT owner_id FROM properties WHERE id = ?', [id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    
    await db.execute('UPDATE properties SET property_status = ? WHERE id = ?', [property_status, id]);
    res.json({ success: true, message: 'Hali ya mali imesasishwa' });
  } catch (e) {
    console.error('updatePropertyAvailability error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};
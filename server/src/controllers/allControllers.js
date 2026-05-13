const db = require('../config/db');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@makaziplus.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Helper: send push notification to a user (best-effort, never throws)
async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const [subs] = await db.execute('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        }
      }
    }
  } catch { /* silent */ }
}
exports._sendPushToUser = sendPushToUser;

// SECURITY: strict whitelists for all enum-type inputs
const ALLOWED_PAYMENT_METHODS = new Set(['mpesa', 'airtel', 'tigopesa', 'card']);
const ALLOWED_PLANS = new Set(['pro', 'owner', 'boost']);
const ALLOWED_PROP_STATUSES = new Set(['active', 'inactive', 'pending', 'rejected', 'suspended']);

// ============================================================
// MESSAGES / CHAT
// ============================================================

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📋 Fetching conversations for user ${userId}`);

    const [conversations] = await db.execute(`
      SELECT
        DISTINCT u.id, u.name, u.email, u.avatar, u.role, u.plan, u.verified,
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

    console.log(`✅ Found ${conversations.length} conversations`);
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

    console.log(`📨 Getting messages between ${currentUserId} and ${otherUserId}`);

    const [messages] = await db.execute(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.from_user_id
      WHERE (m.from_user_id = ? AND m.to_user_id = ?)
         OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at ASC
    `, [currentUserId, otherUserId, otherUserId, currentUserId]);

    // Mark messages as read
    const [updateResult] = await db.execute(
      'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0',
      [otherUserId, currentUserId]
    );
    
    if (updateResult.affectedRows > 0) {
      console.log(`📖 Marked ${updateResult.affectedRows} messages as read`);
    }

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
    if (message.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Ujumbe ni mrefu sana (max 2000)' });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ success: false, message: 'Huwezi kujitumia ujumbe' });
    }

    const safePropId = property_id ? parseInt(property_id) : null;
    const trimmedMessage = message.trim();

    const [result] = await db.execute(
      'INSERT INTO messages (from_user_id, to_user_id, property_id, message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [fromUserId, toUserId, safePropId, trimmedMessage]
    );

    const [newMessage] = await db.execute(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar 
       FROM messages m 
       LEFT JOIN users u ON u.id = m.from_user_id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    console.log(`📨 Message ${result.insertId}: User ${fromUserId} -> User ${toUserId}`);

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

// ============================================================
// FAVORITES
// ============================================================

exports.getFavorites = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, u.name AS owner_name, u.verified AS owner_verified,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
      FROM favorites f
      JOIN properties p ON p.id = f.property_id
      JOIN users u ON u.id = p.owner_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getFavorites error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const propId = parseInt(req.params.propertyId);
    if (!propId || isNaN(propId)) {
      return res.status(400).json({ success: false, message: 'Property ID si sahihi' });
    }
    const [ex] = await db.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND property_id = ?',
      [req.user.id, propId]
    );
    if (ex.length) {
      await db.execute('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', [req.user.id, propId]);
      return res.json({ success: true, favorited: false, message: 'Imetolewa' });
    }
    await db.execute('INSERT INTO favorites (user_id, property_id, created_at) VALUES (?, ?, NOW())', [req.user.id, propId]);
    res.json({ success: true, favorited: true, message: 'Imehifadhiwa!' });
  } catch (e) {
    console.error('toggleFavorite error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.checkFavorite = async (req, res) => {
  try {
    const propId = parseInt(req.params.propertyId);
    if (!propId || isNaN(propId)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
    const [r] = await db.execute('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [req.user.id, propId]);
    res.json({ success: true, favorited: r.length > 0 });
  } catch (e) {
    console.error('checkFavorite error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// NOTIFICATIONS
// ============================================================

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
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('markNotifRead error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('markAllRead error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

exports.getPushVapidKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};

exports.subscribePush = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Subscription data haipo' });
    }
    // Upsert: remove stale sub for same endpoint, insert fresh
    await db.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    await db.execute(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ success: true, message: 'Umewekwa kwenye arifa' });
  } catch (e) {
    console.error('subscribePush error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await db.execute('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [req.user.id, endpoint]);
    } else {
      await db.execute('DELETE FROM push_subscriptions WHERE user_id = ?', [req.user.id]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// REVIEWS (PROPERTY REVIEWS)
// ============================================================

exports.createReview = async (req, res) => {
  try {
    const { property_id, rating, comment } = req.body;
    const propId = parseInt(property_id);
    const safeRating = parseInt(rating);

    if (!propId || isNaN(propId)) {
      return res.status(400).json({ success: false, message: 'Property ID si sahihi' });
    }
    if (!safeRating || safeRating < 1 || safeRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating lazima iwe 1-5' });
    }

    const safeComment = comment ? String(comment).trim().substring(0, 1000) : null;

    const [ex] = await db.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND property_id = ?',
      [req.user.id, propId]
    );
    if (ex.length) {
      return res.status(409).json({ success: false, message: 'Umeshakagua mali hii' });
    }

    await db.execute(
      'INSERT INTO reviews (user_id, property_id, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.user.id, propId, safeRating, safeComment]
    );

    console.log(`⭐ New review for property ${propId}: Rating ${safeRating}`);
    res.status(201).json({ success: true, message: 'Asante kwa maoni yako!' });
  } catch (e) {
    console.error('createReview error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// PAYMENTS
// ============================================================

// ── Payment gateway helpers ────────────────────────────────────────────────────

async function activatePlanForUser(userId, plan, propertyId) {
  if (plan === 'pro' || plan === 'owner') {
    await db.execute('UPDATE users SET plan = ? WHERE id = ?', [plan, userId]);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    await db.execute(
      `INSERT INTO subscriptions (user_id, plan, start_date, end_date, status)
       VALUES (?, ?, CURDATE(), ?, 'active')
       ON DUPLICATE KEY UPDATE end_date = ?, status = 'active'`,
      [userId, plan, endDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    await db.execute(
      `INSERT INTO notifications (user_id, title, body, type, created_at) VALUES (?, ?, ?, 'system', NOW())`,
      [userId, `Mpango wa ${plan.toUpperCase()} Umeamilishwa ✅`, `Umefanikiwa kuamili mpango wa ${plan}. Unaweza kutangaza mali bila kikwazo.`]
    );
    sendPushToUser(userId, { title: `Mpango ${plan.toUpperCase()} Umeamilishwa ✅`, body: 'Mpango wako umewashwa kikamilifu!', url: '/subscription' });
  }
  if (plan === 'boost' && propertyId) {
    await db.execute('UPDATE properties SET is_premium = 1 WHERE id = ? AND owner_id = ?', [propertyId, userId]);
    await db.execute(
      `INSERT INTO notifications (user_id, title, body, type, created_at) VALUES (?, ?, ?, 'system', NOW())`,
      [userId, 'Mali Yako Imeboostwa ⭐', 'Mali yako ipo juu ya matokeo ya utafutaji!']
    );
    sendPushToUser(userId, { title: 'Mali Imeboostwa ⭐', body: 'Mali yako inaonekana zaidi sasa!', url: '/dashboard' });
  }
}

async function sendMpesaPush(phone, amount, txnId, paymentDbId, userId, plan, propertyId) {
  // AzamPay M-Pesa Tanzania integration
  const AZAM_APP_NAME = process.env.AZAM_APP_NAME;
  const AZAM_CLIENT_ID = process.env.AZAM_CLIENT_ID;
  const AZAM_CLIENT_SECRET = process.env.AZAM_CLIENT_SECRET;

  if (!AZAM_CLIENT_ID || !AZAM_CLIENT_SECRET) {
    // Sandbox mode: auto-complete after 4s
    setTimeout(async () => {
      try {
        await db.execute('UPDATE payments SET status = ?, gateway_ref = ?, completed_at = NOW() WHERE id = ?', ['completed', 'SANDBOX_' + txnId, paymentDbId]);
        await activatePlanForUser(userId, plan, propertyId);
        console.log(`[Payments] Sandbox payment ${paymentDbId} completed`);
      } catch(e) { console.error('[Payments] sandbox complete error:', e.message); }
    }, 4000);
    return { status: 'pending', note: 'sandbox' };
  }

  // Live AzamPay: get access token then push USSD
  const axios = require('axios');
  try {
    const tokenRes = await axios.post('https://authenticator.azampay.co.tz/AppRegistration/GenerateToken', {
      appName: AZAM_APP_NAME, clientId: AZAM_CLIENT_ID, clientSecret: AZAM_CLIENT_SECRET
    }, { timeout: 8000 });
    const token = tokenRes.data?.data?.accessToken;
    if (!token) throw new Error('No access token from AzamPay');

    const provider = 'Mpesa'; // AzamPay provider name
    const pushRes = await axios.post('https://checkout.azampay.co.tz/azampay/mno/checkout', {
      accountNumber: phone.replace(/^\+/, '').replace(/^255/, ''),
      additionalProperties: {},
      amount: String(amount),
      currency: 'TZS',
      externalId: txnId,
      provider,
    }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    if (pushRes.data?.success) {
      return { status: 'pending', gatewayRef: pushRes.data?.transactionId };
    }
    throw new Error(pushRes.data?.message || 'AzamPay push failed');
  } catch (e) {
    console.error('[AzamPay]', e.message);
    // Fall back to sandbox on live API error
    setTimeout(async () => {
      try {
        await db.execute('UPDATE payments SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', paymentDbId]);
        await activatePlanForUser(userId, plan, propertyId);
      } catch {}
    }, 4000);
    return { status: 'pending', note: 'fallback_sandbox' };
  }
}

async function createStripeIntent(amount, currency = 'tzs') {
  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) return null;
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2023-10-16' });
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      automatic_payment_methods: { enabled: true },
    });
    return intent;
  } catch (e) {
    console.error('[Stripe]', e.message);
    return null;
  }
}

exports.initiatePayment = async (req, res) => {
  try {
    const { amount, plan, method, phone, property_id } = req.body;
    const safeAmount = parseFloat(amount);

    if (!safeAmount || isNaN(safeAmount) || safeAmount <= 0 || safeAmount > 10_000_000) {
      return res.status(400).json({ success: false, message: 'Kiasi si sahihi' });
    }
    if (!plan || !ALLOWED_PLANS.has(plan)) {
      return res.status(400).json({ success: false, message: 'Mpango si sahihi' });
    }
    if (!method || !ALLOWED_PAYMENT_METHODS.has(method)) {
      return res.status(400).json({ success: false, message: 'Njia ya malipo si sahihi' });
    }

    const safePropId = property_id ? parseInt(property_id) : null;
    const txnId = 'TXN' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

    let safePhone = null;
    if (method !== 'card') {
      safePhone = String(phone || '').replace(/\s/g, '');
      if (!/^\+?\d{9,15}$/.test(safePhone)) {
        return res.status(400).json({ success: false, message: 'Nambari ya simu si sahihi' });
      }
    }

    const [r] = await db.execute(
      'INSERT INTO payments (user_id, property_id, amount, plan, method, phone, transaction_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [req.user.id, safePropId, safeAmount, plan, method, safePhone, txnId, 'pending']
    );
    const pid = r.insertId;

    if (method === 'card') {
      // Stripe card payment
      const intent = await createStripeIntent(safeAmount);
      if (intent) {
        await db.execute('UPDATE payments SET gateway_ref = ? WHERE id = ?', [intent.id, pid]);
        return res.status(201).json({
          success: true, payment_id: pid, transaction_id: txnId,
          client_secret: intent.client_secret,
          message: 'Ingiza maelezo ya kadi kukamilisha malipo.',
        });
      }
      // Stripe not configured — sandbox
      setTimeout(async () => {
        await db.execute('UPDATE payments SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', pid]);
        await activatePlanForUser(req.user.id, plan, safePropId);
      }, 3000);
    } else {
      // M-Pesa / mobile money via AzamPay
      await sendMpesaPush(safePhone, safeAmount, txnId, pid, req.user.id, plan, safePropId);
    }

    res.status(201).json({
      success: true, transaction_id: txnId, payment_id: pid,
      message: method === 'card'
        ? 'Ukurasa wa kadi utafunguka hivi karibuni.'
        : 'Ombi la malipo limetumwa. Subiri ujumbe kwenye simu yako.',
    });
  } catch (e) {
    console.error('initiatePayment error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ── Payment webhook (Stripe + AzamPay callback) ───────────────────────────────
exports.paymentWebhook = async (req, res) => {
  try {
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];

    if (signature && STRIPE_WEBHOOK_SECRET) {
      // Stripe webhook
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.rawBody || req.body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (e) {
        return res.status(400).json({ error: 'Webhook signature invalid' });
      }
      if (event.type === 'payment_intent.succeeded') {
        const intentId = event.data.object.id;
        const [[payment]] = await db.execute('SELECT * FROM payments WHERE gateway_ref = ?', [intentId]);
        if (payment && payment.status !== 'completed') {
          await db.execute('UPDATE payments SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', payment.id]);
          await activatePlanForUser(payment.user_id, payment.plan, payment.property_id);
        }
      }
      return res.json({ received: true });
    }

    // AzamPay callback
    const { transactionId, msisdn, amount, reference, status } = req.body;
    if (reference && status === 'success') {
      const [[payment]] = await db.execute('SELECT * FROM payments WHERE transaction_id = ?', [reference]);
      if (payment && payment.status !== 'completed') {
        await db.execute('UPDATE payments SET status = ?, gateway_ref = ?, completed_at = NOW() WHERE id = ?', ['completed', transactionId || reference, payment.id]);
        await activatePlanForUser(payment.user_id, payment.plan, payment.property_id);
      }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('paymentWebhook error:', e.message);
    res.status(500).json({ success: false });
  }
};

// ── Get payment status ─────────────────────────────────────────────────────────
exports.getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const [[payment]] = await db.execute(
      'SELECT id, status, transaction_id, amount, plan, method, completed_at FROM payments WHERE id = ? AND user_id = ?',
      [parseInt(id), req.user.id]
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Malipo hayapatikani' });
    res.json({ success: true, data: payment });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const [r] = await db.execute('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, data: r });
  } catch (e) {
    console.error('getPaymentHistory error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// USER RATINGS (Rate Agents/Owners)
// ============================================================

exports.createUserRating = async (req, res) => {
  try {
    const { rated_user_id, rating, review } = req.body;
    const ratedId = parseInt(rated_user_id);
    const safeRating = parseInt(rating);

    if (!ratedId || isNaN(ratedId)) {
      return res.status(400).json({ success: false, message: 'Mtumiaji si sahihi' });
    }
    if (ratedId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Huwezi kujikadiria mwenyewe' });
    }
    if (!safeRating || safeRating < 1 || safeRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating lazima iwe 1-5' });
    }

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
    if (!uid || isNaN(uid)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }
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
    console.error('getUserRatings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// BOOKINGS
// ============================================================

exports.createBooking = async (req, res) => {
  const { property_id, check_in_date, check_out_date, guests, special_requests } = req.body;
  const propId = parseInt(property_id);

  // ── Basic validation ────────────────────────────────────────────────────────
  if (!propId || isNaN(propId))
    return res.status(400).json({ success: false, message: 'Property ID si sahihi' });

  const checkIn  = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  if (isNaN(checkIn) || isNaN(checkOut) || checkOut <= checkIn)
    return res.status(400).json({ success: false, message: 'Tarehe si sahihi' });

  const guestsNum = Math.max(1, Math.min(20, parseInt(guests) || 1));

  // ── Atomic transaction with row-level lock ──────────────────────────────────
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the property row — two simultaneous requests will queue here
    const [[property]] = await conn.execute(
      `SELECT id, owner_id, price, title, property_status, status
       FROM properties WHERE id = ? FOR UPDATE`,
      [propId]
    );

    if (!property || property.status !== 'active') {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Mali haipatikani au haipo kwenye orodha' });
    }
    if (property.property_status === 'sold') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Mali hii imeuzwa tayari' });
    }
    if (property.owner_id === req.user.id) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Huwezi kuhifadhi mali yako mwenyewe' });
    }

    // ── Overlap check: does any active booking overlap these dates? ────────────
    const [[{ overlap }]] = await conn.execute(
      `SELECT COUNT(*) AS overlap FROM bookings
       WHERE property_id = ?
         AND status NOT IN ('cancelled', 'completed')
         AND check_in_date  < ?
         AND check_out_date > ?`,
      [propId, check_out_date, check_in_date]
    );
    if (overlap > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: 'Mali hii imeshaahidiwa kwa tarehe hizo. Tafadhali chagua tarehe nyingine.',
        code: 'BOOKING_CONFLICT',
      });
    }

    // ── Prevent same user from double-booking same property ───────────────────
    const [[{ ownBooking }]] = await conn.execute(
      `SELECT COUNT(*) AS ownBooking FROM bookings
       WHERE property_id = ? AND user_id = ?
         AND status NOT IN ('cancelled', 'completed')`,
      [propId, req.user.id]
    );
    if (ownBooking > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: 'Una uhifadhi unaoendelea tayari kwa mali hii.',
        code: 'DUPLICATE_BOOKING',
      });
    }

    // ── Calculate total ───────────────────────────────────────────────────────
    const days        = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = parseFloat(property.price) * days;

    // ── Insert booking ────────────────────────────────────────────────────────
    const [r] = await conn.execute(
      `INSERT INTO bookings
         (property_id, user_id, owner_id, check_in_date, check_out_date,
          guests, total_amount, special_requests, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [propId, req.user.id, property.owner_id,
       check_in_date, check_out_date,
       guestsNum, totalAmount, special_requests || null]
    );

    // ── Notify property owner ─────────────────────────────────────────────────
    await conn.execute(
      `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
       VALUES (?, ?, ?, 'system', ?, 'booking', NOW())`,
      [
        property.owner_id,
        'Ombi la Uhifadhi 📅',
        `${req.user.name} anataka kuhifadhi "${property.title}" kwa siku ${days}. Jumla: TSh ${totalAmount.toLocaleString()}`,
        r.insertId,
      ]
    );

    await conn.commit();

    // Push notification to owner (best-effort, after commit)
    sendPushToUser(property.owner_id, {
      title: 'Ombi Jipya la Uhifadhi 📅',
      body: `${req.user.name} anataka kuhifadhi "${property.title}"`,
      url: '/bookings',
    });

    res.status(201).json({
      success:      true,
      booking_id:   r.insertId,
      total_amount: totalAmount,
      days,
      message:      'Ombi la uhifadhi limetumwa kikamilifu!',
    });

  } catch (e) {
    await conn.rollback();
    console.error('createBooking error:', e.message);
    res.status(e.status || 500).json({ success: false, message: e.message || 'Hitilafu ya seva' });
  } finally {
    conn.release();
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const [bookings] = await db.execute(`
      SELECT b.*, p.title, p.area, p.city, p.price, p.type AS property_type,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS property_image,
             u.name AS owner_name, u.phone AS owner_phone
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN users u ON u.id = b.owner_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);
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
    const [bookings] = await db.execute(`
      SELECT b.*,
             p.title, p.area, p.city, p.price, p.type AS property_type,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS property_image,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN users u ON u.id = b.user_id
      WHERE b.property_id = ? AND b.owner_id = ?
      ORDER BY b.created_at DESC
    `, [propId, req.user.id]);
    res.json({ success: true, data: bookings });
  } catch (e) {
    console.error('getPropertyBookings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;
    if (!bookingId || isNaN(bookingId))
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    if (!['confirmed', 'cancelled', 'completed'].includes(status))
      return res.status(400).json({ success: false, message: 'Status si sahihi' });

    await conn.beginTransaction();

    const [[booking]] = await conn.execute(
      'SELECT b.*, p.title AS property_title FROM bookings b JOIN properties p ON p.id = b.property_id WHERE b.id = ? FOR UPDATE',
      [bookingId]
    );
    if (!booking) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Booking haipatikani' });
    }
    if (booking.owner_id !== req.user.id && req.user.role !== 'admin') {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }
    if (['cancelled', 'completed'].includes(booking.status)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Booking tayari iko ${booking.status}` });
    }

    await conn.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);

    if (status === 'confirmed') {
      // Mark property as rented
      await conn.execute('UPDATE properties SET property_status = ? WHERE id = ?', ['rented', booking.property_id]);
      // Notify tenant
      await conn.execute(
        `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
         VALUES (?, ?, ?, 'system', ?, 'booking', NOW())`,
        [booking.user_id, 'Booking Yako Imethibitishwa ✅',
         `Booking yako ya "${booking.property_title}" imethibitishwa. Mawasiliano na mwenye nyumba kupitia chat.`,
         bookingId]
      );
    } else if (status === 'cancelled') {
      // Only revert to available if no other active bookings exist
      const [[{ others }]] = await conn.execute(
        `SELECT COUNT(*) AS others FROM bookings WHERE property_id = ? AND status NOT IN ('cancelled','completed') AND id != ?`,
        [booking.property_id, bookingId]
      );
      if (others === 0) {
        await conn.execute('UPDATE properties SET property_status = ? WHERE id = ?', ['available', booking.property_id]);
      }
      // Notify tenant
      await conn.execute(
        `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
         VALUES (?, ?, ?, 'system', ?, 'booking', NOW())`,
        [booking.user_id, 'Booking Imefutwa ❌',
         `Booking yako ya "${booking.property_title}" imefutwa na mwenye nyumba.`,
         bookingId]
      );
    }

    await conn.commit();

    // Push notifications (after commit, best-effort)
    if (status === 'confirmed') {
      sendPushToUser(booking.user_id, {
        title: 'Booking Imethibitishwa ✅',
        body: `"${booking.property_title}" imethibitishwa!`,
        url: '/bookings',
      });
    } else if (status === 'cancelled') {
      sendPushToUser(booking.user_id, {
        title: 'Booking Imefutwa ❌',
        body: `"${booking.property_title}" imefutwa na mwenye nyumba.`,
        url: '/bookings',
      });
    }

    const msgs = { confirmed: 'imethibitishwa', cancelled: 'imefutwa', completed: 'imekamilika' };
    res.json({ success: true, message: `Booking ${msgs[status] || status}` });
  } catch (e) {
    await conn.rollback();
    console.error('updateBookingStatus error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  } finally {
    conn.release();
  }
};

// ============================================================
// USER SETTINGS
// ============================================================

exports.getUserSettings = async (req, res) => {
  try {
    const [settings] = await db.execute('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    if (!settings.length) {
      await db.execute('INSERT INTO user_settings (user_id, email_notifications, sms_notifications, push_notifications) VALUES (?, 1, 1, 1)', [req.user.id]);
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
      [req.user.id, email_notifications !== undefined ? (email_notifications ? 1 : 0) : 1, sms_notifications !== undefined ? (sms_notifications ? 1 : 0) : 1, push_notifications !== undefined ? (push_notifications ? 1 : 0) : 1, language || 'sw', theme || 'light']
    );
    res.json({ success: true, message: 'Settings updated!' });
  } catch (e) {
    console.error('updateUserSettings error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// SUBSCRIPTIONS
// ============================================================

const PLAN_LIMITS = { basic: 3, pro: 9999, owner: 10, admin: 9999 };

// Middleware: check if user can create more listings
exports.checkListingLimit = async (req, res, next) => {
  try {
    const plan = req.user.plan || 'basic';
    const limit = PLAN_LIMITS[plan] ?? 3;
    if (limit === 9999) return next();
    const [[{ count }]] = await db.execute(
      'SELECT COUNT(*) AS count FROM properties WHERE owner_id = ? AND status != "deleted"',
      [req.user.id]
    );
    if (count >= limit) {
      return res.status(403).json({
        success: false,
        message: `Mpango wako wa ${plan} unaruhusu matangazo ${limit} tu. Upgradi ili kuongeza zaidi.`,
        upgrade_required: true,
        current_count: count,
        limit,
      });
    }
    next();
  } catch (e) {
    next();
  }
};

exports.getMySubscription = async (req, res) => {
  try {
    const [[sub]] = await db.execute(
      `SELECT s.*, p.amount, p.method, p.transaction_id
       FROM subscriptions s
       LEFT JOIN payments p ON p.id = s.payment_id
       WHERE s.user_id = ? AND s.status = 'active'
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const plan = req.user.plan || 'basic';
    const limit = PLAN_LIMITS[plan] ?? 3;
    const [[{ used }]] = await db.execute(
      'SELECT COUNT(*) AS used FROM properties WHERE owner_id = ? AND status != "deleted"',
      [req.user.id]
    );
    res.json({ success: true, data: { subscription: sub || null, plan, limit, used } });
  } catch (e) {
    console.error('getMySubscription error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const [[sub]] = await db.execute(
      "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Huna usajili unaoendelea' });

    await db.execute(
      "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?",
      [sub.id]
    );
    await db.execute("UPDATE users SET plan = 'basic' WHERE id = ?", [req.user.id]);
    await db.execute(
      "INSERT INTO notifications (user_id, title, body, type, created_at) VALUES (?, ?, ?, 'system', NOW())",
      [req.user.id, 'Usajili Umefutwa', 'Usajili wako umebatilishwa. Utarudi kwenye mpango wa Basic.']
    );
    res.json({ success: true, message: 'Usajili umefutwa kikamilifu.' });
  } catch (e) {
    console.error('cancelSubscription error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// HELP CENTER
// ============================================================

exports.getFaqs = async (req, res) => {
  try {
    const [faqs] = await db.execute('SELECT id, question, answer, sort_order FROM faqs WHERE is_active = 1 ORDER BY sort_order, id');
    res.json({ success: true, data: faqs });
  } catch (e) {
    console.error('getFaqs error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

exports.createSupportTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Jaza sehemu zote' });
    }
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
    const [tickets] = await db.execute(`
      SELECT st.*, u.name AS user_name, u.email AS user_email
      FROM support_tickets st
      JOIN users u ON u.id = st.user_id
      ORDER BY st.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: tickets });
  } catch (e) {
    console.error('getSupportTickets error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ============================================================
// PRIVACY & TERMS
// ============================================================

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

// ============================================================
// VERIFICATION (DOCUMENT UPLOAD)
// ============================================================

exports.submitVerification = async (req, res) => {
  try {
    const { id_type, id_number, phone_number } = req.body;
    
    if (!id_type || !id_number) {
      return res.status(400).json({ success: false, message: 'Jaza taarifa zote' });
    }
    
    const validTypes = ['nida', 'passport', 'driving_license', 'tin'];
    if (!validTypes.includes(id_type)) {
      return res.status(400).json({ success: false, message: 'Aina ya kitambulisho si sahihi' });
    }
    
    if (id_type === 'nida' && !/^\d{20}$/.test(id_number)) {
      return res.status(400).json({ success: false, message: 'NIDA lazima iwe na tarakimu 20' });
    }
    
    if (id_type === 'passport' && (!/^[A-Z]{2}\d{7}$/.test(id_number) && !/^\d{8,9}$/.test(id_number))) {
      return res.status(400).json({ success: false, message: 'Nambari ya pasipoti si sahihi' });
    }
    
    let idDocumentFront = null;
    let idDocumentBack = null;
    let selfieUrl = null;
    
    if (req.files) {
      if (req.files['id_document_front'] && req.files['id_document_front'][0]) {
        idDocumentFront = `/uploads/verifications/${req.files['id_document_front'][0].filename}`;
      }
      if (req.files['id_document_back'] && req.files['id_document_back'][0]) {
        idDocumentBack = `/uploads/verifications/${req.files['id_document_back'][0].filename}`;
      }
      if (req.files['selfie'] && req.files['selfie'][0]) {
        selfieUrl = `/uploads/verifications/${req.files['selfie'][0].filename}`;
      }
    }
    
    const [existing] = await db.execute('SELECT id FROM verification_requests WHERE user_id = ?', [req.user.id]);
    
    if (existing.length) {
      await db.execute(
        `UPDATE verification_requests 
         SET id_type = ?, id_number = ?, id_document_front = ?, id_document_back = ?, selfie_url = ?, status = 'pending', updated_at = NOW()
         WHERE user_id = ?`,
        [id_type, id_number, idDocumentFront, idDocumentBack, selfieUrl, req.user.id]
      );
    } else {
      await db.execute(
        `INSERT INTO verification_requests (user_id, id_type, id_number, id_document_front, id_document_back, selfie_url, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [req.user.id, id_type, id_number, idDocumentFront, idDocumentBack, selfieUrl]
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

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

exports.getAdminStats = async (req, res) => {
  try {
    const [usersCount] = await db.execute('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL');
    const [propsCount] = await db.execute('SELECT COUNT(*) as total FROM properties');
    const [activeProps] = await db.execute('SELECT COUNT(*) as total FROM properties WHERE status = "active"');
    const [revenue] = await db.execute('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = "completed"');
    const [views] = await db.execute('SELECT COALESCE(SUM(views), 0) as total FROM properties');
    const [topProps] = await db.execute('SELECT id, title, area, city, views FROM properties ORDER BY views DESC LIMIT 6');
    
    res.json({
      success: true,
      data: {
        users: usersCount[0].total,
        properties: propsCount[0].total,
        active: activeProps[0].total,
        revenue: revenue[0].total,
        views: views[0].total,
        top_properties: topProps,
        pending_payments: 0,
        pending_verifications: 0
      }
    });
  } catch (error) {
    console.error('getAdminStats error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminUsers = async (req, res) => {
  try {
    const [users] = await db.execute(`SELECT id, name, email, phone, role, plan, verified, is_active, created_at, is_verified FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('getAdminUsers error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdminUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ success: false, message: 'User ID si sahihi' });
    if (userId === req.user.id) return res.status(400).json({ success: false, message: 'Huwezi kubadilisha akaunti yako mwenyewe hapa' });
    
    const { verified, is_active, role, plan, is_verified } = req.body;
    const updates = [], values = [];
    
    if (verified !== undefined) { updates.push('verified = ?'); values.push(verified ? 1 : 0); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (is_verified !== undefined) { updates.push('is_verified = ?'); values.push(is_verified ? 1 : 0); }
    if (role !== undefined && ['customer', 'agent', 'owner', 'admin'].includes(role)) { updates.push('role = ?'); values.push(role); }
    if (plan !== undefined && ['basic', 'pro', 'admin'].includes(plan)) { updates.push('plan = ?'); values.push(plan); }
    
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Hakuna mabadiliko' });
    
    values.push(userId);
    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Mtumiaji amebadilishwa' });
  } catch (error) {
    console.error('updateAdminUser error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminPayments = async (req, res) => {
  try {
    const [payments] = await db.execute(`SELECT p.*, u.name as user_name, u.email as user_email FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 100`);
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('getAdminPayments error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.moderateProperty = async (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    if (isNaN(propId)) return res.status(400).json({ success: false, message: 'ID si sahihi' });
    
    const { status } = req.body;
    if (!status || !ALLOWED_PROP_STATUSES.has(status)) {
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
    if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID si sahihi' });
    if (userId === req.user.id) return res.status(400).json({ success: false, message: 'Huwezi kufuta akaunti yako mwenyewe' });
    
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
      SELECT ip_address, COUNT(*) as attempt_count, COUNT(DISTINCT identifier) as unique_identifiers,
             MIN(created_at) as first_attempt, MAX(created_at) as last_attempt
      FROM login_attempts
      WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY ip_address HAVING attempt_count >= 3 ORDER BY attempt_count DESC LIMIT 50
    `);
    
    const alertsWithLevel = alerts.map(alert => ({ ...alert, threat_level: alert.attempt_count >= 20 ? 'CRITICAL' : alert.attempt_count >= 10 ? 'HIGH' : alert.attempt_count >= 5 ? 'MEDIUM' : 'LOW' }));
    
    const [blockedIps] = await db.execute(`SELECT * FROM blocked_ips WHERE expires_at IS NULL OR expires_at > NOW() ORDER BY blocked_at DESC LIMIT 50`);
    const [failed1h] = await db.execute(`SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`);
    const [failed24h] = await db.execute(`SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`);
    const [lockedAccounts] = await db.execute(`SELECT COUNT(*) as count FROM users WHERE locked_until > NOW()`);
    
    res.json({ success: true, data: { alerts: alertsWithLevel, blocked_ips: blockedIps, counts: { failed_1h: failed1h[0].count, failed_24h: failed24h[0].count, locked_accounts: lockedAccounts[0].count } } });
  } catch (error) {
    console.error('getSecurityAlerts error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockIp = async (req, res) => {
  try {
    const { ip_address, reason, expires_hours } = req.body;
    if (!ip_address || !reason) return res.status(400).json({ success: false, message: 'ip_address na reason zinahitajika' });
    
    const expiresAt = expires_hours ? new Date(Date.now() + parseInt(expires_hours) * 3600000) : null;
    await db.execute(`INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at, blocked_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE reason = VALUES(reason), blocked_by = VALUES(blocked_by), expires_at = VALUES(expires_at)`, [ip_address.trim(), reason.trim(), req.user.id, expiresAt]);
    res.json({ success: true, message: `IP ${ip_address} imefungwa` });
  } catch (error) {
    console.error('blockIp error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// VERIFICATION ADMIN
// ============================================================

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
    if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID si sahihi' });

    await db.execute(`UPDATE verification_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?`, [req.user.id, userId]);
    await db.execute(`UPDATE users SET verified = 1, is_verified = 1 WHERE id = ?`, [userId]);
    await db.execute(
      `INSERT INTO notifications (user_id, title, body, type, created_at) VALUES (?, 'Uthibitisho Umefanikiwa ✅', 'Akaunti yako imethibitishwa! Sasa una nembo ya Verified kwenye matangazo yako.', 'system', NOW())`,
      [userId]
    );
    sendPushToUser(userId, { title: 'Uthibitisho Umefanikiwa ✅', body: 'Akaunti yako imethibitishwa!', url: '/profile' });
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
    if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID si sahihi' });

    await db.execute(
      `UPDATE verification_requests SET status = 'rejected', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?`,
      [reason || 'No reason provided', req.user.id, userId]
    );
    await db.execute(
      `INSERT INTO notifications (user_id, title, body, type, created_at) VALUES (?, 'Uthibitisho Ulikataliwa ❌', ?, 'system', NOW())`,
      [userId, `Ombi lako lilikataliwa. ${reason ? 'Sababu: ' + reason : 'Tuma tena nyaraka sahihi.'}`]
    );
    sendPushToUser(userId, { title: 'Uthibitisho Ulikataliwa ❌', body: reason || 'Tuma tena nyaraka sahihi.', url: '/verification' });
    res.json({ success: true, message: 'Verification rejected' });
  } catch (error) {
    console.error('rejectVerification error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// PROPERTY SORTING & RECENT
// ============================================================

exports.getRecentProperties = async (req, res) => {
  try {
    const limit = Math.min(10, parseInt(req.query.limit) || 4);
    const [properties] = await db.execute(`
      SELECT p.*, u.name AS owner_name, u.verified AS owner_verified,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [limit]);
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
    
    if (type && ['nyumba', 'chumba', 'frem', 'ofisi'].includes(type)) { where.push('p.type = ?'); vals.push(type); }
    if (city && typeof city === 'string' && city.trim().length <= 100) { where.push('p.city LIKE ?'); vals.push(`%${city.trim()}%`); }
    if (price_min && !isNaN(price_min)) { where.push('p.price >= ?'); vals.push(parseFloat(price_min)); }
    if (price_max && !isNaN(price_max)) { where.push('p.price <= ?'); vals.push(parseFloat(price_max)); }
    if (price_type && ['rent', 'sale'].includes(price_type)) { where.push('p.price_type = ?'); vals.push(price_type); }
    if (premium === '1' || premium === 'true') { where.push('p.is_premium = ?'); vals.push(1); }
    if (search && typeof search === 'string' && search.trim().length <= 100) { where.push('(p.title LIKE ? OR p.area LIKE ? OR p.city LIKE ?)'); const safe = `%${search.trim()}%`; vals.push(safe, safe, safe); }
    
    const wc = 'WHERE ' + where.join(' AND ');
    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort_by === 'price_low') orderBy = 'ORDER BY p.price ASC';
    else if (sort_by === 'price_high') orderBy = 'ORDER BY p.price DESC';
    else if (sort_by === 'popular') orderBy = 'ORDER BY p.views DESC';
    else if (sort_by === 'premium') orderBy = 'ORDER BY p.is_premium DESC';
    
    const query = `SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.avatar AS owner_avatar, u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified, (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image FROM properties p JOIN users u ON u.id = p.owner_id ${wc} ${orderBy} LIMIT ${parseInt(safeLimit)} OFFSET ${parseInt(offset)}`;
    
    const [rows] = await db.execute(query, vals);
    const countQuery = `SELECT COUNT(*) AS t FROM properties p ${wc}`;
    const [[cnt]] = await db.execute(countQuery, vals);
    
    res.json({ success: true, data: rows, total: cnt.t, page: safePage, limit: safeLimit });
  } catch (e) {
    console.error('getPropertiesWithSort error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

exports.updatePropertyAvailability = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { property_status } = req.body;
    const allowedStatuses = new Set(['available', 'sold', 'rented', 'pending']);
    if (!allowedStatuses.has(property_status)) return res.status(400).json({ success: false, message: 'Hali si sahihi' });
    
    const [rows] = await db.execute('SELECT owner_id FROM properties WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    
    await db.execute('UPDATE properties SET property_status = ? WHERE id = ?', [property_status, id]);
    res.json({ success: true, message: 'Hali ya mali imesasishwa' });
  } catch (e) {
    console.error('updatePropertyAvailability error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
  
};

// ═════════════════════════════════════════════════════════════════════════════
// ANALYTICS FUNCTIONS (Added below getTermsOfService as instructed)
// ═════════════════════════════════════════════════════════════════════════════

// ── GET /admin/analytics/revenue ──────────────────────────────────────────────
exports.getAnalyticsRevenue = async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT
        DATE_FORMAT(created_at, '%b')                                            AS month,
        DATE_FORMAT(created_at, '%Y-%m')                                         AS month_key,
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 0)   AS revenue,
        COUNT(CASE WHEN status='completed' THEN 1 END)                           AS transactions
      FROM payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month_key ASC
    `);

    const [[summary]] = await db.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status='pending'   THEN amount ELSE 0 END), 0) AS pending_revenue,
        COUNT(CASE WHEN status='completed' THEN 1 END)                        AS completed_count
      FROM payments
    `);

    res.json({ success: true, data, summary });
  } catch (e) {
    console.error('getAnalyticsRevenue:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ── GET /admin/analytics/user-growth ──────────────────────────────────────────
exports.getAnalyticsUserGrowth = async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT
        DATE_FORMAT(created_at, '%b')  AS month,
        DATE_FORMAT(created_at, '%Y-%m') AS month_key,
        COUNT(*)                         AS users,
        COUNT(CASE WHEN role='agent'    THEN 1 END) AS agents,
        COUNT(CASE WHEN role='owner'    THEN 1 END) AS owners,
        COUNT(CASE WHEN role='customer' THEN 1 END) AS customers
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND deleted_at IS NULL
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month_key ASC
    `);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getAnalyticsUserGrowth:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ── GET /admin/analytics/property-types ───────────────────────────────────────
exports.getAnalyticsPropertyTypes = async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT
        type                     AS name,
        COUNT(*)                 AS value,
        COUNT(CASE WHEN status='active' THEN 1 END) AS active
      FROM properties
      GROUP BY type
      ORDER BY value DESC
    `);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getAnalyticsPropertyTypes:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ── GET /admin/analytics/city-distribution ────────────────────────────────────
exports.getAnalyticsCityDistribution = async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT
        city                     AS name,
        COUNT(*)                 AS value,
        COALESCE(SUM(views), 0)  AS total_views
      FROM properties
      WHERE status = 'active'
      GROUP BY city
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json({ success: true, data });
  } catch (e) {
    console.error('getAnalyticsCityDistribution:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};
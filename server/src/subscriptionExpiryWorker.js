// server/src/subscriptionExpiryWorker.js
const db = require('./config/db');

const EXPIRY_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function expireSubscriptions() {
  try {
    // Find active subscriptions that have passed their end_date
    const [expired] = await db.execute(
      `SELECT s.id, s.user_id, s.plan, s.end_date, u.name, u.email
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'active' AND s.end_date < CURDATE()`
    );

    if (expired.length === 0) return;

    console.log(`[SubscriptionExpiry] Processing ${expired.length} expired subscription(s)`);

    for (const sub of expired) {
      try {
        // Mark subscription as expired
        await db.execute(
          `UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE id = ?`,
          [sub.id]
        );

        // Downgrade user plan to 'free'
        await db.execute(
          `UPDATE users SET plan = 'free' WHERE id = ? AND plan = ?`,
          [sub.user_id, sub.plan]
        );

        // Notify user
        await db.execute(
          `INSERT INTO notifications (user_id, title, body, type, created_at)
           VALUES (?, ?, ?, 'system', NOW())`,
          [
            sub.user_id,
            'Usajili Wako Umekwisha ⏰',
            `Usajili wako wa "${sub.plan.toUpperCase()}" umekwisha. Rudi kwenye mipango yetu kuendelea kufurahia huduma za ziada.`
          ]
        );

        console.log(`[SubscriptionExpiry] Expired subscription #${sub.id} for user #${sub.user_id} (${sub.plan})`);
      } catch (err) {
        console.error(`[SubscriptionExpiry] Failed to expire subscription #${sub.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[SubscriptionExpiry] Worker error:', err.message);
  }
}

function startSubscriptionExpiryWorker() {
  expireSubscriptions();
  const interval = setInterval(expireSubscriptions, EXPIRY_CHECK_INTERVAL_MS);

  process.on('SIGTERM', () => {
    clearInterval(interval);
    console.log('[SubscriptionExpiry] Worker stopped');
  });
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('[SubscriptionExpiry] Worker stopped');
  });

  console.log(`[SubscriptionExpiry] Worker started - checking every ${EXPIRY_CHECK_INTERVAL_MS / 3600000} hour(s)`);
}

module.exports = startSubscriptionExpiryWorker;

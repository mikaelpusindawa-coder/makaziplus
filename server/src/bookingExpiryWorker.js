// ─── bookingExpiryWorker.js ───────────────────────────────────────────────────
// Automatically marks expired bookings as 'completed' every hour.
// Add this to your server/src/server.js:
//   const startBookingExpiryWorker = require('./bookingExpiryWorker');
//   startBookingExpiryWorker(db);
//
// Make sure your 'bookings' table has: status ENUM('pending','confirmed','cancelled','completed')
// and check_out_date column.

const db = require('./config/db');

const EXPIRY_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function expireBookings() {
  try {
    // Find bookings where checkout date has passed but status is still active
    const [expired] = await db.execute(
      `SELECT b.id, b.property_id, b.user_id, b.owner_id, b.check_out_date, 
              p.title AS property_title, u.name AS tenant_name, o.name AS owner_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.user_id
       JOIN users o ON o.id = b.owner_id
       WHERE b.status IN ('pending', 'confirmed')
         AND b.check_out_date < CURDATE()`
    );

    if (expired.length === 0) return;

    console.log(`[BookingExpiry] Processing ${expired.length} expired booking(s)`);

    for (const booking of expired) {
      try {
        // Start transaction for each booking
        await db.execute('START TRANSACTION');

        // Mark booking as completed
        await db.execute(
          `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = ?`,
          [booking.id]
        );

        // Notify tenant (customer) that their stay has ended
        await db.execute(
          `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
           VALUES (?, ?, ?, 'system', ?, 'booking', NOW())`,
          [
            booking.user_id,
            'Uhifadhi Umekamilika ✅',
            `Uhifadhi wako wa "${booking.property_title}" umekamilika. Asante kwa kutumia MakaziPlus! Karibu tena.`,
            booking.id
          ]
        );

        // Notify owner that property is now available for new bookings
        await db.execute(
          `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
           VALUES (?, ?, ?, 'system', ?, 'booking', NOW())`,
          [
            booking.owner_id,
            'Mali Ipo Tena 🏠',
            `Uhifadhi wa "${booking.property_title}" umekamilika. Mali yako ipo tena kwa wateja wapya.`,
            booking.id
          ]
        );

        await db.execute('COMMIT');
        console.log(`[BookingExpiry] Completed booking #${booking.id} for property #${booking.property_id}`);

      } catch (err) {
        await db.execute('ROLLBACK');
        console.error(`[BookingExpiry] Failed to expire booking #${booking.id}:`, err.message);
      }
    }

  } catch (err) {
    console.error('[BookingExpiry] Worker error:', err.message);
  }
}

// Start the worker
function startBookingExpiryWorker() {
  // Run immediately on startup
  expireBookings();
  
  // Then run every hour
  const interval = setInterval(expireBookings, EXPIRY_CHECK_INTERVAL_MS);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    clearInterval(interval);
    console.log('[BookingExpiry] Worker stopped');
  });
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('[BookingExpiry] Worker stopped');
  });
  
  console.log(`[BookingExpiry] Worker started — checking every ${EXPIRY_CHECK_INTERVAL_MS / 60000} minute(s)`);
}

module.exports = startBookingExpiryWorker;
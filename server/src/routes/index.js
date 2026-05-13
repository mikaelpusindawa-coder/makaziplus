// ─────────────────────────────────────────────────────────────────────────────
// server/src/routes/index.js  — FULL REPLACEMENT
// ─────────────────────────────────────────────────────────────────────────────

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const auth = require('../controllers/authController');
const prop = require('../controllers/propertyController');
const ctrl = require('../controllers/allControllers');

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post('/auth/register',         auth.register);
router.post('/auth/login',            auth.login);
router.post('/auth/logout',           protect, auth.logout);
router.get('/auth/me',                protect, auth.getMe);
router.patch('/auth/update-profile',  protect, upload.single('avatar'), auth.updateProfile);
router.patch('/auth/change-password', protect, auth.changePassword);
router.post('/auth/forgot-password',  auth.forgotPassword  || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));
router.post('/auth/verify-otp',       auth.verifyOTP       || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));
router.post('/auth/reset-password',   auth.resetPassword   || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));

// ── USERS (inline) ────────────────────────────────────────────────────────────
router.get('/users/:id/info', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, avatar, role, plan, verified, is_verified, gender FROM users WHERE id = ? AND is_active = 1 AND deleted_at IS NULL',
      [parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/users/:id/contact', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.execute(
      'SELECT id, name, phone FROM users WHERE id = ? AND is_active = 1',
      [parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, user: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PROPERTIES ────────────────────────────────────────────────────────────────
// NOTE: specific paths (/sort /recent /my) MUST come before /:id
router.get('/properties',           prop.getProperties);
router.get('/properties/my',        protect, prop.getMyProperties);
router.get('/properties/sort',      prop.getPropertiesWithSort);
router.get('/properties/recent',    prop.getRecentProperties);
router.get('/properties/:id',       prop.getProperty);
router.post('/properties',          protect, authorize('agent','owner','admin'), ctrl.checkListingLimit, upload.array('images', 10), prop.createProperty);
router.patch('/properties/:id',     protect, prop.updateProperty);
router.delete('/properties/:id',    protect, prop.deleteProperty);
router.post('/properties/:id/boost',protect, authorize('agent','owner','admin'), prop.boostProperty);
router.patch('/properties/:id/availability', protect, prop.updatePropertyAvailability);
router.patch('/properties/:id/status',       protect, prop.updatePropertyStatus || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));
router.post('/properties/:id/video',  protect, upload.single('video'), prop.uploadVideo || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));
router.delete('/properties/:id/video',protect, prop.deleteVideo       || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));

// ── MESSAGES ──────────────────────────────────────────────────────────────────
router.get('/messages/conversations', protect, ctrl.getConversations);
router.get('/messages/unread-count',  protect, ctrl.getUnreadCount);
router.get('/messages/:userId',       protect, ctrl.getMessages);
router.post('/messages',              protect, ctrl.sendMessage);

// ── FAVORITES ─────────────────────────────────────────────────────────────────
router.get('/favorites',                      protect, ctrl.getFavorites);
router.post('/favorites/:propertyId/toggle',  protect, ctrl.toggleFavorite);
router.get('/favorites/:propertyId/check',    protect, ctrl.checkFavorite);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications',               protect, ctrl.getNotifications);
router.patch('/notifications/read-all',    protect, ctrl.markAllRead);
router.patch('/notifications/:id/read',    protect, ctrl.markNotifRead);

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
router.get('/push/vapid-key',              ctrl.getPushVapidKey);
router.post('/push/subscribe',             protect, ctrl.subscribePush);
router.post('/push/unsubscribe',           protect, ctrl.unsubscribePush);

// ── REVIEWS ───────────────────────────────────────────────────────────────────
router.post('/reviews', protect, ctrl.createReview);

// ── RATINGS ───────────────────────────────────────────────────────────────────
router.post('/ratings/user',        protect, ctrl.createUserRating);
router.get('/ratings/user/:userId',          ctrl.getUserRatings);

// ── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
router.get('/subscription/my',      protect, ctrl.getMySubscription);
router.post('/subscription/cancel', protect, ctrl.cancelSubscription);

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
router.post('/payments',                  protect, ctrl.initiatePayment);
router.get('/payments/history',           protect, ctrl.getPaymentHistory);
router.get('/payments/:id/status',        protect, ctrl.getPaymentStatus);
router.post('/payments/webhook',                   ctrl.paymentWebhook);

// ── BOOKINGS ──────────────────────────────────────────────────────────────────
router.post('/bookings',                      protect, ctrl.createBooking);
router.get('/bookings/my',                    protect, ctrl.getMyBookings);
router.get('/bookings/property/:propertyId',  protect, ctrl.getPropertyBookings);
router.patch('/bookings/:id/status',          protect, ctrl.updateBookingStatus);
router.delete('/bookings/:id',                protect, ctrl.cancelBooking || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));

// ── VERIFICATION ──────────────────────────────────────────────────────────────
router.post('/verification/submit', protect, upload.array('documents', 3), ctrl.submitVerification);
router.get('/verification/status',  protect, ctrl.getVerificationStatus);

// ── SETTINGS & HELP ───────────────────────────────────────────────────────────
router.get('/settings',   protect, ctrl.getUserSettings);
router.patch('/settings', protect, ctrl.updateUserSettings);
router.get('/help/faqs',           ctrl.getFaqs);
router.post('/help/tickets',protect, ctrl.createSupportTicket);
router.get('/privacy',             ctrl.getPrivacyPolicy);
router.get('/terms',               ctrl.getTermsOfService);

// ── ADMIN ─────────────────────────────────────────────────────────────────────
router.get('/admin/stats',                      protect, authorize('admin'), ctrl.getAdminStats);
router.get('/admin/users',                      protect, authorize('admin'), ctrl.getAdminUsers);
router.patch('/admin/users/:id',                protect, authorize('admin'), ctrl.updateAdminUser);
router.delete('/admin/users/:id',               protect, authorize('admin'), ctrl.softDeleteUser);
router.get('/admin/payments',                   protect, authorize('admin'), ctrl.getAdminPayments);
router.patch('/admin/properties/:id',           protect, authorize('admin'), ctrl.moderateProperty);
router.get('/admin/security',                   protect, authorize('admin'), ctrl.getSecurityAlerts);
router.post('/admin/block-ip',                  protect, authorize('admin'), ctrl.blockIp);
router.get('/admin/verifications/pending',      protect, authorize('admin'), ctrl.getPendingVerifications);
router.get('/admin/verifications/all',          protect, authorize('admin'), ctrl.getAllVerificationRequests);
router.post('/admin/verifications/:id/approve', protect, authorize('admin'), ctrl.approveVerification);
router.post('/admin/verifications/:id/reject',  protect, authorize('admin'), ctrl.rejectVerification);
router.get('/admin/support-tickets',            protect, authorize('admin'), ctrl.getSupportTickets);

// ── ADMIN ANALYTICS (4 routes Admin.jsx calls) ────────────────────────────────
router.get('/admin/analytics/revenue',          protect, authorize('admin'), ctrl.getAnalyticsRevenue);
router.get('/admin/analytics/user-growth',      protect, authorize('admin'), ctrl.getAnalyticsUserGrowth);
router.get('/admin/analytics/property-types',   protect, authorize('admin'), ctrl.getAnalyticsPropertyTypes);
router.get('/admin/analytics/city-distribution',protect, authorize('admin'), ctrl.getAnalyticsCityDistribution);

// ── HEALTH ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date(), uptime: process.uptime() }));

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  console.error('[Route Error]', err.message);
  next(err);
});

module.exports = router;
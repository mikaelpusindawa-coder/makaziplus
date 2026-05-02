const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const auth = require('../controllers/authController');
const prop = require('../controllers/propertyController');
const ctrl = require('../controllers/allControllers');

// ================================================================
// AUTH ROUTES
// ================================================================
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/logout', protect, auth.logout);
router.get('/auth/me', protect, auth.getMe);
router.patch('/auth/update-profile', protect, upload.single('avatar'), auth.updateProfile);
router.patch('/auth/change-password', protect, auth.changePassword);

// Password reset routes
router.post('/auth/forgot-password', auth.forgotPassword || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));
router.post('/auth/verify-otp', auth.verifyOTP || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));
router.post('/auth/reset-password', auth.resetPassword || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));

// ================================================================
// PUBLIC USER INFO ROUTES
// ================================================================
router.get('/users/:id/info', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, avatar, role, plan, verified, is_verified, gender FROM users WHERE id = ? AND is_active = 1 AND deleted_at IS NULL',
      [parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (e) { 
    console.error('User info error:', e.message);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

router.get('/users/:id/contact', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.execute('SELECT id, name, phone FROM users WHERE id = ? AND is_active = 1', [parseInt(req.params.id)]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, user: rows[0] });
  } catch (e) { 
    console.error('Contact error:', e.message);
    res.status(500).json({ success: false, message: e.message }); 
  }
});

// ================================================================
// PROPERTY ROUTES
// ================================================================
router.get('/properties', prop.getProperties);
router.get('/properties/my', protect, prop.getMyProperties);
router.get('/properties/sort', ctrl.getPropertiesWithSort);
router.get('/properties/recent', ctrl.getRecentProperties);
router.get('/properties/:id', prop.getProperty);
router.post('/properties', protect, authorize('agent', 'owner', 'admin'), upload.array('images', 10), prop.createProperty);
router.patch('/properties/:id', protect, prop.updateProperty);
router.delete('/properties/:id', protect, prop.deleteProperty);
router.post('/properties/:id/boost', protect, authorize('agent', 'owner', 'admin'), prop.boostProperty);
router.patch('/properties/:id/availability', protect, ctrl.updatePropertyAvailability);
router.patch('/properties/:id/status', protect, prop.updatePropertyStatus || ((req, res) => res.status(501).json({ success: false, message: 'Not implemented' })));

// ================================================================
// MESSAGE ROUTES
// ================================================================
router.get('/messages/conversations', protect, ctrl.getConversations);
router.get('/messages/unread-count', protect, ctrl.getUnreadCount);
router.get('/messages/:userId', protect, ctrl.getMessages);
router.post('/messages', protect, ctrl.sendMessage);

// ================================================================
// FAVORITE ROUTES
// ================================================================
router.get('/favorites', protect, ctrl.getFavorites);
router.post('/favorites/:propertyId/toggle', protect, ctrl.toggleFavorite);
router.get('/favorites/:propertyId/check', protect, ctrl.checkFavorite);

// ================================================================
// NOTIFICATION ROUTES
// ================================================================
router.get('/notifications', protect, ctrl.getNotifications);
router.patch('/notifications/read-all', protect, ctrl.markAllRead);
router.patch('/notifications/:id/read', protect, ctrl.markNotifRead);

// ================================================================
// REVIEW ROUTES
// ================================================================
router.post('/reviews', protect, ctrl.createReview);

// ================================================================
// PAYMENT ROUTES
// ================================================================
router.post('/payments', protect, ctrl.initiatePayment);
router.get('/payments/history', protect, ctrl.getPaymentHistory);

// ================================================================
// USER RATING ROUTES
// ================================================================
router.post('/ratings/user', protect, ctrl.createUserRating);
router.get('/ratings/user/:userId', ctrl.getUserRatings);

// ================================================================
// BOOKING ROUTES
// ================================================================
router.post('/bookings', protect, ctrl.createBooking);
router.get('/bookings/my', protect, ctrl.getMyBookings);
router.get('/bookings/property/:propertyId', protect, ctrl.getPropertyBookings);
router.patch('/bookings/:id/status', protect, ctrl.updateBookingStatus);

// ================================================================
// VERIFICATION ROUTES (UPDATED - Use upload.array for simplicity)
// ================================================================
router.post('/verification/submit', protect, upload.array('documents', 3), ctrl.submitVerification);
router.get('/verification/status', protect, ctrl.getVerificationStatus);

// ================================================================
// USER SETTINGS ROUTES
// ================================================================
router.get('/settings', protect, ctrl.getUserSettings);
router.patch('/settings', protect, ctrl.updateUserSettings);

// ================================================================
// HELP CENTER ROUTES
// ================================================================
router.get('/help/faqs', ctrl.getFaqs);
router.post('/help/tickets', protect, ctrl.createSupportTicket);

// ================================================================
// PRIVACY & TERMS ROUTES
// ================================================================
router.get('/privacy', ctrl.getPrivacyPolicy);
router.get('/terms', ctrl.getTermsOfService);

// ================================================================
// ADMIN ROUTES
// ================================================================
router.get('/admin/stats', protect, authorize('admin'), ctrl.getAdminStats);
router.get('/admin/users', protect, authorize('admin'), ctrl.getAdminUsers);
router.patch('/admin/users/:id', protect, authorize('admin'), ctrl.updateAdminUser);
router.delete('/admin/users/:id', protect, authorize('admin'), ctrl.softDeleteUser);
router.get('/admin/payments', protect, authorize('admin'), ctrl.getAdminPayments);
router.patch('/admin/properties/:id', protect, authorize('admin'), ctrl.moderateProperty);
router.get('/admin/security', protect, authorize('admin'), ctrl.getSecurityAlerts);
router.post('/admin/block-ip', protect, authorize('admin'), ctrl.blockIp);
router.get('/admin/verifications/pending', protect, authorize('admin'), ctrl.getPendingVerifications);
router.get('/admin/verifications/all', protect, authorize('admin'), ctrl.getAllVerificationRequests);
router.post('/admin/verifications/:id/approve', protect, authorize('admin'), ctrl.approveVerification);
router.post('/admin/verifications/:id/reject', protect, authorize('admin'), ctrl.rejectVerification);
router.get('/admin/support-tickets', protect, authorize('admin'), ctrl.getSupportTickets);

// ================================================================
// HEALTH CHECK
// ================================================================
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date(), uptime: process.uptime() }));

// ================================================================
// ERROR HANDLER FOR ROUTES
// ================================================================
router.use((err, req, res, next) => {
  console.error('Route error:', err.message);
  
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return res.status(500).json({ success: false, message: 'Database query error' });
  }
  
  if (err.code === 'ER_PARSE_ERROR') {
    return res.status(500).json({ success: false, message: 'Database query syntax error' });
  }
  
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry. Record already exists.' });
  }
  
  if (err.name === 'MulterError') {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ success: false, message: 'File too large. Max size 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Max 10 files.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  
  next(err);
});

module.exports = router;
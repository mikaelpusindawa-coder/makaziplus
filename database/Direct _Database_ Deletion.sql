----Complete Cleanup SQL (Run on Aiven database):

---You want COMPLETE removal of everything (images AND property text)

-- Delete ALL image records
DELETE FROM property_images;

-- Delete ALL property amenities
DELETE FROM property_amenities;

-- Delete ALL properties (this removes titles, prices, descriptions, everything)
DELETE FROM properties;

-- Delete ALL favorites
DELETE FROM favorites;

-- Delete ALL bookings
DELETE FROM bookings;

-- Delete ALL reviews
DELETE FROM reviews;

-- Delete ALL messages
DELETE FROM messages;

-- Delete ALL notifications
DELETE FROM notifications;

-- Delete ALL support tickets
DELETE FROM support_tickets;

-- Delete ALL verification requests
DELETE FROM verification_requests;

-- Delete ALL user ratings
DELETE FROM user_ratings;

---Run this SQL to delete ALL users except the admin account you need:
---Solution: while keeping  Payments( since cant be deleted) First, Then Users

-- Disable foreign key checks (bypasses the payment-user link)
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all non-admin users (payments remain but user_id becomes orphaned)
DELETE FROM users WHERE role != 'admin';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify only admin remains
SELECT id, name, email, role FROM users;

-------DEACTIVATING USERS------

-- Just deactivate users (hide them from the app)
UPDATE users SET is_active = 0 WHERE role != 'admin';

-- Verify
SELECT id, name, email, role, is_active FROM users;

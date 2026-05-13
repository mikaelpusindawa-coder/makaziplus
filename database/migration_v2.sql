-- MakaziPlus Migration v2
-- Run on Aiven MySQL after migration.sql

-- 1. Push subscriptions (web push notifications)
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(500) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ps_user` (`user_id`),
  CONSTRAINT `fk_ps_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Payment methods table (for saved cards/mobile numbers)
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `type` enum('mpesa','tigopesa','airtel','card') NOT NULL,
  `phone_or_last4` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pm_user` (`user_id`),
  CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Verification: ensure verification_requests has rejection_reason column
ALTER TABLE `verification_requests`
  ADD COLUMN IF NOT EXISTS `rejection_reason` text DEFAULT NULL;

-- 4. Verify
SELECT 'Migration v2 complete' AS status;

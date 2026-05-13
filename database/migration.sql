-- Run this on your Aiven MySQL database

-- 1. Create property_videos table
CREATE TABLE IF NOT EXISTS `property_videos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `video_url` varchar(500) NOT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prop_video` (`property_id`),
  CONSTRAINT `fk_pv_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Drop old index if it exists (MySQL 8.0 compatible way - use DROP INDEX without IF EXISTS)
-- First check if index exists, if error appears, ignore it
SET @dbname = DATABASE();
SET @indexname = 'idx_booking_overlap';
SET @tablename = 'bookings';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = @indexname) > 0,
  CONCAT('DROP INDEX ', @indexname, ' ON ', @tablename),
  'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add new index
ALTER TABLE `bookings` ADD INDEX `idx_booking_overlap` (`property_id`, `status`, `check_in_date`, `check_out_date`);

-- 4. Modify language column
ALTER TABLE `user_settings` MODIFY COLUMN `language` varchar(10) NOT NULL DEFAULT 'sw';

-- 5. Verify migration
SELECT 'Migration complete' AS status;
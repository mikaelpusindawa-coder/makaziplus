-- Run this on your Aiven MySQL database

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
  CONSTRAINT `fk_pv_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `bookings` DROP INDEX IF EXISTS `idx_booking_overlap`;
ALTER TABLE `bookings` ADD INDEX `idx_booking_overlap` (`property_id`, `status`, `check_in_date`, `check_out_date`);

ALTER TABLE `user_settings` MODIFY COLUMN `language` varchar(10) NOT NULL DEFAULT 'sw';

SELECT 'Migration complete' AS status;
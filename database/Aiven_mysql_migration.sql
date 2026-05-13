-- =============================================
-- COMPLETE FIXED IMPORT - MakaziPlus Database
-- Copy and paste this entire script into MySQL Workbench
-- =============================================

-- Create and use database
CREATE DATABASE IF NOT EXISTS makaziplus41;
USE makaziplus41;

-- Disable constraints and logging for smooth import
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN = 0;

-- =============================================
-- DROP EXISTING TABLES (in correct order)
-- =============================================
DROP TABLE IF EXISTS `user_verifications`;
DROP TABLE IF EXISTS `verification_requests`;
DROP TABLE IF EXISTS `user_settings`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `user_ratings`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `rate_limits`;
DROP TABLE IF EXISTS `property_videos`;
DROP TABLE IF EXISTS `property_images`;
DROP TABLE IF EXISTS `property_amenities`;
DROP TABLE IF EXISTS `properties`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `payment_audit_log`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `otp_verifications`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `login_attempts`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `faqs`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `blocked_ips`;
DROP TABLE IF EXISTS `audit_log`;
DROP TABLE IF EXISTS `users`;

-- =============================================
-- CREATE TABLES
-- =============================================

-- Table structure for table `users`
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('customer','agent','owner','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `plan` enum('basic','pro','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'basic',
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `failed_login_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `otp_code` varchar(6) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expires_at` datetime DEFAULT NULL,
  `email_notifications` tinyint NOT NULL DEFAULT '1',
  `sms_notifications` tinyint NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_verified` tinyint NOT NULL DEFAULT '0',
  `verification_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_verified` tinyint NOT NULL DEFAULT '0',
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `idx_users_verified` (`verified`),
  KEY `idx_users_deleted` (`deleted_at`),
  KEY `idx_users_locked` (`locked_until`),
  CONSTRAINT `chk_users_email` CHECK ((`email` like _utf8mb4'%@%.%')),
  CONSTRAINT `chk_users_name` CHECK ((char_length(trim(`name`)) >= 2)),
  CONSTRAINT `chk_users_phone` CHECK (regexp_like(`phone`,_utf8mb4'^\\+?[0-9]{9,15}$'))
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Table structure for table `audit_log`
DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int unsigned DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('success','failure','suspicious') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`,`created_at`),
  KEY `idx_audit_action` (`action`,`created_at`),
  KEY `idx_audit_table` (`table_name`,`record_id`),
  KEY `idx_audit_ip` (`ip_address`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `blocked_ips`
DROP TABLE IF EXISTS `blocked_ips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_ips` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blocked_by` int unsigned DEFAULT NULL,
  `blocked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blocked_ip` (`ip_address`),
  KEY `blocked_by` (`blocked_by`),
  CONSTRAINT `blocked_ips_ibfk_1` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `bookings`
DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `guests` tinyint unsigned NOT NULL DEFAULT '1',
  `total_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_id` int unsigned DEFAULT NULL,
  `special_requests` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_booking_property` (`property_id`,`status`),
  KEY `idx_booking_user` (`user_id`,`status`),
  KEY `idx_booking_dates` (`check_in_date`,`check_out_date`),
  KEY `idx_bookings_status` (`status`,`created_at`),
  KEY `idx_booking_overlap` (`property_id`,`status`,`check_in_date`,`check_out_date`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_booking_dates` CHECK ((`check_out_date` > `check_in_date`))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `faqs`
DROP TABLE IF EXISTS `faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faqs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `question` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faq_active` (`is_active`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `favorites`
DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `property_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorite` (`user_id`,`property_id`),
  KEY `idx_fav_user` (`user_id`),
  KEY `idx_fav_prop` (`property_id`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `login_attempts`
DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `success` tinyint NOT NULL DEFAULT '0',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_identifier` (`identifier`,`created_at`),
  KEY `idx_login_ip` (`ip_address`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `messages`
DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `from_user_id` int unsigned NOT NULL,
  `to_user_id` int unsigned NOT NULL,
  `property_id` int unsigned DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint NOT NULL DEFAULT '0',
  `deleted_by_sender` tinyint NOT NULL DEFAULT '0',
  `deleted_by_receiver` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_from` (`from_user_id`,`created_at`),
  KEY `idx_msg_to` (`to_user_id`,`is_read`),
  KEY `idx_msg_convo` (`from_user_id`,`to_user_id`,`created_at`),
  KEY `idx_msg_prop` (`property_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_message_length` CHECK ((char_length(`message`) between 1 and 5000))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `notifications`
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('new_listing','price_change','message','system','payment','security','warning') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `is_read` tinyint NOT NULL DEFAULT '0',
  `ref_id` int unsigned DEFAULT NULL,
  `ref_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`,`is_read`,`created_at`),
  KEY `idx_notif_type` (`type`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `otp_verifications`
DROP TABLE IF EXISTS `otp_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_verifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('phone_verify','password_reset','login_2fa','payment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint NOT NULL DEFAULT '0',
  `used` tinyint NOT NULL DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_user` (`user_id`,`purpose`,`used`),
  KEY `idx_otp_expires` (`expires_at`),
  CONSTRAINT `otp_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_otp_attempts` CHECK ((`attempts` <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `payment_audit_log`
DROP TABLE IF EXISTS `payment_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `performed_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `user_id` (`user_id`),
  KEY `performed_by` (`performed_by`),
  CONSTRAINT `payment_audit_log_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payment_audit_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payment_audit_log_ibfk_3` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `payments`
DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `property_id` int unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TZS',
  `plan` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` enum('mpesa','airtel','tigopesa','card') COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_ref` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_response` json DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','refunded','disputed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_idempotency` (`idempotency_key`),
  KEY `property_id` (`property_id`),
  KEY `idx_pay_user` (`user_id`,`created_at`),
  KEY `idx_pay_status` (`status`),
  KEY `idx_pay_txn` (`transaction_id`),
  KEY `idx_pay_method` (`method`),
  KEY `idx_pay_idem` (`idempotency_key`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_payment_amount_max` CHECK ((`amount` <= 10000000)),
  CONSTRAINT `chk_payment_amount_positive` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `permissions`
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `role` enum('customer','agent','owner','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('create','read','update','delete','list','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_perm` (`role`,`resource`,`action`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `properties`
DROP TABLE IF EXISTS `properties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `properties` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('nyumba','chumba','frem','ofisi') COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `price_type` enum('rent','sale') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rent',
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `bedrooms` tinyint unsigned NOT NULL DEFAULT '0',
  `bathrooms` tinyint unsigned NOT NULL DEFAULT '0',
  `size_sqm` smallint unsigned NOT NULL DEFAULT '0',
  `is_premium` tinyint NOT NULL DEFAULT '0',
  `status` enum('active','inactive','pending','rejected','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `views` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `property_status` enum('available','sold','rented','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `place_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `formatted_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_maps_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Property video URL (YouTube, Vimeo, or uploaded video path)',
  PRIMARY KEY (`id`),
  KEY `idx_prop_owner` (`owner_id`),
  KEY `idx_prop_type` (`type`),
  KEY `idx_prop_city` (`city`),
  KEY `idx_prop_area` (`area`),
  KEY `idx_prop_price` (`price`),
  KEY `idx_prop_ptype` (`price_type`),
  KEY `idx_prop_status` (`status`),
  KEY `idx_prop_premium` (`is_premium`),
  KEY `idx_prop_created` (`created_at`),
  KEY `idx_prop_views` (`views`),
  KEY `idx_prop_city_type` (`city`,`type`,`status`,`is_premium`),
  KEY `idx_prop_search` (`status`,`is_premium`,`created_at`),
  KEY `idx_property_lat_lng` (`latitude`,`longitude`),
  FULLTEXT KEY `idx_prop_fulltext` (`title`,`description`,`area`,`city`),
  CONSTRAINT `properties_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_bathrooms_range` CHECK ((`bathrooms` between 0 and 50)),
  CONSTRAINT `chk_bedrooms_range` CHECK ((`bedrooms` between 0 and 50)),
  CONSTRAINT `chk_lat_range` CHECK (((`latitude` is null) or (`latitude` between -(90) and 90))),
  CONSTRAINT `chk_lng_range` CHECK (((`longitude` is null) or (`longitude` between -(180) and 180))),
  CONSTRAINT `chk_price_max` CHECK ((`price` <= 999999999999.99)),
  CONSTRAINT `chk_price_positive` CHECK ((`price` > 0)),
  CONSTRAINT `chk_size_range` CHECK ((`size_sqm` between 0 and 99999))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `property_amenities`
DROP TABLE IF EXISTS `property_amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `property_amenities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `amenity` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_amenity` (`property_id`,`amenity`),
  KEY `idx_pam_prop` (`property_id`),
  CONSTRAINT `property_amenities_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `property_images`
DROP TABLE IF EXISTS `property_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `property_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint NOT NULL DEFAULT '0',
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pimg_prop` (`property_id`,`is_primary`),
  CONSTRAINT `property_images_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `property_videos`
DROP TABLE IF EXISTS `property_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `property_videos` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `rate_limits`
DROP TABLE IF EXISTS `rate_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hit_count` int unsigned NOT NULL DEFAULT '1',
  `window_start` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `blocked_until` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rate_key` (`identifier`,`endpoint`),
  KEY `idx_rate_window` (`identifier`,`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `reviews`
DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `property_id` int unsigned NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `is_flagged` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_review` (`user_id`,`property_id`),
  KEY `idx_rev_prop` (`property_id`),
  KEY `idx_rev_user` (`user_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_review_comment` CHECK (((`comment` is null) or (char_length(`comment`) <= 2000))),
  CONSTRAINT `chk_review_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `subscriptions`
DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `payment_id` int unsigned DEFAULT NULL,
  `plan` enum('basic','pro','owner') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'basic',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','expired','cancelled','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `auto_renew` tinyint NOT NULL DEFAULT '0',
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_sub_user` (`user_id`,`status`),
  KEY `idx_sub_end` (`end_date`,`status`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_sub_dates` CHECK ((`end_date` > `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `support_tickets`
DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `subject` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','in_progress','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `admin_reply` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_user` (`user_id`,`status`),
  KEY `idx_ticket_status` (`status`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `user_ratings`
DROP TABLE IF EXISTS `user_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_ratings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `rated_user_id` int unsigned NOT NULL,
  `rating_user_id` int unsigned NOT NULL,
  `rating` tinyint NOT NULL,
  `review` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_rating` (`rated_user_id`,`rating_user_id`),
  KEY `idx_urating_rated` (`rated_user_id`),
  KEY `idx_urating_rater` (`rating_user_id`),
  CONSTRAINT `user_ratings_ibfk_1` FOREIGN KEY (`rated_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_ratings_ibfk_2` FOREIGN KEY (`rating_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_user_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `user_sessions`
DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token_hash` (`token_hash`),
  KEY `idx_sess_user` (`user_id`,`is_active`),
  KEY `idx_sess_expires` (`expires_at`,`is_active`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `user_settings`
DROP TABLE IF EXISTS `user_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `email_notifications` tinyint NOT NULL DEFAULT '1',
  `sms_notifications` tinyint NOT NULL DEFAULT '1',
  `push_notifications` tinyint NOT NULL DEFAULT '1',
  `marketing_emails` tinyint NOT NULL DEFAULT '0',
  `language` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sw',
  `theme` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'light',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_settings_notif` (`user_id`,`email_notifications`,`sms_notifications`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `user_verifications`
DROP TABLE IF EXISTS `user_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_verifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `id_type` enum('nida','passport','driving_license','tin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified` tinyint NOT NULL DEFAULT '0',
  `verified_by` int unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_uv_user` (`user_id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_uverif_user` (`user_id`),
  CONSTRAINT `user_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_verifications_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `verification_requests`
DROP TABLE IF EXISTS `verification_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `id_type` enum('nida','passport','driving_license','tin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_document_front` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_document_back` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `selfie_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_verified` tinyint NOT NULL DEFAULT '0',
  `status` enum('pending','approved','rejected','requires_resubmission') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vreq_user` (`user_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_vreq_user` (`user_id`,`status`),
  KEY `idx_vreq_type` (`id_type`),
  CONSTRAINT `verification_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `verification_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSERT DATA
-- =============================================

-- Insert Users
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `plan`, `avatar`, `verified`, `is_active`, `failed_login_attempts`, `locked_until`, `last_login_at`, `last_login_ip`, `password_changed_at`, `otp_code`, `otp_expires_at`, `email_notifications`, `sms_notifications`, `deleted_at`, `created_at`, `updated_at`, `is_verified`, `verification_type`, `otp_verified`, `reset_token`, `reset_token_expires`, `gender`) VALUES (5,'Noel Juma','noel@gmail.com','255748533936','$2b$12$pHmRF0qP2bwHj9bzegQ1MOs874zllq7qsEZDiH3sp8FPvfHVx9Zxe','admin','admin','/uploads/avatar-1778015806868-134997662.jpg',0,1,0,NULL,'2026-05-07 16:05:13','10.24.182.129','2026-04-21 01:14:30',NULL,NULL,1,1,NULL,'2026-04-17 02:55:03','2026-05-07 16:05:13',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `plan`, `avatar`, `verified`, `is_active`, `failed_login_attempts`, `locked_until`, `last_login_at`, `last_login_ip`, `password_changed_at`, `otp_code`, `otp_expires_at`, `email_notifications`, `sms_notifications`, `deleted_at`, `created_at`, `updated_at`, `is_verified`, `verification_type`, `otp_verified`, `reset_token`, `reset_token_expires`, `gender`) VALUES (22,'ANNA Michael','anna@gmail.com','+255748523980','$2b$12$oYHy8KEDJ.5BjdaH9Te92u9Er.7Vw5nyzd69GlWhvJ2du8PBX4Jmm','agent','basic',NULL,0,1,0,NULL,NULL,NULL,'2026-05-05 21:50:11',NULL,NULL,1,1,NULL,'2026-05-05 21:50:11','2026-05-05 21:50:11',0,NULL,0,NULL,NULL,'female');
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `plan`, `avatar`, `verified`, `is_active`, `failed_login_attempts`, `locked_until`, `last_login_at`, `last_login_ip`, `password_changed_at`, `otp_code`, `otp_expires_at`, `email_notifications`, `sms_notifications`, `deleted_at`, `created_at`, `updated_at`, `is_verified`, `verification_type`, `otp_verified`, `reset_token`, `reset_token_expires`, `gender`) VALUES (23,'Anuarite Amosi','anu@gmail.com','+255789567098','$2b$12$eq4b3AeLyCVSVW04FCLuSu6ljBbyxVLCeuBE8sxVfM2D6RxjMD8OW','customer','basic',NULL,0,1,0,NULL,NULL,NULL,'2026-05-06 06:23:08',NULL,NULL,1,1,NULL,'2026-05-06 06:23:08','2026-05-06 06:23:08',0,NULL,0,NULL,NULL,'female');

-- Insert Audit Log
INSERT INTO `audit_log` VALUES (1,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-03 13:30:33'),(2,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36','success','2026-05-03 15:21:09'),(3,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-03 15:27:27'),(4,18,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36','success','2026-05-03 15:28:29'),(5,18,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-03 15:34:10'),(6,19,'REGISTER',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36','success','2026-05-03 15:35:39'),(7,19,'UNAUTHORIZED_ACCESS_ATTEMPT:/admin/verifications/all',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'failure','2026-05-03 15:36:50'),(8,19,'UNAUTHORIZED_ACCESS_ATTEMPT:/admin/verifications/all',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'failure','2026-05-03 15:38:27'),(9,19,'LOGOUT',NULL,NULL,NULL,NULL,'10.29.103.1',NULL,'success','2026-05-03 15:39:28'),(10,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-03 15:52:39'),(11,18,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-03 15:53:11'),(12,18,'UNAUTHORIZED_ACCESS_ATTEMPT:/admin/verifications/all',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'failure','2026-05-03 15:53:52'),(13,18,'UNAUTHORIZED_ACCESS_ATTEMPT:/admin/verifications/all',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'failure','2026-05-03 15:54:49'),(14,18,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36','success','2026-05-03 16:09:21'),(15,15,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-03 21:36:28'),(16,18,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 19:29:01'),(17,18,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-04 20:35:18'),(18,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 20:49:21'),(19,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-04 20:59:03'),(20,5,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 20:59:24'),(21,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-04 21:17:41'),(22,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 21:18:23'),(23,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.29.103.1',NULL,'success','2026-05-04 22:03:01'),(24,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 22:03:32'),(25,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.29.103.1',NULL,'success','2026-05-04 22:15:46'),(26,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 22:16:08'),(27,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-04 23:37:19'),(28,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 23:37:40'),(29,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.29.103.1',NULL,'success','2026-05-04 23:45:07'),(30,16,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-04 23:45:29'),(31,18,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36','success','2026-05-05 04:20:05'),(32,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 06:31:41'),(33,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-05 06:32:36'),(34,8,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 06:32:59'),(35,8,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-05 06:33:45'),(36,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 06:34:04'),(37,20,'REGISTER',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','success','2026-05-05 06:56:19'),(38,20,'LOGOUT',NULL,NULL,NULL,NULL,'10.29.103.1',NULL,'success','2026-05-05 07:09:50'),(39,21,'REGISTER',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','success','2026-05-05 07:14:52'),(40,21,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-05 07:46:08'),(41,21,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','success','2026-05-05 07:47:40'),(42,5,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 10:56:55'),(43,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 17:54:36'),(44,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-05 17:56:52'),(45,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 18:00:15'),(46,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.190.134',NULL,'success','2026-05-05 18:24:37'),(47,5,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 18:24:58'),(48,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-05 18:54:48'),(49,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-05 21:37:26'),(50,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 21:37:52'),(51,22,'REGISTER',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 21:50:13'),(52,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-05 21:58:40'),(53,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-05 21:59:10'),(54,23,'REGISTER',NULL,NULL,NULL,NULL,'10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-06 06:23:10'),(55,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-06 06:24:50'),(56,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-06 13:02:59'),(57,23,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-06 13:35:17'),(58,5,'LOGIN',NULL,NULL,NULL,NULL,'10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-06 13:35:38'),(59,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.24.156.130',NULL,'success','2026-05-06 13:42:28'),(60,5,'LOGIN',NULL,NULL,NULL,NULL,'10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-06 13:42:49'),(61,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.28.13.2',NULL,'success','2026-05-06 22:36:31'),(62,5,'LOGIN',NULL,NULL,NULL,NULL,'10.25.193.131','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-06 22:36:53'),(63,5,'LOGIN',NULL,NULL,NULL,NULL,'10.25.193.131','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-07 10:55:32'),(64,5,'LOGOUT',NULL,NULL,NULL,NULL,'10.25.193.131',NULL,'success','2026-05-07 16:04:52'),(65,5,'LOGIN',NULL,NULL,NULL,NULL,'10.24.182.129','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','success','2026-05-07 16:05:13');

-- Insert FAQs
INSERT INTO `faqs` VALUES (1,'Jinsi ya kuunda akaunti?','Bonyeza \"Jisajili\" kwenye ukurasa wa kuingia. Jaza maelezo yako na utume. Utapewa taarifa kwenye barua pepe yako.',1,1,'2026-04-17 02:43:15'),(2,'Je, ni bei gani ya kuweka tangazo?','Kuweka tangazo la kawaida ni bure. Kwa tangazo la Premium unalipa TSh 10,000 kwa wiki au TSh 30,000 kwa mwezi.',2,1,'2026-04-17 02:43:15'),(3,'Jinsi ya kuwasiliana na dalali?','Bonyeza kitufe cha \"Wasiliana\" kwenye ukurasa wa mali. Utapata uwezo wa kuzungumza na dalali kwa njia ya mazungumzo.',3,1,'2026-04-17 02:43:15'),(4,'Je, ninauwezo wa kubadilisha nywila?','Ndiyo. Nenda kwenye \"Akaunti\" → \"Mipangilio\" na ufuate maagizo ya kubadilisha nywila.',4,1,'2026-04-17 02:43:15'),(5,'Je, taarifa zangu ziko salama?','Ndiyo. Tunatumia teknolojia ya kisasa ya usalama (bcrypt, JWT, HTTPS) kulinda taarifa zako zote.',5,1,'2026-04-17 02:43:15'),(6,'Ninawezaje kuthibitisha akaunti yangu?','Nenda kwenye Akaunti → Thibitisha Utambulisho. Jaza namba ya NIDA au pasipoti yako kisha subiri uthibitisho wa admin.',6,1,'2026-04-17 02:43:15'),(7,'Je, ninaweza kubatilisha malipo?','Malipo ya digital hayabatilishwi mara baada ya kuthibitishwa. Wasiliana na msaada wetu kwa masuala ya malipo.',7,1,'2026-04-17 02:43:15'),(8,'Jinsi ya kuongeza mali kwenye orodha?','Unahitaji akaunti ya Dalali au Mwenye Nyumba. Bonyeza kitufe cha + chini ya skrini na jaza maelezo ya mali yako.',8,1,'2026-04-17 02:43:15');

-- Insert Login Attempts
INSERT INTO `login_attempts` VALUES (1,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-03 13:30:33'),(2,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36','2026-05-03 15:21:09'),(3,'nuru@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36','2026-05-03 15:28:29'),(4,'nuru@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-03 15:53:11'),(5,'nuru@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36','2026-05-03 16:09:21'),(6,'jose@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-03 21:36:28'),(7,'nuru@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 19:29:01'),(8,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 20:49:21'),(9,'noel@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 20:59:24'),(10,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 21:18:23'),(11,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 22:03:32'),(12,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 22:16:08'),(13,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 23:37:40'),(14,'alice@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-04 23:45:29'),(15,'nuru@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36','2026-05-05 04:20:05'),(16,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 06:31:38'),(17,'anna@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 06:32:59'),(18,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 06:34:04'),(19,'oversize@gmail.com','10.28.190.134',0,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','2026-05-05 07:11:04'),(20,'oversize@gmail.com','10.28.190.134',0,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','2026-05-05 07:11:05'),(21,'oversize@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','2026-05-05 07:47:40'),(22,'noel@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 10:56:55'),(23,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 17:54:35'),(24,'anna@gmail.com','10.24.156.130',0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 17:57:08'),(25,'anna@gmail.com','10.24.156.130',0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 17:57:10'),(26,'nuru@gmail.com','10.24.156.130',0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 17:57:35'),(27,'nuru@gmail.com','10.24.156.130',0,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 17:57:36'),(28,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 18:00:15'),(29,'noel@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 18:24:58'),(30,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 21:37:52'),(31,'noel@gmail.com','10.24.156.130',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-05 21:59:10'),(32,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-06 06:24:50'),(33,'anna@gmail.com','10.29.103.1',0,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','2026-05-06 10:15:48'),(34,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-06 13:02:59'),(35,'noel@gmail.com','10.29.103.1',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-06 13:35:38'),(36,'noel@gmail.com','10.28.190.134',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-06 13:42:49'),(37,'noel@gmail.com','10.25.193.131',1,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-05-06 22:36:53');

-- Insert Messages
INSERT INTO `messages` VALUES (1,22,5,NULL,'hellow brother',1,0,0,'2026-05-05 21:54:33'),(2,22,5,NULL,'hellow brother',1,0,0,'2026-05-05 21:54:34'),(3,5,22,NULL,'hellow how is you brother',1,0,0,'2026-05-05 21:55:07'),(4,5,22,NULL,'hellow how is you brother',1,0,0,'2026-05-05 21:55:09'),(5,22,5,NULL,'am good too brother',0,0,0,'2026-05-05 21:55:31'),(6,22,5,NULL,'am good too brother',0,0,0,'2026-05-05 21:55:33'),(7,5,22,NULL,'nice to hear that bro',1,0,0,'2026-05-05 21:55:50'),(8,5,22,NULL,'nice to hear that bro',1,0,0,'2026-05-05 21:55:51'),(9,22,5,NULL,'you are welcome',0,0,0,'2026-05-05 21:56:05'),(10,22,5,NULL,'you are welcome',0,0,0,'2026-05-05 21:56:06'),(11,23,5,NULL,'hellow bro',1,0,0,'2026-05-06 13:07:48'),(12,23,5,NULL,'hellow bro',1,0,0,'2026-05-06 13:07:49'),(13,5,23,NULL,'hellow how is you today',0,0,0,'2026-05-06 13:08:25'),(14,5,23,NULL,'hellow how is you today',0,0,0,'2026-05-06 13:08:26'),(15,23,5,NULL,'am good fear to you sis',1,0,0,'2026-05-06 13:08:51'),(16,23,5,NULL,'am good fear to you sis',1,0,0,'2026-05-06 13:08:52'),(17,5,23,NULL,'iam good too bro',0,0,0,'2026-05-06 13:09:38'),(18,5,23,NULL,'iam good too bro',0,0,0,'2026-05-06 13:09:40'),(19,23,5,NULL,'nice ,you are welcome bro',1,0,0,'2026-05-06 13:10:12'),(20,23,5,NULL,'nice ,you are welcome bro',1,0,0,'2026-05-06 13:10:14');

-- Insert Notifications
INSERT INTO `notifications` VALUES (4,22,'Karibu MakaziPlus!','Akaunti yako imefunguliwa. Anza kutafuta nyumba yako ya ndoto!','system',0,NULL,NULL,'2026-05-05 21:50:12'),(5,5,'Booking Request Received ?','ANNA Michael wants to book your property for 2 day(s). Total: TSh 2,459,950','system',0,13,'booking','2026-05-05 21:52:28'),(6,5,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,1,'message','2026-05-05 21:54:34'),(7,22,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,3,'message','2026-05-05 21:55:08'),(8,5,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,5,'message','2026-05-05 21:55:32'),(9,22,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,7,'message','2026-05-05 21:55:50'),(10,5,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,9,'message','2026-05-05 21:56:05'),(11,23,'Karibu MakaziPlus!','Akaunti yako imefunguliwa. Anza kutafuta nyumba yako ya ndoto!','system',0,NULL,NULL,'2026-05-06 06:23:09'),(12,5,'Booking Request Received ?','Anuarite Amosi wants to book your property for 1 day(s). Total: TSh 5,677,999','system',0,14,'booking','2026-05-06 13:07:29'),(13,5,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,11,'message','2026-05-06 13:07:49'),(14,23,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,13,'message','2026-05-06 13:08:26'),(15,5,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,15,'message','2026-05-06 13:08:52'),(16,23,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,17,'message','2026-05-06 13:09:39'),(17,5,'Ujumbe Mpya ?','Umepewa ujumbe mpya kutoka kwa mtumiaji','message',0,19,'message','2026-05-06 13:10:12');

-- Insert Payments
INSERT INTO `payments` VALUES (1,2,NULL,30000.00,'TZS','pro','mpesa','+255700000002','TXN20240201001',NULL,NULL,'completed',NULL,NULL,'IDEM_001','2026-04-17 02:43:14','2026-04-17 02:43:14'),(2,4,NULL,10000.00,'TZS','boost','airtel','+255700000004','TXN20240215002',NULL,NULL,'completed',NULL,NULL,'IDEM_002','2026-04-17 02:43:14','2026-04-17 02:43:14'),(3,11,NULL,30000.00,'TZS','pro','mpesa','748523935','TXN1776950637517ZYFTZ3',NULL,NULL,'completed',NULL,NULL,NULL,'2026-04-23 16:23:57','2026-04-23 16:24:00'),(4,18,NULL,15000.00,'TZS','owner','tigopesa','1234567890','TXN177749912433174UV2T',NULL,NULL,'completed',NULL,NULL,NULL,'2026-04-30 00:45:24','2026-04-30 00:45:27');

-- Insert Permissions
INSERT INTO `permissions` VALUES (1,'customer','properties','read',1),(2,'customer','properties','list',1),(3,'customer','properties','create',0),(4,'customer','properties','update',0),(5,'customer','properties','delete',0),(6,'customer','messages','create',1),(7,'customer','messages','read',1),(8,'customer','favorites','create',1),(9,'customer','favorites','read',1),(10,'customer','payments','create',1),(11,'customer','payments','read',1),(12,'customer','reviews','create',1),(13,'customer','users','admin',0),(14,'agent','properties','create',1),(15,'agent','properties','update',1),(16,'agent','properties','delete',1),(17,'agent','properties','list',1),(18,'agent','properties','read',1),(19,'agent','messages','create',1),(20,'agent','messages','read',1),(21,'agent','payments','create',1),(22,'agent','payments','read',1),(23,'agent','users','admin',0),(24,'owner','properties','create',1),(25,'owner','properties','update',1),(26,'owner','properties','delete',1),(27,'owner','properties','list',1),(28,'owner','properties','read',1),(29,'owner','messages','create',1),(30,'owner','messages','read',1),(31,'owner','payments','create',1),(32,'owner','payments','read',1),(33,'owner','users','admin',0),(34,'admin','properties','admin',1),(35,'admin','users','admin',1),(36,'admin','payments','admin',1),(37,'admin','messages','admin',1),(38,'admin','reviews','admin',1),(39,'admin','audit_log','read',1),(40,'admin','blocked_ips','admin',1);

-- Insert Properties
INSERT INTO `properties` VALUES (26,5,'nyumba nzuri kinondoni','nyumba nzuri kinondoni  msasani','nyumba',1234567000.00,'rent','Dar es Salaam','kinondoni , msasani','kionondoni',NULL,NULL,23,2,889,0,'active',21,'2026-05-05 18:14:08','2026-05-06 15:01:04','available',NULL,'kionondoni',NULL,1,NULL),(27,5,'nyumba hii inapatikana ubungo','nyumba hii inapatikana ubungo  maji','nyumba',5677999.00,'rent','Dar es Salaam','ubungo','ubungo',-6.78258800,39.21678550,34,12,889,0,'active',10,'2026-05-05 21:20:08','2026-05-06 21:49:15','available',NULL,'ubungo',NULL,1,NULL),(28,5,'mali safi kinondoni','nyumba hii inapatikana maeneo ya kinondoni','nyumba',7889992.00,'rent','Dar es Salaam','kinondoni ,dar es salaam','kinondoni',NULL,NULL,33,4,678,0,'active',13,'2026-05-05 21:44:11','2026-05-07 16:05:32','available',NULL,'kinondoni',NULL,1,NULL),(29,5,'chumba kizuri magomeni','chumba hiki kinapatikana maeneo ya magomeni dar es salaam','chumba',1229975.00,'rent','Dar es Salaam','magomeni','magomeni',-6.78818600,39.16993000,45,6,456,0,'active',13,'2026-05-05 21:46:09','2026-05-06 14:48:19','available',NULL,'magomeni',NULL,1,NULL),(30,5,'nyumba nzuri kinondoni','nyumba nzuri kinondoni  msasani','nyumba',1234567000.00,'rent','Dar es Salaam','kinondoni , msasani','kionondoni',NULL,NULL,23,2,889,0,'active',3,'2026-05-06 15:02:36','2026-05-07 10:56:08','available',NULL,'kionondoni',NULL,1,NULL);

-- Insert Property Amenities
INSERT INTO `property_amenities` VALUES (112,26,'Maji'),(111,26,'Umeme'),(114,27,'Maji'),(113,27,'Umeme'),(115,28,'Maji'),(116,28,'Umeme'),(117,29,'Maji'),(118,29,'Umeme'),(119,30,'Maji'),(120,30,'Umeme');

-- Insert Property Images
INSERT INTO `property_images` VALUES (29,26,'/uploads/properties/prop-1778004847988-127964631.jpg',1,0,'2026-05-05 18:14:08'),(30,27,'/uploads/properties/prop-1778016008495-928945414.jpg',1,0,'2026-05-05 21:20:09'),(31,28,'/uploads/properties/prop-1778017451525-213176063.jpg',1,0,'2026-05-05 21:44:12'),(32,29,'/uploads/properties/prop-1778017569781-776503339.jpg',1,0,'2026-05-05 21:46:10'),(33,30,'/uploads/properties/prop-1778079755667-831367249.jpg',1,0,'2026-05-06 15:02:36');

-- Insert Reviews
INSERT INTO `reviews` VALUES (1,22,29,5,'nyumba nzuri sana hii',0,'2026-05-05 21:53:46'),(2,23,26,5,'nyumba safi na salama',0,'2026-05-06 13:06:10'),(3,5,28,5,NULL,0,'2026-05-06 21:54:57');

-- Insert Subscriptions
INSERT INTO `subscriptions` VALUES (1,2,1,'pro','2026-04-17','2026-05-17','active',0,NULL,'2026-04-17 02:43:15'),(2,11,NULL,'pro','2026-04-23','2026-05-23','active',0,NULL,'2026-04-23 16:24:00');

-- Insert User Settings
INSERT INTO `user_settings` VALUES (1,5,1,1,1,0,'en','light','2026-05-03 13:30:49','2026-05-07 16:30:43'),(3,18,1,1,1,0,'sw','light','2026-05-03 15:28:44','2026-05-03 15:28:44'),(4,19,1,1,1,0,'sw','light','2026-05-03 15:35:47','2026-05-03 15:35:47'),(5,15,1,1,1,0,'sw','light','2026-05-03 21:40:27','2026-05-03 21:40:27'),(6,16,1,1,1,0,'sw','light','2026-05-04 23:45:43','2026-05-04 23:45:43'),(7,8,1,1,1,0,'sw','light','2026-05-05 06:33:20','2026-05-05 06:33:20'),(8,20,1,1,1,0,'en','light','2026-05-05 06:56:36','2026-05-05 07:01:53'),(11,21,1,1,1,0,'sw','light','2026-05-05 07:15:21','2026-05-05 07:15:21'),(31,22,1,1,1,0,'sw','light','2026-05-05 22:06:24','2026-05-05 22:06:24'),(32,23,1,1,1,0,'en','light','2026-05-06 06:23:44','2026-05-06 13:35:05');

-- Insert User Sessions
INSERT INTO `user_sessions` VALUES (1,5,'1fcf671316bc9f2a6510caf3a959b33f833765f5f06744da43de259233d10726','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-10 13:30:33','2026-05-03 13:30:33','2026-05-03 15:52:39'),(2,5,'ae23e59913da0aacb86ac4756e848d4cf0790f6582f25c25c8e4ff0f0672eb5c','10.24.156.130','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',NULL,0,'2026-05-10 15:21:09','2026-05-03 15:21:09','2026-05-03 15:27:27'),(3,18,'0195402d772c428f4e5a107d3cf3ed0adaf14c5bf75b8fd6720481e5be1bf393','10.24.156.130','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',NULL,0,'2026-05-10 15:28:29','2026-05-03 15:28:29','2026-05-03 15:34:10'),(4,19,'7f0f96c88674dc0908353adc8ac97e437495a0194a4a8b07d52d012746b971e5','10.24.156.130','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',NULL,0,'2026-05-10 15:35:39','2026-05-03 15:35:38','2026-05-03 15:39:27'),(5,18,'1dd0f8c0b9aa4f77dfb7f9684298b6dd732dd18683e83eb914225908fd65907b','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-10 15:53:11','2026-05-03 15:53:11','2026-05-03 21:43:37'),(6,18,'1d62f3685ac1ddc7c5841dce414aef110eb41e48ae38c74bac13add75e615fc4','10.29.103.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',NULL,1,'2026-05-10 16:09:22','2026-05-03 16:09:21','2026-05-03 16:23:54'),(7,15,'8485c7830b901350525b46f7c0feb32de54f131ac905dd53df2508ca7cc4ab96','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-10 21:36:28','2026-05-03 21:36:28','2026-05-05 06:44:34'),(8,18,'f658a5fdde6cdcbd745ef8bfb02b8354af384ef9e21c8eda67c3dc489363c193','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 19:29:01','2026-05-04 19:29:01','2026-05-04 20:35:18'),(9,5,'3770e3887f8620a0dcecb291795e94a8f361c871adfd6e8fa046ae05d5f9fdf6','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 20:49:22','2026-05-04 20:49:21','2026-05-04 20:59:03'),(10,5,'abf58bb1cefc0bf4ddea6004bbc4f06f67ea381a345f239a0ce932433a153eef','10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 20:59:24','2026-05-04 20:59:24','2026-05-04 21:17:40'),(11,5,'7a7eba9105213c2b2f3070aa3cd23bc26678055cab8774d7301d22aa9763d4c9','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 21:18:23','2026-05-04 21:18:23','2026-05-04 22:03:01'),(12,5,'ac970c67a3ed465e7698b951c8dc2b81e8f7ff7b6a3e8e87ed61c0501dc566a0','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 22:03:32','2026-05-04 22:03:32','2026-05-04 22:15:45'),(13,5,'69b2863408c5b648ddf8d08e31da9afbc77f4996a7beca5d96f06fdf78891ebb','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 22:16:08','2026-05-04 22:16:08','2026-05-04 23:37:19'),(14,5,'89f5521de4befffa4f35b903737fa9d095c7e7f7f67dffeb9d6e69ebfcc94ee1','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-11 23:37:40','2026-05-04 23:37:40','2026-05-04 23:45:07'),(15,16,'f4640c2c494b8a37b44061e8ae973d58caecd7b4a48daf1d65598167e5d46440','10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-11 23:45:29','2026-05-04 23:45:29','2026-05-05 06:30:49'),(16,18,'7629a62ad0a1a3b98fbeaf7264c5b487a9c3418dbd043591a3120e17aef3325c','10.28.190.134','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',NULL,1,'2026-05-12 04:20:05','2026-05-05 04:20:05','2026-05-05 04:22:53'),(17,5,'606c7c7dffc44fabf9f87fe12180b6fd26e744fe457070c404b61b76227fcf71','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 06:31:39','2026-05-05 06:31:41','2026-05-05 06:32:36'),(18,8,'b4c1d73c12e579593aad6dfe46e7ecc2d45bfc18ddd202a67f514382f252fb98','10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 06:32:59','2026-05-05 06:32:59','2026-05-05 06:33:44'),(19,5,'32f7e7a2376a8797db487a63ea9e05a42e4bf9c1ef992380f028b2da5901c389','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-12 06:34:04','2026-05-05 06:34:04','2026-05-05 10:51:54'),(20,20,'e4831b1a8c25d53cc0ba4cf92887b012912ad5b303378650044f6f91deebfa90','10.28.190.134','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',NULL,0,'2026-05-12 06:56:19','2026-05-05 06:56:19','2026-05-05 07:09:50'),(21,21,'9ea6b41052866c07eb5111719bcfe087b1afe12f3fe97305f0e45606a80db5c4','10.29.103.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',NULL,0,'2026-05-12 07:14:52','2026-05-05 07:14:52','2026-05-05 07:46:08'),(22,21,'aa5f275c109a9cecdc4fb9524c5e4084398c91ca8e611754e2d7287118a0afc3','10.28.190.134','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',NULL,1,'2026-05-12 07:47:41','2026-05-05 07:47:40','2026-05-05 07:49:34'),(23,5,'5bf9d0da41e889d3d088810827c1761c9eb42bf48c978d15ef85b4508a5e1f6a','10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 10:56:55','2026-05-05 10:56:55','2026-05-05 18:54:47'),(24,5,'2005900b7140fde76bde1d7e1cf7ddbd7664001578c6801a140dc3d4e968b1d2','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 17:54:36','2026-05-05 17:54:36','2026-05-05 17:56:51'),(25,5,'c69acf2bddb32ef4786950b535ed8d867d2729d5bdbe438cc745c9e41009628c','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 18:00:16','2026-05-05 18:00:15','2026-05-05 18:24:36'),(26,5,'6b2b6f996aa72ccb6fc9190568cc2c68b43d4c65e1d7d7c97ba37a6696c5fe09','10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 18:24:58','2026-05-05 18:24:58','2026-05-05 21:37:25'),(27,5,'19e5f44fc7050357cde27250c4725bf7a9f2c7c8519f956f9fc8fb173e2886fd','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-12 21:37:52','2026-05-05 21:37:52','2026-05-05 21:58:40'),(28,22,'20fb8e4bb269fa95416b546e37c75de582e75091709c62f6a724a3b67cff7b5c','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-12 21:50:13','2026-05-05 21:50:13','2026-05-05 22:07:12'),(29,5,'96d3240626f4c08f07f252354ab74224e807417d032a87ebafc52a0a1a23a5ce','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-12 21:59:10','2026-05-05 21:59:10','2026-05-05 22:07:52'),(30,23,'fb79a8f84e4dcb2cd512d7c43e783903329d2349a13a09abc1c29eb37b96b1f8','10.24.156.130','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-13 06:23:10','2026-05-06 06:23:10','2026-05-06 13:35:16'),(31,5,'2aff42f949cb539df662cbd2a636c335ef9a3e6ffc3ca9f5a50adbf8e13550da','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-13 06:24:50','2026-05-06 06:24:50','2026-05-06 06:41:17'),(32,5,'9c285df9ba39f0d7a13e12fd3685910e7b8c1e78ef5351c83fcd0284246668de','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-13 13:02:59','2026-05-06 13:02:59','2026-05-06 22:36:31'),(33,5,'a052bf4a5176d6b6cb5875bcf2a247204fc56e91a112a0c60d020c1fa5080d78','10.29.103.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-13 13:35:38','2026-05-06 13:35:38','2026-05-06 13:42:28'),(34,5,'848f980229698dd7f96725cb64049f193e37d97912b641f6ebd94ec0076b01a8','10.28.190.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,0,'2026-05-13 13:42:49','2026-05-06 13:42:49','2026-05-07 16:04:52'),(35,5,'97b1554d6a6370ebc0f3f12629ffc0202034d2ff7a5129ad6aaf34b6d9851f3c','10.25.193.131','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-13 22:36:53','2026-05-06 22:36:53','2026-05-07 09:02:56'),(36,5,'1ef922f79411a8b6cea824aa8c2a1d0809c6d0e2bd25179cb4bc8afdca5d0371','10.25.193.131','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-14 10:55:32','2026-05-07 10:55:32','2026-05-07 16:30:46'),(37,5,'5992cf62fe40aa0859dc73044acc501450474d1f962528a9fda2a7c96a4c63a2','10.24.182.129','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',NULL,1,'2026-05-14 16:05:13','2026-05-07 16:05:13','2026-05-07 16:05:56');

-- Insert Bookings
INSERT INTO `bookings` VALUES (13,29,22,5,'2026-05-06','2026-05-08',1,2459950.00,'pending',NULL,'i need this tomorrow','2026-05-05 21:52:28','2026-05-05 21:52:28'),(14,27,23,5,'2026-05-06','2026-05-07',1,5677999.00,'pending',NULL,'i need this tomorrow','2026-05-06 13:07:28','2026-05-06 13:07:28');

-- =============================================
-- CREATE VIEWS (Original definitions restored)
-- =============================================

DROP VIEW IF EXISTS `vw_active_subscriptions`;
CREATE VIEW `vw_active_subscriptions` AS 
SELECT s.id, s.plan, s.start_date, s.end_date, s.status, 
DATEDIFF(s.end_date, CURDATE()) AS days_remaining,
u.id AS user_id, u.name AS user_name, u.email AS user_email, u.plan AS current_plan
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active' AND s.end_date >= CURDATE();

DROP VIEW IF EXISTS `vw_admin_payments`;
CREATE VIEW `vw_admin_payments` AS 
SELECT p.id, p.amount, p.currency, p.plan, p.method, p.status, p.transaction_id, p.gateway_ref, p.created_at, p.completed_at,
CONCAT(LEFT(p.phone, 4), '****', RIGHT(p.phone, 3)) AS masked_phone,
u.id AS user_id, u.name AS user_name, u.email AS user_email
FROM payments p
JOIN users u ON p.user_id = u.id;

DROP VIEW IF EXISTS `vw_admin_users`;
CREATE VIEW `vw_admin_users` AS 
SELECT id, name, email, phone, role, plan, verified, is_active, failed_login_attempts, locked_until, last_login_at, last_login_ip, deleted_at, created_at, updated_at
FROM users;

DROP VIEW IF EXISTS `vw_agent_dashboard`;
CREATE VIEW `vw_agent_dashboard` AS 
SELECT p.id, p.title, p.type, p.price, p.price_type, p.city, p.area, p.is_premium, p.status, p.views, p.created_at, p.updated_at, p.owner_id,
(SELECT COUNT(*) FROM messages m WHERE m.property_id = p.id) AS lead_count,
(SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_primary = 1 LIMIT 1) AS primary_image
FROM properties p;

DROP VIEW IF EXISTS `vw_properties_public`;
CREATE VIEW `vw_properties_public` AS 
SELECT p.id, p.title, p.type, p.price, p.price_type, p.city, p.area, p.bedrooms, p.bathrooms, p.size_sqm, p.is_premium, p.views, p.status, p.created_at, p.owner_id,
u.name AS owner_name, u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified,
(SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_primary = 1 LIMIT 1) AS primary_image
FROM properties p
JOIN users u ON p.owner_id = u.id
WHERE p.status = 'active';

DROP VIEW IF EXISTS `vw_revenue_analytics`;
CREATE VIEW `vw_revenue_analytics` AS 
SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, 
COUNT(*) AS transaction_count,
SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS revenue,
SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_revenue,
SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
method
FROM payments
GROUP BY DATE_FORMAT(created_at, '%Y-%m'), method;

DROP VIEW IF EXISTS `vw_security_alerts`;
CREATE VIEW `vw_security_alerts` AS 
SELECT ip_address, COUNT(*) AS attempt_count, COUNT(DISTINCT identifier) AS unique_identifiers, MIN(created_at) AS first_attempt, MAX(created_at) AS last_attempt,
CASE 
WHEN COUNT(*) >= 50 THEN 'CRITICAL'
WHEN COUNT(*) >= 20 THEN 'HIGH'
WHEN COUNT(*) >= 10 THEN 'MEDIUM'
ELSE 'LOW'
END AS threat_level
FROM login_attempts
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY ip_address
HAVING attempt_count >= 10;

DROP VIEW IF EXISTS `vw_top_properties`;
CREATE VIEW `vw_top_properties` AS 
SELECT p.id, p.title, p.city, p.area, p.type, p.price, p.views, p.is_premium,
COALESCE(AVG(r.rating), 0) AS avg_rating,
COUNT(DISTINCT r.id) AS review_count,
COUNT(DISTINCT f.id) AS favorite_count,
COUNT(DISTINCT m.id) AS message_count
FROM properties p
LEFT JOIN reviews r ON p.id = r.property_id
LEFT JOIN favorites f ON p.id = f.property_id
LEFT JOIN messages m ON p.id = m.property_id
WHERE p.status = 'active'
GROUP BY p.id
ORDER BY avg_rating DESC, review_count DESC, views DESC;

-- =============================================
-- COMMIT AND RE-ENABLE CONSTRAINTS
-- =============================================
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;

-- =============================================
-- VERIFICATION QUERIES (Run these to confirm import)
-- =============================================
SELECT '=== IMPORT COMPLETED SUCCESSFULLY ===' AS Status;
SELECT COUNT(*) AS Total_Users FROM users;
SELECT COUNT(*) AS Total_Properties FROM properties;
SELECT COUNT(*) AS Total_Bookings FROM bookings;
SELECT 'Database makaziplus41 is ready!' AS Message;
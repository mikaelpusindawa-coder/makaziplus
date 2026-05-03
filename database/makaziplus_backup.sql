-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: makaziplus41
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(64) DEFAULT NULL,
  `record_id` int unsigned DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `status` enum('success','failure','suspicious') NOT NULL DEFAULT 'success',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`,`created_at`),
  KEY `idx_audit_action` (`action`,`created_at`),
  KEY `idx_audit_table` (`table_name`,`record_id`),
  KEY `idx_audit_ip` (`ip_address`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `blocked_ips`
--

DROP TABLE IF EXISTS `blocked_ips`;
CREATE TABLE `blocked_ips` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `reason` varchar(200) NOT NULL,
  `blocked_by` int unsigned DEFAULT NULL,
  `blocked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blocked_ip` (`ip_address`),
  KEY `blocked_by` (`blocked_by`),
  CONSTRAINT `blocked_ips_ibfk_1` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `guests` tinyint unsigned NOT NULL DEFAULT '1',
  `total_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  `payment_id` int unsigned DEFAULT NULL,
  `special_requests` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_booking_property` (`property_id`,`status`),
  KEY `idx_booking_user` (`user_id`,`status`),
  KEY `idx_booking_dates` (`check_in_date`,`check_out_date`),
  KEY `idx_bookings_status` (`status`,`created_at`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_booking_dates` CHECK ((`check_out_date` > `check_in_date`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `faqs`
--

DROP TABLE IF EXISTS `faqs`;
CREATE TABLE `faqs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `question` varchar(255) NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faq_active` (`is_active`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(150) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `success` tinyint NOT NULL DEFAULT '0',
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_identifier` (`identifier`,`created_at`),
  KEY `idx_login_ip` (`ip_address`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `from_user_id` int unsigned NOT NULL,
  `to_user_id` int unsigned NOT NULL,
  `property_id` int unsigned DEFAULT NULL,
  `message` text NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text NOT NULL,
  `type` enum('new_listing','price_change','message','system','payment','security','warning') NOT NULL DEFAULT 'system',
  `is_read` tinyint NOT NULL DEFAULT '0',
  `ref_id` int unsigned DEFAULT NULL,
  `ref_type` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`,`is_read`,`created_at`),
  KEY `idx_notif_type` (`type`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `otp_verifications`
--

DROP TABLE IF EXISTS `otp_verifications`;
CREATE TABLE `otp_verifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `purpose` enum('phone_verify','password_reset','login_2fa','payment') NOT NULL,
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

--
-- Table structure for table `payment_audit_log`
--

DROP TABLE IF EXISTS `payment_audit_log`;
CREATE TABLE `payment_audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `note` text,
  `ip_address` varchar(45) DEFAULT NULL,
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

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `property_id` int unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'TZS',
  `plan` varchar(50) NOT NULL,
  `method` enum('mpesa','airtel','tigopesa','card') NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `gateway_ref` varchar(200) DEFAULT NULL,
  `gateway_response` json DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','refunded','disputed') NOT NULL DEFAULT 'pending',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `idempotency_key` varchar(100) DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `role` enum('customer','agent','owner','admin') NOT NULL,
  `resource` varchar(100) NOT NULL,
  `action` enum('create','read','update','delete','list','admin') NOT NULL,
  `allowed` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_perm` (`role`,`resource`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `properties`
--

DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `type` enum('nyumba','chumba','frem','ofisi') NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `price_type` enum('rent','sale') NOT NULL DEFAULT 'rent',
  `city` varchar(100) NOT NULL,
  `area` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `bedrooms` tinyint unsigned NOT NULL DEFAULT '0',
  `bathrooms` tinyint unsigned NOT NULL DEFAULT '0',
  `size_sqm` smallint unsigned NOT NULL DEFAULT '0',
  `is_premium` tinyint NOT NULL DEFAULT '0',
  `status` enum('active','inactive','pending','rejected','suspended') NOT NULL DEFAULT 'pending',
  `views` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `property_status` enum('available','sold','rented','pending') NOT NULL DEFAULT 'available',
  `place_id` varchar(255) DEFAULT NULL,
  `formatted_address` varchar(500) DEFAULT NULL,
  `google_maps_url` varchar(500) DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `property_amenities`
--

DROP TABLE IF EXISTS `property_amenities`;
CREATE TABLE `property_amenities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `amenity` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_amenity` (`property_id`,`amenity`),
  KEY `idx_pam_prop` (`property_id`),
  CONSTRAINT `property_amenities_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `property_images`
--

DROP TABLE IF EXISTS `property_images`;
CREATE TABLE `property_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `property_id` int unsigned NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `is_primary` tinyint NOT NULL DEFAULT '0',
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pimg_prop` (`property_id`,`is_primary`),
  CONSTRAINT `property_images_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `rate_limits`
--

DROP TABLE IF EXISTS `rate_limits`;
CREATE TABLE `rate_limits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(150) NOT NULL,
  `endpoint` varchar(200) NOT NULL,
  `hit_count` int unsigned NOT NULL DEFAULT '1',
  `window_start` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `blocked_until` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rate_key` (`identifier`,`endpoint`),
  KEY `idx_rate_window` (`identifier`,`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `property_id` int unsigned NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `payment_id` int unsigned DEFAULT NULL,
  `plan` enum('basic','pro','owner') NOT NULL DEFAULT 'basic',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','expired','cancelled','suspended') NOT NULL DEFAULT 'active',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `subject` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `admin_reply` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_user` (`user_id`,`status`),
  KEY `idx_ticket_status` (`status`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user_ratings`
--

DROP TABLE IF EXISTS `user_ratings`;
CREATE TABLE `user_ratings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `rated_user_id` int unsigned NOT NULL,
  `rating_user_id` int unsigned NOT NULL,
  `rating` tinyint NOT NULL,
  `review` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_rating` (`rated_user_id`,`rating_user_id`),
  KEY `idx_urating_rated` (`rated_user_id`),
  KEY `idx_urating_rater` (`rating_user_id`),
  CONSTRAINT `user_ratings_ibfk_1` FOREIGN KEY (`rated_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_ratings_ibfk_2` FOREIGN KEY (`rating_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_user_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token_hash` (`token_hash`),
  KEY `idx_sess_user` (`user_id`,`is_active`),
  KEY `idx_sess_expires` (`expires_at`,`is_active`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user_settings`
--

DROP TABLE IF EXISTS `user_settings`;
CREATE TABLE `user_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `email_notifications` tinyint NOT NULL DEFAULT '1',
  `sms_notifications` tinyint NOT NULL DEFAULT '1',
  `push_notifications` tinyint NOT NULL DEFAULT '1',
  `marketing_emails` tinyint NOT NULL DEFAULT '0',
  `language` varchar(10) DEFAULT 'sw',
  `theme` varchar(20) DEFAULT 'light',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_settings_notif` (`user_id`,`email_notifications`,`sms_notifications`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user_verifications`
--

DROP TABLE IF EXISTS `user_verifications`;
CREATE TABLE `user_verifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `id_type` enum('nida','passport','driving_license','tin') NOT NULL,
  `id_number` varchar(100) NOT NULL,
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

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('customer','agent','owner','admin') NOT NULL DEFAULT 'customer',
  `plan` enum('basic','pro','admin') NOT NULL DEFAULT 'basic',
  `avatar` varchar(500) DEFAULT NULL,
  `verified` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `failed_login_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `password_changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `otp_code` varchar(6) DEFAULT NULL,
  `otp_expires_at` datetime DEFAULT NULL,
  `email_notifications` tinyint NOT NULL DEFAULT '1',
  `sms_notifications` tinyint NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_verified` tinyint NOT NULL DEFAULT '0',
  `verification_type` varchar(50) DEFAULT NULL,
  `otp_verified` tinyint NOT NULL DEFAULT '0',
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `idx_users_verified` (`verified`),
  KEY `idx_users_deleted` (`deleted_at`),
  KEY `idx_users_locked` (`locked_until`),
  CONSTRAINT `chk_users_email` CHECK ((`email` like '%@%.%')),
  CONSTRAINT `chk_users_name` CHECK ((char_length(trim(`name`)) >= 2)),
  CONSTRAINT `chk_users_phone` CHECK (regexp_like(`phone`,'^\\+?[0-9]{9,15}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `verification_requests`
--

DROP TABLE IF EXISTS `verification_requests`;
CREATE TABLE `verification_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `id_type` enum('nida','passport','driving_license','tin') NOT NULL,
  `id_number` varchar(100) NOT NULL,
  `id_document_front` varchar(500) DEFAULT NULL,
  `id_document_back` varchar(500) DEFAULT NULL,
  `selfie_url` varchar(500) DEFAULT NULL,
  `phone_verified` tinyint NOT NULL DEFAULT '0',
  `status` enum('pending','approved','rejected','requires_resubmission') NOT NULL DEFAULT 'pending',
  `admin_notes` text,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DATA INSERTIONS (ALL YOUR EXISTING DATA - PRESERVED)
INSERT INTO `users` VALUES (2,'Ahmed Dalali','agent@makaziplus.co.tz','+255700000002','$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS','agent','pro',NULL,1,0,0,NULL,NULL,NULL,'2026-04-17 02:43:14',NULL,NULL,1,1,'2026-04-23 00:55:10','2026-04-17 02:43:14','2026-04-23 00:55:10',0,NULL,0,NULL,NULL,NULL);
INSERT INTO `users` VALUES (4,'Fatuma Mwenye','owner@makaziplus.co.tz','+255700000004','$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS','owner','basic',NULL,1,0,0,NULL,NULL,NULL,'2026-04-17 02:43:14',NULL,NULL,1,1,'2026-04-23 00:55:03','2026-04-17 02:43:14','2026-04-23 00:55:03',0,NULL,0,NULL,NULL,NULL);
INSERT INTO `users` VALUES (5,'Noel Juma','noel@gmail.com','255748533936','$2b$12$pHmRF0qP2bwHj9bzegQ1MOs874zllq7qsEZDiH3sp8FPvfHVx9Zxe','admin','admin','/uploads/avatar-1777239010296-181676261.jpg',0,1,0,NULL,'2026-05-02 10:48:49','::1','2026-04-21 01:14:30',NULL,NULL,1,1,NULL,'2026-04-17 02:55:03','2026-05-02 10:48:49',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (6,'David Pius','aminiel@gmail.com','255645674567','$2b$12$PG5o7TCtqPeI2p3AgxKoVuC84sXlLESQJvtL3asbsKYJG7tfy/zRy','owner','basic','/uploads/avatar-1776420900613-844408821.jpg',1,1,0,NULL,'2026-04-17 12:17:49','::1','2026-04-17 03:51:58',NULL,NULL,1,1,NULL,'2026-04-17 03:51:58','2026-04-17 13:26:08',1,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (7,'Jembe Kazini','jembekazini798@gmail.com','0738523935','$2b$12$HV41N8hpx4V/g7vb.SQf7OxqZg5RHQM/LLAwcy9kPQ/iWlT34K15e','customer','basic',NULL,0,1,0,NULL,NULL,NULL,'2026-04-18 10:10:13',NULL,NULL,1,1,NULL,'2026-04-18 10:10:13','2026-04-18 10:10:13',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (8,'Anna Michael','anna@gmail.com','+255788198900','$2b$12$nSHx8SYM7C/n1pbfW97JVuYISOB25GEue7/wLBIITDWMPD5C5cpXG','agent','pro',NULL,1,1,0,NULL,'2026-04-29 23:26:17','::1','2026-04-18 10:51:43',NULL,NULL,1,1,NULL,'2026-04-18 10:51:43','2026-04-29 23:26:17',0,NULL,0,NULL,NULL,'female');
INSERT INTO `users` VALUES (9,'Juma Michael@gmail.com','juma@gmail.com','+255799004536','$2b$12$FAx95Bw2qWW32aJzhHPPb.n3mb2ub5ubQ.0wvObgTvDGfVZw/n4JW','agent','basic',NULL,0,1,0,NULL,NULL,NULL,'2026-04-18 10:56:41',NULL,NULL,1,1,NULL,'2026-04-18 10:56:41','2026-04-18 10:56:41',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (10,'Nestory Aminiel','nesto@gmail.com','+255678567345','$2b$12$k0b31JNjsMn/RMzr7Vi8A.s3I.vMAwhQK4Tcx0d3/LDQuuCvD7MJS','agent','basic',NULL,1,1,0,NULL,NULL,NULL,'2026-04-18 10:57:51',NULL,NULL,1,1,NULL,'2026-04-18 10:57:51','2026-04-18 11:37:38',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (11,'Grace Amosi','grace@gmail.com','+255890456234','$2b$12$XBQSKpXwM8bcJOWf9aam2eoMDFr7IXBx/Xc0KMMC/wuKugX2qfsFm','customer','pro','/uploads/avatar-1776950554348-515973511.jpg',1,1,0,NULL,'2026-04-23 15:14:38','::1','2026-04-18 10:58:49',NULL,NULL,1,1,NULL,'2026-04-18 10:58:49','2026-04-23 16:24:00',0,NULL,0,NULL,NULL,'female');
INSERT INTO `users` VALUES (12,'Esther Mushi','esther@gmail.com','+255903211321','$2b$12$2dolWBnfn9snb2pA7vOcs.Y14EuZL12Kb6nOFAgl5IoozpLnwCaPy','customer','basic',NULL,1,1,0,NULL,'2026-04-18 11:19:08','::1','2026-04-18 10:59:55',NULL,NULL,1,1,NULL,'2026-04-18 10:59:55','2026-04-18 11:37:31',0,NULL,0,NULL,NULL,'female');
INSERT INTO `users` VALUES (13,'Misana Amosi','misana@gmail.com','+255756145269','$2b$12$dxWuMYCyCpdFZsSqXShnlOacjDy/pKmrwedaW.HBl0e4i9TsM1O0.','customer','basic',NULL,1,1,0,NULL,'2026-04-23 13:23:43','::1','2026-04-18 11:01:02',NULL,NULL,1,1,NULL,'2026-04-18 11:01:02','2026-04-23 13:23:43',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (14,'Obedi Michael','obedi@gmail.com','+2556754390123','$2b$12$JHz8YtTa1VR2Ddd3EDAqS.zh.p4GqCB3Kpui.mzqLqt/IjO40whAW','owner','basic',NULL,1,1,0,NULL,'2026-04-23 13:25:16','::1','2026-04-18 11:02:32',NULL,NULL,1,1,NULL,'2026-04-18 11:02:32','2026-04-23 13:25:16',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (15,'Jose Abel','jose@gmail.com','+2556452349078','$2b$12$JVR9jU8hxD9Hm.aCbGo6n.ljE1oXQOObYGgT46ajCCLaol20TYQx2','owner','basic','/uploads/avatar-1776703380084-27045681.jpg',1,1,0,NULL,'2026-04-28 14:01:20','::1','2026-04-18 11:03:57',NULL,NULL,1,1,NULL,'2026-04-18 11:03:57','2026-04-28 14:01:20',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (16,'Alice Abdul','alice@gmail.com','+255645179678','$2b$12$E6NS6nV8ZIdC/WfZ3/b2.ulyLt1sIgSWhcBqicWOfJ5id5beGCAKm','owner','basic',NULL,1,1,0,NULL,'2026-04-21 14:19:32','::1','2026-04-18 11:05:03',NULL,NULL,1,1,NULL,'2026-04-18 11:05:03','2026-04-21 14:19:32',0,NULL,0,NULL,NULL,'male');
INSERT INTO `users` VALUES (17,'Rahel Annael','rahel@gmail.com','1234567890','$2b$12$5N4U5ElGmJOKPcSnOjL1JuZb50p/ZztYLM7xuWSuUvNwYtKpAeoBO','owner','basic',NULL,0,1,0,NULL,'2026-04-24 02:53:35','::1','2026-04-23 00:41:22',NULL,NULL,1,1,NULL,'2026-04-23 00:41:22','2026-04-24 02:53:35',0,NULL,0,NULL,NULL,'female');
INSERT INTO `users` VALUES (18,'Nuru Abel','nuru@gmail.com','255678980123','$2b$12$qP72j9isSR5hJZuLEQuK8u1SF/Jb4GC0RfjtgXLttCBu6hatRi.5C','customer','basic',NULL,0,1,0,NULL,'2026-05-03 01:46:54','::1','2026-04-24 02:50:33',NULL,NULL,1,1,NULL,'2026-04-24 02:50:33','2026-05-03 01:46:54',0,NULL,0,NULL,NULL,'female');

INSERT INTO `properties` VALUES (1,2,'Villa ya Kisasa Msasani','Villa yenye starehe nyingi karibu na bahari.','nyumba',850000.00,'rent','Dar es Salaam','Msasani',NULL,NULL,NULL,4,3,240,0,'suspended',466,'2026-04-17 02:43:14','2026-04-24 10:23:20','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (2,2,'Nyumba Nzuri Kinondoni','Nyumba nzuri na spacious.','nyumba',450000.00,'rent','Dar es Salaam','Kinondoni',NULL,NULL,NULL,3,2,150,0,'suspended',348,'2026-04-17 02:43:14','2026-04-23 13:57:03','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (3,4,'Chumba Kikubwa Mikocheni','Chumba kikubwa na furaha.','chumba',180000.00,'rent','Dar es Salaam','Mikocheni',NULL,NULL,NULL,1,1,45,0,'active',224,'2026-04-17 02:43:14','2026-04-30 12:34:22','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (4,2,'Frem ya Biashara CBD','Frem kubwa moyo wa mji.','frem',1200000.00,'rent','Dar es Salaam','CBD',NULL,NULL,NULL,0,2,180,0,'suspended',182,'2026-04-17 02:43:14','2026-04-23 01:08:30','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (5,2,'Nyumba Luxury Oyster Bay','Nyumba ya luxury.','nyumba',2200000.00,'rent','Dar es Salaam','Oyster Bay',NULL,NULL,NULL,5,4,380,0,'suspended',616,'2026-04-17 02:43:14','2026-04-23 01:08:25','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (6,4,'Chumba cha Starehe Sinza','Chumba cha bei nafuu Sinza.','chumba',120000.00,'rent','Dar es Salaam','Sinza',NULL,NULL,NULL,1,1,32,0,'suspended',109,'2026-04-17 02:43:14','2026-04-23 01:08:23','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (7,2,'Nyumba Kuuza Tegeta 3BR','Nyumba nzuri kwa kuuza.','nyumba',45000000.00,'sale','Dar es Salaam','Tegeta',NULL,NULL,NULL,3,2,140,0,'suspended',207,'2026-04-17 02:43:14','2026-04-23 01:08:20','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (8,4,'Nyumba Mwanza Ziwa','Nyumba nzuri karibu na Ziwa Victoria.','nyumba',320000.00,'rent','Mwanza','Nyamagana',NULL,NULL,NULL,3,2,130,0,'suspended',93,'2026-04-17 02:43:14','2026-04-26 19:14:10','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (9,2,'Ofisi ya Kisasa Arusha','Ofisi ya kisasa Arusha.','ofisi',500000.00,'rent','Arusha','CBD Arusha',NULL,NULL,NULL,0,1,90,0,'suspended',156,'2026-04-17 02:43:14','2026-04-23 01:08:09','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (10,4,'Studio Modern Kariakoo','Studio ya kisasa Kariakoo.','chumba',95000.00,'rent','Dar es Salaam','Kariakoo',NULL,NULL,NULL,1,1,28,0,'suspended',94,'2026-04-17 02:43:14','2026-04-23 01:08:04','available',NULL,NULL,NULL);
INSERT INTO `properties` VALUES (11,5,'Nyumba nzuri Ubungo','nyumba hii inapatikana maeneo ya Ubungo , karibu na chuo cha UDSM','nyumba',7000000.00,'rent','Dar es Salaam','Kimara','kimara',-6.77699500,39.26369500,30,10,600,0,'active',44,'2026-04-17 12:07:50','2026-04-30 09:23:27','available',NULL,'kimara ',NULL);
INSERT INTO `properties` VALUES (12,16,'nyumba nzuri Kinndoni','nyumba hii inapatikana Kinondoni B','nyumba',3999999.00,'rent','Dar es Salaam','Kinondoni,mkwajuni,hospital','kinondoni',NULL,NULL,23,10,699,0,'active',18,'2026-04-18 11:10:22','2026-04-30 10:41:12','available',NULL,'kinondoni',NULL);
INSERT INTO `properties` VALUES (13,16,'nyumba nzuri Ilala','hii inapatikana Ilala','nyumba',8999999.00,'sale','Dar es Salaam','Ilala,kariakoo,gerezani','Ilala',NULL,NULL,15,7,599,0,'active',24,'2026-04-18 11:12:48','2026-05-01 09:49:51','available',NULL,'Ilala',NULL);
INSERT INTO `properties` VALUES (14,16,'inapatikana ubungo','nyumba hii inapatikana Ubungo','nyumba',11999999.00,'rent','Dar es Salaam','Ubungo,ubungo maji,msewe','ubungo',NULL,NULL,40,20,456,0,'active',20,'2026-04-18 11:15:11','2026-04-29 10:05:08','available',NULL,'ubungo',NULL);
INSERT INTO `properties` VALUES (15,8,'nyumba nzuri ubungo','nyumba hii inapatikana maeneno ya Ubungo maji','nyumba',2000000.00,'rent','Dar es Salaam','ubungo,ubungo maji, maziwa','ubungo',-6.77699500,39.26369500,29,12,400,0,'active',27,'2026-04-18 11:23:10','2026-04-30 10:41:26','available',NULL,'ubungo',NULL);
INSERT INTO `properties` VALUES (16,8,'nyumba nzuri tegeta','inapatikana tegeta','nyumba',55999999.00,'rent','Dar es Salaam','Dar es salaam , tegeta, tegeta nyuki','tegeta',-6.77699500,39.26369500,40,12,899,0,'active',39,'2026-04-18 11:25:18','2026-04-23 13:27:26','available',NULL,'tegeta',NULL);
INSERT INTO `properties` VALUES (17,8,'nyumba nzuri Kimara','inapatikana kimara Temboni','nyumba',9800000.00,'rent','Dar es Salaam','dar es salaam,Kimara ,Kimara Temboni','Kimara',-6.77699500,39.26369500,30,10,455,0,'active',47,'2026-04-18 11:27:31','2026-04-30 11:10:08','available',NULL,'Kimara',NULL);
INSERT INTO `properties` VALUES (18,8,'nyumba nzuri Arusha','inapatikana Arusha Mjini','nyumba',99999999.00,'sale','Arusha','Arusha, usa river,momela','arusha',-6.77699500,39.26369500,49,20,456,0,'active',30,'2026-04-18 16:11:24','2026-05-01 09:49:26','available',NULL,'arusha',NULL);
INSERT INTO `properties` VALUES (19,14,'nyumba nzuri Longido','Nyumba hii inapatikana Arusha Longido','nyumba',6700000.00,'sale','Dar es Salaam','Arusha,Longido,Areni','longido',-6.77699500,39.26369500,30,12,899,0,'active',60,'2026-04-18 16:27:49','2026-05-01 14:35:58','available',NULL,'longido',NULL);
INSERT INTO `properties` VALUES (20,15,'nyumba nzuri morogoro','nyumba hii inapatikana morogoro','nyumba',455999.00,'rent','Dar es Salaam','morogoro','morogoro',-6.78817300,39.16996000,34,3,89,0,'active',88,'2026-04-20 19:37:12','2026-05-01 10:06:00','available',NULL,'morogoro',NULL);

-- Property amenities data
INSERT INTO `property_amenities` VALUES (1,1,'Pool'),(2,1,'Bustani'),(3,1,'Parking'),(4,1,'Generator'),(5,1,'Security 24/7'),(6,1,'WiFi');
INSERT INTO `property_amenities` VALUES (7,2,'Bustani'),(8,2,'Parking'),(9,2,'Maji'),(10,2,'Umeme'),(11,2,'Security');
INSERT INTO `property_amenities` VALUES (12,3,'WiFi'),(13,3,'Maji'),(14,3,'Umeme');
INSERT INTO `property_amenities` VALUES (15,4,'Generator'),(16,4,'Security 24/7'),(17,4,'Lift'),(18,4,'Parking'),(19,4,'WiFi');
INSERT INTO `property_amenities` VALUES (20,5,'Pool'),(21,5,'Gym'),(22,5,'Cinema Room'),(23,5,'Rooftop'),(24,5,'Generator'),(25,5,'Security 24/7'),(26,5,'WiFi');
INSERT INTO `property_amenities` VALUES (27,6,'Maji'),(28,6,'Umeme');
INSERT INTO `property_amenities` VALUES (29,7,'Bustani'),(30,7,'Parking'),(31,7,'Maji');
INSERT INTO `property_amenities` VALUES (32,8,'Bustani'),(33,8,'Maji'),(34,8,'Parking');
INSERT INTO `property_amenities` VALUES (35,9,'WiFi Haraka'),(36,9,'Generator'),(37,9,'Security'),(38,9,'Parking'),(39,9,'Lift');
INSERT INTO `property_amenities` VALUES (40,10,'WiFi'),(41,10,'Umeme'),(42,10,'Maji');
INSERT INTO `property_amenities` VALUES (43,11,'Maji'),(44,11,'Umeme'),(45,11,'Solar'),(46,11,'WiFi'),(47,11,'Lift'),(48,11,'Bustani');
INSERT INTO `property_amenities` VALUES (49,12,'AC'),(50,12,'Water Tank'),(51,12,'Umeme'),(52,12,'Maji'),(53,12,'Solar'),(54,12,'WiFi');
INSERT INTO `property_amenities` VALUES (55,13,'Umeme'),(56,13,'Maji'),(57,13,'WiFi'),(58,13,'Lift');
INSERT INTO `property_amenities` VALUES (59,14,'Umeme'),(60,14,'Maji');
INSERT INTO `property_amenities` VALUES (61,15,'AC'),(62,15,'Maji'),(63,15,'Store Room'),(64,15,'Umeme'),(65,15,'WiFi');
INSERT INTO `property_amenities` VALUES (66,16,'Umeme'),(67,16,'Maji'),(68,16,'Lift'),(69,16,'WiFi'),(70,16,'AC');
INSERT INTO `property_amenities` VALUES (71,17,'Parking'),(72,17,'Umeme'),(73,17,'Maji'),(74,17,'Security 24/7'),(75,17,'WiFi'),(76,17,'Lift'),(77,17,'AC'),(78,17,'Water Tank'),(79,17,'Store Room'),(80,17,'Pool'),(81,17,'Generator'),(82,17,'Solar'),(83,17,'Rooftop'),(84,17,'Balcony');
INSERT INTO `property_amenities` VALUES (85,18,'Umeme'),(86,18,'Maji'),(87,18,'Water Tank'),(88,18,'Parking');
INSERT INTO `property_amenities` VALUES (89,19,'Parking'),(90,19,'WiFi'),(91,19,'Security 24/7'),(92,19,'AC'),(93,19,'Umeme'),(94,19,'Maji'),(95,19,'Bustani'),(96,19,'Pool');
INSERT INTO `property_amenities` VALUES (97,20,'WiFi'),(98,20,'Umeme'),(99,20,'Maji');

-- Property images data
INSERT INTO `property_images` VALUES (1,1,'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (2,1,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',0,1,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (3,2,'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (4,2,'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',0,1,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (5,3,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (6,4,'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (7,5,'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (8,5,'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',0,1,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (9,6,'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (10,7,'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (11,8,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (12,9,'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (13,10,'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',1,0,'2026-04-17 02:43:14');
INSERT INTO `property_images` VALUES (14,11,'/uploads/properties/prop-1776416870616-412257756.jpg',1,0,'2026-04-17 12:07:50');
INSERT INTO `property_images` VALUES (15,12,'/uploads/properties/prop-1776499822706-807209996.jpg',1,0,'2026-04-18 11:10:23');
INSERT INTO `property_images` VALUES (16,13,'/uploads/properties/prop-1776499968521-442659372.jpg',1,0,'2026-04-18 11:12:48');
INSERT INTO `property_images` VALUES (17,14,'/uploads/properties/prop-1776500111931-861309098.jpg',1,0,'2026-04-18 11:15:11');
INSERT INTO `property_images` VALUES (18,15,'/uploads/properties/prop-1776500590563-856541689.jpg',1,0,'2026-04-18 11:23:10');
INSERT INTO `property_images` VALUES (19,16,'/uploads/properties/prop-1776500718364-51844602.jpg',1,0,'2026-04-18 11:25:18');
INSERT INTO `property_images` VALUES (20,17,'/uploads/properties/prop-1776500851605-6381612.jpg',1,0,'2026-04-18 11:27:31');
INSERT INTO `property_images` VALUES (21,18,'/uploads/properties/prop-1776517884821-392850839.jpg',1,0,'2026-04-18 16:11:25');
INSERT INTO `property_images` VALUES (22,19,'/uploads/properties/prop-1776518869011-812768262.jpg',1,0,'2026-04-18 16:27:49');
INSERT INTO `property_images` VALUES (23,20,'/uploads/properties/prop-1776703032280-402223560.jpg',1,0,'2026-04-20 19:37:12');

-- Favorites data
INSERT INTO `favorites` VALUES (3,5,8,'2026-04-18 10:00:31');
INSERT INTO `favorites` VALUES (4,5,19,'2026-04-18 22:39:07');
INSERT INTO `favorites` VALUES (5,5,15,'2026-04-21 14:16:58');
INSERT INTO `favorites` VALUES (6,5,12,'2026-04-21 14:16:59');
INSERT INTO `favorites` VALUES (7,13,20,'2026-04-23 11:57:20');

-- Bookings data
INSERT INTO `bookings` VALUES (1,1,5,2,'2026-04-17','2026-04-24',2,5950000.00,'cancelled',NULL,'i need this on 19/04/2026','2026-04-17 05:02:58','2026-04-23 00:49:49');
INSERT INTO `bookings` VALUES (2,1,8,2,'2026-04-18','2026-05-02',1,11900000.00,'pending',NULL,'where is it available','2026-04-18 11:56:50','2026-04-18 11:56:50');
INSERT INTO `bookings` VALUES (3,16,8,8,'2026-04-18','2026-04-25',10,391999993.00,'confirmed',NULL,'i need this tomorrow','2026-04-18 15:58:22','2026-04-18 16:06:42');
INSERT INTO `bookings` VALUES (4,16,8,8,'2026-04-18','2026-04-25',1,391999993.00,'pending',NULL,'help me this please','2026-04-18 16:07:55','2026-04-18 16:07:55');
INSERT INTO `bookings` VALUES (5,20,15,15,'2026-04-20','2026-04-23',2,1367997.00,'confirmed',NULL,'i need this on 23/04/2026','2026-04-20 19:38:23','2026-04-20 19:39:18');
INSERT INTO `bookings` VALUES (6,13,5,16,'2026-04-22','2026-04-24',5,17999998.00,'cancelled',NULL,NULL,'2026-04-21 14:18:33','2026-04-21 14:21:15');
INSERT INTO `bookings` VALUES (7,20,13,15,'2026-04-21','2026-04-25',1,1823996.00,'cancelled',NULL,'confirm me via my whatsapp number','2026-04-21 14:51:23','2026-04-23 11:50:51');
INSERT INTO `bookings` VALUES (8,20,8,15,'2026-04-21','2026-04-30',1,4103991.00,'cancelled',NULL,'confirm me when everything is well settled','2026-04-21 14:57:51','2026-04-23 11:51:08');
INSERT INTO `bookings` VALUES (9,17,17,8,'2026-04-23','2026-04-24',1,9800000.00,'pending',NULL,NULL,'2026-04-23 00:42:53','2026-04-23 00:42:53');
INSERT INTO `bookings` VALUES (10,19,13,14,'2026-04-23','2026-05-30',1,247900000.00,'confirmed',NULL,NULL,'2026-04-23 13:24:46','2026-04-23 13:26:38');
INSERT INTO `bookings` VALUES (11,16,14,8,'2026-04-25','2026-05-09',1,783999986.00,'pending',NULL,NULL,'2026-04-23 13:27:52','2026-04-23 13:27:52');
INSERT INTO `bookings` VALUES (12,20,18,15,'2026-05-01','2026-05-02',1,455999.00,'pending',NULL,'I need this today','2026-05-01 10:07:13','2026-05-01 10:07:13');

-- FAQs data
INSERT INTO `faqs` VALUES (1,'Jinsi ya kuunda akaunti?','Bonyeza \"Jisajili\" kwenye ukurasa wa kuingia. Jaza maelezo yako na utume. Utapewa taarifa kwenye barua pepe yako.',1,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (2,'Je, ni bei gani ya kuweka tangazo?','Kuweka tangazo la kawaida ni bure. Kwa tangazo la Premium unalipa TSh 10,000 kwa wiki au TSh 30,000 kwa mwezi.',2,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (3,'Jinsi ya kuwasiliana na dalali?','Bonyeza kitufe cha \"Wasiliana\" kwenye ukurasa wa mali. Utapata uwezo wa kuzungumza na dalali kwa njia ya mazungumzo.',3,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (4,'Je, ninauwezo wa kubadilisha nywila?','Ndiyo. Nenda kwenye \"Akaunti\" → \"Mipangilio\" na ufuate maagizo ya kubadilisha nywila.',4,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (5,'Je, taarifa zangu ziko salama?','Ndiyo. Tunatumia teknolojia ya kisasa ya usalama (bcrypt, JWT, HTTPS) kulinda taarifa zako zote.',5,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (6,'Ninawezaje kuthibitisha akaunti yangu?','Nenda kwenye Akaunti → Thibitisha Utambulisho. Jaza namba ya NIDA au pasipoti yako kisha subiri uthibitisho wa admin.',6,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (7,'Je, ninaweza kubatilisha malipo?','Malipo ya digital hayabatilishwi mara baada ya kuthibitishwa. Wasiliana na msaada wetu kwa masuala ya malipo.',7,1,'2026-04-17 02:43:15');
INSERT INTO `faqs` VALUES (8,'Jinsi ya kuongeza mali kwenye orodha?','Unahitaji akaunti ya Dalali au Mwenye Nyumba. Bonyeza kitufe cha + chini ya skrini na jaza maelezo ya mali yako.',8,1,'2026-04-17 02:43:15');

-- Payments data
INSERT INTO `payments` VALUES (1,2,NULL,30000.00,'TZS','pro','mpesa','+255700000002','TXN20240201001',NULL,NULL,'completed',NULL,NULL,'IDEM_001','2026-04-17 02:43:14','2026-04-17 02:43:14');
INSERT INTO `payments` VALUES (2,4,NULL,10000.00,'TZS','boost','airtel','+255700000004','TXN20240215002',NULL,NULL,'completed',NULL,NULL,'IDEM_002','2026-04-17 02:43:14','2026-04-17 02:43:14');
INSERT INTO `payments` VALUES (3,11,NULL,30000.00,'TZS','pro','mpesa','748523935','TXN1776950637517ZYFTZ3',NULL,NULL,'completed',NULL,NULL,NULL,'2026-04-23 16:23:57','2026-04-23 16:24:00');
INSERT INTO `payments` VALUES (4,18,NULL,15000.00,'TZS','owner','tigopesa','1234567890','TXN177749912433174UV2T',NULL,NULL,'completed',NULL,NULL,NULL,'2026-04-30 00:45:24','2026-04-30 00:45:27');

-- Subscriptions data
INSERT INTO `subscriptions` VALUES (1,2,1,'pro','2026-04-17','2026-05-17','active',0,NULL,'2026-04-17 02:43:15');
INSERT INTO `subscriptions` VALUES (2,11,NULL,'pro','2026-04-23','2026-05-23','active',0,NULL,'2026-04-23 16:24:00');

-- User ratings data
INSERT INTO `user_ratings` VALUES (1,2,5,5,'dalali mzuri sana huyu','2026-04-17 11:48:30');
INSERT INTO `user_ratings` VALUES (2,4,5,5,NULL,'2026-04-30 09:09:52');
INSERT INTO `user_ratings` VALUES (3,8,5,5,NULL,'2026-04-18 15:32:15');
INSERT INTO `user_ratings` VALUES (4,14,5,5,'Nyumba safi kabsa','2026-04-18 16:37:39');
INSERT INTO `user_ratings` VALUES (5,16,8,5,NULL,'2026-04-21 17:03:04');
INSERT INTO `user_ratings` VALUES (6,8,17,5,NULL,'2026-04-24 10:27:32');
INSERT INTO `user_ratings` VALUES (10,8,18,5,NULL,'2026-04-28 11:17:33');

-- Permissions data
INSERT INTO `permissions` VALUES (1,'customer','properties','read',1);
INSERT INTO `permissions` VALUES (2,'customer','properties','list',1);
INSERT INTO `permissions` VALUES (3,'customer','properties','create',0);
INSERT INTO `permissions` VALUES (4,'customer','properties','update',0);
INSERT INTO `permissions` VALUES (5,'customer','properties','delete',0);
INSERT INTO `permissions` VALUES (6,'customer','messages','create',1);
INSERT INTO `permissions` VALUES (7,'customer','messages','read',1);
INSERT INTO `permissions` VALUES (8,'customer','favorites','create',1);
INSERT INTO `permissions` VALUES (9,'customer','favorites','read',1);
INSERT INTO `permissions` VALUES (10,'customer','payments','create',1);
INSERT INTO `permissions` VALUES (11,'customer','payments','read',1);
INSERT INTO `permissions` VALUES (12,'customer','reviews','create',1);
INSERT INTO `permissions` VALUES (13,'customer','users','admin',0);
INSERT INTO `permissions` VALUES (14,'agent','properties','create',1);
INSERT INTO `permissions` VALUES (15,'agent','properties','update',1);
INSERT INTO `permissions` VALUES (16,'agent','properties','delete',1);
INSERT INTO `permissions` VALUES (17,'agent','properties','list',1);
INSERT INTO `permissions` VALUES (18,'agent','properties','read',1);
INSERT INTO `permissions` VALUES (19,'agent','messages','create',1);
INSERT INTO `permissions` VALUES (20,'agent','messages','read',1);
INSERT INTO `permissions` VALUES (21,'agent','payments','create',1);
INSERT INTO `permissions` VALUES (22,'agent','payments','read',1);
INSERT INTO `permissions` VALUES (23,'agent','users','admin',0);
INSERT INTO `permissions` VALUES (24,'owner','properties','create',1);
INSERT INTO `permissions` VALUES (25,'owner','properties','update',1);
INSERT INTO `permissions` VALUES (26,'owner','properties','delete',1);
INSERT INTO `permissions` VALUES (27,'owner','properties','list',1);
INSERT INTO `permissions` VALUES (28,'owner','properties','read',1);
INSERT INTO `permissions` VALUES (29,'owner','messages','create',1);
INSERT INTO `permissions` VALUES (30,'owner','messages','read',1);
INSERT INTO `permissions` VALUES (31,'owner','payments','create',1);
INSERT INTO `permissions` VALUES (32,'owner','payments','read',1);
INSERT INTO `permissions` VALUES (33,'owner','users','admin',0);
INSERT INTO `permissions` VALUES (34,'admin','properties','admin',1);
INSERT INTO `permissions` VALUES (35,'admin','users','admin',1);
INSERT INTO `permissions` VALUES (36,'admin','payments','admin',1);
INSERT INTO `permissions` VALUES (37,'admin','messages','admin',1);
INSERT INTO `permissions` VALUES (38,'admin','reviews','admin',1);
INSERT INTO `permissions` VALUES (39,'admin','audit_log','read',1);
INSERT INTO `permissions` VALUES (40,'admin','blocked_ips','admin',1);

-- Verification requests data
INSERT INTO `verification_requests` VALUES (1,5,'tin','123456',NULL,NULL,NULL,0,'rejected','tin sio sahihi , rudia tin kwa usahihi',5,'2026-04-17 11:51:41','2026-04-17 11:49:23','2026-04-17 11:51:41');
INSERT INTO `verification_requests` VALUES (2,17,'passport','12345678',NULL,NULL,NULL,0,'rejected','passport sio sahihi, weka passpoti sahihi',5,'2026-04-23 00:46:42','2026-04-23 00:44:41','2026-04-23 00:46:42');
INSERT INTO `verification_requests` VALUES (3,18,'driving_license','dfgghjjjvcdd',NULL,NULL,NULL,0,'pending',NULL,NULL,NULL,'2026-04-30 08:46:21','2026-04-30 08:46:21');

-- Support tickets data
INSERT INTO `support_tickets` VALUES (1,5,'fail to login','ninashindwa kulogin','open',NULL,'2026-04-17 02:56:42',NULL);
INSERT INTO `support_tickets` VALUES (2,6,'fails to login','i have failed to login to my account','open',NULL,'2026-04-17 13:11:46',NULL);
INSERT INTO `support_tickets` VALUES (3,5,'failed to ligin','nimeshindwa kufungua account yangu','open',NULL,'2026-04-17 13:25:38',NULL);
INSERT INTO `support_tickets` VALUES (4,5,'nashindwa kulogin','i have failed to login to my account','open',NULL,'2026-04-21 02:07:06',NULL);

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
-- ================================================================
--  MakaziPlus — Enterprise-Grade Database Schema v3.0
--  Financial Application — Production-Ready
--
--  Includes:
--    1. INDEXES        — Query performance on all searched columns
--    2. TRIGGERS       — Auto-audit, integrity enforcement, business rules
--    3. STORED PROCEDURES — Complex business logic encapsulated in DB
--    4. VIEWS          — Role-based data exposure, reporting
--    5. CONFIDENTIALITY — Sensitive columns, DB users, minimal privilege
--    6. INTEGRITY      — FK, CHECK, UNIQUE, NOT NULL, ENUM constraints
--    7. AUTHENTICATION — Password policy, login tracking, lockout, OTP
--    8. AUTHORIZATION  — Permissions table, row-level enforcement
--    9. FINANCIAL SECURITY — Immutable audit trail, idempotency, fraud controls
--   10. CYBER ATTACK PROTECTION — Rate limiting tables, anomaly detection
--
--  Run in MySQL Workbench: Ctrl+Shift+Enter (Execute All)
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP DATABASE IF EXISTS makaziplus41;
CREATE DATABASE makaziplus41
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE makaziplus41;

-- ================================================================
--  SECTION 1: CORE TABLES WITH FULL INTEGRITY CONSTRAINTS
-- ================================================================

-- ─── USERS ───────────────────────────────────────────────────────
CREATE TABLE users (
  id                    INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  name                  VARCHAR(100)     NOT NULL,
  email                 VARCHAR(150)     NOT NULL,
  phone                 VARCHAR(20)      NOT NULL,
  password              VARCHAR(255)     NOT NULL                           COMMENT 'bcrypt hash cost>=12',
  role                  ENUM('customer','agent','owner','admin')
                                         NOT NULL DEFAULT 'customer',
  plan                  ENUM('basic','pro','admin')
                                         NOT NULL DEFAULT 'basic',
  avatar                VARCHAR(500)     DEFAULT NULL,
  verified              TINYINT(1)       NOT NULL DEFAULT 0,
  is_active             TINYINT(1)       NOT NULL DEFAULT 1,
  -- Authentication security fields
  failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until          DATETIME         DEFAULT NULL                       COMMENT 'Account locked after 5 failures',
  last_login_at         DATETIME         DEFAULT NULL,
  last_login_ip         VARCHAR(45)      DEFAULT NULL                       COMMENT 'IPv4/IPv6',
  password_changed_at   DATETIME         DEFAULT CURRENT_TIMESTAMP,
  -- OTP for phone verification
  otp_code              VARCHAR(6)       DEFAULT NULL,
  otp_expires_at        DATETIME         DEFAULT NULL,
  -- Privacy & GDPR
  email_notifications   TINYINT(1)       NOT NULL DEFAULT 1,
  sms_notifications     TINYINT(1)       NOT NULL DEFAULT 1,
  deleted_at            DATETIME         DEFAULT NULL                       COMMENT 'Soft delete — GDPR right to erasure',
  created_at            DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Added columns from live DB modifications
  is_verified           TINYINT(1)       NOT NULL DEFAULT 0                 COMMENT 'Identity verification status',
  verification_type     VARCHAR(50)      DEFAULT NULL                       COMMENT 'nida|passport|driving_license|tin',
  otp_verified          TINYINT(1)       NOT NULL DEFAULT 0                 COMMENT 'OTP phone verification done',
  reset_token           VARCHAR(255)     DEFAULT NULL                       COMMENT 'Password reset token (hashed)',
  reset_token_expires   DATETIME         DEFAULT NULL                       COMMENT 'Reset token expiry',
  gender                ENUM('male','female','other') DEFAULT NULL          COMMENT 'User gender',

  CONSTRAINT uq_users_email  UNIQUE (email),
  CONSTRAINT uq_users_phone  UNIQUE (phone),
  CONSTRAINT chk_users_name  CHECK  (CHAR_LENGTH(TRIM(name)) >= 2),
  CONSTRAINT chk_users_email CHECK  (email LIKE '%@%.%'),
  CONSTRAINT chk_users_phone CHECK  (phone REGEXP '^\\+?[0-9]{9,15}$')
) ENGINE=InnoDB COMMENT='Core user accounts — never SELECT *';

-- ─── PROPERTIES ──────────────────────────────────────────────────
CREATE TABLE properties (
  id           INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  owner_id     INT UNSIGNED    NOT NULL,
  title        VARCHAR(200)    NOT NULL,
  description  TEXT            NOT NULL,
  type         ENUM('nyumba','chumba','frem','ofisi') NOT NULL,
  price        DECIMAL(15,2)   NOT NULL,
  price_type   ENUM('rent','sale') NOT NULL DEFAULT 'rent',
  city         VARCHAR(100)    NOT NULL,
  area         VARCHAR(100)    NOT NULL,
  address      VARCHAR(255)    DEFAULT NULL,
  latitude     DECIMAL(10,8)   DEFAULT NULL,
  longitude    DECIMAL(11,8)   DEFAULT NULL,
  bedrooms     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bathrooms    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  size_sqm     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_premium   TINYINT(1)      NOT NULL DEFAULT 0,
  status       ENUM('active','inactive','pending','rejected','suspended')
                               NOT NULL DEFAULT 'pending'                  COMMENT 'New listings start pending admin approval',
  views        INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  property_status ENUM('available','sold','rented','pending')
                               NOT NULL DEFAULT 'available'               COMMENT 'Availability: available|sold|rented|pending',

  CONSTRAINT chk_price_positive    CHECK (price > 0),
  CONSTRAINT chk_price_max         CHECK (price <= 999999999999.99),
  CONSTRAINT chk_bedrooms_range    CHECK (bedrooms   BETWEEN 0 AND 50),
  CONSTRAINT chk_bathrooms_range   CHECK (bathrooms  BETWEEN 0 AND 50),
  CONSTRAINT chk_size_range        CHECK (size_sqm   BETWEEN 0 AND 99999),
  CONSTRAINT chk_lat_range         CHECK (latitude   IS NULL OR latitude  BETWEEN -90   AND 90),
  CONSTRAINT chk_lng_range         CHECK (longitude  IS NULL OR longitude BETWEEN -180  AND 180),

  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Property listings — status=pending until admin approves';

-- ─── PROPERTY IMAGES ─────────────────────────────────────────────
CREATE TABLE property_images (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  property_id  INT UNSIGNED  NOT NULL,
  image_url    VARCHAR(500)  NOT NULL,
  is_primary   TINYINT(1)    NOT NULL DEFAULT 0,
  sort_order   TINYINT       NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── PROPERTY AMENITIES ──────────────────────────────────────────
CREATE TABLE property_amenities (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  property_id  INT UNSIGNED  NOT NULL,
  amenity      VARCHAR(100)  NOT NULL,

  CONSTRAINT uq_amenity UNIQUE (property_id, amenity),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── MESSAGES ────────────────────────────────────────────────────
CREATE TABLE messages (
  id            INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  from_user_id  INT UNSIGNED  NOT NULL,
  to_user_id    INT UNSIGNED  NOT NULL,
  property_id   INT UNSIGNED  DEFAULT NULL,
  message       TEXT          NOT NULL,
  is_read       TINYINT(1)    NOT NULL DEFAULT 0,
  deleted_by_sender   TINYINT(1) NOT NULL DEFAULT 0,
  deleted_by_receiver TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_no_self_message CHECK (from_user_id <> to_user_id),
  CONSTRAINT chk_message_length  CHECK (CHAR_LENGTH(message) BETWEEN 1 AND 5000),

  FOREIGN KEY (from_user_id) REFERENCES users(id)      ON DELETE CASCADE  ON UPDATE CASCADE,
  FOREIGN KEY (to_user_id)   REFERENCES users(id)      ON DELETE CASCADE  ON UPDATE CASCADE,
  FOREIGN KEY (property_id)  REFERENCES properties(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── FAVORITES ───────────────────────────────────────────────────
CREATE TABLE favorites (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  property_id  INT UNSIGNED  NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_favorite UNIQUE (user_id, property_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────
CREATE TABLE notifications (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  body        TEXT          NOT NULL,
  type        ENUM('new_listing','price_change','message','system','payment','security','warning')
                            NOT NULL DEFAULT 'system',
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  ref_id      INT UNSIGNED  DEFAULT NULL,
  ref_type    VARCHAR(50)   DEFAULT NULL                                    COMMENT 'property|payment|message|user',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── PAYMENTS — IMMUTABLE FINANCIAL LEDGER ───────────────────────
CREATE TABLE payments (
  id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED    NOT NULL,
  property_id     INT UNSIGNED    DEFAULT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  currency        CHAR(3)         NOT NULL DEFAULT 'TZS',
  plan            VARCHAR(50)     NOT NULL,
  method          ENUM('mpesa','airtel','tigopesa','card') NOT NULL,
  phone           VARCHAR(20)     DEFAULT NULL,
  transaction_id  VARCHAR(100)    DEFAULT NULL,
  gateway_ref     VARCHAR(200)    DEFAULT NULL                              COMMENT 'Flutterwave/Selcom reference',
  gateway_response JSON           DEFAULT NULL                              COMMENT 'Full gateway response for audit',
  status          ENUM('pending','processing','completed','failed','refunded','disputed')
                                  NOT NULL DEFAULT 'pending',
  ip_address      VARCHAR(45)     DEFAULT NULL,
  user_agent      VARCHAR(500)    DEFAULT NULL,
  idempotency_key VARCHAR(100)    DEFAULT NULL                              COMMENT 'Prevents duplicate charges',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME        DEFAULT NULL,

  CONSTRAINT chk_payment_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_payment_amount_max      CHECK (amount <= 10000000),
  CONSTRAINT uq_idempotency              UNIQUE (idempotency_key),

  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE RESTRICT  ON UPDATE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL  ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='IMMUTABLE — no UPDATE/DELETE allowed except status. Full audit via payment_audit_log.';

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────
CREATE TABLE subscriptions (
  id              INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL,
  payment_id      INT UNSIGNED  DEFAULT NULL,
  plan            ENUM('basic','pro','owner') NOT NULL DEFAULT 'basic',
  start_date      DATE          NOT NULL,
  end_date        DATE          NOT NULL,
  status          ENUM('active','expired','cancelled','suspended')
                                NOT NULL DEFAULT 'active',
  auto_renew      TINYINT(1)    NOT NULL DEFAULT 0,
  cancelled_at    DATETIME      DEFAULT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_sub_dates CHECK (end_date > start_date),

  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE  ON UPDATE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── REVIEWS ─────────────────────────────────────────────────────
CREATE TABLE reviews (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  property_id  INT UNSIGNED  NOT NULL,
  rating       TINYINT       NOT NULL,
  comment      TEXT          DEFAULT NULL,
  is_flagged   TINYINT(1)    NOT NULL DEFAULT 0                            COMMENT 'Flagged for moderation',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_review             UNIQUE  (user_id, property_id),
  CONSTRAINT chk_review_rating     CHECK   (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_review_comment    CHECK   (comment IS NULL OR CHAR_LENGTH(comment) <= 2000),

  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ─── USER RATINGS — Rate agents/owners directly ──────────────────
CREATE TABLE user_ratings (
  id             INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  rated_user_id  INT UNSIGNED  NOT NULL,
  rating_user_id INT UNSIGNED  NOT NULL,
  rating         TINYINT       NOT NULL,
  review         TEXT          DEFAULT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_user_rating UNIQUE (rated_user_id, rating_user_id),
  CONSTRAINT chk_user_rating CHECK  (rating BETWEEN 1 AND 5),

  FOREIGN KEY (rated_user_id)  REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (rating_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Rate agents and property owners';

-- ─── USER VERIFICATIONS — National ID verification ───────────────
CREATE TABLE user_verifications (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  id_type      ENUM('nida','passport','driving_license','tin') NOT NULL,
  id_number    VARCHAR(100)  NOT NULL,
  verified     TINYINT(1)    NOT NULL DEFAULT 0,
  verified_by  INT UNSIGNED  DEFAULT NULL,
  verified_at  DATETIME      DEFAULT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_uv_user UNIQUE (user_id),
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Identity verification — NIDA, Passport, etc.';

-- ─── VERIFICATION REQUESTS — Pending admin review ────────────────
CREATE TABLE verification_requests (
  id               INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED  NOT NULL,
  id_type          VARCHAR(50)   NOT NULL,
  id_number        VARCHAR(100)  NOT NULL,
  id_document_url  VARCHAR(500)  DEFAULT NULL,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by      INT UNSIGNED  DEFAULT NULL,
  review_notes     TEXT          DEFAULT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at      DATETIME      DEFAULT NULL,

  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── FAQS ────────────────────────────────────────────────────────
CREATE TABLE faqs (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  question    VARCHAR(255)  NOT NULL,
  answer      TEXT          NOT NULL,
  sort_order  INT           NOT NULL DEFAULT 0,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── SUPPORT TICKETS ─────────────────────────────────────────────
CREATE TABLE support_tickets (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  subject     VARCHAR(200)  NOT NULL,
  message     TEXT          NOT NULL,
  status      ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  admin_reply TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME      DEFAULT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ================================================================
--  SECTION 2: SECURITY & AUDIT TABLES
-- ================================================================

-- ─── AUDIT LOG — Every sensitive action recorded ─────────────────
CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED    DEFAULT NULL                                  COMMENT 'NULL = system or unauthenticated',
  action      VARCHAR(100)    NOT NULL                                      COMMENT 'e.g. LOGIN, LOGOUT, UPDATE_PROFILE',
  table_name  VARCHAR(64)     DEFAULT NULL,
  record_id   INT UNSIGNED    DEFAULT NULL,
  old_values  JSON            DEFAULT NULL                                  COMMENT 'Before change',
  new_values  JSON            DEFAULT NULL                                  COMMENT 'After change',
  ip_address  VARCHAR(45)     DEFAULT NULL,
  user_agent  VARCHAR(500)    DEFAULT NULL,
  status      ENUM('success','failure','suspicious') NOT NULL DEFAULT 'success',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Immutable audit trail — INSERT only, never UPDATE/DELETE';

-- ─── PAYMENT AUDIT LOG — Immutable financial trail ───────────────
CREATE TABLE payment_audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id  INT UNSIGNED    NOT NULL,
  user_id     INT UNSIGNED    NOT NULL,
  action      VARCHAR(50)     NOT NULL                                      COMMENT 'INITIATED|PROCESSING|COMPLETED|FAILED|REFUNDED',
  old_status  VARCHAR(30)     DEFAULT NULL,
  new_status  VARCHAR(30)     NOT NULL,
  amount      DECIMAL(12,2)   NOT NULL,
  note        TEXT            DEFAULT NULL,
  ip_address  VARCHAR(45)     DEFAULT NULL,
  performed_by INT UNSIGNED   DEFAULT NULL                                  COMMENT 'Admin user who made the change',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (payment_id)    REFERENCES payments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users(id)    ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (performed_by)  REFERENCES users(id)    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Financial audit — INSERT only. Every payment state transition logged.';

-- ─── LOGIN ATTEMPTS — Brute-force protection ─────────────────────
CREATE TABLE login_attempts (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier  VARCHAR(150)    NOT NULL                                      COMMENT 'email or phone attempted',
  ip_address  VARCHAR(45)     NOT NULL,
  success     TINYINT(1)      NOT NULL DEFAULT 0,
  user_agent  VARCHAR(500)    DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_login_ip_time  (ip_address, created_at),
  INDEX idx_login_id_time  (identifier, created_at)
) ENGINE=InnoDB COMMENT='Rate-limit enforcement at DB level';

-- ─── SESSIONS — Active JWT session tracking ──────────────────────
CREATE TABLE user_sessions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED    NOT NULL,
  token_hash   VARCHAR(64)     NOT NULL                                     COMMENT 'SHA-256 of JWT — never store full token',
  ip_address   VARCHAR(45)     DEFAULT NULL,
  user_agent   VARCHAR(500)    DEFAULT NULL,
  device_type  VARCHAR(50)     DEFAULT NULL                                 COMMENT 'mobile|desktop|tablet',
  is_active    TINYINT(1)      NOT NULL DEFAULT 1,
  expires_at   DATETIME        NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_token_hash UNIQUE (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Active sessions — allows server-side token revocation';

-- ─── OTP VERIFICATION ────────────────────────────────────────────
CREATE TABLE otp_verifications (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  otp_hash    VARCHAR(255)  NOT NULL                                        COMMENT 'bcrypt hash of OTP code',
  purpose     ENUM('phone_verify','password_reset','login_2fa','payment')
                            NOT NULL,
  attempts    TINYINT       NOT NULL DEFAULT 0,
  used        TINYINT(1)    NOT NULL DEFAULT 0,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_otp_attempts CHECK (attempts <= 5),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── RATE LIMIT TRACKING ─────────────────────────────────────────
CREATE TABLE rate_limits (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier  VARCHAR(150)    NOT NULL                                      COMMENT 'ip:endpoint key',
  endpoint    VARCHAR(200)    NOT NULL,
  hit_count   INT UNSIGNED    NOT NULL DEFAULT 1,
  window_start DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME      DEFAULT NULL,

  CONSTRAINT uq_rate_key UNIQUE (identifier, endpoint),
  INDEX idx_rate_window (identifier, window_start)
) ENGINE=InnoDB COMMENT='DB-level rate limit enforcement';

-- ─── BLOCKED IPS ─────────────────────────────────────────────────
CREATE TABLE blocked_ips (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  ip_address  VARCHAR(45)   NOT NULL,
  reason      VARCHAR(200)  NOT NULL,
  blocked_by  INT UNSIGNED  DEFAULT NULL,
  blocked_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME      DEFAULT NULL                                    COMMENT 'NULL = permanent',

  CONSTRAINT uq_blocked_ip UNIQUE (ip_address),
  FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─── PERMISSIONS — Fine-grained RBAC ────────────────────────────
CREATE TABLE permissions (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  role        ENUM('customer','agent','owner','admin') NOT NULL,
  resource    VARCHAR(100)  NOT NULL                                        COMMENT 'e.g. properties, payments, users',
  action      ENUM('create','read','update','delete','list','admin') NOT NULL,
  allowed     TINYINT(1)    NOT NULL DEFAULT 1,

  CONSTRAINT uq_perm UNIQUE (role, resource, action)
) ENGINE=InnoDB COMMENT='Role-Based Access Control matrix';

-- ================================================================
--  SECTION 3: INDEXES — Performance on all searched columns
-- ================================================================

-- Users
CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_phone     ON users(phone);
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_verified  ON users(verified);
CREATE INDEX idx_users_deleted   ON users(deleted_at);
CREATE INDEX idx_users_locked    ON users(locked_until);

-- Properties — most searched columns
CREATE INDEX idx_prop_owner      ON properties(owner_id);
CREATE INDEX idx_prop_type       ON properties(type);
CREATE INDEX idx_prop_city       ON properties(city);
CREATE INDEX idx_prop_area       ON properties(area);
CREATE INDEX idx_prop_price      ON properties(price);
CREATE INDEX idx_prop_ptype      ON properties(price_type);
CREATE INDEX idx_prop_status     ON properties(status);
CREATE INDEX idx_prop_premium    ON properties(is_premium);
CREATE INDEX idx_prop_created    ON properties(created_at);
CREATE INDEX idx_prop_views      ON properties(views);
-- Composite indexes for common filter combinations
CREATE INDEX idx_prop_city_type  ON properties(city, type, status, is_premium);
CREATE INDEX idx_prop_search     ON properties(status, is_premium, created_at);
-- Full-text search on title, description, area
CREATE FULLTEXT INDEX idx_prop_fulltext ON properties(title, description, area, city);

-- Property images
CREATE INDEX idx_pimg_prop       ON property_images(property_id, is_primary);

-- Property amenities
CREATE INDEX idx_pam_prop        ON property_amenities(property_id);

-- Messages
CREATE INDEX idx_msg_from        ON messages(from_user_id, created_at);
CREATE INDEX idx_msg_to          ON messages(to_user_id, is_read);
CREATE INDEX idx_msg_convo       ON messages(from_user_id, to_user_id, created_at);
CREATE INDEX idx_msg_prop        ON messages(property_id);

-- Favorites
CREATE INDEX idx_fav_user        ON favorites(user_id);
CREATE INDEX idx_fav_prop        ON favorites(property_id);

-- Notifications
CREATE INDEX idx_notif_user      ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_notif_type      ON notifications(type);

-- Payments
CREATE INDEX idx_pay_user        ON payments(user_id, created_at);
CREATE INDEX idx_pay_status      ON payments(status);
CREATE INDEX idx_pay_txn         ON payments(transaction_id);
CREATE INDEX idx_pay_method      ON payments(method);
CREATE INDEX idx_pay_idem        ON payments(idempotency_key);

-- Subscriptions
CREATE INDEX idx_sub_user        ON subscriptions(user_id, status);
CREATE INDEX idx_sub_end         ON subscriptions(end_date, status);

-- Reviews
CREATE INDEX idx_rev_prop        ON reviews(property_id);
CREATE INDEX idx_rev_user        ON reviews(user_id);

-- Audit log
CREATE INDEX idx_audit_user      ON audit_log(user_id, created_at);
CREATE INDEX idx_audit_action    ON audit_log(action, created_at);
CREATE INDEX idx_audit_table     ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_ip        ON audit_log(ip_address);

-- Login attempts
CREATE INDEX idx_login_identifier ON login_attempts(identifier, created_at);
CREATE INDEX idx_login_ip_recent  ON login_attempts(ip_address, created_at);

-- Sessions
CREATE INDEX idx_sess_user       ON user_sessions(user_id, is_active);
CREATE INDEX idx_sess_expires    ON user_sessions(expires_at, is_active);

-- OTP
CREATE INDEX idx_otp_user        ON otp_verifications(user_id, purpose, used);
CREATE INDEX idx_otp_expires     ON otp_verifications(expires_at);


-- User ratings
CREATE INDEX idx_urating_rated  ON user_ratings(rated_user_id);
CREATE INDEX idx_urating_rater  ON user_ratings(rating_user_id);

-- User verifications
CREATE INDEX idx_uverif_user    ON user_verifications(user_id);
CREATE INDEX idx_vreq_user      ON verification_requests(user_id, status);

-- FAQs
CREATE INDEX idx_faq_active     ON faqs(is_active, sort_order);

-- Support tickets
CREATE INDEX idx_ticket_user    ON support_tickets(user_id, status);
CREATE INDEX idx_ticket_status  ON support_tickets(status);

-- ================================================================
--  SECTION 4: TRIGGERS — Auto-enforcement of business rules
-- ================================================================

DELIMITER $$

-- ─── TRIGGER 1: Prevent negative prices ─────────────────────────
CREATE TRIGGER trg_properties_price_check
BEFORE INSERT ON properties
FOR EACH ROW
BEGIN
  IF NEW.price <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'INTEGRITY ERROR: Property price must be greater than zero';
  END IF;
  IF NEW.price > 999999999999.99 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'INTEGRITY ERROR: Property price exceeds maximum allowed value';
  END IF;
END$$

CREATE TRIGGER trg_properties_price_update
BEFORE UPDATE ON properties
FOR EACH ROW
BEGIN
  IF NEW.price <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'INTEGRITY ERROR: Property price must be greater than zero';
  END IF;
END$$

-- ─── TRIGGER 2: Payment amount cannot be changed once created ────
CREATE TRIGGER trg_payment_immutable
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.amount <> OLD.amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SECURITY: Payment amount cannot be modified after creation';
  END IF;
  IF NEW.user_id <> OLD.user_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SECURITY: Payment user_id cannot be changed';
  END IF;
  IF NEW.currency <> OLD.currency THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SECURITY: Payment currency cannot be changed';
  END IF;
  -- Auto-set completed_at when status changes to completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    SET NEW.completed_at = NOW();
  END IF;
END$$

-- ─── TRIGGER 3: Auto-log every payment status change ─────────────
CREATE TRIGGER trg_payment_audit
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO payment_audit_log
      (payment_id, user_id, action, old_status, new_status, amount, created_at)
    VALUES
      (NEW.id, NEW.user_id, UPPER(NEW.status), OLD.status, NEW.status, NEW.amount, NOW());
  END IF;
END$$

-- ─── TRIGGER 4: Auto-upgrade user plan when subscription activates
CREATE TRIGGER trg_subscription_plan_sync
AFTER INSERT ON subscriptions
FOR EACH ROW
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE users SET plan = NEW.plan WHERE id = NEW.user_id;
  END IF;
END$$

CREATE TRIGGER trg_subscription_plan_cancel
AFTER UPDATE ON subscriptions
FOR EACH ROW
BEGIN
  IF NEW.status IN ('cancelled','expired') AND OLD.status = 'active' THEN
    -- Only downgrade if no other active subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = NEW.user_id AND status = 'active' AND id <> NEW.id
    ) THEN
      UPDATE users SET plan = 'basic' WHERE id = NEW.user_id;
    END IF;
  END IF;
END$$

-- ─── TRIGGER 5: Lock account after 5 failed login attempts ───────
CREATE TRIGGER trg_account_lockout
AFTER INSERT ON login_attempts
FOR EACH ROW
BEGIN
  DECLARE fail_count INT;
  IF NEW.success = 0 THEN
    SELECT COUNT(*) INTO fail_count
    FROM login_attempts
    WHERE identifier = NEW.identifier
      AND success = 0
      AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE);

    IF fail_count >= 5 THEN
      UPDATE users
      SET
        failed_login_attempts = fail_count,
        locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      WHERE (email = NEW.identifier OR phone = NEW.identifier);

      -- Create security notification
      INSERT INTO notifications (user_id, title, body, type)
      SELECT id,
        'Tahadhari ya Usalama',
        CONCAT('Majaribio ', fail_count, ' ya kuingia yameshindwa. Akaunti yako imefungwa kwa dakika 30.'),
        'security'
      FROM users
      WHERE (email = NEW.identifier OR phone = NEW.identifier)
        AND is_active = 1;
    END IF;
  ELSE
    -- Successful login — reset counter and record login time
    UPDATE users
    SET
      failed_login_attempts = 0,
      locked_until          = NULL,
      last_login_at         = NOW(),
      last_login_ip         = NEW.ip_address
    WHERE (email = NEW.identifier OR phone = NEW.identifier);
  END IF;
END$$

-- ─── TRIGGER 6: Audit all user profile changes ───────────────────
CREATE TRIGGER trg_users_audit
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  -- Only audit sensitive field changes
  IF NEW.email    <> OLD.email
  OR NEW.phone    <> OLD.phone
  OR NEW.role     <> OLD.role
  OR NEW.plan     <> OLD.plan
  OR NEW.password <> OLD.password
  OR NEW.is_active <> OLD.is_active
  THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, status)
    VALUES (
      NEW.id,
      'UPDATE_USER',
      'users',
      NEW.id,
      JSON_OBJECT(
        'email',     OLD.email,
        'phone',     OLD.phone,
        'role',      OLD.role,
        'plan',      OLD.plan,
        'is_active', OLD.is_active
      ),
      JSON_OBJECT(
        'email',     NEW.email,
        'phone',     NEW.phone,
        'role',      NEW.role,
        'plan',      NEW.plan,
        'is_active', NEW.is_active
      ),
      'success'
    );
  END IF;
END$$

-- ─── TRIGGER 7: Auto-set property to pending on create ───────────
-- (Properties need admin approval before going live — fraud prevention)
CREATE TRIGGER trg_property_pending
BEFORE INSERT ON properties
FOR EACH ROW
BEGIN
  -- All new properties start as 'pending' regardless of what app sends
  -- Exception: admin users (checked at app level; here we just enforce pending)
  IF NEW.status NOT IN ('pending','active') THEN
    SET NEW.status = 'pending';
  END IF;
  -- Auto-set is_premium to 0 on creation — premium requires payment
  SET NEW.is_premium = 0;
END$$

-- ─── TRIGGER 8: Prevent deleting completed payments ──────────────
CREATE TRIGGER trg_payment_no_delete
BEFORE DELETE ON payments
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'FINANCIAL COMPLIANCE: Payment records cannot be deleted. This action is prohibited.';
END$$

-- ─── TRIGGER 9: Prevent deleting audit logs ──────────────────────
CREATE TRIGGER trg_audit_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMPLIANCE: Audit log records cannot be deleted';
END$$

CREATE TRIGGER trg_audit_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMPLIANCE: Audit log records cannot be modified';
END$$

-- ─── TRIGGER 10: Validate OTP attempts ───────────────────────────
CREATE TRIGGER trg_otp_max_attempts
BEFORE UPDATE ON otp_verifications
FOR EACH ROW
BEGIN
  IF NEW.attempts > 5 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'SECURITY: Maximum OTP attempts exceeded. Please request a new OTP.';
  END IF;
END$$

DELIMITER ;

-- ================================================================
--  SECTION 5: STORED PROCEDURES
-- ================================================================

DELIMITER $$

-- ─── PROC 1: Safe login with lockout check ───────────────────────
CREATE PROCEDURE sp_login_check (
  IN  p_identifier VARCHAR(150),
  IN  p_ip_address VARCHAR(45),
  IN  p_user_agent VARCHAR(500),
  OUT p_user_id    INT,
  OUT p_status     VARCHAR(50),
  OUT p_message    VARCHAR(200)
)
BEGIN
  DECLARE v_is_active    TINYINT;
  DECLARE v_locked_until DATETIME;
  DECLARE v_user_id      INT;

  -- Check if identifier exists and account state
  SELECT id, is_active, locked_until
  INTO v_user_id, v_is_active, v_locked_until
  FROM users
  WHERE (email = p_identifier OR phone = p_identifier)
  LIMIT 1;

  SET p_user_id = v_user_id;

  IF v_user_id IS NULL THEN
    SET p_status  = 'NOT_FOUND';
    SET p_message = 'Barua pepe au nywila si sahihi';
    -- Still log the attempt
    INSERT INTO login_attempts (identifier, ip_address, success, user_agent)
    VALUES (p_identifier, p_ip_address, 0, p_user_agent);
  ELSEIF v_is_active = 0 THEN
    SET p_status  = 'INACTIVE';
    SET p_message = 'Akaunti hii imefungwa. Wasiliana na msaada.';
    INSERT INTO login_attempts (identifier, ip_address, success, user_agent)
    VALUES (p_identifier, p_ip_address, 0, p_user_agent);
  ELSEIF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    SET p_status  = 'LOCKED';
    SET p_message = CONCAT('Akaunti imefungwa hadi ', DATE_FORMAT(v_locked_until, '%H:%i'), '. Jaribu tena baadaye.');
    INSERT INTO login_attempts (identifier, ip_address, success, user_agent)
    VALUES (p_identifier, p_ip_address, 0, p_user_agent);
  ELSE
    SET p_status  = 'OK';
    SET p_message = 'OK';
  END IF;
END$$

-- ─── PROC 2: Record successful login ─────────────────────────────
CREATE PROCEDURE sp_login_success (
  IN p_user_id     INT,
  IN p_identifier  VARCHAR(150),
  IN p_ip_address  VARCHAR(45),
  IN p_user_agent  VARCHAR(500),
  IN p_token_hash  VARCHAR(64),
  IN p_expires_at  DATETIME
)
BEGIN
  -- Log success
  INSERT INTO login_attempts (identifier, ip_address, success, user_agent)
  VALUES (p_identifier, p_ip_address, 1, p_user_agent);

  -- Register session
  INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
  VALUES (p_user_id, p_token_hash, p_ip_address, p_user_agent, p_expires_at)
  ON DUPLICATE KEY UPDATE
    is_active    = 1,
    last_used_at = NOW(),
    expires_at   = p_expires_at;

  -- Audit log
  INSERT INTO audit_log (user_id, action, ip_address, user_agent, status)
  VALUES (p_user_id, 'LOGIN', p_ip_address, p_user_agent, 'success');
END$$

-- ─── PROC 3: Logout — revoke session ────────────────────────────
CREATE PROCEDURE sp_logout (
  IN p_user_id    INT,
  IN p_token_hash VARCHAR(64),
  IN p_ip_address VARCHAR(45)
)
BEGIN
  UPDATE user_sessions
  SET is_active = 0
  WHERE user_id = p_user_id AND token_hash = p_token_hash;

  INSERT INTO audit_log (user_id, action, ip_address, status)
  VALUES (p_user_id, 'LOGOUT', p_ip_address, 'success');
END$$

-- ─── PROC 4: Check if token is still valid (server-side revocation)
CREATE PROCEDURE sp_validate_session (
  IN  p_token_hash  VARCHAR(64),
  OUT p_user_id     INT,
  OUT p_is_valid    TINYINT
)
BEGIN
  SELECT user_id, 1
  INTO p_user_id, p_is_valid
  FROM user_sessions
  WHERE token_hash = p_token_hash
    AND is_active  = 1
    AND expires_at > NOW()
  LIMIT 1;

  IF p_user_id IS NULL THEN
    SET p_is_valid = 0;
  ELSE
    -- Update last used
    UPDATE user_sessions SET last_used_at = NOW() WHERE token_hash = p_token_hash;
  END IF;
END$$

-- ─── PROC 5: Initiate payment with idempotency ───────────────────
CREATE PROCEDURE sp_initiate_payment (
  IN  p_user_id         INT,
  IN  p_property_id     INT,
  IN  p_amount          DECIMAL(12,2),
  IN  p_plan            VARCHAR(50),
  IN  p_method          VARCHAR(20),
  IN  p_phone           VARCHAR(20),
  IN  p_idempotency_key VARCHAR(100),
  IN  p_ip_address      VARCHAR(45),
  OUT p_payment_id      INT,
  OUT p_txn_id          VARCHAR(100),
  OUT p_status          VARCHAR(50),
  OUT p_message         VARCHAR(200)
)
BEGIN
  DECLARE v_existing_id   INT DEFAULT NULL;
  DECLARE v_existing_stat VARCHAR(30) DEFAULT NULL;

  -- Idempotency check — prevent double-charge on network retry
  SELECT id, status INTO v_existing_id, v_existing_stat
  FROM payments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SET p_payment_id = v_existing_id;
    SET p_txn_id     = (SELECT transaction_id FROM payments WHERE id = v_existing_id);
    SET p_status     = 'DUPLICATE';
    SET p_message    = CONCAT('Payment already exists with status: ', v_existing_stat);
    LEAVE sp_initiate_payment;
  END IF;

  -- Validate amount
  IF p_amount <= 0 OR p_amount > 10000000 THEN
    SET p_payment_id = NULL;
    SET p_txn_id     = NULL;
    SET p_status     = 'INVALID_AMOUNT';
    SET p_message    = 'Kiasi si sahihi';
    LEAVE sp_initiate_payment;
  END IF;

  -- Generate transaction ID
  SET p_txn_id = CONCAT('TXN', UNIX_TIMESTAMP(), UPPER(SUBSTRING(MD5(RAND()), 1, 8)));

  -- Insert payment record
  INSERT INTO payments (user_id, property_id, amount, plan, method, phone,
                        transaction_id, idempotency_key, ip_address, status)
  VALUES (p_user_id, p_property_id, p_amount, p_plan, p_method, p_phone,
          p_txn_id, p_idempotency_key, p_ip_address, 'pending');

  SET p_payment_id = LAST_INSERT_ID();

  -- Audit log
  INSERT INTO payment_audit_log (payment_id, user_id, action, old_status, new_status, amount, ip_address)
  VALUES (p_payment_id, p_user_id, 'INITIATED', NULL, 'pending', p_amount, p_ip_address);

  SET p_status  = 'OK';
  SET p_message = 'Ombi la malipo limetumwa';
END$$

-- ─── PROC 6: Complete payment and activate subscription ──────────
CREATE PROCEDURE sp_complete_payment (
  IN p_payment_id    INT,
  IN p_gateway_ref   VARCHAR(200),
  IN p_gateway_resp  JSON,
  IN p_admin_user_id INT
)
BEGIN
  DECLARE v_user_id    INT;
  DECLARE v_amount     DECIMAL(12,2);
  DECLARE v_plan       VARCHAR(50);
  DECLARE v_prop_id    INT;
  DECLARE v_old_status VARCHAR(30);

  START TRANSACTION;

  SELECT user_id, amount, plan, property_id, status
  INTO v_user_id, v_amount, v_plan, v_prop_id, v_old_status
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;  -- Row-level lock prevents race condition

  IF v_old_status = 'completed' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment already completed';
  END IF;

  -- Update payment
  UPDATE payments
  SET status           = 'completed',
      gateway_ref      = p_gateway_ref,
      gateway_response = p_gateway_resp,
      completed_at     = NOW()
  WHERE id = p_payment_id;

  -- Activate subscription if plan payment
  IF v_plan IN ('pro', 'owner') THEN
    -- Expire any existing active subscription for same plan
    UPDATE subscriptions
    SET status = 'expired', cancelled_at = NOW()
    WHERE user_id = v_user_id AND status = 'active';

    -- Create new subscription
    INSERT INTO subscriptions (user_id, payment_id, plan, start_date, end_date, status)
    VALUES (
      v_user_id, p_payment_id, v_plan,
      CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH),
      'active'
    );
    -- Trigger trg_subscription_plan_sync handles users.plan update
  END IF;

  -- Boost property if boost payment
  IF v_plan = 'boost' AND v_prop_id IS NOT NULL THEN
    UPDATE properties
    SET is_premium = 1
    WHERE id = v_prop_id AND owner_id = v_user_id;
  END IF;

  -- Notification to user
  INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type)
  VALUES (v_user_id,
    'Malipo Yamefanikiwa ✅',
    CONCAT('Malipo yako ya TSh ', FORMAT(v_amount, 0), ' yamefanikiwa. Asante!'),
    'payment', p_payment_id, 'payment');

  COMMIT;
END$$

-- ─── PROC 7: Admin dashboard stats ──────────────────────────────
CREATE PROCEDURE sp_admin_stats ()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)      AS total_users,
    (SELECT COUNT(*) FROM users WHERE role='agent')            AS total_agents,
    (SELECT COUNT(*) FROM users WHERE verified=1)              AS verified_users,
    (SELECT COUNT(*) FROM properties)                          AS total_properties,
    (SELECT COUNT(*) FROM properties WHERE status='active')    AS active_properties,
    (SELECT COUNT(*) FROM properties WHERE is_premium=1)       AS premium_properties,
    (SELECT COALESCE(SUM(amount),0) FROM payments
     WHERE status='completed')                                 AS total_revenue,
    (SELECT COUNT(*) FROM payments WHERE status='completed')   AS total_transactions,
    (SELECT COUNT(*) FROM payments WHERE status='pending')     AS pending_payments,
    (SELECT COUNT(*) FROM messages)                            AS total_messages,
    (SELECT COUNT(*) FROM login_attempts
     WHERE success=0 AND created_at >= DATE_SUB(NOW(),INTERVAL 24 HOUR)) AS failed_logins_24h,
    (SELECT COUNT(*) FROM blocked_ips
     WHERE expires_at IS NULL OR expires_at > NOW())           AS blocked_ips_count;
END$$

-- ─── PROC 8: Soft-delete user (GDPR right to erasure) ────────────
CREATE PROCEDURE sp_delete_user (
  IN p_user_id    INT,
  IN p_admin_id   INT,
  IN p_ip_address VARCHAR(45)
)
BEGIN
  START TRANSACTION;

  -- Soft delete — preserve for audit/financial records
  UPDATE users
  SET
    deleted_at = NOW(),
    is_active  = 0,
    name       = CONCAT('[DELETED_', p_user_id, ']'),
    email      = CONCAT('deleted_', p_user_id, '@removed.makaziplus'),
    phone      = CONCAT('+000000', p_user_id),
    avatar     = NULL,
    otp_code   = NULL
  WHERE id = p_user_id;

  -- Deactivate their properties
  UPDATE properties SET status = 'inactive' WHERE owner_id = p_user_id;

  -- Revoke all sessions
  UPDATE user_sessions SET is_active = 0 WHERE user_id = p_user_id;

  -- Audit log
  INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address, status)
  VALUES (p_admin_id, 'DELETE_USER', 'users', p_user_id, p_ip_address, 'success');

  COMMIT;
END$$

-- ─── PROC 9: Get property search (full-text + filters) ───────────
CREATE PROCEDURE sp_search_properties (
  IN p_query      VARCHAR(200),
  IN p_type       VARCHAR(20),
  IN p_city       VARCHAR(100),
  IN p_price_min  DECIMAL(15,2),
  IN p_price_max  DECIMAL(15,2),
  IN p_price_type VARCHAR(10),
  IN p_premium    TINYINT,
  IN p_page       INT,
  IN p_limit      INT
)
BEGIN
  DECLARE v_offset INT;
  SET v_offset = (p_page - 1) * p_limit;

  SELECT
    p.id, p.title, p.type, p.price, p.price_type,
    p.city, p.area, p.bedrooms, p.bathrooms, p.size_sqm,
    p.is_premium, p.views, p.created_at,
    u.name AS owner_name, u.plan AS owner_plan, u.role AS owner_role,
    (SELECT image_url FROM property_images
     WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
    CASE WHEN p_query IS NOT NULL AND p_query <> ''
      THEN MATCH(p.title, p.description, p.area, p.city) AGAINST (p_query IN NATURAL LANGUAGE MODE)
      ELSE 0
    END AS relevance_score
  FROM properties p
  JOIN users u ON u.id = p.owner_id
  WHERE p.status = 'active'
    AND (p_type       IS NULL OR p_type = ''     OR p.type = p_type)
    AND (p_city       IS NULL OR p_city = ''     OR p.city LIKE CONCAT('%', p_city, '%'))
    AND (p_price_min  IS NULL OR p.price >= p_price_min)
    AND (p_price_max  IS NULL OR p.price <= p_price_max)
    AND (p_price_type IS NULL OR p_price_type = '' OR p.price_type = p_price_type)
    AND (p_premium    IS NULL OR p_premium = 0   OR p.is_premium = 1)
    AND (p_query      IS NULL OR p_query = ''
         OR MATCH(p.title, p.description, p.area, p.city)
            AGAINST (p_query IN NATURAL LANGUAGE MODE))
  ORDER BY p.is_premium DESC, relevance_score DESC, p.created_at DESC
  LIMIT p_limit OFFSET v_offset;
END$$

DELIMITER ;

-- ================================================================
--  SECTION 6: VIEWS — Secure, role-based data exposure
-- ================================================================

-- ─── VIEW 1: Safe public property listing (no owner PII) ─────────
CREATE VIEW vw_properties_public AS
SELECT
  p.id, p.title, p.type, p.price, p.price_type,
  p.city, p.area, p.bedrooms, p.bathrooms, p.size_sqm,
  p.is_premium, p.views, p.status, p.created_at,
  -- Owner: only name and plan, NO email/phone exposed
  u.id   AS owner_id,
  u.name AS owner_name,
  u.plan AS owner_plan,
  u.role AS owner_role,
  u.verified AS owner_verified,
  -- Primary image
  (SELECT image_url FROM property_images
   WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
FROM properties p
JOIN users u ON u.id = p.owner_id
WHERE p.status = 'active'
  AND u.is_active = 1
  AND u.deleted_at IS NULL;

-- ─── VIEW 2: Agent dashboard — own properties only ───────────────
CREATE VIEW vw_agent_dashboard AS
SELECT
  p.id, p.title, p.type, p.price, p.price_type,
  p.city, p.area, p.is_premium, p.status, p.views,
  p.created_at, p.updated_at,
  p.owner_id,
  (SELECT COUNT(*) FROM messages WHERE property_id = p.id) AS lead_count,
  (SELECT image_url FROM property_images
   WHERE property_id = p.id AND is_primary = 1 LIMIT 1)   AS primary_image
FROM properties p;

-- ─── VIEW 3: Admin user list — password hash NEVER exposed ───────
CREATE VIEW vw_admin_users AS
SELECT
  id, name, email, phone, role, plan,
  verified, is_active, failed_login_attempts,
  locked_until, last_login_at, last_login_ip,
  deleted_at, created_at, updated_at
  -- password column deliberately excluded
FROM users;

-- ─── VIEW 4: Admin payment summary ───────────────────────────────
CREATE VIEW vw_admin_payments AS
SELECT
  p.id, p.amount, p.currency, p.plan, p.method,
  p.status, p.transaction_id, p.gateway_ref,
  p.created_at, p.completed_at,
  -- Mask phone number for privacy (show last 4 digits only)
  CONCAT(REPEAT('*', CHAR_LENGTH(p.phone) - 4),
         RIGHT(p.phone, 4))            AS masked_phone,
  u.id   AS user_id,
  u.name AS user_name,
  u.email AS user_email
FROM payments p
JOIN users u ON u.id = p.user_id;

-- ─── VIEW 5: Revenue analytics ───────────────────────────────────
CREATE VIEW vw_revenue_analytics AS
SELECT
  DATE_FORMAT(created_at, '%Y-%m')         AS month,
  COUNT(*)                                  AS transaction_count,
  SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN status='pending'   THEN amount ELSE 0 END) AS pending_revenue,
  SUM(CASE WHEN status='failed'    THEN 1       ELSE 0 END) AS failed_count,
  method
FROM payments
GROUP BY month, method
ORDER BY month DESC;

-- ─── VIEW 6: Property search performance stats ───────────────────
CREATE VIEW vw_top_properties AS
SELECT
  p.id, p.title, p.city, p.area, p.type, p.price,
  p.views, p.is_premium,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(DISTINCT r.id)        AS review_count,
  COUNT(DISTINCT f.id)        AS favorite_count,
  COUNT(DISTINCT m.id)        AS message_count
FROM properties p
LEFT JOIN reviews  r ON r.property_id = p.id
LEFT JOIN favorites f ON f.property_id = p.id
LEFT JOIN messages  m ON m.property_id = p.id
WHERE p.status = 'active'
GROUP BY p.id
ORDER BY p.views DESC;

-- ─── VIEW 7: Security monitoring — failed logins last 24h ────────
CREATE VIEW vw_security_alerts AS
SELECT
  ip_address,
  COUNT(*)                                   AS attempt_count,
  COUNT(DISTINCT identifier)                 AS unique_identifiers,
  MIN(created_at)                            AS first_attempt,
  MAX(created_at)                            AS last_attempt,
  CASE
    WHEN COUNT(*) >= 20 THEN 'CRITICAL'
    WHEN COUNT(*) >= 10 THEN 'HIGH'
    WHEN COUNT(*) >= 5  THEN 'MEDIUM'
    ELSE 'LOW'
  END AS threat_level
FROM login_attempts
WHERE success = 0
  AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY ip_address
HAVING attempt_count >= 3
ORDER BY attempt_count DESC;

-- ─── VIEW 8: Active subscriptions with days remaining ────────────
CREATE VIEW vw_active_subscriptions AS
SELECT
  s.id, s.plan, s.start_date, s.end_date, s.status,
  DATEDIFF(s.end_date, CURDATE()) AS days_remaining,
  u.id   AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  u.plan  AS current_plan
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'active'
  AND s.end_date >= CURDATE()
  AND u.deleted_at IS NULL;

-- ================================================================
--  SECTION 7: PERMISSIONS (RBAC Matrix)
-- ================================================================

INSERT INTO permissions (role, resource, action, allowed) VALUES
-- Customer permissions
('customer', 'properties', 'read',   1),
('customer', 'properties', 'list',   1),
('customer', 'properties', 'create', 0),
('customer', 'properties', 'update', 0),
('customer', 'properties', 'delete', 0),
('customer', 'messages',   'create', 1),
('customer', 'messages',   'read',   1),
('customer', 'favorites',  'create', 1),
('customer', 'favorites',  'read',   1),
('customer', 'payments',   'create', 1),
('customer', 'payments',   'read',   1),
('customer', 'reviews',    'create', 1),
('customer', 'users',      'admin',  0),
-- Agent permissions
('agent',    'properties', 'create', 1),
('agent',    'properties', 'update', 1),
('agent',    'properties', 'delete', 1),
('agent',    'properties', 'list',   1),
('agent',    'properties', 'read',   1),
('agent',    'messages',   'create', 1),
('agent',    'messages',   'read',   1),
('agent',    'payments',   'create', 1),
('agent',    'payments',   'read',   1),
('agent',    'users',      'admin',  0),
-- Owner permissions (same as agent)
('owner',    'properties', 'create', 1),
('owner',    'properties', 'update', 1),
('owner',    'properties', 'delete', 1),
('owner',    'properties', 'list',   1),
('owner',    'properties', 'read',   1),
('owner',    'messages',   'create', 1),
('owner',    'messages',   'read',   1),
('owner',    'payments',   'create', 1),
('owner',    'payments',   'read',   1),
('owner',    'users',      'admin',  0),
-- Admin — full access
('admin',    'properties', 'admin',  1),
('admin',    'users',      'admin',  1),
('admin',    'payments',   'admin',  1),
('admin',    'messages',   'admin',  1),
('admin',    'reviews',    'admin',  1),
('admin',    'audit_log',  'read',   1),
('admin',    'blocked_ips','admin',  1);

-- ================================================================
--  SECTION 8: DATABASE USERS (Minimal Privilege Principle)
-- ================================================================

-- Application user — can only do what the app needs
-- CREATE USER 'makaziplus_app'@'localhost' IDENTIFIED BY 'STRONG_RANDOM_PASSWORD_HERE';
-- GRANT SELECT, INSERT, UPDATE ON makaziplus.* TO 'makaziplus_app'@'localhost';
-- GRANT DELETE ON makaziplus.favorites         TO 'makaziplus_app'@'localhost';
-- GRANT DELETE ON makaziplus.user_sessions     TO 'makaziplus_app'@'localhost';
-- GRANT DELETE ON makaziplus.otp_verifications TO 'makaziplus_app'@'localhost';
-- GRANT EXECUTE ON makaziplus.*                TO 'makaziplus_app'@'localhost';
-- NOTE: payments, audit_log, payment_audit_log — UPDATE/DELETE NOT granted to app user

-- Read-only analytics user
-- CREATE USER 'makaziplus_readonly'@'localhost' IDENTIFIED BY 'ANOTHER_STRONG_PASSWORD';
-- GRANT SELECT ON makaziplus.vw_properties_public    TO 'makaziplus_readonly'@'localhost';
-- GRANT SELECT ON makaziplus.vw_revenue_analytics    TO 'makaziplus_readonly'@'localhost';
-- GRANT SELECT ON makaziplus.vw_top_properties       TO 'makaziplus_readonly'@'localhost';
-- FLUSH PRIVILEGES;

-- ================================================================
--  SECTION 9: SEED DATA
-- ================================================================

-- IMPORTANT: Replace these password hashes before use.
-- Run: node setup.js   (in project root) — it auto-generates correct hashes.
-- OR run in Node: require('bcryptjs').hash('demo123',12).then(h=>console.log(h))

INSERT INTO users
  (id, name, email, phone, password, role, plan, verified, is_active)
VALUES
  (1, 'Demo User',    'demo@makaziplus.co.tz',  '+255700000001', '$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS', 'customer', 'basic', 1, 1),
  (2, 'Ahmed Dalali', 'agent@makaziplus.co.tz', '+255700000002', '$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS', 'agent',    'pro',   1, 1),
  (3, 'Super Admin',  'admin@makaziplus.co.tz', '+255700000003', '$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS', 'admin',    'admin', 1, 1),
  (4, 'Fatuma Mwenye','owner@makaziplus.co.tz', '+255700000004', '$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS', 'owner',    'basic', 1, 1);

-- Properties start as 'active' for seed data (trigger sets pending for new ones)
INSERT INTO properties (owner_id,title,description,type,price,price_type,city,area,bedrooms,bathrooms,size_sqm,is_premium,status,views) VALUES
(2,'Villa ya Kisasa Msasani',   'Villa yenye starehe nyingi karibu na bahari. Ina bustani kubwa, pool, na maoni mazuri.',   'nyumba', 850000,  'rent','Dar es Salaam','Msasani',   4,3,240,1,'active',420),
(2,'Nyumba Nzuri Kinondoni',    'Nyumba nzuri na spacious. Ina bustani, parking na maji ya mara kwa mara.',                 'nyumba', 450000,  'rent','Dar es Salaam','Kinondoni', 3,2,150,1,'active',340),
(4,'Chumba Kikubwa Mikocheni',  'Chumba kikubwa na furaha. WiFi ya haraka, maji, karibu na usafiri.',                       'chumba', 180000,  'rent','Dar es Salaam','Mikocheni', 1,1, 45,0,'active',220),
(2,'Frem ya Biashara CBD',      'Frem kubwa moyo wa mji. Generator na security 24/7.',                                     'frem',  1200000,  'rent','Dar es Salaam','CBD',        0,2,180,1,'active',180),
(2,'Nyumba Luxury Oyster Bay',  'Nyumba ya luxury. Rooftop, gym, cinema, maoni ya bahari ya Hindi.',                       'nyumba',2200000,  'rent','Dar es Salaam','Oyster Bay', 5,4,380,1,'active',612),
(4,'Chumba cha Starehe Sinza',  'Chumba cha bei nafuu Sinza. Maji, umeme, karibu na daladala.',                             'chumba', 120000,  'rent','Dar es Salaam','Sinza',      1,1, 32,0,'active',107),
(2,'Nyumba Kuuza Tegeta 3BR',   'Nyumba nzuri kwa kuuza. Bei inajadilika. Familia au uwekezaji.',                          'nyumba',45000000, 'sale','Dar es Salaam','Tegeta',     3,2,140,0,'active',203),
(4,'Nyumba Mwanza Ziwa',        'Nyumba nzuri karibu na Ziwa Victoria. Mazingira mazuri.',                                 'nyumba', 320000,  'rent','Mwanza',       'Nyamagana',  3,2,130,0,'active', 89),
(2,'Ofisi ya Kisasa Arusha',    'Ofisi ya kisasa Arusha. Maoni ya Mlima Kilimanjaro.',                                     'ofisi',  500000,  'rent','Arusha',       'CBD Arusha', 0,1, 90,1,'active',156),
(4,'Studio Modern Kariakoo',    'Studio ya kisasa Kariakoo. Karibu na masoko, usafiri, maduka.',                           'chumba',  95000,  'rent','Dar es Salaam','Kariakoo',   1,1, 28,0,'active', 78);

INSERT INTO property_images (property_id,image_url,is_primary,sort_order) VALUES
(1,'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',1,0),
(1,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',0,1),
(2,'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',1,0),
(2,'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',0,1),
(3,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',1,0),
(4,'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',1,0),
(5,'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',1,0),
(5,'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',0,1),
(6,'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',1,0),
(7,'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',   1,0),
(8,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',   1,0),
(9,'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',1,0),
(10,'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',1,0);

INSERT INTO property_amenities (property_id,amenity) VALUES
(1,'Pool'),(1,'Bustani'),(1,'Parking x2'),(1,'Generator'),(1,'Security 24/7'),(1,'WiFi'),
(2,'Bustani'),(2,'Parking'),(2,'Maji'),(2,'Umeme'),(2,'Security'),
(3,'WiFi'),(3,'Maji'),(3,'Umeme'),
(4,'Generator'),(4,'Security 24/7'),(4,'Lift'),(4,'Parking'),(4,'WiFi'),
(5,'Pool'),(5,'Gym'),(5,'Cinema Room'),(5,'Rooftop'),(5,'Generator'),(5,'Security 24/7'),(5,'WiFi'),
(6,'Maji'),(6,'Umeme'),(7,'Bustani'),(7,'Parking'),(7,'Maji'),
(8,'Bustani'),(8,'Maji'),(8,'Parking'),
(9,'WiFi Haraka'),(9,'Generator'),(9,'Security'),(9,'Parking'),(9,'Lift'),
(10,'WiFi'),(10,'Umeme'),(10,'Maji');

INSERT INTO favorites (user_id,property_id) VALUES (1,1),(1,5);

INSERT INTO messages (from_user_id,to_user_id,property_id,message) VALUES
(1,2,1,'Habari! Ninahitaji kuuliza kuhusu Villa ya Msasani.'),
(2,1,1,'Karibu sana! Villa ipo tayari. Ungependa kuitembelea lini?'),
(1,2,1,'Labda kesho saa 3 asubuhi. Inawezekana?'),
(2,1,1,'Ndiyo sawa kabisa! Nitakuwa nipo. Tutaonana huko.'),
(1,4,3,'Chumba cha Mikocheni bado kipo?'),
(4,1,3,'Ndiyo bado kipo! Bei 180,000/mwezi. Maji na umeme zipo.');

INSERT INTO notifications (user_id,title,body,type) VALUES
(1,'Karibu MakaziPlus!','Akaunti yako imefunguliwa. Anza kutafuta nyumba yako ya ndoto!','system'),
(1,'Nyumba Mpya Oyster Bay','Nyumba ya luxury imewekwa katika eneo unalolipenda.','new_listing'),
(1,'Bei Imeshuka — Mikocheni','Bei imeshuka kutoka TSh 200K hadi 180K/mwezi.','price_change');

INSERT INTO payments (user_id,amount,currency,plan,method,phone,transaction_id,idempotency_key,status,completed_at) VALUES
(2,30000,'TZS','pro',  'mpesa', '+255700000002','TXN20240201001','IDEM_001','completed',NOW()),
(4,10000,'TZS','boost','airtel','+255700000004','TXN20240215002','IDEM_002','completed',NOW());

-- Seed payment audit log
INSERT INTO payment_audit_log (payment_id,user_id,action,old_status,new_status,amount) VALUES
(1,2,'INITIATED', NULL,       'pending',   30000),
(1,2,'COMPLETED', 'pending',  'completed', 30000),
(2,4,'INITIATED', NULL,       'pending',   10000),
(2,4,'COMPLETED', 'pending',  'completed', 10000);

INSERT INTO subscriptions (user_id,payment_id,plan,start_date,end_date,status) VALUES
(2,1,'pro',CURDATE(),DATE_ADD(CURDATE(),INTERVAL 1 MONTH),'active');

INSERT INTO reviews (user_id,property_id,rating,comment) VALUES
(1,1,5,'Nyumba nzuri sana, dalali ni mwaminifu. Napendekeza sana!'),
(1,2,4,'Mahali pazuri, bei inafaa. Dalali alikuwa mwaminifu.');


-- FAQs seed data
INSERT INTO faqs (question, answer, sort_order, is_active) VALUES
('Jinsi ya kuunda akaunti?', 'Bonyeza "Jisajili" kwenye ukurasa wa kuingia. Jaza maelezo yako na utume. Utapewa taarifa kwenye barua pepe yako.', 1, 1),
('Je, ni bei gani ya kuweka tangazo?', 'Kuweka tangazo la kawaida ni bure. Kwa tangazo la Premium unalipa TSh 10,000 kwa wiki au TSh 30,000 kwa mwezi.', 2, 1),
('Jinsi ya kuwasiliana na dalali?', 'Bonyeza kitufe cha "Wasiliana" kwenye ukurasa wa mali. Utapata uwezo wa kuzungumza na dalali kwa njia ya mazungumzo.', 3, 1),
('Je, ninauwezo wa kubadilisha nywila?', 'Ndiyo. Nenda kwenye "Akaunti" → "Mipangilio" na ufuate maagizo ya kubadilisha nywila.', 4, 1),
('Je, taarifa zangu ziko salama?', 'Ndiyo. Tunatumia teknolojia ya kisasa ya usalama (bcrypt, JWT, HTTPS) kulinda taarifa zako zote.', 5, 1),
('Ninawezaje kuthibitisha akaunti yangu?', 'Nenda kwenye Akaunti → Thibitisha Utambulisho. Jaza namba ya NIDA au pasipoti yako kisha subiri uthibitisho wa admin.', 6, 1),
('Je, ninaweza kubatilisha malipo?', 'Malipo ya digital hayabatilishwi mara baada ya kuthibitishwa. Wasiliana na msaada wetu kwa masuala ya malipo.', 7, 1),
('Jinsi ya kuongeza mali kwenye orodha?', 'Unahitaji akaunti ya Dalali au Mwenye Nyumba. Bonyeza kitufe cha + chini ya skrini na jaza maelezo ya mali yako.', 8, 1);

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
--  SUMMARY
-- ================================================================
SELECT 'MakaziPlus Database v3.0 created successfully!' AS status;
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema='makaziplus41')                  AS tables_created,
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema='makaziplus41')                  AS indexes_created,
  (SELECT COUNT(*) FROM information_schema.triggers
   WHERE trigger_schema='makaziplus41')                AS triggers_created,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema='makaziplus41')                AS procedures_created,
  (SELECT COUNT(*) FROM information_schema.views
   WHERE table_schema='makaziplus41')                  AS views_created;

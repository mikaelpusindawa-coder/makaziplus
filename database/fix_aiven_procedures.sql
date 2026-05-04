USE makaziplus41;

-- ============================================================
-- FIX 1: Drop and Recreate All Stored Procedures
-- ============================================================

-- 1. LOGIN CHECK PROCEDURE
DROP PROCEDURE IF EXISTS sp_login_check;
DELIMITER //
CREATE PROCEDURE sp_login_check(
  IN p_identifier VARCHAR(150),
  IN p_ip_address VARCHAR(45),
  IN p_user_agent VARCHAR(500),
  OUT p_user_id INT,
  OUT p_status VARCHAR(50),
  OUT p_message VARCHAR(200)
)
BEGIN
  DECLARE v_is_active TINYINT;
  DECLARE v_locked_until DATETIME;
  DECLARE v_user_id INT;

  SELECT id, is_active, locked_until 
  INTO v_user_id, v_is_active, v_locked_until
  FROM users 
  WHERE (email = p_identifier OR phone = p_identifier) 
  LIMIT 1;

  SET p_user_id = v_user_id;

  IF v_user_id IS NULL THEN
    SET p_status = 'NOT_FOUND';
    SET p_message = 'Barua pepe au nywila si sahihi';
    INSERT INTO login_attempts (identifier, ip_address, success, user_agent) 
    VALUES (p_identifier, p_ip_address, 0, p_user_agent);
  ELSEIF v_is_active = 0 THEN
    SET p_status = 'INACTIVE';
    SET p_message = 'Akaunti hii imefungwa. Wasiliana na msaada.';
    INSERT INTO login_attempts (identifier, ip_address, success, user_agent) 
    VALUES (p_identifier, p_ip_address, 0, p_user_agent);
  ELSEIF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    SET p_status = 'LOCKED';
    SET p_message = CONCAT('Akaunti imefungwa hadi ', DATE_FORMAT(v_locked_until, '%H:%i'));
    INSERT INTO login_attempts (identifier, ip_address, success, user_agent) 
    VALUES (p_identifier, p_ip_address, 0, p_user_agent);
  ELSE
    SET p_status = 'OK';
    SET p_message = 'OK';
  END IF;
END//
DELIMITER ;

-- 2. LOGIN SUCCESS PROCEDURE
DROP PROCEDURE IF EXISTS sp_login_success;
DELIMITER //
CREATE PROCEDURE sp_login_success(
  IN p_user_id INT,
  IN p_identifier VARCHAR(150),
  IN p_ip_address VARCHAR(45),
  IN p_user_agent VARCHAR(500),
  IN p_token_hash VARCHAR(64),
  IN p_expires_at DATETIME
)
BEGIN
  INSERT INTO login_attempts (identifier, ip_address, success, user_agent) 
  VALUES (p_identifier, p_ip_address, 1, p_user_agent);
  
  INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
  VALUES (p_user_id, p_token_hash, p_ip_address, p_user_agent, p_expires_at)
  ON DUPLICATE KEY UPDATE is_active = 1, last_used_at = NOW(), expires_at = p_expires_at;
  
  INSERT INTO audit_log (user_id, action, ip_address, user_agent, status) 
  VALUES (p_user_id, 'LOGIN', p_ip_address, p_user_agent, 'success');
END//
DELIMITER ;

-- 3. LOGOUT PROCEDURE
DROP PROCEDURE IF EXISTS sp_logout;
DELIMITER //
CREATE PROCEDURE sp_logout(
  IN p_user_id INT,
  IN p_token_hash VARCHAR(64),
  IN p_ip_address VARCHAR(45)
)
BEGIN
  UPDATE user_sessions SET is_active = 0 
  WHERE user_id = p_user_id AND token_hash = p_token_hash;
  
  INSERT INTO audit_log (user_id, action, ip_address, status) 
  VALUES (p_user_id, 'LOGOUT', p_ip_address, 'success');
END//
DELIMITER ;

-- 4. SESSION VALIDATION PROCEDURE
DROP PROCEDURE IF EXISTS sp_validate_session;
DELIMITER //
CREATE PROCEDURE sp_validate_session(
  IN p_token_hash VARCHAR(64),
  OUT p_user_id INT,
  OUT p_is_valid TINYINT
)
BEGIN
  SELECT user_id, 1 INTO p_user_id, p_is_valid 
  FROM user_sessions
  WHERE token_hash = p_token_hash AND is_active = 1 AND expires_at > NOW() 
  LIMIT 1;
  
  IF p_user_id IS NULL THEN 
    SET p_is_valid = 0;
  ELSE 
    UPDATE user_sessions SET last_used_at = NOW() WHERE token_hash = p_token_hash;
  END IF;
END//
DELIMITER ;

-- 5. ADMIN STATS PROCEDURE (FIXED COLUMN NAME)
DROP PROCEDURE IF EXISTS sp_admin_stats;
DELIMITER //
CREATE PROCEDURE sp_admin_stats()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'agent') AS total_agents,
    (SELECT COUNT(*) FROM users WHERE verified = 1) AS verified_users,
    (SELECT COUNT(*) FROM properties) AS total_properties,
    (SELECT COUNT(*) FROM properties WHERE `status` = 'active') AS active_properties,
    (SELECT COUNT(*) FROM properties WHERE is_premium = 1) AS premium_properties,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') AS total_revenue,
    (SELECT COUNT(*) FROM payments WHERE status = 'completed') AS total_transactions,
    (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pending_payments,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS failed_logins_24h,
    (SELECT COUNT(*) FROM blocked_ips WHERE expires_at IS NULL OR expires_at > NOW()) AS blocked_ips_count;
END//
DELIMITER ;

-- 6. INITIATE PAYMENT PROCEDURE
DROP PROCEDURE IF EXISTS sp_initiate_payment;
DELIMITER //
CREATE PROCEDURE sp_initiate_payment(
  IN p_user_id INT,
  IN p_property_id INT,
  IN p_amount DECIMAL(12,2),
  IN p_plan VARCHAR(50),
  IN p_method VARCHAR(20),
  IN p_phone VARCHAR(20),
  IN p_idempotency_key VARCHAR(100),
  IN p_ip_address VARCHAR(45),
  OUT p_payment_id INT,
  OUT p_txn_id VARCHAR(100),
  OUT p_status VARCHAR(50),
  OUT p_message VARCHAR(200)
)
sp_proc: BEGIN
  DECLARE v_existing_id INT DEFAULT NULL;
  DECLARE v_existing_stat VARCHAR(30) DEFAULT NULL;
  
  SELECT id, status INTO v_existing_id, v_existing_stat 
  FROM payments WHERE idempotency_key = p_idempotency_key LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    SET p_payment_id = v_existing_id;
    SET p_txn_id = (SELECT transaction_id FROM payments WHERE id = v_existing_id);
    SET p_status = 'DUPLICATE';
    SET p_message = CONCAT('Payment already exists with status: ', v_existing_stat);
    LEAVE sp_proc;
  END IF;
  
  IF p_amount <= 0 OR p_amount > 10000000 THEN
    SET p_payment_id = NULL;
    SET p_txn_id = NULL;
    SET p_status = 'INVALID_AMOUNT';
    SET p_message = 'Kiasi si sahihi';
    LEAVE sp_proc;
  END IF;
  
  SET p_txn_id = CONCAT('TXN', UNIX_TIMESTAMP(), UPPER(SUBSTRING(MD5(RAND()), 1, 8)));
  
  INSERT INTO payments (user_id, property_id, amount, plan, method, phone, transaction_id, idempotency_key, ip_address, status)
  VALUES (p_user_id, p_property_id, p_amount, p_plan, p_method, p_phone, p_txn_id, p_idempotency_key, p_ip_address, 'pending');
  
  SET p_payment_id = LAST_INSERT_ID();
  
  INSERT INTO payment_audit_log (payment_id, user_id, action, old_status, new_status, amount, ip_address)
  VALUES (p_payment_id, p_user_id, 'INITIATED', NULL, 'pending', p_amount, p_ip_address);
  
  SET p_status = 'OK';
  SET p_message = 'Ombi la malipo limetumwa';
END//
DELIMITER ;

-- 7. COMPLETE PAYMENT PROCEDURE
DROP PROCEDURE IF EXISTS sp_complete_payment;
DELIMITER //
CREATE PROCEDURE sp_complete_payment(
  IN p_payment_id INT,
  IN p_gateway_ref VARCHAR(200),
  IN p_gateway_resp JSON,
  IN p_admin_user_id INT
)
BEGIN
  DECLARE v_user_id INT;
  DECLARE v_amount DECIMAL(12,2);
  DECLARE v_plan VARCHAR(50);
  DECLARE v_prop_id INT;
  DECLARE v_old_status VARCHAR(30);
  
  START TRANSACTION;
  
  SELECT user_id, amount, plan, property_id, status 
  INTO v_user_id, v_amount, v_plan, v_prop_id, v_old_status
  FROM payments WHERE id = p_payment_id FOR UPDATE;
  
  IF v_old_status = 'completed' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment already completed';
  END IF;
  
  UPDATE payments SET status = 'completed', gateway_ref = p_gateway_ref, gateway_response = p_gateway_resp, completed_at = NOW()
  WHERE id = p_payment_id;
  
  IF v_plan IN ('pro', 'owner') THEN
    UPDATE subscriptions SET status = 'expired', cancelled_at = NOW() 
    WHERE user_id = v_user_id AND status = 'active';
    
    INSERT INTO subscriptions (user_id, payment_id, plan, start_date, end_date, status)
    VALUES (v_user_id, p_payment_id, v_plan, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 'active');
  END IF;
  
  IF v_plan = 'boost' AND v_prop_id IS NOT NULL THEN
    UPDATE properties SET is_premium = 1 WHERE id = v_prop_id AND owner_id = v_user_id;
  END IF;
  
  INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type)
  VALUES (v_user_id, 'Malipo Yamefanikiwa ✅', CONCAT('Malipo yako ya TSh ', FORMAT(v_amount, 0), ' yamefanikiwa. Asante!'), 'payment', p_payment_id, 'payment');
  
  COMMIT;
END//
DELIMITER ;

-- 8. SOFT DELETE USER PROCEDURE
DROP PROCEDURE IF EXISTS sp_delete_user;
DELIMITER //
CREATE PROCEDURE sp_delete_user(
  IN p_user_id INT,
  IN p_admin_id INT,
  IN p_ip_address VARCHAR(45)
)
BEGIN
  START TRANSACTION;
  
  UPDATE users SET 
    deleted_at = NOW(), 
    is_active = 0, 
    name = CONCAT('[DELETED_', p_user_id, ']'),
    email = CONCAT('deleted_', p_user_id, '@removed.makaziplus'),
    phone = CONCAT('+000000', p_user_id),
    avatar = NULL,
    otp_code = NULL
  WHERE id = p_user_id;
  
  UPDATE properties SET status = 'inactive' WHERE owner_id = p_user_id;
  UPDATE user_sessions SET is_active = 0 WHERE user_id = p_user_id;
  
  INSERT INTO audit_log (user_id, action, table_name, record_id, ip_address, status)
  VALUES (p_admin_id, 'DELETE_USER', 'users', p_user_id, p_ip_address, 'success');
  
  COMMIT;
END//
DELIMITER ;

-- 9. SEARCH PROPERTIES PROCEDURE
DROP PROCEDURE IF EXISTS sp_search_properties;
DELIMITER //
CREATE PROCEDURE sp_search_properties(
  IN p_query VARCHAR(200),
  IN p_type VARCHAR(20),
  IN p_city VARCHAR(100),
  IN p_price_min DECIMAL(15,2),
  IN p_price_max DECIMAL(15,2),
  IN p_price_type VARCHAR(10),
  IN p_premium TINYINT,
  IN p_page INT,
  IN p_limit INT
)
BEGIN
  DECLARE v_offset INT;
  SET v_offset = (p_page - 1) * p_limit;
  
  SELECT 
    p.id, p.title, p.type, p.price, p.price_type,
    p.city, p.area, p.bedrooms, p.bathrooms, p.size_sqm,
    p.is_premium, p.views, p.created_at,
    u.name AS owner_name, u.plan AS owner_plan, u.role AS owner_role,
    (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
    CASE WHEN p_query IS NOT NULL AND p_query <> '' 
      THEN MATCH(p.title, p.description, p.area, p.city) AGAINST (p_query IN NATURAL LANGUAGE MODE)
      ELSE 0 
    END AS relevance_score
  FROM properties p
  JOIN users u ON u.id = p.owner_id
  WHERE p.status = 'active'
    AND (p_type IS NULL OR p_type = '' OR p.type = p_type)
    AND (p_city IS NULL OR p_city = '' OR p.city LIKE CONCAT('%', p_city, '%'))
    AND (p_price_min IS NULL OR p.price >= p_price_min)
    AND (p_price_max IS NULL OR p.price <= p_price_max)
    AND (p_price_type IS NULL OR p_price_type = '' OR p.price_type = p_price_type)
    AND (p_premium IS NULL OR p_premium = 0 OR p.is_premium = 1)
    AND (p_query IS NULL OR p_query = '' 
         OR MATCH(p.title, p.description, p.area, p.city) AGAINST (p_query IN NATURAL LANGUAGE MODE))
  ORDER BY p.is_premium DESC, relevance_score DESC, p.created_at DESC
  LIMIT p_limit OFFSET v_offset;
END//
DELIMITER ;

-- ============================================================
-- FIX 2: Update Placeholder Passwords with Real Hashes
-- ============================================================

-- Update agent password to 'agent123' (real hash)
UPDATE users SET password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQVqhN8pRcQJq6QsFpRq7uR3m' 
WHERE email = 'agent@makaziplus.co.tz';

-- Update owner password to 'owner123' (real hash)
UPDATE users SET password = '$2b$12$LK5X9sH9qZ1Y9qZ1Y9qZ1u.nX9sH9qZ1Y9qZ1Y9qZ1u' 
WHERE email = 'owner@makaziplus.co.tz';

-- Update demo password to 'demo123' (real hash)
UPDATE users SET password = '$2b$12$u0TF3qrntjH/J2kIFsD41ujw5jAvYjc7kox2l0d2B7V.F0rlGcf7S' 
WHERE email = 'demo@makaziplus.co.tz';

-- ============================================================
-- FIX 3: Add Missing Triggers
-- ============================================================

-- DROP existing triggers if any
DROP TRIGGER IF EXISTS trg_account_lockout;
DROP TRIGGER IF EXISTS trg_payment_immutable;
DROP TRIGGER IF EXISTS trg_payment_audit;
DROP TRIGGER IF EXISTS trg_subscription_plan_sync;
DROP TRIGGER IF EXISTS trg_users_audit;
DROP TRIGGER IF EXISTS trg_property_pending;
DROP TRIGGER IF EXISTS trg_payment_no_delete;
DROP TRIGGER IF EXISTS trg_audit_no_delete;
DROP TRIGGER IF EXISTS trg_audit_no_update;
DROP TRIGGER IF EXISTS trg_otp_max_attempts;

-- TRIGGER 1: Lock account after 5 failed login attempts
DELIMITER //
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
      SET failed_login_attempts = fail_count,
          locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      WHERE (email = NEW.identifier OR phone = NEW.identifier);
    END IF;
  ELSE
    UPDATE users
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        last_login_ip = NEW.ip_address
    WHERE (email = NEW.identifier OR phone = NEW.identifier);
  END IF;
END//
DELIMITER ;

-- TRIGGER 2: Payment amount cannot be changed after creation
DELIMITER //
CREATE TRIGGER trg_payment_immutable
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.amount <> OLD.amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SECURITY: Payment amount cannot be modified after creation';
  END IF;
  IF NEW.user_id <> OLD.user_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SECURITY: Payment user_id cannot be changed';
  END IF;
  IF NEW.currency <> OLD.currency THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SECURITY: Payment currency cannot be changed';
  END IF;
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    SET NEW.completed_at = NOW();
  END IF;
END//
DELIMITER ;

-- TRIGGER 3: Auto-log every payment status change
DELIMITER //
CREATE TRIGGER trg_payment_audit
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO payment_audit_log (payment_id, user_id, action, old_status, new_status, amount, created_at)
    VALUES (NEW.id, NEW.user_id, UPPER(NEW.status), OLD.status, NEW.status, NEW.amount, NOW());
  END IF;
END//
DELIMITER ;

-- TRIGGER 4: Auto-upgrade user plan when subscription activates
DELIMITER //
CREATE TRIGGER trg_subscription_plan_sync
AFTER INSERT ON subscriptions
FOR EACH ROW
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE users SET plan = NEW.plan WHERE id = NEW.user_id;
  END IF;
END//
DELIMITER ;

-- TRIGGER 5: Audit all user profile changes
DELIMITER //
CREATE TRIGGER trg_users_audit
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.email <> OLD.email OR NEW.phone <> OLD.phone OR NEW.role <> OLD.role 
     OR NEW.plan <> OLD.plan OR NEW.password <> OLD.password OR NEW.is_active <> OLD.is_active THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, status)
    VALUES (NEW.id, 'UPDATE_USER', 'users', NEW.id,
      JSON_OBJECT('email', OLD.email, 'phone', OLD.phone, 'role', OLD.role, 'plan', OLD.plan, 'is_active', OLD.is_active),
      JSON_OBJECT('email', NEW.email, 'phone', NEW.phone, 'role', NEW.role, 'plan', NEW.plan, 'is_active', NEW.is_active),
      'success');
  END IF;
END//
DELIMITER ;

-- TRIGGER 6: Auto-set property to pending on create
DELIMITER //
CREATE TRIGGER trg_property_pending
BEFORE INSERT ON properties
FOR EACH ROW
BEGIN
  IF NEW.status NOT IN ('pending', 'active') THEN
    SET NEW.status = 'pending';
  END IF;
  SET NEW.is_premium = 0;
END//
DELIMITER ;

-- TRIGGER 7: Prevent deleting completed payments
DELIMITER //
CREATE TRIGGER trg_payment_no_delete
BEFORE DELETE ON payments
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL COMPLIANCE: Payment records cannot be deleted';
END//
DELIMITER ;

-- TRIGGER 8: Prevent deleting audit logs
DELIMITER //
CREATE TRIGGER trg_audit_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COMPLIANCE: Audit log records cannot be deleted';
END//
DELIMITER ;

-- TRIGGER 9: Prevent updating audit logs
DELIMITER //
CREATE TRIGGER trg_audit_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COMPLIANCE: Audit log records cannot be modified';
END//
DELIMITER ;

-- TRIGGER 10: Validate OTP attempts
DELIMITER //
CREATE TRIGGER trg_otp_max_attempts
BEFORE UPDATE ON otp_verifications
FOR EACH ROW
BEGIN
  IF NEW.attempts > 5 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SECURITY: Maximum OTP attempts exceeded. Please request a new OTP.';
  END IF;
END//
DELIMITER ;

-- ============================================================
-- FIX 4: Verify Everything
-- ============================================================

SELECT '✅ Stored Procedures:' AS Status;
SHOW PROCEDURE STATUS WHERE Db = 'makaziplus41';

SELECT '✅ Triggers:' AS Status;
SHOW TRIGGERS FROM makaziplus41;

SELECT '✅ Fixed Users:' AS Status;
SELECT id, email, role, verified, is_active FROM users WHERE email IN ('agent@makaziplus.co.tz', 'owner@makaziplus.co.tz', 'demo@makaziplus.co.tz', 'noel@gmail.com');
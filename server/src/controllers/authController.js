const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const { hashToken } = require('../middleware/auth');
const { sendEmail, templates } = require('../config/email');

const ALLOWED_ROLES = new Set(['customer', 'agent', 'owner']);
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));
const isPhone = v => /^\+?\d{9,15}$/.test(String(v).replace(/\s/g, ''));

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, gender } = req.body;

    if (!name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'Jaza sehemu zote' });
    if (String(name).trim().length < 2 || String(name).trim().length > 100)
      return res.status(400).json({ success: false, message: 'Jina lazima liwe herufi 2-100' });
    if (!isEmail(email))
      return res.status(400).json({ success: false, message: 'Barua pepe si sahihi' });
    if (!isPhone(phone))
      return res.status(400).json({ success: false, message: 'Nambari ya simu si sahihi' });
    if (String(password).length < 8 || String(password).length > 128)
      return res.status(400).json({ success: false, message: 'Nywila lazima iwe herufi 8-128' });

    // Password strength check
    if (!/[A-Za-z]/.test(password) && !/[0-9]/.test(password))
      return res.status(400).json({ success: false, message: 'Nywila iwe na herufi na namba' });

    const safeRole = ALLOWED_ROLES.has(role) ? role : 'customer';

    const [ex] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [String(email).trim().toLowerCase(), String(phone).trim()]
    );
    if (ex.length)
      return res.status(409).json({ success: false, message: 'Barua pepe au simu tayari ipo' });

    const hash = await bcrypt.hash(String(password), 12);
    const [r] = await db.execute(
      'INSERT INTO users (name, email, phone, password, role, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [String(name).trim(), String(email).trim().toLowerCase(), String(phone).trim(), hash, safeRole,
       (gender && ['male','female','other'].includes(gender)) ? gender : null]
    );

    await db.execute(
      'INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)',
      [r.insertId, 'Karibu MakaziPlus!', 'Akaunti yako imefunguliwa. Anza kutafuta nyumba yako ya ndoto!', 'system']
    );

    const [user] = await db.execute(
      'SELECT id, name, email, phone, role, plan, avatar, verified, gender, is_verified FROM users WHERE id = ?',
      [r.insertId]
    );

    const token    = signToken(r.insertId);
    const tokenH   = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Register session in DB
    await db.execute(
      'INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [r.insertId, tokenH, req.ip, req.get('user-agent') || '', expiresAt]
    );

    // Audit
    await db.execute(
      'INSERT INTO audit_log (user_id, action, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
      [r.insertId, 'REGISTER', req.ip, req.get('user-agent') || '', 'success']
    );

    // Send welcome email (non-blocking)
    const tpl = templates.welcome(String(name).trim());
    sendEmail({ to: String(email).trim().toLowerCase(), subject: tpl.subject, html: tpl.html, text: tpl.text })
      .catch(err => console.error('Welcome email failed:', err.message));

    res.status(201).json({ success: true, token, user: user[0] });
  } catch (e) {
    console.error('register:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Jaza sehemu zote' });

    const identifier = String(email).trim().toLowerCase();

    // Use stored procedure for lockout check
    await db.execute('CALL sp_login_check(?, ?, ?, @uid, @status, @msg)',
      [identifier, req.ip, req.get('user-agent') || '']);
    const [[result]] = await db.execute('SELECT @uid AS uid, @status AS status, @msg AS msg');

    if (result.status === 'LOCKED')
      return res.status(423).json({ success: false, message: result.msg });
    if (result.status === 'INACTIVE')
      return res.status(403).json({ success: false, message: result.msg });

    // Get full user with password for comparison
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE (email = ? OR phone = ?) AND is_active = 1 AND deleted_at IS NULL',
      [identifier, identifier]
    );

    // SECURITY: timing-safe — always run bcrypt
    const dummy   = '$2a$12$invalidplaceholderhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const found   = rows.length > 0;
    const toCheck = found ? rows[0].password : dummy;
    const match   = await bcrypt.compare(String(password), toCheck);

    if (!found || !match) {
      // Log failed attempt (triggers account lockout after 5)
      await db.execute(
        'INSERT INTO login_attempts (identifier, ip_address, success, user_agent) VALUES (?, ?, 0, ?)',
        [identifier, req.ip, req.get('user-agent') || '']
      );
      return res.status(401).json({ success: false, message: 'Barua pepe au nywila si sahihi' });
    }

    const user      = rows[0];
    const token     = signToken(user.id);
    const tokenH    = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Use stored procedure to register session + audit
    await db.execute('CALL sp_login_success(?, ?, ?, ?, ?, ?)',
      [user.id, identifier, req.ip, req.get('user-agent') || '', tokenH, expiresAt]);

    const { password: _pw, otp_code: _otp, ...safe } = user;
    res.json({ success: true, token, user: safe });
  } catch (e) {
    console.error('login:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const { password: _pw, otp_code: _otp, locked_until: _lu, ...safe } = req.user;
  res.json({ success: true, user: safe });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await db.execute('CALL sp_logout(?, ?, ?)',
      [req.user.id, req.tokenHash, req.ip]);
    res.json({ success: true, message: 'Umetoka kikamilifu' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// PATCH /api/auth/update-profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : null;

    const sets = [], vals = [];
    if (name !== undefined) {
      if (String(name).trim().length < 2 || String(name).trim().length > 100)
        return res.status(400).json({ success: false, message: 'Jina si sahihi' });
      sets.push('name = ?'); vals.push(String(name).trim());
    }
    if (phone !== undefined) {
      if (!isPhone(phone))
        return res.status(400).json({ success: false, message: 'Simu si sahihi' });
      sets.push('phone = ?'); vals.push(String(phone).trim());
    }
    if (avatar) { sets.push('avatar = ?'); vals.push(avatar); }
    if (!sets.length)
      return res.status(400).json({ success: false, message: 'Hakuna mabadiliko' });

    vals.push(req.user.id);
    await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [u] = await db.execute(
      'SELECT id, name, email, phone, role, plan, avatar, verified FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, user: u[0] });
  } catch (e) {
    console.error('updateProfile:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// PATCH /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Jaza sehemu zote' });
    if (String(newPassword).length < 8 || String(newPassword).length > 128)
      return res.status(400).json({ success: false, message: 'Nywila mpya lazima iwe herufi 8-128' });

    const [r] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(String(currentPassword), r[0].password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Nywila ya sasa si sahihi' });

    await db.execute(
      'UPDATE users SET password = ?, password_changed_at = NOW() WHERE id = ?',
      [await bcrypt.hash(String(newPassword), 12), req.user.id]
    );

    // Revoke all other sessions (force re-login on other devices)
    await db.execute(
      'UPDATE user_sessions SET is_active = 0 WHERE user_id = ? AND token_hash <> ?',
      [req.user.id, req.tokenHash]
    );

    await db.execute(
      'INSERT INTO audit_log (user_id, action, ip_address, status) VALUES (?, ?, ?, ?)',
      [req.user.id, 'PASSWORD_CHANGED', req.ip, 'success']
    );

    res.json({ success: true, message: 'Nywila imebadilishwa. Vifaa vingine vimefutwa.' });
  } catch (e) {
    console.error('changePassword:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success:false, message:'Weka barua pepe au simu' });
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE (email=? OR phone=?) AND is_active=1 AND deleted_at IS NULL',
      [String(email).trim(), String(email).trim()]
    );
    // Always respond same (don't reveal if user exists)
    if (rows.length) {
      const otp = String(Math.floor(100000 + Math.random()*900000));
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(otp, 10);
      await db.execute(
        'INSERT INTO otp_verifications (user_id, otp_hash, purpose, expires_at) VALUES (?,?,?,?)',
        [rows[0].id, hash, 'password_reset', new Date(Date.now()+10*60000)]
      );
      // Send OTP via email (non-blocking)
      const [userRow] = await db.execute('SELECT email FROM users WHERE id = ?', [rows[0].id]);
      if (userRow.length && userRow[0].email) {
        const tpl = templates.passwordReset(otp);
        sendEmail({ to: userRow[0].email, subject: tpl.subject, html: tpl.html, text: tpl.text })
          .catch(err => console.error('OTP email failed:', err.message));
      } else {
        console.log(`OTP for user ${rows[0].id}: ${otp}`); // fallback log if no email
      }
    }
    res.json({ success:true, message:'Kama akaunti ipo, OTP imetumwa kwenye simu/barua pepe yako.' });
  } catch(e) { res.status(500).json({ success:false, message:'Hitilafu ya seva' }); }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email||!otp) return res.status(400).json({ success:false, message:'Jaza sehemu zote' });
    const [users] = await db.execute('SELECT id FROM users WHERE email=? OR phone=?', [email, email]);
    if (!users.length) return res.status(400).json({ success:false, message:'OTP si sahihi' });
    const [otps] = await db.execute(
      'SELECT id, otp_hash FROM otp_verifications WHERE user_id=? AND purpose=? AND used=0 AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1',
      [users[0].id, 'password_reset']
    );
    if (!otps.length) return res.status(400).json({ success:false, message:'OTP imeisha muda au si sahihi' });
    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare(String(otp), otps[0].otp_hash);
    if (!match) return res.status(400).json({ success:false, message:'OTP si sahihi' });
    await db.execute('UPDATE otp_verifications SET used=1 WHERE id=?', [otps[0].id]);
    res.json({ success:true, message:'OTP imethibitishwa', user_id:users[0].id });
  } catch(e) { res.status(500).json({ success:false, message:'Hitilafu ya seva' }); }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, user_id, new_password } = req.body;
    if (!new_password||new_password.length<8) return res.status(400).json({ success:false, message:'Nywila lazima iwe herufi 8+' });
    const bcrypt = require('bcryptjs');
    const id = user_id || (await db.execute('SELECT id FROM users WHERE email=? OR phone=?',[email,email]))[0][0]?.id;
    if (!id) return res.status(400).json({ success:false, message:'Mtumiaji hapatikani' });
    await db.execute('UPDATE users SET password=?, password_changed_at=NOW() WHERE id=?',
      [await bcrypt.hash(String(new_password),12), id]);
    await db.execute('UPDATE user_sessions SET is_active=0 WHERE user_id=?', [id]);
    res.json({ success:true, message:'Nywila imebadilishwa. Ingia tena.' });
  } catch(e) { res.status(500).json({ success:false, message:'Hitilafu ya seva' }); }
};

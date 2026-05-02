const jwt  = require('jsonwebtoken');
const db   = require('../config/db');
const crypto = require('crypto');

// Hash a JWT token for session lookup (never store raw token in DB)
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Main protect middleware — validates JWT + checks server-side session
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Hakuna token ya uthibitisho' });

    const token = header.split(' ')[1];

    // 1. Verify JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: jwtErr.name === 'TokenExpiredError'
          ? 'Kikao kimekwisha muda. Ingia tena.'
          : 'Token si halali',
      });
    }

    // 2. Load user from DB — checks is_active, not deleted
    const [rows] = await db.execute(
      `SELECT id, name, email, phone, role, plan, avatar, verified, is_active, locked_until, deleted_at
       FROM users WHERE id = ? AND is_active = 1 AND deleted_at IS NULL`,
      [decoded.id]
    );

    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Mtumiaji hapatikani au amefungwa' });

    const user = rows[0];

    // 3. Check account not locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        message: `Akaunti imefungwa hadi ${new Date(user.locked_until).toLocaleTimeString()}. Jaribu tena baadaye.`,
      });
    }

    // 4. Server-side session check (allows token revocation on logout)
    const tokenHash = hashToken(token);
    const [sess] = await db.execute(
      'SELECT id FROM user_sessions WHERE token_hash = ? AND is_active = 1 AND expires_at > NOW()',
      [tokenHash]
    );

    if (!sess.length) {
      // Session revoked or expired — force re-login
      return res.status(401).json({
        success: false,
        message: 'Kikao kimefutwa. Ingia tena.',
      });
    }

    // 5. Update session last used
    await db.execute(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE token_hash = ?',
      [tokenHash]
    );

    req.user       = user;
    req.tokenHash  = tokenHash;
    next();
  } catch (err) {
    console.error('protect middleware error:', err.message);
    return res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// Role authorization
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    // Log unauthorized access attempt
    db.execute(
      'INSERT INTO audit_log (user_id, action, ip_address, status) VALUES (?, ?, ?, ?)',
      [req.user.id, `UNAUTHORIZED_ACCESS_ATTEMPT:${req.path}`, req.ip, 'failure']
    ).catch(() => {});

    return res.status(403).json({
      success: false,
      message: 'Huna ruhusa ya kufanya hivi',
    });
  }
  next();
};

// Permission check against permissions table
const can = (resource, action) => async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT allowed FROM permissions WHERE role = ? AND resource = ? AND action = ?',
      [req.user.role, resource, action]
    );
    if (!rows.length || !rows[0].allowed) {
      return res.status(403).json({
        success: false,
        message: `Ruhusa ya '${action}' kwenye '${resource}' haipo kwa jukumu lako`,
      });
    }
    next();
  } catch {
    next();
  }
};

module.exports = { protect, authorize, can, hashToken };

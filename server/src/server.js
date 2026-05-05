require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const routes = require('./routes/index');
const db = require('./config/db');

const app = express();
const server = http.createServer(app);

// ============================================================
// SOCKET.IO WITH AUTHENTICATION
// ============================================================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Hakuna token'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Token si halali'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  const uid = socket.userId;
  console.log(`✅ User ${uid} connected to Socket.IO`);
  
  // Join user's personal room
  socket.join(`user_${uid}`);
  
  // Emit connection confirmation
  socket.emit('connected', { 
    message: 'Connected to MakaziPlus chat server', 
    userId: uid 
  });

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  socket.on('send_message', async (data) => {
    try {
      const { to_user_id, message, property_id } = data;
      const toId = parseInt(to_user_id);
      
      // Validation
      if (!toId || isNaN(toId) || toId === uid) {
        socket.emit('error', { message: 'Invalid recipient' });
        return;
      }
      
      if (!message || String(message).trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      if (String(message).trim().length > 5000) {
        socket.emit('error', { message: 'Message too long (max 5000 characters)' });
        return;
      }
      
      const safePropId = property_id ? parseInt(property_id) : null;
      const trimmedMessage = String(message).trim();
      
      // Save message to database
      const [result] = await db.execute(
        `INSERT INTO messages (from_user_id, to_user_id, property_id, message, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        [uid, toId, safePropId, trimmedMessage]
      );
      
      // Fetch the complete message with sender info
      const [msgRows] = await db.execute(
        `SELECT m.*, u.name AS from_name, u.avatar AS from_avatar
         FROM messages m
         JOIN users u ON u.id = m.from_user_id
         WHERE m.id = ?`,
        [result.insertId]
      );
      
      const newMessage = msgRows[0];
      
      // Send to recipient in real-time
      io.to(`user_${toId}`).emit('new_message', newMessage);
      
      // Confirm to sender
      socket.emit('message_sent', newMessage);
      
      // Create notification for recipient
      await db.execute(
        `INSERT INTO notifications (user_id, title, body, type, ref_id, ref_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [toId, 'Ujumbe Mpya 💬', `Umepewa ujumbe mpya kutoka kwa mtumiaji`, 'message', result.insertId, 'message']
      );
      
      // Send real-time notification
      io.to(`user_${toId}`).emit('notification', {
        type: 'message',
        title: 'Ujumbe Mpya',
        body: 'Umepewa ujumbe mpya',
        data: { message_id: result.insertId, from_user_id: uid }
      });
      
      console.log(`📨 Message ${result.insertId}: User ${uid} -> User ${toId}`);
      
    } catch (err) {
      console.error('Socket send_message error:', err.message);
      socket.emit('error', { message: 'Ujumbe haukutumwa: ' + err.message });
    }
  });

  // ============================================================
  // TYPING INDICATOR
  // ============================================================
  socket.on('typing', ({ to_user_id }) => {
    const toId = parseInt(to_user_id);
    if (toId && !isNaN(toId) && toId !== uid) {
      socket.to(`user_${toId}`).emit('user_typing', { from: uid });
    }
  });
  
  socket.on('stop_typing', ({ to_user_id }) => {
    const toId = parseInt(to_user_id);
    if (toId && !isNaN(toId)) {
      socket.to(`user_${toId}`).emit('user_stop_typing', { from: uid });
    }
  });

  // ============================================================
  // MARK MESSAGES AS READ
  // ============================================================
  socket.on('mark_read', async ({ from_user_id }) => {
    try {
      const fromId = parseInt(from_user_id);
      if (fromId && !isNaN(fromId)) {
        const [result] = await db.execute(
          'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0',
          [fromId, uid]
        );
        if (result.affectedRows > 0) {
          console.log(`📖 User ${uid} marked ${result.affectedRows} messages from ${fromId} as read`);
        }
      }
    } catch (err) {
      console.error('Mark read error:', err.message);
    }
  });

  // ============================================================
  // DISCONNECT
  // ============================================================
  socket.on('disconnect', () => {
    console.log(`❌ User ${uid} disconnected from Socket.IO`);
  });
});

// ============================================================
// SECURITY HEADERS (Helmet)
// ============================================================
try {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  console.log('✅ Helmet security headers active');
} catch {
  console.warn('⚠️ Run: cd server && npm install helmet');
}

// Trust proxy (for correct IP behind Render/Nginx)
app.set('trust proxy', 1);

// ============================================================
// CORS
// ============================================================
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// BODY PARSING
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// STATIC FILES FOR UPLOADS (CRITICAL)
// ============================================================
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
const propertiesDir = path.join(uploadsDir, 'properties');
const avatarsDir = path.join(uploadsDir, 'avatars');
const verificationDir = path.join(uploadsDir, 'verifications');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(propertiesDir)) fs.mkdirSync(propertiesDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
if (!fs.existsSync(verificationDir)) fs.mkdirSync(verificationDir, { recursive: true });

console.log('✅ Upload directories verified');
console.log(`   📁 Uploads: ${uploadsDir}`);
console.log(`   📁 Properties: ${propertiesDir}`);
console.log(`   📁 Avatars: ${avatarsDir}`);

// Serve uploaded files with proper CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  res.header('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(uploadsDir));

console.log(`✅ Static uploads serving enabled at: /uploads`);

// ============================================================
// IP BLOCK MIDDLEWARE
// ============================================================
app.use(async (req, res, next) => {
  try {
    const ip = req.ip;
    const [rows] = await db.execute(
      'SELECT id FROM blocked_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1',
      [ip]
    );
    if (rows.length) {
      return res.status(403).json({ success: false, message: 'Ufikiaji umezuiwa.' });
    }
    next();
  } catch { 
    next(); 
  }
});

// ============================================================
// RATE LIMITING
// ============================================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Majaribio mengi. Jaribu tena baada ya dakika 15.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Maombi mengi. Pumzika kidogo.' },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Majaribio mengi ya malipo. Jaribu tena baada ya saa 1.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api', apiLimiter);

// ============================================================
// DATABASE CONNECTION TEST
// ============================================================
app.use(async (req, res, next) => {
  try {
    if (!global.dbConnected) {
      await db.query('SELECT 1');
      global.dbConnected = true;
      console.log('✅ MySQL Connected and Ready');
    }
    next();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    next();
  }
});

// ============================================================
// ROUTES
// ============================================================
app.use('/api', routes);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ============================================================
// CHAT TEST ENDPOINT
// ============================================================
app.get('/api/chat/test', (req, res) => {
  res.json({
    success: true,
    message: 'Chat API is working',
    socketStatus: io.engine?.clientsCount || 0,
    timestamp: new Date()
  });
});

// ============================================================
// GET CONVERSATIONS ENDPOINT
// ============================================================
app.get('/api/chat/conversations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    const userId = decoded.id;
    
    const [conversations] = await db.execute(`
      SELECT
        DISTINCT u.id, u.name, u.email, u.avatar, u.role,
        (SELECT message FROM messages 
         WHERE (from_user_id = ? AND to_user_id = u.id)
            OR (from_user_id = u.id AND to_user_id = ?)
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages 
         WHERE (from_user_id = ? AND to_user_id = u.id)
            OR (from_user_id = u.id AND to_user_id = ?)
         ORDER BY created_at DESC LIMIT 1) AS last_time,
        (SELECT COUNT(*) FROM messages 
         WHERE from_user_id = u.id AND to_user_id = ? AND is_read = 0) AS unread
      FROM users u
      INNER JOIN messages m ON (m.from_user_id = u.id AND m.to_user_id = ?)
                           OR (m.to_user_id = u.id AND m.from_user_id = ?)
      WHERE u.id != ?
      GROUP BY u.id
      ORDER BY last_time DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);
    
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching conversations' });
  }
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = parseInt(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 MakaziPlus Server Running`);
  console.log(`========================================`);
  console.log(`📡 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
  console.log(`🛡️ Security: Helmet + Rate Limiting + IP Block`);
  console.log(`💬 Chat system ready - waiting for connections`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`========================================\n`);
});
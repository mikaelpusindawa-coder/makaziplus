const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const router = express.Router();
const VIDEO_DIR = path.join(__dirname, '../../uploads/videos');
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 1000000000);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `video-${ts}-${rand}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
  cb(null, allowed.includes(file.mimetype));
} });

router.post('/:id/video', upload.single('video'), async (req, res) => {
  const userId = req.user.id;
  const propId = parseInt(req.params.id);
  if (!req.file) return res.status(400).json({ success: false, message: 'Hakuna video.' });

  try {
    const [[property]] = await db.execute('SELECT id, owner_id FROM properties WHERE id = ?', [propId]);
    if (!property) { fs.unlinkSync(req.file.path); return res.status(404).json({ success: false, message: 'Mali haikupatikana.' }); }
    const isOwner = property.owner_id === userId || req.user.role === 'admin';
    if (!isOwner) { fs.unlinkSync(req.file.path); return res.status(403).json({ success: false, message: 'Huna ruhusa.' }); }

    const videoUrl = `/uploads/videos/${req.file.filename}`;
    const [[existing]] = await db.execute('SELECT id, video_url FROM property_videos WHERE property_id = ?', [propId]);
    if (existing) {
      const oldPath = path.join(__dirname, '../../', existing.video_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      await db.execute('UPDATE property_videos SET video_url = ?, file_size = ?, original_name = ? WHERE property_id = ?', [videoUrl, req.file.size, req.file.originalname, propId]);
    } else {
      await db.execute('INSERT INTO property_videos (property_id, video_url, file_size, original_name) VALUES (?, ?, ?, ?)', [propId, videoUrl, req.file.size, req.file.originalname]);
    }
    res.status(201).json({ success: true, data: { video_url: videoUrl } });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  }
});

router.delete('/:id/video', async (req, res) => {
  const userId = req.user.id;
  const propId = parseInt(req.params.id);
  try {
    const [[property]] = await db.execute('SELECT owner_id FROM properties WHERE id = ?', [propId]);
    if (!property) return res.status(404).json({ success: false, message: 'Mali haikupatikana.' });
    const isOwner = property.owner_id === userId || req.user.role === 'admin';
    if (!isOwner) return res.status(403).json({ success: false, message: 'Huna ruhusa.' });
    const [[vid]] = await db.execute('SELECT video_url FROM property_videos WHERE property_id = ?', [propId]);
    if (!vid) return res.status(404).json({ success: false, message: 'Video haikupatikana.' });
    const filePath = path.join(__dirname, '../../', vid.video_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.execute('DELETE FROM property_videos WHERE property_id = ?', [propId]);
    res.json({ success: true, message: 'Video imefutwa.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva.' });
  }
});

module.exports = router;
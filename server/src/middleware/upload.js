const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories
const uploadDir = path.join(__dirname, '../../uploads');
const avatarDir = path.join(uploadDir, 'avatars');
const propertyDir = path.join(uploadDir, 'properties');
const verificationDir = path.join(uploadDir, 'verifications');
const videoDir = path.join(uploadDir, 'videos');

// Ensure directories exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(propertyDir)) fs.mkdirSync(propertyDir, { recursive: true });
if (!fs.existsSync(verificationDir)) fs.mkdirSync(verificationDir, { recursive: true });
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

console.log('✅ Upload directories ready');
console.log(`   📁 Uploads: ${uploadDir}`);
console.log(`   📁 Avatars: ${avatarDir}`);
console.log(`   📁 Properties: ${propertyDir}`);
console.log(`   📁 Videos: ${videoDir}`);
console.log(`   📁 Verifications: ${verificationDir}`);

// Allowed MIME types for images and videos
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
]);

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', 
  '.mp4', '.webm', '.mov', '.ogg'
]);

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tumia picha za JPEG, PNG, WEBP, GIF au video za MP4, WebM, MOV'), false);
  }
};

// ============================================================
// AVATAR STORAGE
// ============================================================
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `avatar-${timestamp}-${randomNum}${sanitizedExt}`);
  },
});

// ============================================================
// PROPERTY IMAGES STORAGE
// ============================================================
const propertyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if it's a video
    if (file.mimetype.startsWith('video/')) {
      cb(null, videoDir);
    } else {
      cb(null, propertyDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    const prefix = file.mimetype.startsWith('video/') ? 'video' : 'prop';
    cb(null, `${prefix}-${timestamp}-${randomNum}${sanitizedExt}`);
  },
});

// ============================================================
// VERIFICATION DOCUMENTS STORAGE
// ============================================================
const verificationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, verificationDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `verification-${timestamp}-${randomNum}${sanitizedExt}`);
  },
});

// ============================================================
// CREATE MULTER INSTANCES
// ============================================================

// Single avatar upload (for profile)
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

// Multiple files upload (property images + videos) - max 15 files total
const propertyUpload = multer({
  storage: propertyStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 15 } // 50MB per video
});

// Verification documents upload (max 3 files)
const verificationUpload = multer({
  storage: verificationStorage,
  fileFilter: fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, files: 3 }
});

// ============================================================
// EXPORT MIDDLEWARE FUNCTIONS
// ============================================================

module.exports = {
  single: (fieldName) => (req, res, next) => {
    avatarUpload.single(fieldName)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },

  array: (fieldName, maxCount) => (req, res, next) => {
    propertyUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      if (req.files && req.files.length) {
        const images = req.files.filter(f => !f.mimetype.startsWith('video/'));
        const videos = req.files.filter(f => f.mimetype.startsWith('video/'));
        console.log(`✅ Uploaded ${images.length} images and ${videos.length} videos`);
      }
      next();
    });
  },

  fields: (fields) => (req, res, next) => {
    verificationUpload.fields(fields)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },

  avatarUpload,
  propertyUpload,
  verificationUpload,
  
  uploadDir,
  propertyDir,
  avatarDir,
  verificationDir,
  videoDir
};
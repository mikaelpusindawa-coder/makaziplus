const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories
const uploadDir = path.join(__dirname, '../../uploads');
const avatarDir = path.join(uploadDir, 'avatars');
const propertyDir = path.join(uploadDir, 'properties');
const verificationDir = path.join(uploadDir, 'verifications');

// Ensure directories exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(propertyDir)) fs.mkdirSync(propertyDir, { recursive: true });
if (!fs.existsSync(verificationDir)) fs.mkdirSync(verificationDir, { recursive: true });

console.log('✅ Upload directories ready');

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Avatar storage
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `avatar-${timestamp}-${randomNum}${sanitizedExt}`);
  },
});

// Property images storage
const propertyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, propertyDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `prop-${timestamp}-${randomNum}${sanitizedExt}`);
  },
});

// Verification documents storage
const verificationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, verificationDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `verification-${timestamp}-${randomNum}${sanitizedExt}`);
  },
});

// File filter
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tumia picha za JPEG, PNG, WEBP, au GIF tu'), false);
  }
};

// Multer instances
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

const propertyUpload = multer({
  storage: propertyStorage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, files: 10 }
});

const verificationUpload = multer({
  storage: verificationStorage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, files: 3 }
});

// Helper function to get file URL
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${path.basename(path.dirname(filename))}/${path.basename(filename)}`;
};

// Export middleware functions
module.exports = {
  // Single file upload (avatar)
  single: (fieldName) => (req, res, next) => {
    avatarUpload.single(fieldName)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  
  // Multiple files upload (property images)
  array: (fieldName, maxCount) => (req, res, next) => {
    propertyUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  
  // Multiple fields upload (verification documents)
  fields: (fields) => (req, res, next) => {
    verificationUpload.fields(fields)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  
  // Get file URL helper
  getFileUrl,
  
  // Direct multer instances (for advanced use)
  avatarUpload,
  propertyUpload,
  verificationUpload
};
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories
const uploadDir = path.join(__dirname, '../../uploads');
const avatarDir = path.join(uploadDir, 'avatars');
const propertyDir = path.join(uploadDir, 'properties');
const verificationDir = path.join(uploadDir, 'verifications');

// Ensure directories exist synchronously at startup
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(propertyDir)) fs.mkdirSync(propertyDir, { recursive: true });
if (!fs.existsSync(verificationDir)) fs.mkdirSync(verificationDir, { recursive: true });

console.log('✅ Upload directories ready');
console.log(`   📁 Uploads: ${uploadDir}`);
console.log(`   📁 Avatars: ${avatarDir}`);
console.log(`   📁 Properties: ${propertyDir}`);
console.log(`   📁 Verifications: ${verificationDir}`);

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tumia picha za JPEG, PNG, WEBP, au GIF tu'), false);
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
// PROPERTY IMAGES STORAGE (CRITICAL FIX)
// ============================================================
const propertyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, propertyDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `prop-${timestamp}-${randomNum}${sanitizedExt}`);
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

// Multiple property images upload (max 10 images)
const propertyUpload = multer({
  storage: propertyStorage,
  fileFilter: fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, files: 10 }
});

// Verification documents upload (max 3 files)
const verificationUpload = multer({
  storage: verificationStorage,
  fileFilter: fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, files: 3 }
});

// ============================================================
// HELPER FUNCTION: Get file URL for response
// ============================================================
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  // Return relative path that will be served by express static
  return filename;
};

// ============================================================
// EXPORT MIDDLEWARE FUNCTIONS
// ============================================================

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

  // Multiple files upload (property images) - CRITICAL FOR PROPERTY IMAGES
  array: (fieldName, maxCount) => (req, res, next) => {
    propertyUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      // Log uploaded files for debugging
      if (req.files && req.files.length) {
        console.log(`✅ Uploaded ${req.files.length} property images`);
        req.files.forEach((file, i) => {
          console.log(`   Image ${i + 1}: ${file.filename}`);
        });
      } else {
        console.log('⚠️ No property images uploaded');
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

  // Direct multer instances for advanced use
  avatarUpload,
  propertyUpload,
  verificationUpload,
  
  // Directory paths for debugging
  uploadDir,
  propertyDir,
  avatarDir,
  verificationDir
};
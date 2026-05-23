// server/src/middleware/upload.js
const multer = require('multer');

// Use memory storage (upload to Cloudinary directly from buffer)
const memoryStorage = multer.memoryStorage();

// Allowed MIME types for images and videos
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
]);

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tumia picha za JPEG, PNG, WEBP, GIF au video za MP4, WebM, MOV'), false);
  }
};

// Create multer instance with memory storage (for Cloudinary upload)
const upload = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB for videos
    files: 15 // Max 15 files per request
  }
});

// ============================================================
// EXPORT MIDDLEWARE FUNCTIONS
// ============================================================

module.exports = {
  // Single file upload (for avatar)
  single: (fieldName) => upload.single(fieldName),
  
  // Multiple files upload (for property images)
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  
  // Fields upload (for verification documents)
  fields: (fields) => upload.fields(fields),
  
  // Direct multer instance
  upload,
  
  // File filter for reference
  fileFilter,
  
  // Keep these for backward compatibility (some files may still reference them)
  avatarUpload: upload,
  propertyUpload: upload,
  verificationUpload: upload,
  
  uploadDir: null, // No longer used - Cloudinary handles storage
  propertyDir: null,
  avatarDir: null,
  verificationDir: null,
  videoDir: null,
};

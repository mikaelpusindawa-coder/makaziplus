// server/src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log('✅ Cloudinary configured for:', process.env.CLOUDINARY_CLOUD_NAME);

// Upload buffer to Cloudinary (for memory storage)
const uploadBuffer = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.upload_stream(
      {
        folder: options.folder || 'makaziplus/properties',
        resource_type: options.resource_type || 'image',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const streamifier = require('streamifier');
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Delete file from Cloudinary
const deleteFile = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

// Get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  });
};

module.exports = {
  cloudinary,
  uploadBuffer,
  deleteFile,
  getOptimizedUrl,
};

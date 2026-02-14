const supabase = require('../config/supabase');

/**
 * Upload image to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Name for the file
 * @param {string} mimeType - MIME type (image/png, image/jpeg)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
const uploadImage = async (fileBuffer, fileName, mimeType) => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('food-images')
      .upload(uniqueFileName, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error('Failed to upload image to storage');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('food-images')
      .getPublicUrl(uniqueFileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Delete image from Supabase Storage
 * @param {string} imageUrl - Full URL of the image
 * @returns {Promise<boolean>} - Success status
 */
const deleteImage = async (imageUrl) => {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('food-images')
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Image delete error:', error);
    return false;
  }
};

module.exports = {
  uploadImage,
  deleteImage
};
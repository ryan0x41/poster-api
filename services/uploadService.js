const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// SOURCE: GPT
// QUESTION: give me a function to upload an image to a folder on cloudinary
const uploadImage = (fileBuffer, folder = "images", filename = null) => {
  return new Promise((resolve, reject) => {
    // Generate filename if not provided
    if (!filename) {
      filename = `image-${crypto.randomBytes(6).toString("hex")}`; // Unique filename
    }

    // Extract the file extension
    const fileExtension = path.extname(filename); // e.g., .jpg, .png

    // Remove spaces & normalize filename
    const baseFilename = path.basename(filename, fileExtension).replace(/\s+/g, "_");

    // Combine filename and extension
    const publicId = `${folder}/${baseFilename}${fileExtension}`;

    const options = folder === "profile-image"
      ? {
        folder,
        public_id: publicId,
        resource_type: "image",
        transformation: [{ width: 200, height: 200, crop: "fill" }]
      }
      : {
        folder,
        public_id: publicId,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }]
      };

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = { uploadImage };

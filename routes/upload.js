const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const authenticateCookie = require('../middleware/authenticateCookie')

const { uploadImage } = require('../services/uploadService');

router.post('/image', authenticateCookie, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
          return res.status(400).json({ error: "no file uploaded" });
        }
    
        const imageUrl = await uploadImage(req.file.buffer, 'images');
        
        res.json({ imageUrl });
      } catch (error) {
        console.error("upload error:", error);
        res.status(500).json({ error: "image upload failed" });
      }
});

module.exports = router;
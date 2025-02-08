const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { uploadImage } = require('../services/uploadService');

// the CRUD operations needed from userService
const { createUser, loginUser, deleteUser, editUser, resetPassword, updateProfileImageUrl, getUserProfile } = require('../services/userService');

// security reasons, dont allow users to delete other user accounts and what not
const authenticateCookie = require('../middleware/authenticateCookie');

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // if username, email or password do not exist
    if (!username || !email || !password) {
        // status 400 is bad request
        return res.status(400).json({ error: 'username, email, and password are required to register!' });
    }

    // try to create a new user
    try {
        // status 201 is creation successful
        const newUser = await createUser(username, email, password );
        res.status(201).json({ message: 'user created successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        // status 400 is bad request
        return res.status(400).json({ error: 'username, and password are required to login!' });
    }

    try {
        // status 201 is creation successful
        const { token } = await loginUser(usernameOrEmail, password );
        res.status(201).json({ message: 'user logged in successfully', token: token });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }    
});

router.post('/reset-password', authenticateCookie, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const { message } = await resetPassword(oldPassword, newPassword, req.user.id);

        res.status(202).json({ message: message });
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: error.message });
    }
});

router.post('/update-info', authenticateCookie, async (req, res) => {
    try {
        const { newEmail, newUsername } = req.body;
        const { message, token } = await editUser(newUsername, newEmail, req.user.id);

        res.status(202).json({ message: message, token });
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: error.message });
    }
});

router.get('/profile/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const { message, user } = await getUserProfile(username);

        res.status(200).json({ message: message, user})
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: error.message });
    }
});

router.post('/profile-image', authenticateCookie, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "no file uploaded" });
          }

          const imageUrl = await uploadImage(req.file.buffer, 'profile-image', req.user.id);
          const { userId } = await updateProfileImageUrl(req.user.id, imageUrl);

          res.json({ userId: userId, imageUrl: imageUrl });
    } catch (error) {
        console.error("error uploading profile image:", error);
        res.status(500).json({ error: error });
    }
});

router.post('/delete-account', authenticateCookie, async (req, res) => {
    const { userId, usernameOrEmail, password } = req.body;

    // validate against auth user
    if (!req.user || req.user.id !== userId) {
        return res.status(401).json({ error: 'not a chance' });
    }

    try {
        // auth user
        const { user } = await loginUser(usernameOrEmail, password);

        if (!user || user.id !== req.user.id) {
            return res.status(401).json({ error: 'invalid username, email or password for this account' });
        }

        // make sure password is correct
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return res.status(400).json({ error: 'invalid password' });
        }

        // delete account
        const deletedUser = await deleteUser(userId);
        if (!deletedUser || !deletedUser.username) {
            throw new Error('failed to delete user');
        }

        res.status(200).json({ message: `goodbye ${deletedUser.username} ;(` });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});



module.exports = router;
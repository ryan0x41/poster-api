const express = require('express');
const router = express.Router();

const { getNewUsers } = require('../services/userService');
const { decodeToken, authenticateAuthHeader } = require('../middleware/authenticateAuthHeader');

router.get('/new/users', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const { users } = await getNewUsers();
        res.status(200).json({ message: "new users retrieved successfuly", users });
    } catch (error) {
        console.error("error getting users:", error.message);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 
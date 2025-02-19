const express = require('express');
const router = express.Router();
const { getSpotifyAuthUrl, spotifyCallback, getSpotifyTopData } = require('../controllers/spotifyController');
const authenticateCookie = require('../middleware/authenticateCookie');

router.get('/auth', authenticateCookie, getSpotifyAuthUrl);
router.get('/callback', authenticateCookie, spotifyCallback);
router.get('/', authenticateCookie, getSpotifyTopData);

module.exports = router;
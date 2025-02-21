const express = require('express');
const router = express.Router();
const {
    getSpotifyAuthUrl,
    spotifyCallback,
    getSpotifyTopData,
    getSpotifyTopArtists,
    getSpotifyTopTracks,
} = require('../controllers/spotifyController');
const authenticateAuthHeader = require('../middleware/authenticateAuthHeader');

router.get('/auth', authenticateAuthHeader, getSpotifyAuthUrl);
router.get('/callback', authenticateAuthHeader, spotifyCallback);

router.get('/top/:option?/:userId?', authenticateAuthHeader, async (req, res, next) => {
    try {
        let { option, userId } = req.params;
        userId = userId || req.query.userId || req.user.id;

        // no option provided, default to req.user.id (self)
        if (!option) {
            userId = req.user.id;
        } else if (["tracks", "artists"].includes(option)) {
            // if valid option is provided, use it and default to req.user.id if userId does not exist
            userId = userId || req.query.userId || req.user.id;
        } else {
            // if not valid, assume it is userId
            userId = option;
            option = undefined;
        }
        // ... we out here ahead of the game and shi

        let data;
        if (option === "tracks") {
            data = await getSpotifyTopTracks(userId);
        } else if (option === "artists") {
            data = await getSpotifyTopArtists(userId);
        } else {
            data = await getSpotifyTopData(userId);
        }

        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
});



module.exports = router;
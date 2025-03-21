const express = require('express');
const router = express.Router();
const {
    getSpotifyAuthUrl,
    spotifyCallback,
    getSpotifyTopData,
    getSpotifyTopArtists,
    getSpotifyTopTracks,
    getCurrentlyPlaying,
} = require('../controllers/spotifyController');
const { decodeToken, authenticateAuthHeader, verifyToken } = require('../middleware/authenticateAuthHeader');

const stateStore = {};

router.get('/auth', decodeToken, authenticateAuthHeader, async (req, res, next) => {
    try {
        const state = Math.random().toString(36).substr(2, 10);
        stateStore[state] = req.token;
        const authorizeURL = getSpotifyAuthUrl(state);
        const url = new URL(authorizeURL);
        url.searchParams.set("state", state);
        res.status(200).json({ authorizeURL: url.toString() });
    } catch (error) {
        next(error);
    }
});

router.get('/callback', async (req, res, next) => {
    const state = req.query.state;
    if (!state || !stateStore[state]) {
        const error = new Error("invalid or missing state parameter");
        error.status = 401;
        return next(error);
    }
    const token = stateStore[state];
    delete stateStore[state];
    try {
        req.user = await verifyToken(token);
        req.token = token;
        next();
    } catch (error) {
        error.status = 401;
        return next(error);
    }
}, spotifyCallback);

router.get('/top/:option?/:userId?', decodeToken, authenticateAuthHeader, async (req, res, next) => {
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

router.get('/playing/:userId?', decodeToken, authenticateAuthHeader, async (req, res, next) => {
    try {
        let { userId } = req.params;
        userId = userId || req.user.id;

        const data = await getCurrentlyPlaying(userId);

        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
});



module.exports = router;
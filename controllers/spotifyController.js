const SpotifyWebApi = require('spotify-web-api-node');
const { linkSpotify } = require('../services/userService');
const { SpotifyAccount } = require('../models/SpotifyAccount');
const crypto = require('crypto');

const spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectUri: "http://localhost:3000/spotify/callback", 
	// redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

const getSpotifyAuthUrl = (req, res) => {
	const scopes = ['user-top-read']; // permissions for spotify, change if needed

	// csrf stuff i read up on
	const state = crypto.randomBytes(16).toString('hex');
  	req.session.spotifyState = state;

	const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
	res.redirect(authorizeURL);
};

const spotifyCallback = async (req, res) => {
	const { code, state: returnedState } = req.query;

	if (returnedState !== req.session.spotifyState) {
		return res.status(403).json({ error: 'state mismatch' });
	}
	
	delete req.session.spotifyState;

	try {
		const data = await spotifyApi.authorizationCodeGrant(code);
		const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = data.body;
		const expiresAt = Date.now() + expiresIn * 1000;

		spotifyApi.setAccessToken(accessToken);

		const spotifyProfile = await spotifyApi.getMe();
    	const spotifyId = spotifyProfile.body.id;

		console.log(req.user)

		const spotifyAccount = new SpotifyAccount({ 
			userId: req.user.id, 
			accessToken, 
			refreshToken, 
			expiresAt, 
			spotifyId 
		});

		await linkSpotify(spotifyAccount);

		res.json({ message: 'spotify connected successfully' });
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ error: "failed to auth with spotify" });
	}
};

const getSpotifyTopData = async (req, res) => {
	try {
		spotifyApi.setAccessToken(req.user.spotifyAccessToken);

		const topArtistsData = await spotifyApi.getMyTopArtists({ limit: 10 });
		const topTracksData = await spotifyApi.getMyTopTracks({ limit: 10 });

		res.status(200).json({
			topArtists: topArtistsData.body.items,
			topTracks: topTracksData.body.items,
		});
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ error: "failed to get spotify top artists/songs" });
	}
};

module.exports = {
	getSpotifyAuthUrl,
	spotifyCallback,
	getSpotifyTopData,
};
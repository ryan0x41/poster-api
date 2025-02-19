const SpotifyWebApi = require('spotify-web-api-node');
const { linkSpotify } = require('../services/userService');
const { getSpotifyAccessToken } = require('../services/spotifyService');
const { SpotifyAccount } = require('../models/SpotifyAccount');
const crypto = require('crypto');

const spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectUri: process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/spotify/callback",
});

const getSpotifyAuthUrl = (req, res) => {
	const scopes = ['user-top-read', 'user-read-recently-played']; // permissions for spotify, change if needed

	// csrf stuff i read up on
	const state = crypto.randomBytes(16).toString('hex');
  	req.session.spotifyState = state;

	const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

	res.status(200).json({ message: "success", authorizeURL });
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

async function getSpotifyTopArtists(userId) {
	const { accessToken } = await getSpotifyAccessToken(userId);
	spotifyApi.setAccessToken(accessToken);

	const topArtistsData = await spotifyApi.getMyTopArtists({ limit: 10 });
	return topArtistsData.body.items;
}

async function getSpotifyTopTracks(userId) {
	const { accessToken } = await getSpotifyAccessToken(userId);
	spotifyApi.setAccessToken(accessToken);

	const topTracksData = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 10 });

	// mannnn spotify had some really ugly json 
	const cleanedTracks = topTracksData.body.items.map(item => {
		const { track, played_at } = item;
		return {
		played_at,
		track: {
			id: track.id,
			name: track.name,
			url: track.external_urls.spotify,
			album: {
				id: track.album.id,
				name: track.album.name,
				// the first image
				image: track.album.images && track.album.images[0] ? track.album.images[0].url : null,
				url: track.album.external_urls.spotify,
			},
			artists: track.artists.map(artist => ({
				id: artist.id,
				name: artist.name,
				url: artist.external_urls.spotify,
			})),
		},
		};
	});
	
	return cleanedTracks;
}

async function getSpotifyTopData(userId) {
	const { accessToken } = await getSpotifyAccessToken(userId);
	spotifyApi.setAccessToken(accessToken);
	
	const topArtistsData = await spotifyApi.getMyTopArtists({ limit: 10 });
	const topTracksData = await getSpotifyTopTracks(userId);
	
	return {
		topArtists: topArtistsData.body.items,
		topTracks: topTracksData,
	};
}

module.exports = {
	getSpotifyAuthUrl,
	spotifyCallback,
	getSpotifyTopData,
	getSpotifyTopArtists,
	getSpotifyTopTracks,
};
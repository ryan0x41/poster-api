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
	const scopes = [
					'user-top-read',
				    'user-read-recently-played',
				    'user-read-currently-playing',
					'user-read-playback-state',
				   ];	// permissions for spotify, change if needed

	// csrf stuff i read up on
	const state = crypto.randomBytes(16).toString('hex');
  	req.session.spotifyState = state;

	const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

	res.redirect(authorizeURL);
	//res.status(200).json({ message: "success", authorizeURL });
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
	return { artists: topArtistsData.body.items };
}

async function getSpotifyTopTracks(userId) {
	const { accessToken } = await getSpotifyAccessToken(userId);
	spotifyApi.setAccessToken(accessToken);

	const topTracksData = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 10 });
	console.log(topTracksData);
	// mannnn spotify had some really ugly json 
	const tracks = await cleanTracks(topTracksData);

	return { tracks };
}

async function cleanTracks(tracksData) {
	if (!tracksData || !tracksData.body) {
		console.error("Invalid tracksData structure:", tracksData);
		return [];
	}

	if (Array.isArray(tracksData.body.items)) {
		return tracksData.body.items.map(item => {
			if (!item.track) return null;

			return formatTrack(item.track, item.played_at);
		}).filter(Boolean);
	} else if (tracksData.body.item) {
		return [formatTrack(tracksData.body.item, tracksData.body.timestamp)];
	}

	console.error("Unexpected tracksData format:", tracksData);
	return [];
}

function formatTrack(track, played_at) {
	return {
		played_at: played_at || null,
		track: {
			id: track.id,
			name: track.name,
			url: track.external_urls?.spotify || null,
			album: {
				id: track.album?.id || null,
				name: track.album?.name || "unknown album",
				image: track.album?.images?.[0]?.url || null,
				url: track.album?.external_urls?.spotify || null,
			},
			artists: track.artists?.map(artist => ({
				id: artist.id,
				name: artist.name,
				url: artist.external_urls?.spotify || null,
			})) || [],
		},
	};
}

async function getCurrentlyPlaying(userId) {
	const { accessToken } = await getSpotifyAccessToken(userId);
	spotifyApi.setAccessToken(accessToken);
	
	const currentlyPlaying = await spotifyApi.getMyCurrentPlaybackState();
	if (!currentlyPlaying.body || !currentlyPlaying.body.item) {
		return { message: "no track currently playing", tracks: [] };
	}

	const tracks = await cleanTracks(currentlyPlaying);

	return { tracks };
}

async function getSpotifyTopData(userId) {
	const { accessToken } = await getSpotifyAccessToken(userId);
	spotifyApi.setAccessToken(accessToken);
	
	const topArtistsData = await spotifyApi.getMyTopArtists({ limit: 10 });
	const topTracksData = await getSpotifyTopTracks(userId);
	
	return {
		artists: topArtistsData.body.items,
		tracks: topTracksData,
	};
}

module.exports = {
	getSpotifyAuthUrl,
	spotifyCallback,
	getSpotifyTopData,
	getSpotifyTopArtists,
	getSpotifyTopTracks,
	getCurrentlyPlaying,
};
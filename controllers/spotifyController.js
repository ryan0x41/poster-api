const dotenv = require('dotenv');
dotenv.config({ path: '.config' });
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

const getSpotifyAuthUrl = (state) => {
	const scopes = [
		'user-top-read',
		'user-read-recently-played',
		'user-read-currently-playing',
		'user-read-playback-state',
	];
	return spotifyApi.createAuthorizeURL(scopes, state);
};

const spotifyCallback = async (req, res) => {
	const { code } = req.query;

	if (req.session) {
		delete req.session.spotifyState;
	} else {
		delete req.spotifyState;
	}

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
		
		res.redirect((process.env.FRONTEND_URL || 'http://localhost:4000') + '/spotify/success');
	} catch (error) {
		console.error(error.message);
		res.redirect((process.env.FRONTEND_URL || 'http://localhost:4000') + '/spotify/failure');
	}
};

async function getSpotifyTopArtists(userId) {
	try {
		const { accessToken } = await getSpotifyAccessToken(userId);
		spotifyApi.setAccessToken(accessToken);

		const topArtistsData = await spotifyApi.getMyTopArtists({ limit: 10 });
		return { artists: topArtistsData.body.items };
	} catch (error) {
		console.error(error.message);
		return { artists: [] };
	}
}

async function getSpotifyTopTracks(userId) {
	try {
		const { accessToken } = await getSpotifyAccessToken(userId);
		spotifyApi.setAccessToken(accessToken);

		const topTracksData = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 10 });
		console.log(topTracksData);
		// mannnn spotify had some really ugly json 
		const tracks = await cleanTracks(topTracksData);

		return { tracks };
	} catch (error) {
		console.error(error.message);
		return { artists: [] };
	}
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
	console.log(track.album.images)
	return {
		played_at: played_at || null,
		track: {
			id: track.id,
			name: track.name,
			url: track.external_urls?.spotify || null,
			album: {
				id: track.album?.id || null,
				name: track.album?.name || "unknown album",
				image: track.album?.images?.[2]?.url || null,
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
	try {
		const { accessToken } = await getSpotifyAccessToken(userId);
		spotifyApi.setAccessToken(accessToken);

		const currentlyPlaying = await spotifyApi.getMyCurrentPlaybackState();
		if (!currentlyPlaying.body || !currentlyPlaying.body.item) {
			return { message: "no track currently playing", tracks: [] };
		}

		const tracks = await cleanTracks(currentlyPlaying);

		return { tracks };
	} catch (error) {
		console.error({ error: error.message });
		return { tracks: [] };
	}
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
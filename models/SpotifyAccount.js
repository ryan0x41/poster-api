class SpotifyAccount {
    constructor({ userId, accessToken, refreshToken, expiresAt, spotifyId }) {
        if (!userId || !accessToken || !refreshToken || !expiresAt) {
            throw new Error('all fields (userId, accessToken, refreshToken, expiresAt) are required to make a SpotifyAccount');
        }

        this.spotifyId = spotifyId;
        this.userId = userId;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
    }
}

module.exports = { SpotifyAccount };
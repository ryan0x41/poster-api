const { connectDB } = require('./db')
// get spotify access token and refresh it if expired
async function getSpotifyAccessToken(userId) {
    const db = await connectDB();
    const spotifyCollection = db.collection('spotifyAccounts');
    
    const spotifyAccount = await spotifyCollection.findOne({ userId });
    if (!spotifyAccount) {
        throw new Error("spotify account not linked");
    }

    // check if access token is expired, if so refresh
    if (Date.now() > spotifyAccount.expiresAt) {
        spotifyApi.setRefreshToken(spotifyAccount.refreshToken);
        const data = await spotifyApi.refreshAccessToken();

        const newAccessToken = data.body.access_token;
        const newExpiresAt = Date.now() + data.body.expires_in * 1000;

        await spotifyCollection.updateOne(
            { userId },
            { $set: { accessToken: newAccessToken, expiresAt: newExpiresAt } }
        );
        spotifyAccount.accessToken = newAccessToken;
      }

      return { accessToken: spotifyAccount.accessToken };
}

module.exports = { getSpotifyAccessToken };
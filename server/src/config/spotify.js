const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId:     process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri:  process.env.SPOTIFY_REDIRECT_URI,
});

/**
 * Refreshes the Spotify Client Credentials token.
 * Used for server-to-server requests (search, metadata) that don't
 * require a user to be logged in.
 */
const refreshClientCredentials = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);
    console.log('🎵 Spotify client credentials refreshed');

    // Auto-refresh slightly before expiry
    const expiresIn = data.body.expires_in; // seconds
    setTimeout(refreshClientCredentials, (expiresIn - 60) * 1000);
  } catch (error) {
    console.error('❌ Spotify token refresh failed:', error.message);
  }
};

module.exports = { spotifyApi, refreshClientCredentials };

const SpotifyWebApi = require('spotify-web-api-node');

const getRedirectUri = () => {
  const uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/auth/spotify/callback';
  return uri.trim();
};

const spotifyApi = new SpotifyWebApi({
  clientId: (process.env.SPOTIFY_CLIENT_ID || '').trim(),
  clientSecret: (process.env.SPOTIFY_CLIENT_SECRET || '').trim(),
  redirectUri: getRedirectUri(),
});

// Sync configuration whenever called in case env vars were loaded asynchronously
const syncSpotifyCredentials = () => {
  if (process.env.SPOTIFY_CLIENT_ID) {
    spotifyApi.setClientId(process.env.SPOTIFY_CLIENT_ID.trim());
  }
  if (process.env.SPOTIFY_CLIENT_SECRET) {
    spotifyApi.setClientSecret(process.env.SPOTIFY_CLIENT_SECRET.trim());
  }
  spotifyApi.setRedirectURI(getRedirectUri());
};

/**
 * Scopes for Spotify OAuth user authorization
 */
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'playlist-read-private',
];

/**
 * Generates Spotify authorization URL for users to link their account
 */
const getSpotifyAuthorizeUrl = (state) => {
  syncSpotifyCredentials();
  return spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, state || 'whiplash-auth', true);
};

/**
 * Refreshes the Spotify Client Credentials token.
 * Used for server-to-server requests (search, track metadata) that don't
 * require a specific user's private data.
 */
const refreshClientCredentials = async () => {
  syncSpotifyCredentials();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.includes('your_spotify_')) {
    console.warn('⚠️ Spotify credentials not configured. Skipping server token refresh.');
    return;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);
    console.log('🎵 Spotify client credentials refreshed');

    const expiresIn = data.body.expires_in || 3600; // seconds
    setTimeout(refreshClientCredentials, Math.max((expiresIn - 60) * 1000, 60000));
  } catch (error) {
    console.warn('⚠️ Spotify client credentials refresh failed:', error.message);
  }
};

module.exports = {
  spotifyApi,
  getSpotifyAuthorizeUrl,
  refreshClientCredentials,
  syncSpotifyCredentials,
};

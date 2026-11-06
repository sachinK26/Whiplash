const { spotifyApi, syncSpotifyCredentials } = require('../config/spotify');

/**
 * Ensures spotifyApi has a valid client credentials access token.
 * Automatically fetches one if not already set.
 */
const ensureSpotifyAccessToken = async () => {
  syncSpotifyCredentials();
  const token = spotifyApi.getAccessToken();
  if (!token) {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);
  }
};

/**
 * Normalizes Spotify track object into clean internal Whiplash shape
 */
const normalizeTrack = (track) => {
  if (!track) return null;

  const artistNames = track.artists ? track.artists.map((a) => a.name) : [];
  const artists = track.artists
    ? track.artists.map((a) => ({ id: a.id, name: a.name }))
    : [];

  const releaseDate = track.album?.release_date || null;
  const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;
  const coverImage = track.album?.images?.[0]?.url || '';

  return {
    id: track.id,
    spotifyId: track.id,
    targetType: 'track',
    title: track.name,
    trackName: track.name,
    artistNames,
    artists,
    albumName: track.album?.name || '',
    albumId: track.album?.id || '',
    coverImage,
    coverImages: track.album?.images || [],
    durationMs: track.duration_ms,
    popularity: track.popularity,
    previewUrl: track.preview_url || null,
    releaseYear,
    releaseDate,
    spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
  };
};

/**
 * Normalizes Spotify album object into clean internal Whiplash shape
 */
const normalizeAlbum = (album) => {
  if (!album) return null;

  const artistNames = album.artists ? album.artists.map((a) => a.name) : [];
  const artists = album.artists
    ? album.artists.map((a) => ({ id: a.id, name: a.name }))
    : [];

  const releaseDate = album.release_date || null;
  const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;
  const coverImage = album.images?.[0]?.url || '';

  const tracks = album.tracks?.items
    ? album.tracks.items.map((t) => ({
        id: t.id,
        spotifyId: t.id,
        trackNumber: t.track_number,
        title: t.name,
        trackName: t.name,
        durationMs: t.duration_ms,
        previewUrl: t.preview_url || null,
        spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
        artistNames: t.artists ? t.artists.map((a) => a.name) : artistNames,
      }))
    : [];

  return {
    id: album.id,
    spotifyId: album.id,
    targetType: 'album',
    title: album.name,
    albumName: album.name,
    artistNames,
    artists,
    coverImage,
    coverImages: album.images || [],
    releaseYear,
    releaseDate,
    totalTracks: album.total_tracks || tracks.length,
    albumType: album.album_type || 'album',
    genres: album.genres || [],
    label: album.label || '',
    spotifyUrl: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`,
    tracks,
  };
};

/**
 * Normalizes Spotify artist object
 */
const normalizeArtist = (artist) => {
  if (!artist) return null;

  return {
    id: artist.id,
    spotifyId: artist.id,
    name: artist.name,
    genres: artist.genres || [],
    coverImage: artist.images?.[0]?.url || '',
    images: artist.images || [],
    followers: artist.followers?.total || 0,
    popularity: artist.popularity,
    spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
  };
};

module.exports = {
  ensureSpotifyAccessToken,
  normalizeTrack,
  normalizeAlbum,
  normalizeArtist,
};


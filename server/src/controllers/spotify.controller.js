const mongoose = require('mongoose');
const { spotifyApi } = require('../config/spotify');
const {
  ensureSpotifyAccessToken,
  normalizeTrack,
  normalizeAlbum,
  normalizeArtist,
} = require('../utils/spotify.helper');
const Review = require('../models/Review.model');

// Helper to fetch review stats safely even if MongoDB is not connected
const getSafeCommunityStats = async (spotifyId, targetType) => {
  if (mongoose.connection.readyState !== 1) {
    return {
      totalReviews: 0,
      averageRating: 0,
      distribution: {
        '0.5': 0, '1.0': 0, '1.5': 0, '2.0': 0, '2.5': 0,
        '3.0': 0, '3.5': 0, '4.0': 0, '4.5': 0, '5.0': 0,
      },
      notice: 'Database not connected to persist reviews yet.',
    };
  }
  return Review.getAggregateStats(spotifyId, targetType);
};

/**
 * @desc    Search tracks, albums, and artists on Spotify
 * @route   GET /api/spotify/search (or /api/music/search)
 * @access  Public
 */
const searchMusic = async (req, res) => {
  const { q, type = 'track,album', limit = 20, offset = 0 } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "q" is required',
    });
  }

  try {
    await ensureSpotifyAccessToken();

    const searchTypes = type.split(',').map((t) => t.trim());
    const validTypes = ['track', 'album', 'artist'].filter((t) => searchTypes.includes(t));
    const typesToQuery = validTypes.length > 0 ? validTypes : ['track', 'album'];

    const response = await spotifyApi.search(q.trim(), typesToQuery, {
      limit: Math.min(parseInt(limit, 10) || 20, 50),
      offset: parseInt(offset, 10) || 0,
    });

    const body = response.body;

    const tracks = body.tracks?.items ? body.tracks.items.map(normalizeTrack) : [];
    const albums = body.albums?.items ? body.albums.items.map(normalizeAlbum) : [];
    const artists = body.artists?.items ? body.artists.items.map(normalizeArtist) : [];

    return res.json({
      success: true,
      query: q,
      total: {
        tracks: body.tracks?.total || 0,
        albums: body.albums?.total || 0,
        artists: body.artists?.total || 0,
      },
      results: {
        tracks,
        albums,
        artists,
      },
      albums: {
        items: albums,
        total: body.albums?.total || albums.length,
      },
      tracks: {
        items: tracks,
        total: body.tracks?.total || tracks.length,
      },
      artists: {
        items: artists,
        total: body.artists?.total || artists.length,
      },
    });
  } catch (error) {
    console.error('Spotify search error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to search Spotify',
    });
  }
};

/**
 * @desc    Get detailed track info + community review statistics
 * @route   GET /api/spotify/track/:id
 * @access  Public
 */
const getTrackById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Track ID is required' });
  }

  try {
    await ensureSpotifyAccessToken();

    const [trackData, stats] = await Promise.all([
      spotifyApi.getTrack(id),
      getSafeCommunityStats(id, 'track'),
    ]);

    const track = normalizeTrack(trackData.body);

    return res.json({
      success: true,
      data: track,
      communityStats: stats,
    });
  } catch (error) {
    console.error(`Error fetching track ${id}:`, error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: status === 404 ? 'Track not found on Spotify' : 'Failed to fetch track',
    });
  }
};

/**
 * @desc    Get detailed album info with tracklist + community review statistics
 * @route   GET /api/spotify/album/:id
 * @access  Public
 */
const getAlbumById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Album ID is required' });
  }

  try {
    await ensureSpotifyAccessToken();

    const [albumData, stats] = await Promise.all([
      spotifyApi.getAlbum(id),
      getSafeCommunityStats(id, 'album'),
    ]);

    const album = normalizeAlbum(albumData.body);

    return res.json({
      success: true,
      name: album.albumName,
      ...album,
      data: album,
      communityStats: stats,
    });
  } catch (error) {
    console.error(`Error fetching album ${id}:`, error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: status === 404 ? 'Album not found on Spotify' : 'Failed to fetch album',
    });
  }
};

/**
 * @desc    Get artist profile, top tracks & albums
 * @route   GET /api/spotify/artist/:id
 * @access  Public
 */
const getArtistById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Artist ID is required' });
  }

  try {
    await ensureSpotifyAccessToken();

    const [artistData, topTracksData, albumsData] = await Promise.all([
      spotifyApi.getArtist(id),
      spotifyApi.getArtistTopTracks(id, 'US'),
      spotifyApi.getArtistAlbums(id, { limit: 12 }),
    ]);

    const artist = normalizeArtist(artistData.body);
    const topTracks = topTracksData.body.tracks
      ? topTracksData.body.tracks.map(normalizeTrack)
      : [];
    const albums = albumsData.body.items
      ? albumsData.body.items.map(normalizeAlbum)
      : [];

    return res.json({
      success: true,
      data: {
        artist,
        topTracks,
        albums,
      },
    });
  } catch (error) {
    console.error(`Error fetching artist ${id}:`, error.message);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: status === 404 ? 'Artist not found on Spotify' : 'Failed to fetch artist',
    });
  }
};

/**
 * @desc    Get new album & single releases
 * @route   GET /api/spotify/new-releases
 * @access  Public
 */
const getNewReleases = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const country = req.query.country || 'US';

  try {
    await ensureSpotifyAccessToken();
    const data = await spotifyApi.getNewReleases({ limit, country });
    const albums = data.body.albums.items.map(normalizeAlbum);

    return res.json({
      success: true,
      count: albums.length,
      data: albums,
    });
  } catch (error) {
    // If Spotify blocks /browse/new-releases for Client Credentials apps in Dev mode,
    // fallback gracefully to searching recent popular albums
    try {
      const currentYear = new Date().getFullYear();
      const fallback = await spotifyApi.searchAlbums(`year:${currentYear}`, { limit });
      const albums = fallback.body.albums?.items ? fallback.body.albums.items.map(normalizeAlbum) : [];

      return res.json({
        success: true,
        count: albums.length,
        data: albums,
        note: 'Latest releases retrieved via recent catalog search',
      });
    } catch (fallbackErr) {
      console.error('Error fetching new releases:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch new releases',
      });
    }
  }
};

module.exports = {
  searchMusic,
  getTrackById,
  getAlbumById,
  getArtistById,
  getNewReleases,
};

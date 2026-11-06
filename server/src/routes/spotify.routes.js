const router = require('express').Router();
const {
  searchMusic,
  getTrackById,
  getAlbumById,
  getArtistById,
  getNewReleases,
} = require('../controllers/spotify.controller');

// ─── Spotify / Music Exploration Endpoints ────────────────────────────────────

/**
 * @route   GET /api/spotify/search (and /api/music/search)
 * @desc    Search tracks, albums, and artists
 */
router.get('/search', searchMusic);

/**
 * @route   GET /api/spotify/new-releases (and /api/music/new-releases)
 * @desc    Get latest album and single releases
 */
router.get('/new-releases', getNewReleases);

/**
 * @route   GET /api/spotify/track/:id (and /api/music/track/:id)
 * @desc    Get track details + community review stats
 */
router.get('/track/:id', getTrackById);

/**
 * @route   GET /api/spotify/album/:id (and /api/music/album/:id)
 * @desc    Get album details + tracklist + community review stats
 */
router.get('/album/:id', getAlbumById);

/**
 * @route   GET /api/spotify/artist/:id (and /api/music/artist/:id)
 * @desc    Get artist profile, top tracks, and albums
 */
router.get('/artist/:id', getArtistById);

module.exports = router;


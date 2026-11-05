const router = require('express').Router();

// GET /api/music/search?q=<query>&type=track|album
router.get('/search', (req, res) => {
  res.json({ message: 'search music — coming soon' });
});

// GET /api/music/track/:spotifyId
router.get('/track/:spotifyId', (req, res) => {
  res.json({ message: `get track ${req.params.spotifyId} — coming soon` });
});

// GET /api/music/album/:spotifyId
router.get('/album/:spotifyId', (req, res) => {
  res.json({ message: `get album ${req.params.spotifyId} — coming soon` });
});

module.exports = router;

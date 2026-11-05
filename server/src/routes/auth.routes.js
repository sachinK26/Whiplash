const router = require('express').Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  res.json({ message: 'register — coming soon' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  res.json({ message: 'login — coming soon' });
});

// GET  /api/auth/spotify          — redirect to Spotify OAuth
router.get('/spotify', (req, res) => {
  res.json({ message: 'spotify OAuth — coming soon' });
});

// GET  /api/auth/spotify/callback — Spotify OAuth callback
router.get('/spotify/callback', (req, res) => {
  res.json({ message: 'spotify callback — coming soon' });
});

module.exports = router;

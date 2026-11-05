const router = require('express').Router();

router.get('/:username', (req, res) => {
  res.json({ message: `get user ${req.params.username} — coming soon` });
});

module.exports = router;

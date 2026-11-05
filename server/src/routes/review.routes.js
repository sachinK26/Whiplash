const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'list reviews — coming soon' });
});

router.post('/', (req, res) => {
  res.json({ message: 'create review — coming soon' });
});

module.exports = router;

const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'list lists — coming soon' });
});

router.post('/', (req, res) => {
  res.json({ message: 'create list — coming soon' });
});

module.exports = router;

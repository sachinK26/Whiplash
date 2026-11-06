const router = require('express').Router();
const {
  createReview,
  getReviews,
  getReviewStats,
  getReviewById,
  updateReview,
  deleteReview,
  toggleLikeReview,
} = require('../controllers/review.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

// ─── Review Routes ────────────────────────────────────────────────────────────

/**
 * @route   GET /api/reviews
 * @desc    List & filter reviews (query: spotifyId, targetType, author, sort, page, limit)
 * @access  Public (Optional auth for like status)
 */
router.get('/', optionalAuth, getReviews);

/**
 * @route   GET /api/reviews/stats/:spotifyId
 * @desc    Get aggregate rating stats for a track or album
 * @access  Public
 */
router.get('/stats/:spotifyId', getReviewStats);
router.get('/item/:spotifyId', getReviewStats);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get single review details
 * @access  Public (Optional auth)
 */
router.get('/:id', optionalAuth, getReviewById);

/**
 * @route   POST /api/reviews
 * @desc    Create a new review (rating, body, spotifyId, targetType)
 * @access  Private
 */
router.post('/', protect, createReview);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update an existing review
 * @access  Private (Author only)
 */
router.put('/:id', protect, updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete a review
 * @access  Private (Author or Admin)
 */
router.delete('/:id', protect, deleteReview);

/**
 * @route   POST /api/reviews/:id/like
 * @desc    Toggle like / unlike on a review
 * @access  Private
 */
router.post('/:id/like', protect, toggleLikeReview);

module.exports = router;

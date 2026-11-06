const mongoose = require('mongoose');
const Review = require('../models/Review.model');
const User = require('../models/User.model');
const Activity = require('../models/Activity.model');
const { spotifyApi } = require('../config/spotify');
const {
  ensureSpotifyAccessToken,
  normalizeTrack,
  normalizeAlbum,
} = require('../utils/spotify.helper');

// Helper to verify database connectivity
const checkDbConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database is currently disconnected. Please configure a valid MONGO_URI in .env to read/write reviews.',
    });
    return false;
  }
  return true;
};

/**
 * @desc    Create a new review & rating for a track or album
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = async (req, res) => {
  if (!checkDbConnection(res)) return;

  const targetType = req.body.targetType || req.body.itemType;
  const spotifyId = req.body.spotifyId;
  const rating = req.body.rating;
  const body = req.body.body !== undefined 
    ? req.body.body 
    : (req.body.reviewText !== undefined ? req.body.reviewText : (req.body.comment || ''));
  const containsSpoilers = req.body.containsSpoilers || false;
  const listenedAt = req.body.listenedAt || null;

  let trackName = req.body.trackName || (targetType === 'track' ? req.body.title : '');
  let albumName = req.body.albumName || (targetType === 'album' ? req.body.title : '');
  let artistNames = req.body.artistNames || (req.body.artistName ? [req.body.artistName] : []);
  let coverImage = req.body.coverImage;
  let releaseYear = req.body.releaseYear;

  if (!spotifyId || !targetType || rating === undefined) {
    return res.status(400).json({
      success: false,
      message: 'spotifyId, targetType ("track" or "album"), and rating are required',
    });
  }

  if (!['track', 'album'].includes(targetType)) {
    return res.status(400).json({
      success: false,
      message: 'targetType must be either "track" or "album"',
    });
  }

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 0.5 || numRating > 5.0 || (numRating * 2) % 1 !== 0) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 0.5 and 5.0 in 0.5 increments',
    });
  }

  try {
    // Check if user already reviewed this item
    const existing = await Review.findOne({
      author: req.user._id,
      spotifyId,
      targetType,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this item. You can update your existing review.',
        existingReviewId: existing._id,
      });
    }

    // Auto-fetch Spotify metadata if not provided by client
    if (!trackName && !albumName) {
      try {
        await ensureSpotifyAccessToken();
        if (targetType === 'track') {
          const trackData = await spotifyApi.getTrack(spotifyId);
          const normalized = normalizeTrack(trackData.body);
          trackName = normalized.trackName;
          albumName = normalized.albumName;
          artistNames = normalized.artistNames;
          coverImage = normalized.coverImage;
          releaseYear = normalized.releaseYear;
        } else {
          const albumData = await spotifyApi.getAlbum(spotifyId);
          const normalized = normalizeAlbum(albumData.body);
          albumName = normalized.albumName;
          artistNames = normalized.artistNames;
          coverImage = normalized.coverImage;
          releaseYear = normalized.releaseYear;
        }
      } catch (spotifyErr) {
        console.warn('Could not auto-fetch metadata from Spotify:', spotifyErr.message);
      }
    }

    // Create review
    const review = await Review.create({
      author: req.user._id,
      targetType,
      spotifyId,
      trackName: trackName || '',
      albumName: albumName || '',
      artistNames: Array.isArray(artistNames) ? artistNames : [],
      coverImage: coverImage || '',
      releaseYear: releaseYear || null,
      rating: numRating,
      body,
      containsSpoilers,
      listenedAt: listenedAt ? new Date(listenedAt) : new Date(),
    });

    // Increment user reviewCount
    await User.findByIdAndUpdate(req.user._id, { $inc: { reviewCount: 1 } });

    // Create activity feed entry
    await Activity.create({
      actor: req.user._id,
      type: 'review',
      refId: review._id,
      refModel: 'Review',
      metadata: {
        spotifyId,
        targetType,
        title: targetType === 'track' ? trackName : albumName,
        rating: numRating,
        coverImage,
      },
    });

    // Populate author details
    await review.populate('author', 'username displayName avatar');

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      _id: review._id,
      rating: review.rating,
      data: review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create review',
    });
  }
};

/**
 * @desc    Get paginated reviews (filterable by spotifyId, targetType, author, sort)
 * @route   GET /api/reviews
 * @access  Public (Optional Auth for like status)
 */
const getReviews = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      totalPages: 1,
      data: [],
      notice: 'Database is disconnected. Set MONGO_URI in .env to store reviews.',
    });
  }

  const {
    spotifyId,
    targetType,
    author,
    sort = 'recent',
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};

  if (spotifyId) query.spotifyId = spotifyId;
  if (targetType) query.targetType = targetType;
  if (author) query.author = author;

  // Sorting strategy
  let sortOption = { createdAt: -1 };
  if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
  if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };
  if (sort === 'popular' || sort === 'most_liked') sortOption = { likeCount: -1, createdAt: -1 };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const skip = (pageNum - 1) * limitNum;

  try {
    const [total, rawReviews] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .populate('author', 'username displayName avatar')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const currentUserId = req.user?._id ? req.user._id.toString() : null;

    // Attach isLiked field if user is authenticated
    const reviews = rawReviews.map((rev) => {
      const isLiked = currentUserId && Array.isArray(rev.likes)
        ? rev.likes.some((id) => id.toString() === currentUserId)
        : false;

      return {
        ...rev,
        isLiked,
        likes: undefined, // Don't expose full array of user IDs
      };
    });

    return res.json({
      success: true,
      count: reviews.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: reviews,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reviews',
    });
  }
};

/**
 * @desc    Get aggregate rating stats for a track or album
 * @route   GET /api/reviews/stats/:spotifyId
 * @access  Public
 */
const getReviewStats = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({
      success: true,
      spotifyId: req.params.spotifyId,
      data: {
        totalReviews: 0,
        averageRating: 0,
        distribution: {
          '0.5': 0, '1.0': 0, '1.5': 0, '2.0': 0, '2.5': 0,
          '3.0': 0, '3.5': 0, '4.0': 0, '4.5': 0, '5.0': 0,
        },
      },
    });
  }

  const { spotifyId } = req.params;
  const { targetType } = req.query;

  try {
    const stats = await Review.getAggregateStats(spotifyId, targetType);
    return res.json({
      success: true,
      spotifyId,
      totalReviews: stats.totalReviews,
      averageRating: stats.averageRating,
      data: stats,
    });
  } catch (error) {
    console.error('Review stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate stats',
    });
  }
};

/**
 * @desc    Get single review by ID
 * @route   GET /api/reviews/:id
 * @access  Public (Optional Auth)
 */
const getReviewById = async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { id } = req.params;

  try {
    const review = await Review.findById(id).populate('author', 'username displayName avatar');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const currentUserId = req.user?._id ? req.user._id.toString() : null;
    const isLiked = currentUserId ? review.likes.some((uid) => uid.toString() === currentUserId) : false;

    const data = review.toObject();
    data.isLiked = isLiked;
    delete data.likes;

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch review' });
  }
};

/**
 * @desc    Update an existing review
 * @route   PUT /api/reviews/:id
 * @access  Private (Author only)
 */
const updateReview = async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { id } = req.params;
  const { rating, containsSpoilers, listenedAt } = req.body;
  const body = req.body.body !== undefined ? req.body.body : req.body.reviewText;

  try {
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this review',
      });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 0.5 || numRating > 5.0 || (numRating * 2) % 1 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 0.5 and 5.0 in 0.5 increments',
        });
      }
      review.rating = numRating;
    }

    if (body !== undefined) review.body = body;
    if (containsSpoilers !== undefined) review.containsSpoilers = containsSpoilers;
    if (listenedAt !== undefined) review.listenedAt = new Date(listenedAt);

    await review.save();
    await review.populate('author', 'username displayName avatar');

    return res.json({
      success: true,
      message: 'Review updated successfully',
      _id: review._id,
      rating: review.rating,
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update review',
    });
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Author or Admin)
 */
const deleteReview = async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { id } = req.params;

  try {
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isAuthor = review.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this review',
      });
    }

    await Review.findByIdAndDelete(id);

    // Decrement user review count
    await User.findByIdAndUpdate(review.author, { $inc: { reviewCount: -1 } });

    // Clean up activity record
    await Activity.deleteMany({ refId: review._id, refModel: 'Review' });

    return res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete review',
    });
  }
};

/**
 * @desc    Like or unlike a review
 * @route   POST /api/reviews/:id/like
 * @access  Private
 */
const toggleLikeReview = async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { id } = req.params;
  const userId = req.user._id;

  try {
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const likedIndex = review.likes.findIndex((uid) => uid.toString() === userId.toString());
    const isLiked = likedIndex !== -1;

    if (isLiked) {
      // Remove like
      review.likes.splice(likedIndex, 1);
      review.likeCount = Math.max(0, review.likeCount - 1);
      await review.save();

      // Remove activity
      await Activity.findOneAndDelete({
        actor: userId,
        type: 'review_liked',
        refId: review._id,
      });

      return res.json({
        success: true,
        message: 'Review unliked',
        isLiked: false,
        likeCount: review.likeCount,
      });
    } else {
      // Add like
      review.likes.push(userId);
      review.likeCount += 1;
      await review.save();

      // Create activity
      await Activity.create({
        actor: userId,
        type: 'review_liked',
        refId: review._id,
        refModel: 'Review',
        metadata: {
          targetType: review.targetType,
          spotifyId: review.spotifyId,
          title: review.targetType === 'track' ? review.trackName : review.albumName,
        },
      });

      return res.json({
        success: true,
        message: 'Review liked',
        isLiked: true,
        likeCount: review.likeCount,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle like',
    });
  }
};

module.exports = {
  createReview,
  getReviews,
  getReviewStats,
  getReviewById,
  updateReview,
  deleteReview,
  toggleLikeReview,
};

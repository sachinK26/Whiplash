const mongoose = require('mongoose');

/**
 * A review can target either a track or an album.
 * We store the Spotify ID and cache basic metadata so we don't
 * have to hit the Spotify API on every read.
 */
const reviewSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ─── Target (what is being reviewed) ──────────────────────────────────────
    targetType: {
      type: String,
      enum: ['track', 'album'],
      required: true,
      index: true,
    },
    spotifyId: {
      type: String,
      required: true,
      index: true,
    },

    // Cached Spotify metadata (so we don't re-fetch constantly)
    trackName: { type: String, trim: true },
    albumName: { type: String, trim: true },
    artistNames: [{ type: String, trim: true }],
    coverImage: { type: String, default: '' },
    releaseYear: { type: Number, default: null },

    // ─── Review content ───────────────────────────────────────────────────────
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [0.5, 'Rating must be at least 0.5'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: (v) => (v * 2) % 1 === 0, // only 0.5 increments
        message: 'Rating must be in 0.5 increments (e.g. 1.0, 1.5, 2.0...)',
      },
      index: true,
    },
    body: {
      type: String,
      maxlength: [5000, 'Review cannot exceed 5000 characters'],
      default: '',
      trim: true,
    },
    containsSpoilers: { type: Boolean, default: false },

    // ─── Social ───────────────────────────────────────────────────────────────
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0, index: true },

    // ─── Timestamps ───────────────────────────────────────────────────────────
    listenedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent a user from reviewing the same track/album twice
reviewSchema.index({ author: 1, spotifyId: 1, targetType: 1 }, { unique: true });
// Optimize target search + sorting by creation or rating
reviewSchema.index({ spotifyId: 1, targetType: 1, createdAt: -1 });
reviewSchema.index({ spotifyId: 1, targetType: 1, rating: -1 });

/**
 * Static method: calculate aggregate rating stats for a Spotify item
 */
reviewSchema.statics.getAggregateStats = async function (spotifyId, targetType) {
  const matchQuery = { spotifyId };
  if (targetType) matchQuery.targetType = targetType;

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratings: { $push: '$rating' },
      },
    },
  ]);

  const distribution = {
    '0.5': 0, '1.0': 0, '1.5': 0, '2.0': 0, '2.5': 0,
    '3.0': 0, '3.5': 0, '4.0': 0, '4.5': 0, '5.0': 0,
  };

  if (!stats.length) {
    return {
      totalReviews: 0,
      averageRating: 0,
      distribution,
    };
  }

  const { totalReviews, averageRating, ratings } = stats[0];

  ratings.forEach((r) => {
    const key = Number(r).toFixed(1);
    if (distribution[key] !== undefined) {
      distribution[key] += 1;
    }
  });

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    distribution,
  };
};

module.exports = mongoose.model('Review', reviewSchema);

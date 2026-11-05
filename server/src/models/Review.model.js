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
    },

    // ─── Target (what is being reviewed) ──────────────────────────────────────
    targetType: {
      type: String,
      enum: ['track', 'album'],
      required: true,
    },
    spotifyId: {
      type: String,
      required: true,
      index: true,
    },

    // Cached Spotify metadata (so we don't re-fetch constantly)
    trackName:   { type: String },
    albumName:   { type: String },
    artistNames: [{ type: String }],
    coverImage:  { type: String },
    releaseYear: { type: Number },

    // ─── Review content ───────────────────────────────────────────────────────
    rating: {
      type: Number,
      required: true,
      min: [0.5, 'Rating must be at least 0.5'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: (v) => (v * 2) % 1 === 0, // only 0.5 increments
        message: 'Rating must be in 0.5 increments',
      },
    },
    body: {
      type: String,
      maxlength: [5000, 'Review cannot exceed 5000 characters'],
      default: '',
    },
    containsSpoilers: { type: Boolean, default: false },

    // ─── Social ───────────────────────────────────────────────────────────────
    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },

    // ─── Timestamps ───────────────────────────────────────────────────────────
    listenedAt: { type: Date, default: null }, // when user listened to it
  },
  { timestamps: true }
);

// Prevent a user from reviewing the same track/album twice
reviewSchema.index({ author: 1, spotifyId: 1, targetType: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

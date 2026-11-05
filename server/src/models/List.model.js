const mongoose = require('mongoose');

/**
 * A curated list of tracks and/or albums, similar to Letterboxd lists.
 */
const listItemSchema = new mongoose.Schema({
  spotifyId:   { type: String, required: true },
  targetType:  { type: String, enum: ['track', 'album'], required: true },
  trackName:   { type: String },
  albumName:   { type: String },
  artistNames: [{ type: String }],
  coverImage:  { type: String },
  note:        { type: String, maxlength: 500, default: '' }, // per-item note
  position:    { type: Number, required: true },
}, { _id: false });

const listSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'List title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    isRanked:  { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    items:     [listItemSchema],

    // Social
    likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },

    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

listSchema.index({ owner: 1 });

module.exports = mongoose.model('List', listSchema);

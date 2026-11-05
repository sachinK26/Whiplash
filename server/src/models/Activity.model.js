const mongoose = require('mongoose');

/**
 * Activity feed entries — used to build a social timeline.
 * Created automatically whenever a user reviews, lists, likes, or follows.
 */
const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['review', 'list_created', 'list_liked', 'review_liked', 'follow'],
      required: true,
    },
    // Polymorphic reference
    refId:     { type: mongoose.Schema.Types.ObjectId },
    refModel:  { type: String, enum: ['Review', 'List', 'User'] },

    // Snapshot data for quick rendering without joins
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activitySchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);

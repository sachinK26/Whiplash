const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never return password in queries
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: function () { return this.username; },
    },
    avatar: {
      type: String,
      default: '', // URL to avatar image
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    // Social graph
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Stats (denormalised for quick reads)
    reviewCount:  { type: Number, default: 0 },
    listsCount:   { type: Number, default: 0 },

    // Optional Spotify OAuth link
    spotifyId:           { type: String, default: null },
    spotifyAccessToken:  { type: String, default: null },
    spotifyRefreshToken: { type: String, default: null },

    isVerified: { type: Boolean, default: false },
    role:       { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// ─── Hash password before saving ──────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: compare passwords ───────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Virtual: follower count ───────────────────────────────────────────────────
userSchema.virtual('followerCount').get(function () {
  return Array.isArray(this.followers) ? this.followers.length : 0;
});

userSchema.virtual('followingCount').get(function () {
  return Array.isArray(this.following) ? this.following.length : 0;
});

userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);

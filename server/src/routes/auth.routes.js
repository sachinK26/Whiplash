const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User.model');
const { protect } = require('../middleware/auth.middleware');
const {
  spotifyApi,
  getSpotifyAuthorizeUrl,
  syncSpotifyCredentials,
} = require('../config/spotify');

/**
 * Generate a JWT token for a given user ID
 */
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'whiplash_jwt_fallback_secret_key';
  return jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Clean user object to return in responses
 */
const formatUserResponse = (user) => {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    avatar: user.avatar || '',
    bio: user.bio || '',
    reviewCount: user.reviewCount || 0,
    listsCount: user.listsCount || 0,
    followerCount: user.followers ? user.followers.length : 0,
    isSpotifyConnected: Boolean(user.spotifyId),
    role: user.role || 'user',
    createdAt: user.createdAt,
  };
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Display name cannot exceed 50 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { username, email, password, displayName } = req.body;

    try {
      // Check if username or email is already taken
      const existingUser = await User.findOne({
        $or: [
          { username: new RegExp(`^${username}$`, 'i') },
          { email: email.toLowerCase() },
        ],
      });

      if (existingUser) {
        const isSameUsername = existingUser.username.toLowerCase() === username.toLowerCase();
        return res.status(409).json({
          success: false,
          message: isSameUsername
            ? 'Username is already taken'
            : 'Email is already registered',
        });
      }

      // Create new user (password is auto-hashed via pre-save hook)
      const user = await User.create({
        username,
        email,
        password,
        displayName: displayName || username,
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: formatUserResponse(user),
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred during registration',
      });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { identifier, password } = req.body;

    try {
      // Find user by either email or username (select password since it is excluded by default)
      const isEmail = identifier.includes('@');
      const query = isEmail
        ? { email: identifier.toLowerCase().trim() }
        : { username: new RegExp(`^${identifier.trim()}$`, 'i') };

      const user = await User.findOne(query).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(user._id);

      return res.json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: formatUserResponse(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred during login',
      });
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Private (Requires JWT)
 */
router.get('/me', protect, async (req, res) => {
  return res.json({
    success: true,
    user: formatUserResponse(req.user),
  });
});

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user's profile (displayName, bio, avatar)
 * @access  Private (Requires JWT)
 */
router.put(
  '/me',
  protect,
  [
    body('displayName').optional().trim().isLength({ max: 50 }),
    body('bio').optional().isLength({ max: 300 }),
    body('avatar').optional().isString(),
  ],
  async (req, res) => {
    const { displayName, bio, avatar } = req.body;
    try {
      const user = await User.findById(req.user._id);
      if (displayName !== undefined) user.displayName = displayName;
      if (bio !== undefined) user.bio = bio;
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: formatUserResponse(user),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update profile',
      });
    }
  }
);

/**
 * @route   GET /api/auth/spotify
 * @desc    Get Spotify OAuth URL or redirect user to Spotify consent screen
 * @access  Public
 */
router.get('/spotify', (req, res) => {
  try {
    const state = req.query.state || 'whiplash-auth';
    const authorizeUrl = getSpotifyAuthorizeUrl(state);

    // If client asks for JSON redirect info
    if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        authorizeUrl,
      });
    }

    return res.redirect(authorizeUrl);
  } catch (error) {
    console.error('Spotify auth URL generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Spotify authorization URL',
    });
  }
});

/**
 * @route   GET /api/auth/spotify/callback
 * @desc    Handle Spotify OAuth callback & link to user account
 * @access  Public
 */
router.get('/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  if (error) {
    console.error('Spotify authorization error:', error);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code missing in Spotify callback',
    });
  }

  try {
    syncSpotifyCredentials();

    // Exchange auth code for tokens
    const tokenData = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = tokenData.body;

    // Use token to fetch Spotify user profile
    spotifyApi.setAccessToken(access_token);
    const meData = await spotifyApi.getMe();
    const spotifyProfile = meData.body;

    const spotifyId = spotifyProfile.id;
    const spotifyEmail = spotifyProfile.email;
    const spotifyDisplayName = spotifyProfile.display_name || spotifyProfile.id;
    const spotifyAvatar =
      spotifyProfile.images && spotifyProfile.images.length > 0
        ? spotifyProfile.images[0].url
        : '';

    // Check if user already linked this Spotify account
    let user = await User.findOne({ spotifyId });

    if (!user && spotifyEmail) {
      // Check if user exists by email
      user = await User.findOne({ email: spotifyEmail.toLowerCase() });
    }

    if (user) {
      // Update existing user's tokens
      user.spotifyId = spotifyId;
      user.spotifyAccessToken = access_token;
      user.spotifyRefreshToken = refresh_token;
      if (!user.avatar && spotifyAvatar) user.avatar = spotifyAvatar;
      await user.save();
    } else {
      // Create a new user with Spotify profile info
      const randomBase = spotifyDisplayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const uniqueUsername = `${randomBase}_${randomSuffix}`;
      const randomPassword = bcrypt.genSaltSync(10); // Random generated password

      user = await User.create({
        username: uniqueUsername,
        email: spotifyEmail || `${spotifyId}@spotify.whiplash.app`,
        password: randomPassword,
        displayName: spotifyDisplayName,
        avatar: spotifyAvatar,
        spotifyId,
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
      });
    }

    const token = generateToken(user._id);

    // Redirect user back to frontend with token
    return res.redirect(`${clientUrl}/auth/callback?token=${token}&username=${encodeURIComponent(user.username)}`);
  } catch (err) {
    console.error('Spotify callback exchange error:', err);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(err.message || 'Spotify login failed')}`);
  }
});

module.exports = router;

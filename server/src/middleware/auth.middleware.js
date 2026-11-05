const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Middleware to require and verify a JWT Bearer token
 * Attaches authenticated user object to req.user (excluding password)
 */
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'whiplash_jwt_fallback_secret_key';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed token.',
    });
  }
};

/**
 * Optional authentication:
 * If a valid token is provided, attaches req.user.
 * If no token or invalid, simply sets req.user = null and continues.
 */
const optionalAuth = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'whiplash_jwt_fallback_secret_key';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = { protect, optionalAuth };


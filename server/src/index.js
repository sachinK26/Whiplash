const path = require('path');
const dotenv = require('dotenv');

// ─── Load Environment Variables ──────────────────────────────────────────────
// Check project root (.env) first, then current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const { connectDB } = require('./config/db');
const { refreshClientCredentials } = require('./config/spotify');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Initialize Spotify server-to-server credentials in the background
refreshClientCredentials();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/spotify', require('./routes/spotify.routes'));
app.use('/api/music', require('./routes/spotify.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/lists', require('./routes/list.routes'));

// ─── Welcome / Root Route ─────────────────────────────────────────────────────
app.get(['/', '/api'], (req, res) => {
  res.json({
    success: true,
    name: 'Whiplash API',
    description: 'Letterboxd for music — backend API server 🎵',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      spotify: '/api/spotify',
      music: '/api/music',
      reviews: '/api/reviews',
      lists: '/api/lists',
      users: '/api/users',
    },
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    message: 'Whiplash API is running 🎵',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Whiplash server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables so PORT matches server
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

// Shared state across sequential tests
let authToken = '';
let testReviewId = '';

const runTests = async () => {
  console.log(`🚀 Starting Whiplash API Test Suite against ${API_URL}...\n`);

  try {
    // 1. Test Root / Health Check Route
    try {
      const res = await axios.get(`${API_URL}/`);
      console.log('✅ GET /api -> SUCCESS:', res.data.message || res.data.name || 'API reachable');
    } catch (err) {
      console.log('⚠️ GET /api -> 404 (Optional: Add a root route in server.js)');
    }

    // 2. Test Auth - User Registration
    console.log('\n--- AUTH TESTS ---');
    const registerPayload = {
      username: `testuser_${Date.now().toString().slice(-4)}`, // Dynamic unique username
      email: `test_${Date.now()}@example.com`,
      password: 'Password123!',
    };

    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, registerPayload);
      console.log('✅ POST /auth/register -> User Created:', regRes.data.user?.username || regRes.data.username || regRes.data);
    } catch (err) {
      console.log('❌ POST /auth/register -> Failed:', err.response?.data || err.message);
    }

    // 3. Test Auth - User Login
    let loginRes;
    try {
      loginRes = await axios.post(`${API_URL}/auth/login`, {
        identifier: registerPayload.username, // Sends username or email
        email: registerPayload.email,
        password: registerPayload.password,
      });
      authToken = loginRes.data.token;
      console.log('✅ POST /auth/login -> Logged In! Token Received.');
    } catch (err) {
      console.log('❌ POST /auth/login -> Failed:', err.response?.data || err.message);
      console.log('⛔ Stopping tests: Login token required for protected routes.');
      return;
    }

    // Auth Header Config for Protected Routes
    const authHeaders = {
      headers: { Authorization: `Bearer ${authToken}` },
    };

    // 4. Test Spotify Proxy - Search Route
    console.log('\n--- SPOTIFY PROXY TESTS ---');
    try {
      const searchRes = await axios.get(`${API_URL}/spotify/search`, {
        params: { q: 'Radiohead', type: 'album,track', limit: 5 },
      });
      const albumCount = searchRes.data.albums?.items?.length || searchRes.data.results?.albums?.length || 0;
      console.log('✅ GET /spotify/search -> Found albums/tracks:', albumCount);
    } catch (err) {
      console.log('❌ GET /spotify/search -> Failed:', err.response?.data || err.message);
    }

    // 5. Test Spotify Proxy - Album Details
    // Using Spotify ID for Radiohead's 'OK Computer' (6dVIqQ8qmQ5GBnJ9shOYGE)
    const sampleSpotifyId = '6dVIqQ8qmQ5GBnJ9shOYGE';
    try {
      const albumRes = await axios.get(`${API_URL}/spotify/album/${sampleSpotifyId}`);
      console.log('✅ GET /spotify/album/:id -> Retrieved:', albumRes.data.name || albumRes.data.albumName || albumRes.data.data?.albumName);
    } catch (err) {
      console.log('⚠️ GET /spotify/album/:id -> (Check your Spotify credentials in .env):', err.response?.data || err.message);
    }

    // 6. Test Reviews - Create Review (Protected)
    console.log('\n--- REVIEWS & RATINGS TESTS ---');
    try {
      const reviewRes = await axios.post(
        `${API_URL}/reviews`,
        {
          spotifyId: sampleSpotifyId,
          itemType: 'album',
          title: 'OK Computer',
          artistName: 'Radiohead',
          rating: 4.5,
          reviewText: 'Masterpiece album from front to back!',
        },
        authHeaders
      );
      testReviewId = reviewRes.data._id || reviewRes.data.data?._id;
      console.log('✅ POST /reviews -> Review Created! ID:', testReviewId);
    } catch (err) {
      console.log('❌ POST /reviews -> Failed:', err.response?.data || err.message);
    }

    // 7. Test Reviews - Fetch Reviews & Aggregate Score
    try {
      const itemReviewsRes = await axios.get(`${API_URL}/reviews/item/${sampleSpotifyId}`);
      console.log('✅ GET /reviews/item/:spotifyId -> Aggregate Score:', {
        averageRating: itemReviewsRes.data.averageRating ?? itemReviewsRes.data.data?.averageRating,
        totalReviews: itemReviewsRes.data.totalReviews ?? itemReviewsRes.data.data?.totalReviews,
      });
    } catch (err) {
      console.log('❌ GET /reviews/item/:spotifyId -> Failed:', err.response?.data || err.message);
    }

    // 8. Test Reviews - Update Review (Protected)
    if (testReviewId) {
      try {
        const updateRes = await axios.put(
          `${API_URL}/reviews/${testReviewId}`,
          { rating: 5.0, reviewText: 'Updated: 10/10 masterpiece!' },
          authHeaders
        );
        console.log('✅ PUT /reviews/:id -> Updated Rating:', updateRes.data.rating ?? updateRes.data.data?.rating);
      } catch (err) {
        console.log('❌ PUT /reviews/:id -> Failed:', err.response?.data || err.message);
      }

      // 9. Test Reviews - Delete Review (Protected)
      try {
        const deleteRes = await axios.delete(`${API_URL}/reviews/${testReviewId}`, authHeaders);
        console.log('✅ DELETE /reviews/:id -> Deleted:', deleteRes.data.message);
      } catch (err) {
        console.log('❌ DELETE /reviews/:id -> Failed:', err.response?.data || err.message);
      }
    }

    console.log('\n🎉 All API Tests Execution Completed!');
  } catch (error) {
    console.error('Unhandled Test Failure:', error.message);
  }
};

runTests();

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('<username>') || uri.includes('your_mongo_uri')) {
    console.warn('⚠️ MongoDB URI not configured yet in .env (or contains placeholder <username>).');
    console.warn('👉 Update MONGO_URI in .env with your MongoDB Atlas or local connection string to persist data.');
    return null;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.warn('⚠️ Server will stay alive, but database operations will fail until MONGO_URI is resolved.');
    return null;
  }
};

module.exports = { connectDB };

const mongoose = require('mongoose');

const connectMongo = async (mongoUri) => {
  if (!mongoUri) {
    console.log('[MONGO] MONGODB_URI not set. Server will continue running without MongoDB...');
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Server will continue running without MongoDB...');
    return false;
  }
};

module.exports = { connectMongo };

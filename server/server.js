require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Pin = require('./models/Pin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  console.log('Server will continue running without MongoDB...');
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'MeshGrid API is running' });
});

app.get('/api/pins', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json([]); // Return empty array if MongoDB is not connected
    }
    const pins = await Pin.find().sort({ createdAt: -1 });
    res.json(pins);
  } catch (err) {
    console.error('Error fetching pins:', err);
    res.status(500).json({ message: 'Failed to fetch pins' });
  }
});

app.post('/api/pins', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not available' });
    }
    
    const { title, desc, pinType, location } = req.body;

    const pin = await Pin.create({
      title,
      desc,
      pinType,
      location,
    });

    res.status(201).json(pin);
  } catch (err) {
    console.error('Error creating pin:', err);
    res.status(400).json({ message: 'Failed to create pin' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

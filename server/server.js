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
    
    const { yjsId, title, desc, pinType, location } = req.body;

    if (yjsId) {
      const pin = await Pin.findOneAndUpdate(
        { yjsId },
        {
          yjsId,
          title,
          desc,
          pinType,
          location,
          updatedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(201).json(pin);
    }

    const pin = await Pin.create({
      yjsId: `server_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
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

app.post('/api/pins/sync', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not available' });
    }

    const { pins } = req.body;
    if (!Array.isArray(pins)) {
      return res.status(400).json({ message: 'Invalid payload: pins must be an array' });
    }

    const results = await Promise.all(
      pins
        .filter((pin) => pin && (pin.id || pin.yjsId))
        .map((pin) => {
          const yjsId = pin.yjsId || pin.id;

          const latitude = typeof pin.latitude === 'number' ? pin.latitude : pin.location?.coordinates?.[1];
          const longitude = typeof pin.longitude === 'number' ? pin.longitude : pin.location?.coordinates?.[0];

          const location = {
            type: 'Point',
            coordinates: [longitude, latitude]
          };

          const createdAt = pin.createdAt ? new Date(pin.createdAt) : new Date();
          const updatedAt = pin.updatedAt ? new Date(pin.updatedAt) : new Date();

          return Pin.findOneAndUpdate(
            { yjsId },
            {
              yjsId,
              title: pin.title,
              desc: pin.desc,
              pinType: pin.pinType,
              location,
              createdAt,
              updatedAt,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        })
    );

    res.json({ success: true, synced: results.length });
  } catch (err) {
    console.error('Error syncing pins:', err);
    res.status(500).json({ message: 'Failed to sync pins' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const express = require('express');
const mongoose = require('mongoose');
const Pin = require('../../models/Pin');

const createPinsRouter = ({ io, redisQueue }) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.json([]);
      }
      const pins = await Pin.find().sort({ createdAt: -1 });
      return res.json(pins);
    } catch (err) {
      console.error('Error fetching pins:', err);
      return res.status(500).json({ message: 'Failed to fetch pins' });
    }
  });

  router.post('/', async (req, res) => {
    try {
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

      return res.status(201).json(pin);
    } catch (err) {
      console.error('Error creating pin:', err);
      return res.status(400).json({ message: 'Failed to create pin' });
    }
  });

  router.post('/sync', async (req, res) => {
    console.log('Sync API hit with data:', req.body);

    try {
      const { pins } = req.body;
      if (!Array.isArray(pins)) {
        return res.status(400).json({ message: 'Invalid payload: pins must be an array' });
      }

      const enqueued = await redisQueue.enqueuePins(pins);
      if (enqueued) {
        console.log('[REDIS] Enqueued pins batch. count:', pins.length);
      } else {
        console.log('[REDIS] Queue disabled. Skipping enqueue. count:', pins.length);
      }

      io.emit('new_pins_broadcast', pins);
      console.log('[SOCKET] Broadcasted new_pins_broadcast. count:', pins.length);

      return res.status(200).json({ success: true, enqueued: pins.length });
    } catch (err) {
      console.error('Error syncing pins:', err);
      return res.status(500).json({ message: 'Failed to sync pins' });
    }
  });

  return router;
};

module.exports = { createPinsRouter };

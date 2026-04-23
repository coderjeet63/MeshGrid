const mongoose = require('mongoose');
const Pin = require('../../models/Pin');

const startPinQueueWorker = ({ redisQueue, intervalMs = 5000 }) => {
  if (!redisQueue || !redisQueue.isEnabled()) {
    return;
  }

  setInterval(async () => {
    try {
      const data = await redisQueue.dequeuePins();
      if (!data) return;

      console.log('[WORKER] Dequeued pins batch');
      const pins = JSON.parse(data);
      if (!Array.isArray(pins)) {
        console.error('[WORKER] Invalid payload in queue (not array)');
        return;
      }

      if (mongoose.connection.readyState !== 1) {
        console.error('[WORKER] MongoDB not connected. Re-queueing batch.');
        await redisQueue.requeueRaw(data);
        return;
      }

      const results = await Promise.all(
        pins
          .filter((pin) => pin && (pin.id || pin.yjsId))
          .map((pin) => {
            const yjsId = pin.yjsId || pin.id;

            const latitude =
              typeof pin.latitude === 'number'
                ? pin.latitude
                : pin.location?.coordinates?.[1];
            const longitude =
              typeof pin.longitude === 'number'
                ? pin.longitude
                : pin.location?.coordinates?.[0];

            const location = {
              type: 'Point',
              coordinates: [longitude, latitude],
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

      console.log('[WORKER] Upserted pins. count:', results.length);
    } catch (err) {
      console.error('[WORKER] Error processing queue:', err);
    }
  }, intervalMs);
};

module.exports = { startPinQueueWorker };

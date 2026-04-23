const { createClient } = require('redis');
const { Redis: UpstashRedis } = require('@upstash/redis');

const initRedisQueueClient = ({
  redisUrl,
  upstashRestUrl,
  upstashRestToken,
}) => {
  let client;
  let mode = 'disabled';
  let queueEnabled = true;

  if (upstashRestUrl && upstashRestToken) {
    client = new UpstashRedis({
      url: upstashRestUrl,
      token: upstashRestToken,
    });
    mode = 'upstash_rest';
    console.log('[REDIS] Using Upstash REST');
  } else if (redisUrl) {
    client = createClient({ url: redisUrl });
    mode = 'redis_tcp';

    client.on('error', (err) => {
      console.error('[REDIS] Client error:', err);
    });

    (async () => {
      try {
        await client.connect();
        console.log('[REDIS] Connected');
      } catch (err) {
        console.error('[REDIS] Failed to connect:', err);
      }
    })();
  } else {
    console.log('[REDIS] Disabled (no REDIS_URL or UPSTASH_REDIS_REST_* provided)');
  }

  const enqueuePins = async (pins) => {
    if (!client || !queueEnabled) return false;
    const data = JSON.stringify(pins);

    if (mode === 'upstash_rest') {
      await client.lpush('pin_queue', data);
      return true;
    }

    await client.lPush('pin_queue', data);
    return true;
  };

  const dequeuePins = async () => {
    if (!client || !queueEnabled) return null;

    if (mode === 'upstash_rest') {
      try {
        return await client.rpop('pin_queue');
      } catch (err) {
        const message = String(err && err.message ? err.message : '');
        if (message.includes('NOPERM') && message.toLowerCase().includes('rpop')) {
          queueEnabled = false;
          console.error(
            "[REDIS] Queue disabled: Upstash token lacks permission for 'rpop'. Create a new Upstash token with list read/write permissions (or 'All commands')."
          );
          return null;
        }
        throw err;
      }
    }

    return client.rPop('pin_queue');
  };

  const requeueRaw = async (data) => {
    if (!client || !queueEnabled) return false;

    if (mode === 'upstash_rest') {
      await client.lpush('pin_queue', data);
      return true;
    }

    await client.lPush('pin_queue', data);
    return true;
  };

  return {
    mode,
    isEnabled: () => Boolean(client) && queueEnabled,
    enqueuePins,
    dequeuePins,
    requeueRaw,
  };
};

module.exports = { initRedisQueueClient };

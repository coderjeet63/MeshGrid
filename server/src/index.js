require('dotenv').config();

const http = require('http');

const { createApp, mountApiRoutes } = require('./app');
const { connectMongo } = require('./db/mongo');
const { initSocket } = require('./sockets');
const { initRedisQueueClient } = require('./redis/queueClient');
const { startPinQueueWorker } = require('./workers/pinQueueWorker');
const env = require('./config/env');

const startServer = async () => {
  await connectMongo(env.MONGODB_URI);

  const redisQueue = initRedisQueueClient({
    redisUrl: env.REDIS_URL,
    upstashRestUrl: env.UPSTASH_REDIS_REST_URL,
    upstashRestToken: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const app = createApp({ clientOrigin: env.CLIENT_ORIGIN });
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer, env.CLIENT_ORIGIN);

  mountApiRoutes(app, { io, redisQueue });

  startPinQueueWorker({ redisQueue });

  httpServer.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });

  return { app, httpServer, io };
};

module.exports = { startServer };

if (require.main === module) {
  startServer();
}

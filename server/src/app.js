const express = require('express');
const cors = require('cors');

const { createApiRouter } = require('./routes');

const createApp = ({ clientOrigin }) => {
  const app = express();

  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ message: 'MeshGrid API is running' });
  });

  return app;
};

const mountApiRoutes = (app, { io, redisQueue }) => {
  app.use('/api', createApiRouter({ io, redisQueue }));
};

module.exports = { createApp, mountApiRoutes };

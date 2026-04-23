const express = require('express');
const { createPinsRouter } = require('./pins');

const createApiRouter = ({ io, redisQueue }) => {
  const router = express.Router();

  router.use('/pins', createPinsRouter({ io, redisQueue }));

  return router;
};

module.exports = { createApiRouter };

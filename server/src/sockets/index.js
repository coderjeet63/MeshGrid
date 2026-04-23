const { Server } = require('socket.io');

const initSocket = (httpServer, clientOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[SOCKET] Client connected:', socket.id);
    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Client disconnected:', socket.id, 'reason:', reason);
    });
  });

  return io;
};

module.exports = { initSocket };

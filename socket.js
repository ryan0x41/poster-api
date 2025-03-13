const socketIo = require('socket.io');
const { verifyToken } = require('./middleware/authenticateAuthHeader');

let io = null;
const userSockets = {};

function initSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4000',
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('no auth token provided'));
    }

    try {
      const userData = await verifyToken(token);
      socket.user = userData;
      userSockets[userData.id] = socket.id;
      return next();
    } catch (err) {
      return next(new Error('auth error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('new connection from:', socket.user && socket.user.id);
    socket.on('disconnect', () => {
      console.log('socket disconnected from:', socket.user && socket.user.id);
      if (socket.user && userSockets[socket.user.id]) {
        delete userSockets[socket.user.id];
      }
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('socket.io not initialised');
  }
  return io;
}

module.exports = { initSocket, getIO, userSockets };

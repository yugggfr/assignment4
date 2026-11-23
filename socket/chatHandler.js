const jwt = require('jsonwebtoken');
const { eventBus } = require('../events/eventBus');

function initChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_lab4_secure_connect_platform_2026');
        socket.user = decoded;
      } catch (err) {
        socket.user = { username: `Guest_${socket.id.substring(0, 4)}`, role: 'guest' };
      }
    } else {
      socket.user = { username: socket.handshake.auth?.username || `Guest_${socket.id.substring(0, 4)}`, role: 'guest' };
    }
    next();
  });

  const activeUsers = new Map();

  io.on('connection', (socket) => {
    const username = socket.user?.username || `User_${socket.id.substring(0, 4)}`;
    activeUsers.set(socket.id, { username, role: socket.user?.role || 'user' });

    console.log(`[Socket.IO] Client connected: ${socket.id} (${username})`);
    eventBus.emit('chat:user_connected', { socketId: socket.id, username });

    // Send welcome packet with current active users
    socket.emit('connection_success', {
      socketId: socket.id,
      user: socket.user,
      activeUsersCount: activeUsers.size
    });

    // Broadcast active users list
    io.emit('active_users', Array.from(activeUsers.values()));

    // 1. Join Chat Room
    socket.on('join_room', (roomName) => {
      const room = roomName || 'general';
      socket.join(room);
      console.log(`[Socket.IO] ${username} joined room: #${room}`);

      // Notify others in the room
      socket.to(room).emit('system_message', {
        text: `${username} has joined the room.`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'join'
      });
    });

    // 2. Chat Message
    socket.on('chat_message', (data) => {
      const room = data.room || 'general';
      const messageText = (data.message || '').trim();

      if (!messageText) return;

      const messagePayload = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        room,
        sender: username,
        role: socket.user?.role || 'user',
        message: messageText,
        timestamp: new Date().toLocaleTimeString()
      };

      // Server console log matching Fig 3
      console.log(`[Socket.IO Chat] [Room: #${room}] ${username}: "${messageText}"`);

      // Emit to internal eventBus for audit trail
      eventBus.emit('chat:message', {
        room,
        username,
        message: messageText,
        socketId: socket.id
      });

      // Broadcast message to everyone in the room (including sender)
      io.to(room).emit('receive_message', messagePayload);
    });

    // 3. User Typing status
    socket.on('typing', (data) => {
      const room = data.room || 'general';
      socket.to(room).emit('user_typing', { username });
    });

    socket.on('stop_typing', (data) => {
      const room = data.room || 'general';
      socket.to(room).emit('user_stop_typing', { username });
    });

    // 4. Disconnect
    socket.on('disconnect', () => {
      activeUsers.delete(socket.id);
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${username})`);
      eventBus.emit('chat:user_disconnected', { socketId: socket.id, username });
      io.emit('active_users', Array.from(activeUsers.values()));
    });
  });
}

module.exports = initChatSocket;

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const initChatSocket = require('./socket/chatHandler');
const errorHandler = require('./middleware/errorMiddleware');
const { eventBus } = require('./events/eventBus');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS enabled
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve static frontend dashboard
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/protected', protectedRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Secure Connect and Communication Platform (Lab 4)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Attach Socket.IO real-time handlers
initChatSocket(io);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    console.log('================================================================');
    console.log(`  SECURE CONNECT & COMMUNICATION PLATFORM (LAB 4)`);
    console.log(`  Course: Web Dev III - Unit 4 Practical Lab`);
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`  Socket.IO: Ready for real-time bidirectional communication`);
    console.log(`  EventBus: Initialized with Node.js EventEmitter`);
    console.log('================================================================');
  });
}

// Start if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server };

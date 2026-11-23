const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { eventLogs } = require('../events/eventBus');
const User = require('../models/User');
const Note = require('../models/Note');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/protected/profile
 * @desc    Standard protected route accessible by any authenticated user
 * @access  Private (User or Admin)
 */
router.get('/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to your protected profile!',
    user: req.user
  });
});

/**
 * @route   GET /api/protected/admin-dashboard
 * @desc    RBAC Demonstration: Accessible ONLY to users with 'admin' role
 * @access  Private (Admin only)
 */
router.get('/admin-dashboard', authorizeRoles('admin'), async (req, res) => {
  const totalUsers = (await User.findAll()).length;
  const totalNotes = await Note.countTotal();

  res.status(200).json({
    success: true,
    message: 'Access granted to Secure Admin Dashboard (RBAC verified).',
    systemMetrics: {
      activeRole: req.user.role,
      authenticatedAs: req.user.username,
      totalUsers,
      totalNotes,
      serverUptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @route   GET /api/protected/events
 * @desc    Retrieve Node.js EventEmitter audit logs
 * @access  Private (Authenticated)
 */
router.get('/events', (req, res) => {
  res.status(200).json({
    success: true,
    count: eventLogs.length,
    events: eventLogs
  });
});

module.exports = router;

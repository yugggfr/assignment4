const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { eventBus } = require('../events/eventBus');

/**
 * Generate JWT Token helper
 */
function generateToken(user) {
  const payload = {
    id: user.id || user._id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'super_secret_jwt_key_lab4_secure_connect_platform_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user with hashed password
 * @access  Public
 */
async function signup(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Role assignment: default is 'user'. 'admin' can be specified or assigned.
    const userRole = role === 'admin' ? 'admin' : 'user';

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: userRole
    });

    // Emit event for event-driven audit logging
    eventBus.emit('user:signup', user);

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    if (err.code === 11000 || err.message.includes('already')) {
      return res.status(400).json({
        success: false,
        message: err.message || 'User or email already exists.'
      });
    }
    next(err);
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, verify password with bcrypt & return JWT
 * @access  Public
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      eventBus.emit('user:login_failed', {
        email,
        reason: 'User not found',
        ip: req.ip || req.socket.remoteAddress
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Verify hashed password using bcrypt
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      eventBus.emit('user:login_failed', {
        email,
        reason: 'Incorrect password',
        ip: req.ip || req.socket.remoteAddress
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Emit successful login event
    eventBus.emit('user:login', user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile (Protected route)
 * @access  Private
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /api/auth/users
 * @desc    Get all users list (For testing / admin preview)
 * @access  Private
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await User.findAll();
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  getMe,
  getAllUsers,
  generateToken
};

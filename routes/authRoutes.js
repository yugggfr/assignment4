const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public authentication endpoints
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected user endpoints
router.get('/me', authMiddleware, authController.getMe);
router.get('/users', authMiddleware, authController.getAllUsers);

module.exports = router;

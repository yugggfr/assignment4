const jwt = require('jsonwebtoken');
const { eventBus } = require('../events/eventBus');

/**
 * JWT Authentication Middleware
 * Extracts and verifies Bearer token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    eventBus.emit('security:unauthorized', {
      path: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress,
      reason: 'Missing or malformed Authorization header'
    });

    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided in Authorization header (format: Bearer <token>).'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_lab4_secure_connect_platform_2026');
    req.user = decoded;
    next();
  } catch (err) {
    eventBus.emit('security:unauthorized', {
      path: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress,
      reason: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token signature'
    });

    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token has expired. Please log in again.' : 'Invalid token. Authentication failed.'
    });
  }
}

module.exports = authMiddleware;

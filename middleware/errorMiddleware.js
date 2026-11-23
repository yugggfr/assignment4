/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error Handler] ${err.name || 'Error'}: ${err.message}`);

  // Handle Mongoose / custom duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Duplicate field value entered.'
    });
  }

  // Handle JWT invalid error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid JWT token.'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ') || 'Validation error.'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
}

module.exports = errorHandler;

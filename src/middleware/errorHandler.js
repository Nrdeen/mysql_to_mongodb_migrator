const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', err);

  // Mongoose/MongoDB errors
  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate key error',
      field: Object.keys(err.keyPattern || {})[0]
    });
  }

  // MySQL errors
  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      error: err.message
    });
  }

  if (err?.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      success: false,
      message: 'Database table not found',
      error: err.message
    });
  }

  // JWT errors
  if (err?.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;


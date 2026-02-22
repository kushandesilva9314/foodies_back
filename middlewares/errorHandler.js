const errorHandler = (err, req, res, next) => {
  console.error('─── Error ───────────────────────────');
  console.error('Path:', req.path);
  console.error('Message:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  console.error('─────────────────────────────────────');

  // Supabase/PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: {
        message: 'A record with this information already exists.',
      },
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Referenced record does not exist.',
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token.',
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token has expired.',
      },
    });
  }

  // Nodemailer errors
  if (err.code === 'EAUTH' || err.code === 'ECONNECTION') {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Email service unavailable. Please try again later.',
      },
    });
  }

  // Default — your original handler
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
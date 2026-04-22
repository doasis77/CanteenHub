const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const loyaltyRoutes = require('./routes/loyalty');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Default error
  let error = {
    success: false,
    message: 'Internal server error',
    statusCode: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation error';
    error.statusCode = 400;
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.message = 'Unauthorized';
    error.statusCode = 401;
  } else if (err.code === '23505') { // PostgreSQL unique violation
    error.message = 'Resource already exists';
    error.statusCode = 409;
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    error.message = 'Referenced resource not found';
    error.statusCode = 400;
  } else if (err.message) {
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
  }

  res.status(error.statusCode).json(error);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CanteenHub API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;


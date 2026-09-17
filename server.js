const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const loyaltyRoutes = require('./routes/loyalty');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loyalty', loyaltyRoutes);

const publicDir = path.join(__dirname, 'public');

if (!process.env.VERCEL) {
  app.use(express.static(publicDir, {
    index: false,
    extensions: ['html', 'css', 'js'],
  }));

  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (path.extname(req.path)) {
      return res.status(404).send('Not found');
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  let error = {
    success: false,
    message: 'Internal server error',
    statusCode: 500,
  };

  if (err.name === 'ValidationError') {
    error.message = 'Validation error';
    error.statusCode = 400;
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.message = 'Unauthorized';
    error.statusCode = 401;
  } else if (err.code === '23505') {
    error.message = 'Resource already exists';
    error.statusCode = 409;
  } else if (err.code === '23503') {
    error.message = 'Referenced resource not found';
    error.statusCode = 400;
  } else if (err.message) {
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
  }

  res.status(error.statusCode).json(error);
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CanteenHub running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;

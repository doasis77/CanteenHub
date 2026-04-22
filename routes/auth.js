const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(2).max(100).required(),
  studentId: Joi.string().min(3).max(50).required(),
  phone: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password, fullName, studentId, phone } = value;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR student_id = $2',
      [email, studentId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or student ID already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in transaction
    const result = await transaction(async (client) => {
      // Insert user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, student_id, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, student_id, phone, loyalty_points, created_at`,
        [email, passwordHash, fullName, studentId, phone]
      );

      const user = userResult.rows[0];

      // Create default dietary preferences
      await client.query(
        `INSERT INTO user_dietary_preferences (user_id, vegetarian, vegan, gluten_free, dairy_free)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, false, false, false, false]
      );

      return user;
    });

    // Generate token
    const token = generateToken(result.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.id,
          email: result.email,
          fullName: result.full_name,
          studentId: result.student_id,
          phone: result.phone,
          loyaltyPoints: result.loyalty_points
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Find user
    const userResult = await query(
      `SELECT id, email, password_hash, full_name, student_id, phone, loyalty_points
       FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          studentId: user.student_id,
          phone: user.phone,
          loyaltyPoints: user.loyalty_points
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get fresh user data
    const userResult = await query(
      `SELECT id, email, full_name, student_id, phone, loyalty_points
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          studentId: user.student_id,
          phone: user.phone,
          loyaltyPoints: user.loyalty_points
        }
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

module.exports = router;


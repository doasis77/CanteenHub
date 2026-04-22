const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// Validation schemas
const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional()
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

const updateDietaryPreferencesSchema = Joi.object({
  vegetarian: Joi.boolean().optional(),
  vegan: Joi.boolean().optional(),
  glutenFree: Joi.boolean().optional(),
  dairyFree: Joi.boolean().optional()
});

const addAllergySchema = Joi.object({
  allergyName: Joi.string().min(2).max(100).required()
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const userResult = await query(
      `SELECT 
        id, email, full_name, student_id, phone, loyalty_points, created_at
      FROM users 
      WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get dietary preferences
    const preferencesResult = await query(
      `SELECT vegetarian, vegan, gluten_free, dairy_free
       FROM user_dietary_preferences 
       WHERE user_id = $1`,
      [userId]
    );

    // Get allergies
    const allergiesResult = await query(
      `SELECT id, allergy_name, created_at
       FROM user_allergies 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        studentId: user.student_id,
        phone: user.phone,
        loyaltyPoints: user.loyalty_points,
        createdAt: user.created_at,
        dietaryPreferences: preferencesResult.rows[0] || {
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false
        },
        allergies: allergiesResult.rows.map(allergy => ({
          id: allergy.id,
          name: allergy.allergy_name,
          createdAt: allergy.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { fullName, phone, email } = value;

    // Check if email is already taken by another user
    if (email) {
      const existingUserResult = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUserResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already taken'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (fullName !== undefined) {
      paramCount++;
      updateFields.push(`full_name = $${paramCount}`);
      updateValues.push(fullName);
    }

    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      updateValues.push(phone);
    }

    if (email !== undefined) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    updateValues.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, full_name, student_id, phone, loyalty_points
    `;

    const result = await query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        fullName: result.rows[0].full_name,
        studentId: result.rows[0].student_id,
        phone: result.rows[0].phone,
        loyaltyPoints: result.rows[0].loyalty_points
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Update password
router.put('/password', async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate input
    const { error, value } = updatePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { currentPassword, newPassword } = value;

    // Get current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
});

// Update dietary preferences
router.put('/dietary-preferences', async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate input
    const { error, value } = updateDietaryPreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { vegetarian, vegan, glutenFree, dairyFree } = value;

    // Check if preferences exist
    const existingResult = await query(
      'SELECT id FROM user_dietary_preferences WHERE user_id = $1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing preferences
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (vegetarian !== undefined) {
        paramCount++;
        updateFields.push(`vegetarian = $${paramCount}`);
        updateValues.push(vegetarian);
      }

      if (vegan !== undefined) {
        paramCount++;
        updateFields.push(`vegan = $${paramCount}`);
        updateValues.push(vegan);
      }

      if (glutenFree !== undefined) {
        paramCount++;
        updateFields.push(`gluten_free = $${paramCount}`);
        updateValues.push(glutenFree);
      }

      if (dairyFree !== undefined) {
        paramCount++;
        updateFields.push(`dairy_free = $${paramCount}`);
        updateValues.push(dairyFree);
      }

      if (updateFields.length > 0) {
        paramCount++;
        updateValues.push(userId);

        await query(
          `UPDATE user_dietary_preferences 
           SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $${paramCount}`,
          updateValues
        );
      }
    } else {
      // Create new preferences
      await query(
        `INSERT INTO user_dietary_preferences (user_id, vegetarian, vegan, gluten_free, dairy_free)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, vegetarian || false, vegan || false, glutenFree || false, dairyFree || false]
      );
    }

    // Get updated preferences
    const preferencesResult = await query(
      `SELECT vegetarian, vegan, gluten_free, dairy_free
       FROM user_dietary_preferences 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Dietary preferences updated successfully',
      data: preferencesResult.rows[0]
    });
  } catch (error) {
    console.error('Update dietary preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dietary preferences'
    });
  }
});

// Add allergy
router.post('/allergies', async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate input
    const { error, value } = addAllergySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { allergyName } = value;

    // Check if allergy already exists for user
    const existingAllergyResult = await query(
      'SELECT id FROM user_allergies WHERE user_id = $1 AND allergy_name ILIKE $2',
      [userId, allergyName]
    );

    if (existingAllergyResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Allergy already exists'
      });
    }

    // Add allergy
    const result = await query(
      'INSERT INTO user_allergies (user_id, allergy_name) VALUES ($1, $2) RETURNING id, allergy_name, created_at',
      [userId, allergyName]
    );

    res.status(201).json({
      success: true,
      message: 'Allergy added successfully',
      data: {
        id: result.rows[0].id,
        name: result.rows[0].allergy_name,
        createdAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Add allergy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add allergy'
    });
  }
});

// Remove allergy
router.delete('/allergies/:allergyId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { allergyId } = req.params;

    // Check if allergy exists and belongs to user
    const allergyResult = await query(
      'SELECT id FROM user_allergies WHERE id = $1 AND user_id = $2',
      [allergyId, userId]
    );

    if (allergyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Allergy not found'
      });
    }

    // Remove allergy
    await query(
      'DELETE FROM user_allergies WHERE id = $1',
      [allergyId]
    );

    res.json({
      success: true,
      message: 'Allergy removed successfully'
    });
  } catch (error) {
    console.error('Remove allergy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove allergy'
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get order statistics
    const orderStatsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_spent,
        AVG(total_amount) as average_order_value,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
      FROM orders 
      WHERE user_id = $1`,
      [userId]
    );

    // Get favorite categories
    const favoriteCategoriesResult = await query(
      `SELECT 
        mc.name as category_name,
        COUNT(oi.id) as order_count
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN menu_categories mc ON mi.category_id = mc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = $1 AND o.status = 'completed'
      GROUP BY mc.name
      ORDER BY order_count DESC
      LIMIT 5`,
      [userId]
    );

    // Get recent orders
    const recentOrdersResult = await query(
      `SELECT 
        id,
        total_amount,
        status,
        created_at
      FROM orders 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5`,
      [userId]
    );

    const stats = orderStatsResult.rows[0];

    res.json({
      success: true,
      data: {
        orders: {
          total: parseInt(stats.total_orders) || 0,
          completed: parseInt(stats.completed_orders) || 0,
          totalSpent: parseFloat(stats.total_spent) || 0,
          averageOrderValue: parseFloat(stats.average_order_value) || 0
        },
        favoriteCategories: favoriteCategoriesResult.rows.map(cat => ({
          name: cat.category_name,
          orderCount: parseInt(cat.order_count)
        })),
        recentOrders: recentOrdersResult.rows.map(order => ({
          id: order.id,
          totalAmount: parseFloat(order.total_amount),
          status: order.status,
          createdAt: order.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;


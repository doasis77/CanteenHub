const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all cart routes
router.use(authenticateToken);

// Validation schemas
const addToCartSchema = Joi.object({
  menuItemId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  customizations: Joi.object().optional()
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(10).required(),
  customizations: Joi.object().optional()
});

// Get user's cart
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        ci.id,
        ci.quantity,
        ci.customizations,
        ci.created_at,
        ci.updated_at,
        mi.id as menu_item_id,
        mi.name,
        mi.description,
        mi.price,
        mi.emoji,
        mi.calories,
        mi.protein,
        mi.carbs,
        mi.fat,
        mi.customizable,
        mi.available,
        mc.name as category_name
      FROM cart_items ci
      JOIN menu_items mi ON ci.menu_item_id = mi.id
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC`,
      [userId]
    );

    // Calculate totals
    let totalItems = 0;
    let totalAmount = 0;

    const cartItems = result.rows.map(item => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      totalItems += item.quantity;
      totalAmount += itemTotal;

      return {
        id: item.id,
        menuItemId: item.menu_item_id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        emoji: item.emoji,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        customizable: item.customizable,
        available: item.available,
        categoryName: item.category_name,
        quantity: item.quantity,
        customizations: item.customizations,
        itemTotal: itemTotal,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };
    });

    res.json({
      success: true,
      data: {
        items: cartItems,
        summary: {
          totalItems,
          totalAmount: parseFloat(totalAmount.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// Add item to cart
router.post('/items', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Validate input
    const { error, value } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { menuItemId, quantity, customizations } = value;

    // Check if menu item exists and is available
    const menuItemResult = await query(
      'SELECT id, name, price, available FROM menu_items WHERE id = $1',
      [menuItemId]
    );

    if (menuItemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const menuItem = menuItemResult.rows[0];
    if (!menuItem.available) {
      return res.status(400).json({
        success: false,
        message: 'Menu item is not available'
      });
    }

    // Check if item already exists in cart
    const existingItemResult = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND menu_item_id = $2',
      [userId, menuItemId]
    );

    if (existingItemResult.rows.length > 0) {
      // Update existing item
      const existingItem = existingItemResult.rows[0];
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > 10) {
        return res.status(400).json({
          success: false,
          message: 'Maximum quantity per item is 10'
        });
      }

      await query(
        'UPDATE cart_items SET quantity = $1, customizations = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newQuantity, customizations || null, existingItem.id]
      );

      res.json({
        success: true,
        message: 'Cart item updated successfully',
        data: {
          menuItemId,
          quantity: newQuantity,
          customizations
        }
      });
    } else {
      // Add new item to cart
      await query(
        'INSERT INTO cart_items (user_id, menu_item_id, quantity, customizations) VALUES ($1, $2, $3, $4)',
        [userId, menuItemId, quantity, customizations || null]
      );

      res.status(201).json({
        success: true,
        message: 'Item added to cart successfully',
        data: {
          menuItemId,
          quantity,
          customizations
        }
      });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// Update cart item
router.put('/items/:itemId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // Validate input
    const { error, value } = updateCartItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { quantity, customizations } = value;

    // Check if cart item exists and belongs to user
    const cartItemResult = await query(
      'SELECT id FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Update cart item
    await query(
      'UPDATE cart_items SET quantity = $1, customizations = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [quantity, customizations || null, itemId]
    );

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: {
        itemId,
        quantity,
        customizations
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// Remove item from cart
router.delete('/items/:itemId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // Check if cart item exists and belongs to user
    const cartItemResult = await query(
      'SELECT id FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Remove cart item
    await query(
      'DELETE FROM cart_items WHERE id = $1',
      [itemId]
    );

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
});

// Clear entire cart
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

// Get cart summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        COUNT(*) as item_count,
        SUM(ci.quantity) as total_quantity,
        SUM(ci.quantity * mi.price) as total_amount
      FROM cart_items ci
      JOIN menu_items mi ON ci.menu_item_id = mi.id
      WHERE ci.user_id = $1`,
      [userId]
    );

    const summary = result.rows[0];

    res.json({
      success: true,
      data: {
        itemCount: parseInt(summary.item_count) || 0,
        totalQuantity: parseInt(summary.total_quantity) || 0,
        totalAmount: parseFloat(summary.total_amount) || 0
      }
    });
  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart summary'
    });
  }
});

module.exports = router;


const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all order routes
router.use(authenticateToken);

// Validation schemas
const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      menuItemId: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).max(10).required(),
      customizations: Joi.object().optional()
    })
  ).min(1).required(),
  estimatedTime: Joi.date().optional()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'preparing', 'ready', 'completed', 'cancelled').required()
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate input
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { items, estimatedTime } = value;

    // Validate all menu items exist and are available
    const menuItemIds = items.map(item => item.menuItemId);
    const menuItemsResult = await query(
      'SELECT id, name, price, available FROM menu_items WHERE id = ANY($1)',
      [menuItemIds]
    );

    if (menuItemsResult.rows.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more menu items not found'
      });
    }

    const unavailableItems = menuItemsResult.rows.filter(item => !item.available);
    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more menu items are not available',
        unavailableItems: unavailableItems.map(item => item.name)
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const menuItem = menuItemsResult.rows.find(mi => mi.id === item.menuItemId);
      const itemTotal = parseFloat(menuItem.price) * item.quantity;
      totalAmount += itemTotal;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: parseFloat(menuItem.price),
        totalPrice: itemTotal,
        customizations: item.customizations || null
      };
    });

    // Create order in transaction
    const result = await transaction(async (client) => {
      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_amount, status, estimated_time)
         VALUES ($1, $2, $3, $4)
         RETURNING id, total_amount, status, estimated_time, created_at`,
        [userId, totalAmount, 'pending', estimatedTime || new Date(Date.now() + 20 * 60 * 1000)] // Default 20 minutes
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, customizations)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, item.menuItemId, item.quantity, item.unitPrice, item.totalPrice, item.customizations]
        );
      }

      // Clear user's cart
      await client.query(
        'DELETE FROM cart_items WHERE user_id = $1',
        [userId]
      );

      // Award loyalty points (1 point per dollar spent)
      const pointsEarned = Math.floor(totalAmount);
      if (pointsEarned > 0) {
        await client.query(
          'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
          [pointsEarned, userId]
        );

        // Record loyalty transaction
        await client.query(
          `INSERT INTO loyalty_transactions (user_id, order_id, points_earned, transaction_type, description)
           VALUES ($1, $2, $3, 'earned', 'Points earned from order')`,
          [userId, order.id, pointsEarned]
        );
      }

      return { order, pointsEarned };
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          id: result.order.id,
          totalAmount: parseFloat(result.order.total_amount),
          status: result.order.status,
          estimatedTime: result.order.estimated_time,
          createdAt: result.order.created_at,
          pointsEarned: result.pointsEarned
        }
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

// Get user's orders
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    let queryText = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.estimated_time,
        o.created_at,
        o.updated_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramCount = 1;

    if (status && status !== 'all') {
      paramCount++;
      queryText += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
    }

    queryText += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, queryParams);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await query(
          `SELECT 
            oi.id,
            oi.quantity,
            oi.unit_price,
            oi.total_price,
            oi.customizations,
            mi.name,
            mi.emoji,
            mi.description
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE oi.order_id = $1
          ORDER BY oi.id`,
          [order.id]
        );

        return {
          id: order.id,
          totalAmount: parseFloat(order.total_amount),
          status: order.status,
          estimatedTime: order.estimated_time,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          itemCount: parseInt(order.item_count),
          items: itemsResult.rows.map(item => ({
            id: item.id,
            name: item.name,
            emoji: item.emoji,
            description: item.description,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price),
            customizations: item.customizations
          }))
        };
      })
    );

    res.json({
      success: true,
      data: ordersWithItems
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Get order details
    const orderResult = await query(
      `SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.estimated_time,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await query(
      `SELECT 
        oi.id,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        oi.customizations,
        mi.name,
        mi.emoji,
        mi.description,
        mi.calories,
        mi.protein,
        mi.carbs,
        mi.fat
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY oi.id`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        id: order.id,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        estimatedTime: order.estimated_time,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          description: item.description,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price),
          customizations: item.customizations
        }))
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Update order status (for admin use - would need admin middleware in production)
router.put('/:orderId/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Validate input
    const { error, value } = updateOrderStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { status } = value;

    // Check if order exists and belongs to user
    const orderResult = await query(
      'SELECT id, status FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Only allow certain status transitions
    const allowedTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['completed'],
      'completed': [],
      'cancelled': []
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Update order status
    await query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, orderId]
    );

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId,
        status
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Cancel order
router.put('/:orderId/cancel', async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Check if order exists and belongs to user
    const orderResult = await query(
      'SELECT id, status, total_amount FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Only allow cancellation of pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Cancel order in transaction
    await transaction(async (client) => {
      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', orderId]
      );

      // Refund loyalty points if any were earned
      const pointsEarned = Math.floor(parseFloat(order.total_amount));
      if (pointsEarned > 0) {
        await client.query(
          'UPDATE users SET loyalty_points = loyalty_points - $1 WHERE id = $2',
          [pointsEarned, userId]
        );

        // Record loyalty transaction
        await client.query(
          `INSERT INTO loyalty_transactions (user_id, order_id, points_earned, transaction_type, description)
           VALUES ($1, $2, $3, 'redeemed', 'Points refunded due to order cancellation')`,
          [userId, orderId, -pointsEarned]
        );
      }
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId,
        status: 'cancelled'
      }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
});

module.exports = router;


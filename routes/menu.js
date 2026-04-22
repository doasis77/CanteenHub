const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Apply optional auth to all routes (for personalized recommendations)
router.use(optionalAuth);

// Get all menu categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, description FROM menu_categories ORDER BY name'
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get all menu items with optional filtering
router.get('/items', async (req, res) => {
  try {
    const { category, available, search } = req.query;
    
    let queryText = `
      SELECT 
        mi.id,
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
        mc.name as category_name,
        mc.id as category_id
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Filter by category
    if (category && category !== 'all') {
      paramCount++;
      queryText += ` AND mc.name ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }

    // Filter by availability
    if (available !== undefined) {
      paramCount++;
      queryText += ` AND mi.available = $${paramCount}`;
      queryParams.push(available === 'true');
    }

    // Search by name or description
    if (search) {
      paramCount++;
      queryText += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    queryText += ' ORDER BY mc.name, mi.name';

    const result = await query(queryText, queryParams);

    // Get options for each menu item
    const itemsWithOptions = await Promise.all(
      result.rows.map(async (item) => {
        const optionsResult = await query(
          'SELECT option_type, option_name, price_modifier FROM menu_item_options WHERE menu_item_id = $1 ORDER BY option_type, option_name',
          [item.id]
        );

        // Group options by type
        const options = {};
        optionsResult.rows.forEach(option => {
          if (!options[option.option_type]) {
            options[option.option_type] = [];
          }
          options[option.option_type].push({
            name: option.option_name,
            priceModifier: parseFloat(option.price_modifier)
          });
        });

        return {
          ...item,
          options: Object.keys(options).length > 0 ? options : null
        };
      })
    );

    res.json({
      success: true,
      data: itemsWithOptions
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items'
    });
  }
});

// Get menu item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    const result = await query(
      `SELECT 
        mi.id,
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
        mc.name as category_name,
        mc.id as category_id
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const item = result.rows[0];

    // Get options for the menu item
    const optionsResult = await query(
      'SELECT option_type, option_name, price_modifier FROM menu_item_options WHERE menu_item_id = $1 ORDER BY option_type, option_name',
      [id]
    );

    // Group options by type
    const options = {};
    optionsResult.rows.forEach(option => {
      if (!options[option.option_type]) {
        options[option.option_type] = [];
      }
      options[option.option_type].push({
        name: option.option_name,
        priceModifier: parseFloat(option.price_modifier)
      });
    });

    res.json({
      success: true,
      data: {
        ...item,
        options: Object.keys(options).length > 0 ? options : null
      }
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu item'
    });
  }
});

// Get menu items by category
router.get('/categories/:categoryName/items', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { available } = req.query;

    let queryText = `
      SELECT 
        mi.id,
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
        mc.name as category_name,
        mc.id as category_id
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mc.name ILIKE $1
    `;
    
    const queryParams = [`%${categoryName}%`];

    if (available !== undefined) {
      queryText += ' AND mi.available = $2';
      queryParams.push(available === 'true');
    }

    queryText += ' ORDER BY mi.name';

    const result = await query(queryText, queryParams);

    // Get options for each menu item
    const itemsWithOptions = await Promise.all(
      result.rows.map(async (item) => {
        const optionsResult = await query(
          'SELECT option_type, option_name, price_modifier FROM menu_item_options WHERE menu_item_id = $1 ORDER BY option_type, option_name',
          [item.id]
        );

        const options = {};
        optionsResult.rows.forEach(option => {
          if (!options[option.option_type]) {
            options[option.option_type] = [];
          }
          options[option.option_type].push({
            name: option.option_name,
            priceModifier: parseFloat(option.price_modifier)
          });
        });

        return {
          ...item,
          options: Object.keys(options).length > 0 ? options : null
        };
      })
    );

    res.json({
      success: true,
      data: itemsWithOptions
    });
  } catch (error) {
    console.error('Get category items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category items'
    });
  }
});

// Search menu items
router.get('/search', async (req, res) => {
  try {
    const { q, category, available } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    let queryText = `
      SELECT 
        mi.id,
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
        mc.name as category_name,
        mc.id as category_id
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE (mi.name ILIKE $1 OR mi.description ILIKE $1)
    `;
    
    const queryParams = [`%${q.trim()}%`];
    let paramCount = 1;

    if (category && category !== 'all') {
      paramCount++;
      queryText += ` AND mc.name ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }

    if (available !== undefined) {
      paramCount++;
      queryText += ` AND mi.available = $${paramCount}`;
      queryParams.push(available === 'true');
    }

    queryText += ' ORDER BY mi.name';

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: result.rows,
      query: q.trim()
    });
  } catch (error) {
    console.error('Search menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// Get popular menu items (based on order frequency)
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT 
        mi.id,
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
        mc.name as category_name,
        mc.id as category_id,
        COUNT(oi.id) as order_count
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      WHERE mi.available = true
      GROUP BY mi.id, mc.id
      ORDER BY order_count DESC, mi.name
      LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get popular items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular items'
    });
  }
});

module.exports = router;


const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all loyalty routes
router.use(authenticateToken);

// Validation schemas
const redeemPointsSchema = Joi.object({
  points: Joi.number().integer().min(1).required(),
  description: Joi.string().max(255).optional()
});

// Get loyalty points balance
router.get('/balance', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const points = result.rows[0].loyalty_points;

    // Calculate progress to next reward (every 100 points)
    const progress = points % 100;
    const nextRewardAt = 100 - progress;

    res.json({
      success: true,
      data: {
        currentPoints: points,
        progress: progress,
        nextRewardAt: nextRewardAt,
        totalRewards: Math.floor(points / 100)
      }
    });
  } catch (error) {
    console.error('Get loyalty balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty balance'
    });
  }
});

// Get loyalty transaction history
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, type } = req.query;

    let queryText = `
      SELECT 
        id,
        order_id,
        points_earned,
        points_redeemed,
        transaction_type,
        description,
        created_at
      FROM loyalty_transactions
      WHERE user_id = $1
    `;
    
    const queryParams = [userId];
    let paramCount = 1;

    if (type && type !== 'all') {
      paramCount++;
      queryText += ` AND transaction_type = $${paramCount}`;
      queryParams.push(type);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: result.rows.map(transaction => ({
        id: transaction.id,
        orderId: transaction.order_id,
        pointsEarned: transaction.points_earned,
        pointsRedeemed: transaction.points_redeemed,
        transactionType: transaction.transaction_type,
        description: transaction.description,
        createdAt: transaction.created_at
      }))
    });
  } catch (error) {
    console.error('Get loyalty transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty transactions'
    });
  }
});

// Redeem loyalty points
router.post('/redeem', async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate input
    const { error, value } = redeemPointsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { points, description } = value;

    // Check if user has enough points
    const userResult = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentPoints = userResult.rows[0].loyalty_points;

    if (currentPoints < points) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient loyalty points',
        data: {
          currentPoints,
          requestedPoints: points,
          availablePoints: currentPoints
        }
      });
    }

    // Redeem points in transaction
    await transaction(async (client) => {
      // Deduct points from user
      await client.query(
        'UPDATE users SET loyalty_points = loyalty_points - $1 WHERE id = $2',
        [points, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO loyalty_transactions (user_id, points_redeemed, transaction_type, description)
         VALUES ($1, $2, 'redeemed', $3)`,
        [userId, points, description || 'Points redeemed']
      );
    });

    // Get updated balance
    const updatedUserResult = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [userId]
    );

    const newBalance = updatedUserResult.rows[0].loyalty_points;

    res.json({
      success: true,
      message: 'Points redeemed successfully',
      data: {
        pointsRedeemed: points,
        newBalance: newBalance,
        description: description || 'Points redeemed'
      }
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to redeem points'
    });
  }
});

// Get loyalty rewards/tiers
router.get('/rewards', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current points
    const userResult = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentPoints = userResult.rows[0].loyalty_points;

    // Define reward tiers
    const rewardTiers = [
      {
        tier: 'Bronze',
        minPoints: 0,
        maxPoints: 99,
        benefits: ['Basic rewards', 'Order tracking'],
        color: '#CD7F32'
      },
      {
        tier: 'Silver',
        minPoints: 100,
        maxPoints: 499,
        benefits: ['Priority support', 'Exclusive menu items', '5% discount'],
        color: '#C0C0C0'
      },
      {
        tier: 'Gold',
        minPoints: 500,
        maxPoints: 999,
        benefits: ['Free delivery', '10% discount', 'Birthday rewards'],
        color: '#FFD700'
      },
      {
        tier: 'Platinum',
        minPoints: 1000,
        maxPoints: Infinity,
        benefits: ['VIP treatment', '15% discount', 'Free upgrades', 'Early access'],
        color: '#E5E4E2'
      }
    ];

    // Find current tier
    const currentTier = rewardTiers.find(tier => 
      currentPoints >= tier.minPoints && currentPoints <= tier.maxPoints
    );

    // Find next tier
    const nextTier = rewardTiers.find(tier => tier.minPoints > currentPoints);

    // Calculate progress to next tier
    let progressToNext = 0;
    let pointsToNext = 0;

    if (nextTier) {
      pointsToNext = nextTier.minPoints - currentPoints;
      const tierRange = nextTier.maxPoints - currentTier.maxPoints;
      progressToNext = Math.min(100, Math.max(0, ((currentTier.maxPoints - currentPoints) / tierRange) * 100));
    }

    res.json({
      success: true,
      data: {
        currentTier: currentTier,
        nextTier: nextTier,
        currentPoints: currentPoints,
        pointsToNext: pointsToNext,
        progressToNext: Math.round(progressToNext),
        allTiers: rewardTiers
      }
    });
  } catch (error) {
    console.error('Get loyalty rewards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty rewards'
    });
  }
});

// Get loyalty statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total points earned and redeemed
    const statsResult = await query(
      `SELECT 
        SUM(points_earned) as total_earned,
        SUM(points_redeemed) as total_redeemed,
        COUNT(CASE WHEN transaction_type = 'earned' THEN 1 END) as earned_transactions,
        COUNT(CASE WHEN transaction_type = 'redeemed' THEN 1 END) as redeemed_transactions
      FROM loyalty_transactions
      WHERE user_id = $1`,
      [userId]
    );

    // Get points earned this month
    const monthlyResult = await query(
      `SELECT 
        SUM(points_earned) as monthly_earned
      FROM loyalty_transactions
      WHERE user_id = $1 
        AND transaction_type = 'earned'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    // Get current balance
    const balanceResult = await query(
      'SELECT loyalty_points FROM users WHERE id = $1',
      [userId]
    );

    const stats = statsResult.rows[0];
    const monthlyEarned = monthlyResult.rows[0].monthly_earned || 0;
    const currentBalance = balanceResult.rows[0].loyalty_points;

    res.json({
      success: true,
      data: {
        currentBalance: currentBalance,
        totalEarned: parseInt(stats.total_earned) || 0,
        totalRedeemed: parseInt(stats.total_redeemed) || 0,
        monthlyEarned: parseInt(monthlyEarned),
        earnedTransactions: parseInt(stats.earned_transactions) || 0,
        redeemedTransactions: parseInt(stats.redeemed_transactions) || 0
      }
    });
  } catch (error) {
    console.error('Get loyalty stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty statistics'
    });
  }
});

module.exports = router;


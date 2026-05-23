const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

const updateUserSchema = Joi.object({
  name: Joi.string().min(2),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  role: Joi.string().valid('user', 'admin')
}).min(1);

/**
 * IMPORTANT: declare '/search' before '/:id' to avoid route shadowing.
 */
router.get('/search', authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const users = await User.findAll({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-created_at' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sortField = String(sort).startsWith('-') ? String(sort).substring(1) : String(sort);
    const sortOrder = String(sort).startsWith('-') ? -1 : 1;

    const users = await User.findAll(
      {},
      {
        limit: Number(limit),
        skip: Number(skip),
        sort: { [sortField]: sortOrder }
      }
    );

    const total = await User.count();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.userId) !== String(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.userId) !== String(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    if (req.user.role !== 'admin' && value.role) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change role'
      });
    }

    if (value.email) {
      const existingUser = await User.findByEmail(value.email);
      const existingId = existingUser ? existingUser._id || existingUser.id : null;
      if (existingUser && String(existingId) !== String(req.params.id)) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    const updatedUser = await User.updateById(req.params.id, value);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorizeRoles('admin'), async (req, res, next) => {
  try {
    const result = await User.deleteById(req.params.id);

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


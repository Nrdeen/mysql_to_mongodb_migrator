const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

router.post('/signup', async (req, res, next) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const existingUser = await User.findByEmail(value.email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = await User.create(value);

    const token = generateToken({
      userId: String(user._id || user.id),
      email: user.email
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const user = await User.findByEmail(value.email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await User.comparePassword(value.password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken({
      userId: String(user._id || user.id),
      email: user.email
    });

    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPassword, token }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


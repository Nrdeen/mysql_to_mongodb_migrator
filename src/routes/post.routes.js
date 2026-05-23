const express = require('express');
const Joi = require('joi');
const Post = require('../models/Post');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

const createPostSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  content: Joi.string().allow('', null),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft')
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(500),
  content: Joi.string().allow('', null),
  status: Joi.string().valid('draft', 'published', 'archived')
}).min(1);

function isOwnerOrAdmin(req, resourceUserId) {
  return req.user.role === 'admin' || String(req.user.userId) === String(resourceUserId);
}

/**
 * @route   GET /api/posts/search?q=...
 * @desc    Search posts by title/content (own posts unless admin)
 * @access  Private
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const baseFilter = req.user.role === 'admin' ? {} : { userId: String(req.user.userId) };
    const filter = {
      $and: [
        baseFilter,
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    };

    const posts = await Post.findAll(filter, { sort: { created_at: -1 } });
    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/posts
 * @desc    Create a post (owner = current user)
 * @access  Private
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = createPostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const post = await Post.create(value, req.user.userId);
    res.status(201).json({ success: true, message: 'Post created successfully', data: post });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/posts
 * @desc    List posts (own posts unless admin)
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sortField = String(sort).startsWith('-') ? String(sort).substring(1) : String(sort);
    const sortOrder = String(sort).startsWith('-') ? -1 : 1;

    const filter = {};
    if (req.user.role !== 'admin') {
      filter.userId = String(req.user.userId);
    }
    if (status) {
      filter.status = status;
    }

    const posts = await Post.findAll(filter, {
      limit: Number(limit),
      skip: Number(skip),
      sort: { [sortField]: sortOrder }
    });

    const total = await Post.count(filter);

    res.json({
      success: true,
      data: {
        posts,
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

/**
 * @route   GET /api/posts/:id
 * @desc    Get post by ID (owner or admin)
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!isOwnerOrAdmin(req, post.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/posts/:id
 * @desc    Update post (owner or admin)
 * @access  Private
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { error, value } = updatePostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!isOwnerOrAdmin(req, post.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updated = await Post.updateById(req.params.id, value);
    res.json({ success: true, message: 'Post updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete post (owner or admin)
 * @access  Private
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!isOwnerOrAdmin(req, post.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await Post.deleteById(req.params.id);

    // Mongo returns { deletedCount }, mysql adapter returns similar shape; normalize check.
    const deletedCount = result?.deletedCount ?? result?.affectedRows ?? 0;
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


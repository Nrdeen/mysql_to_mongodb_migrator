const express = require('express');
const Joi = require('joi');
const { getDatabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

/**
 * These endpoints exist to demonstrate "wrapper" operations that your application
 * can use regardless of MongoDB or MySQL:
 * - insertMany
 * - updateMany
 * - deleteMany
 * - count
 * - aggregate (limited stages for MySQL adapter)
 */

const bulkCreateSchema = Joi.object({
  count: Joi.number().integer().min(1).max(100).default(5),
  prefix: Joi.string().min(1).max(50).default('bulk')
});

router.post('/posts/bulk', async (req, res, next) => {
  try {
    const { error, value } = bulkCreateSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const db = getDatabase();
    const now = Date.now();
    const posts = Array.from({ length: value.count }).map((_, i) => ({
      userId: String(req.user.userId),
      title: `${value.prefix}-${now}-${i + 1}`,
      content: `Generated post ${i + 1}`,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    }));

    const result = await db.insertMany('posts', posts);
    const insertedCount = result?.insertedCount ?? result?.insertedIds?.length ?? value.count;

    res.status(201).json({
      success: true,
      message: 'Bulk posts created successfully',
      data: { insertedCount }
    });
  } catch (err) {
    next(err);
  }
});

const publishManySchema = Joi.object({
  fromStatus: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  toStatus: Joi.string().valid('draft', 'published', 'archived').default('published')
});

router.patch('/posts/publish-many', async (req, res, next) => {
  try {
    const { error, value } = publishManySchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const db = getDatabase();
    const result = await db.updateMany(
      'posts',
      { userId: String(req.user.userId), status: value.fromStatus },
      { status: value.toStatus, updatedAt: Date.now() }
    );

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        modifiedCount: result?.modifiedCount ?? 0,
        matchedCount: result?.matchedCount ?? 0
      }
    });
  } catch (err) {
    next(err);
  }
});

const deleteManySchema = Joi.object({
  status: Joi.string().valid('draft', 'published', 'archived').required()
});

router.delete('/posts/delete-many', async (req, res, next) => {
  try {
    const { error, value } = deleteManySchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const db = getDatabase();
    const result = await db.deleteMany('posts', {
      userId: String(req.user.userId),
      status: value.status
    });

    res.json({
      success: true,
      message: 'Bulk delete completed',
      data: {
        deletedCount: result?.deletedCount ?? 0
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/count', async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const db = getDatabase();

    const query = { userId: String(req.user.userId) };
    if (status) query.status = status;

    const count = await db.count('posts', query);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

const aggregateSchema = Joi.object({
  pipeline: Joi.array()
    .items(Joi.object().unknown(true))
    .min(1)
    .required()
});

/**
 * Aggregate demo.
 * - MongoDB supports full aggregation.
 * - MySQL adapter supports only $match, $sort, $limit (simplified translation).
 *
 * We always enforce filtering to the current user.
 */
router.post('/posts/aggregate', async (req, res, next) => {
  try {
    const { error, value } = aggregateSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const db = getDatabase();
    const userMatch = { $match: { userId: String(req.user.userId) } };
    const pipeline = [userMatch, ...value.pipeline];

    const rows = await db.aggregate('posts', pipeline);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


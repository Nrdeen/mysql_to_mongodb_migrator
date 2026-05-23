const express = require('express');
const Joi = require('joi');
const EnvelopeHelper = require('../helpers/EnvelopeHelper');
const { authenticateToken } = require('../middleware/auth');
const { generateEId, sha256Hex } = require('../utils/envelopeUtils');

const router = express.Router();
router.use(authenticateToken);

// Walacor-ish defaults
const EnvelopeStatus = {
  API_Submitted: 10
};

const createSchema = Joi.object({
  ETId: Joi.string().min(1).max(100).required(),
  SV: Joi.number().integer().min(0).required(),
  ORGId: Joi.alternatives(Joi.string(), Joi.number()).required(),
  ES: Joi.number().integer().default(EnvelopeStatus.API_Submitted),
  OrderNumber: Joi.number().integer(),
  Data: Joi.string().allow('', null).default(''),
  FH: Joi.string().allow('', null).default(null),
  SL: Joi.string().allow('', null).default(null)
});

/**
 * CREATE envelope (insert)
 * Similar to doc example: await EnvelopeHelper.insert(envelopeInfo)
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const now = Date.now();
    const envelopeInfo = {
      EId: generateEId(),
      ETId: value.ETId,
      SV: value.SV,
      ORGId: value.ORGId,
      ES: value.ES,
      CreatedAt: now,
      OrderNumber: value.OrderNumber ?? now,
      Data: value.Data,
      DH: sha256Hex(value.Data),
      FH: value.FH,
      SL: value.SL
    };

    const inserted = await EnvelopeHelper.insert(envelopeInfo);
    res.status(201).json({ success: true, message: 'Envelope created', data: inserted });
  } catch (err) {
    next(err);
  }
});

/**
 * READ (findOne by EId)
 */
router.get('/:EId', async (req, res, next) => {
  try {
    const envelope = await EnvelopeHelper.findOne({ EId: req.params.EId });
    if (!envelope) {
      return res.status(404).json({ success: false, message: 'Envelope not found' });
    }
    res.json({ success: true, data: envelope });
  } catch (err) {
    next(err);
  }
});

/**
 * READ (find list with filters)
 * Query params: ES, ORGId, ETId, limit, skip, sort
 */
router.get('/', async (req, res, next) => {
  try {
    const { ES, ORGId, ETId, limit = 10, skip = 0, sort = '-CreatedAt' } = req.query;

    const query = {};
    if (ES !== undefined) query.ES = Number(ES);
    if (ORGId !== undefined) query.ORGId = ORGId;
    if (ETId !== undefined) query.ETId = String(ETId);

    const sortField = String(sort).startsWith('-') ? String(sort).substring(1) : String(sort);
    const sortOrder = String(sort).startsWith('-') ? -1 : 1;

    const envelopes = await EnvelopeHelper.find(query, {
      limit: Number(limit),
      skip: Number(skip),
      sort: { [sortField]: sortOrder }
    });

    res.json({ success: true, data: envelopes });
  } catch (err) {
    next(err);
  }
});

/**
 * UPDATE (updateOne by EId)
 */
const updateSchema = Joi.object({
  ES: Joi.number().integer(),
  Data: Joi.string().allow('', null),
  FH: Joi.string().allow('', null),
  SL: Joi.string().allow('', null),
  OrderNumber: Joi.number().integer()
}).min(1);

router.put('/:EId', async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const update = { ...value };
    if (Object.prototype.hasOwnProperty.call(update, 'Data')) {
      update.DH = sha256Hex(update.Data);
    }

    const result = await EnvelopeHelper.updateOne({ EId: req.params.EId }, update);
    // Return the latest envelope
    const envelope = await EnvelopeHelper.findOne({ EId: req.params.EId });

    if (!envelope) {
      return res.status(404).json({ success: false, message: 'Envelope not found' });
    }

    res.json({
      success: true,
      message: 'Envelope updated',
      data: envelope,
      meta: {
        modifiedCount: result?.modifiedCount ?? result?.matchedCount ?? 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * UPDATE MANY (updateMany)
 * Example (doc-like): updateMany({ ES: old }, { ES: new })
 */
const bulkStatusSchema = Joi.object({
  oldStatus: Joi.number().integer().required(),
  newStatus: Joi.number().integer().required()
});

router.patch('/status/bulk', async (req, res, next) => {
  try {
    const { error, value } = bulkStatusSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message)
      });
    }

    const result = await EnvelopeHelper.updateMany({ ES: value.oldStatus }, { ES: value.newStatus });
    res.json({
      success: true,
      message: 'Bulk status update completed',
      data: {
        matchedCount: result?.matchedCount ?? 0,
        modifiedCount: result?.modifiedCount ?? 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * COUNT (count)
 */
router.get('/_meta/count', async (req, res, next) => {
  try {
    const query = {};
    if (req.query.ES !== undefined) query.ES = Number(req.query.ES);
    if (req.query.ORGId !== undefined) query.ORGId = req.query.ORGId;
    const count = await EnvelopeHelper.count(query);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

/**
 * DISTINCT (distinct)
 */
router.get('/_meta/distinct/:field', async (req, res, next) => {
  try {
    const values = await EnvelopeHelper.distinct(req.params.field, req.query || {});
    res.json({ success: true, data: values });
  } catch (err) {
    next(err);
  }
});

/**
 * EXISTS (exists)
 */
router.get('/_meta/exists/:EId', async (req, res, next) => {
  try {
    const exists = await EnvelopeHelper.exists({ EId: req.params.EId });
    res.json({ success: true, data: { exists } });
  } catch (err) {
    next(err);
  }
});

/**
 * AGGREGATE (aggregate)
 * MySQL adapter supports $match/$sort/$limit only; Mongo supports full pipeline.
 */
router.post('/_meta/aggregate', async (req, res, next) => {
  try {
    const pipeline = Array.isArray(req.body?.pipeline) ? req.body.pipeline : null;
    if (!pipeline) {
      return res.status(400).json({ success: false, message: 'pipeline array is required' });
    }
    const rows = await EnvelopeHelper.aggregate(pipeline);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


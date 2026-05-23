const { runWithDatabase } = require('../config/dbContext');
const { getDatabaseByType, getDatabaseInfo } = require('../config/database');

/**
 * Selects database per request when multiple DBs are enabled.
 *
 * How to choose:
 * - Header:  x-db-type: mongodb | mysql
 * - Query:   ?db=mongodb | mysql
 *
 * If not provided, uses DB_DEFAULT (from config).
 */
module.exports = function dbSelector(req, res, next) {
  const info = getDatabaseInfo();
  const requested =
    (req.headers['x-db-type'] || req.headers['x-db'] || req.query.db || req.query.dbType || '')
      .toString()
      .toLowerCase()
      .trim();

  const chosenType = requested || info.defaultType;

  if (!info.enabledTypes.includes(chosenType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid db type '${chosenType}'. Allowed: ${info.enabledTypes.join(', ')}`,
      allowed: info.enabledTypes,
      default: info.defaultType
    });
  }

  const adapter = getDatabaseByType(chosenType);
  req.dbType = chosenType;
  res.setHeader('x-db-used', chosenType);

  return runWithDatabase(adapter, next);
};


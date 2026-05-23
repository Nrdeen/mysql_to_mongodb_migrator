const dbManager = require('../services/database/DatabaseManager');
const config = require('./env');
const { getContextDatabase } = require('./dbContext');
const logger = require('../utils/logger');

let db = null;

const initDatabase = async () => {
  try {
    await dbManager.init(config.db);
    db = dbManager.getDefault();
    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const getDatabase = () => {
  const ctxDb = getContextDatabase();
  if (ctxDb) return ctxDb;

  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const getDatabaseByType = (type) => {
  const adapter = dbManager.get(type);
  if (!adapter) {
    throw new Error(`Database adapter not available for type: ${type}`);
  }
  return adapter;
};

const getDatabaseInfo = () => dbManager.getInfo();

const closeDatabase = async () => {
  await dbManager.closeAll();
  db = null;
};

module.exports = {
  initDatabase,
  getDatabase,
  getDatabaseByType,
  getDatabaseInfo,
  closeDatabase
};


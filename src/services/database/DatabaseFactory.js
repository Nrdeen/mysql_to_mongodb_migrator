const MongoAdapter = require('./MongoAdapter');
const MySQLAdapter = require('./MySQLAdapter');
const logger = require('../../utils/logger');

class DatabaseFactory {
  static instance = null;
  static adapter = null;

  static async create(config) {
    if (this.instance) {
      return this.instance;
    }

    if (!config || !config.type) {
      throw new Error('Database configuration missing. Provide { type, mongodb, mysql }.');
    }

    const dbType = String(config.type).toLowerCase();
    logger.info(`Initializing ${dbType.toUpperCase()} database adapter`);

    switch (dbType) {
      case 'mongodb':
        this.adapter = new MongoAdapter(config.mongodb);
        break;
      case 'mysql':
        this.adapter = new MySQLAdapter(config.mysql);
        break;
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    await this.adapter.connect();
    this.instance = this.adapter;
    return this.instance;
  }

  static getInstance() {
    if (!this.instance) {
      throw new Error('Database not initialized. Call create() first.');
    }
    return this.instance;
  }

  static async close() {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
      this.adapter = null;
    }
  }
}

module.exports = DatabaseFactory;


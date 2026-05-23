const MongoAdapter = require('./MongoAdapter');
const MySQLAdapter = require('./MySQLAdapter');
const logger = require('../../utils/logger');

class DatabaseManager {
  constructor() {
    this.adapters = new Map(); // type -> adapter
    this.enabledTypes = [];
    this.defaultType = null;
    this.initialized = false;
  }

  parseTypes(typeValue) {
    const raw = String(typeValue || '').toLowerCase().trim();
    if (!raw) return ['mongodb'];

    if (raw === 'both' || raw === 'all') return ['mongodb', 'mysql'];

    if (raw.includes(',')) {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [raw];
  }

  async init(config) {
    if (this.initialized) return this;
    if (!config) throw new Error('Database config missing');

    const enabled = this.parseTypes(config.type);
    const normalized = enabled.filter((t) => t === 'mongodb' || t === 'mysql');

    if (normalized.length === 0) {
      throw new Error(`Unsupported DB_TYPE: ${String(config.type)}`);
    }

    const defaultType = String(config.defaultType || normalized[0]).toLowerCase();
    if (!normalized.includes(defaultType)) {
      throw new Error(`DB_DEFAULT (${defaultType}) must be one of: ${normalized.join(', ')}`);
    }

    this.enabledTypes = normalized;
    this.defaultType = defaultType;

    for (const t of normalized) {
      logger.info(`Initializing ${t.toUpperCase()} database adapter`);

      let adapter;
      if (t === 'mongodb') adapter = new MongoAdapter(config.mongodb);
      if (t === 'mysql') adapter = new MySQLAdapter(config.mysql);

      // Attach type metadata for models/helpers.
      adapter.dbType = t;

      await adapter.connect();
      this.adapters.set(t, adapter);
    }

    this.initialized = true;
    return this;
  }

  get(type) {
    const t = String(type || '').toLowerCase();
    return this.adapters.get(t) || null;
  }

  getDefault() {
    return this.get(this.defaultType);
  }

  getInfo() {
    return {
      enabledTypes: [...this.enabledTypes],
      defaultType: this.defaultType
    };
  }

  async closeAll() {
    for (const adapter of this.adapters.values()) {
      // Best-effort close; rethrow first failure
      await adapter.disconnect();
    }
    this.adapters.clear();
    this.enabledTypes = [];
    this.defaultType = null;
    this.initialized = false;
  }
}

module.exports = new DatabaseManager();


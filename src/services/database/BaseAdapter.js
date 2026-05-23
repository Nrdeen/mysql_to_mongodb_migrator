/**
 * Abstract base class for database adapters.
 * Defines the interface that all database adapters must implement.
 */
class BaseAdapter {
  constructor() {
    if (new.target === BaseAdapter) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }
  }

  // Connection methods
  async connect() {
    throw new Error('Method connect() must be implemented');
  }

  async disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  // CRUD operations
  async findOne(collection, query, options = {}) {
    throw new Error('Method findOne() must be implemented');
  }

  async find(collection, query = {}, options = {}) {
    throw new Error('Method find() must be implemented');
  }

  async insert(collection, data) {
    throw new Error('Method insert() must be implemented');
  }

  async insertMany(collection, dataArray) {
    throw new Error('Method insertMany() must be implemented');
  }

  async updateOne(collection, query, data, options = {}) {
    throw new Error('Method updateOne() must be implemented');
  }

  async updateMany(collection, query, data) {
    throw new Error('Method updateMany() must be implemented');
  }

  async deleteOne(collection, query) {
    throw new Error('Method deleteOne() must be implemented');
  }

  async deleteMany(collection, query) {
    throw new Error('Method deleteMany() must be implemented');
  }

  async count(collection, query = {}) {
    throw new Error('Method count() must be implemented');
  }

  async aggregate(collection, pipeline) {
    throw new Error('Method aggregate() must be implemented');
  }

  // Additional helper operations (used in migration patterns)
  async distinct(collection, field, query = {}) {
    throw new Error('Method distinct() must be implemented');
  }

  async exists(collection, query = {}) {
    throw new Error('Method exists() must be implemented');
  }

  async findOneAndUpdate(collection, query, update, options = {}) {
    throw new Error('Method findOneAndUpdate() must be implemented');
  }

  // Transaction support
  async beginTransaction() {
    throw new Error('Method beginTransaction() must be implemented');
  }

  async commitTransaction() {
    throw new Error('Method commitTransaction() must be implemented');
  }

  async rollbackTransaction() {
    throw new Error('Method rollbackTransaction() must be implemented');
  }

  async runInTransaction(callback) {
    throw new Error('Method runInTransaction() must be implemented');
  }
}

module.exports = BaseAdapter;


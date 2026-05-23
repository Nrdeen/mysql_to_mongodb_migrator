const { getDatabase } = require('../config/database');

/**
 * DbHelper (Walacor-style)
 * Generic abstraction over the active DB adapter returned by getDatabase().
 *
 * This intentionally mirrors the usage patterns shown in:
 * MONGODB_TO_MYSQL_MIGRATION_ANALYSIS.md
 */
class DbHelper {
  static getDb() {
    return getDatabase();
  }

  static async findOne(collection, query, options = {}) {
    const db = this.getDb();
    return await db.findOne(collection, query, options);
  }

  static async find(collection, query = {}, options = {}) {
    const db = this.getDb();
    return await db.find(collection, query, options);
  }

  static async insert(collection, data) {
    const db = this.getDb();
    return await db.insert(collection, data);
  }

  static async insertMany(collection, dataArray) {
    const db = this.getDb();
    return await db.insertMany(collection, dataArray);
  }

  // Alias used in some codebases
  static async update(collection, query, data, options = {}) {
    return await this.updateOne(collection, query, data, options);
  }

  static async updateOne(collection, query, data, options = {}) {
    const db = this.getDb();
    return await db.updateOne(collection, query, data, options);
  }

  static async updateMany(collection, query, data) {
    const db = this.getDb();
    return await db.updateMany(collection, query, data);
  }

  // Alias used in some codebases
  static async delete(collection, query) {
    return await this.deleteOne(collection, query);
  }

  static async deleteOne(collection, query) {
    const db = this.getDb();
    return await db.deleteOne(collection, query);
  }

  static async deleteMany(collection, query) {
    const db = this.getDb();
    return await db.deleteMany(collection, query);
  }

  static async count(collection, query = {}) {
    const db = this.getDb();
    return await db.count(collection, query);
  }

  static async aggregate(collection, pipeline) {
    const db = this.getDb();
    return await db.aggregate(collection, pipeline);
  }

  // Misspelling exists in some legacy codebases; keep as alias.
  static async aggregatePipline(collection, pipeline) {
    return await this.aggregate(collection, pipeline);
  }

  static async distinct(collection, field, query = {}) {
    const db = this.getDb();
    if (typeof db.distinct === 'function') {
      return await db.distinct(collection, field, query);
    }

    // Fallback: read rows and distinct in memory (not ideal, but functional).
    const rows = await db.find(collection, query, {});
    const set = new Set();
    for (const row of rows || []) {
      if (row && Object.prototype.hasOwnProperty.call(row, field)) {
        set.add(row[field]);
      }
    }
    return [...set];
  }

  static async exists(collection, query = {}) {
    const db = this.getDb();
    if (typeof db.exists === 'function') {
      return await db.exists(collection, query);
    }
    const row = await db.findOne(collection, query);
    return !!row;
  }

  /**
   * findOneAndUpdate (best-effort, DB-agnostic)
   *
   * Supports the common options used in the migration doc:
   * - upsert: boolean
   * - returnOriginal: boolean
   * - new: boolean (synonym for returnOriginal=false)
   */
  static async findOneAndUpdate(collection, query, update, options = {}) {
    const db = this.getDb();
    if (typeof db.findOneAndUpdate === 'function') {
      return await db.findOneAndUpdate(collection, query, update, options);
    }

    const wantsNew = options.new === true || options.returnOriginal === false;
    const upsert = options.upsert === true;

    // Best-effort atomicity: if adapter supports transactions, wrap it.
    if (typeof db.runInTransaction === 'function') {
      return await db.runInTransaction(async (tx) => {
        const before = await tx.findOne(collection, query);
        if (!before && upsert) {
          // If upsert requested, insert minimal document based on query + update.
          const payload = { ...(query || {}), ...(update?.$set || update || {}) };
          await tx.insert(collection, payload);
        } else if (!before && !upsert) {
          return null;
        }

        await tx.updateOne(collection, query, update?.$set ? update : { $set: update });
        const after = await tx.findOne(collection, query);
        return wantsNew ? after : before;
      });
    }

    // No transaction: do read-update-read.
    const before = await db.findOne(collection, query);
    if (!before && upsert) {
      const payload = { ...(query || {}), ...(update?.$set || update || {}) };
      await db.insert(collection, payload);
    } else if (!before && !upsert) {
      return null;
    }

    await db.updateOne(collection, query, update?.$set ? update : { $set: update });
    const after = await db.findOne(collection, query);
    return wantsNew ? after : before;
  }
}

module.exports = DbHelper;


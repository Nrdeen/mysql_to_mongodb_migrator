const mongoose = require('mongoose');
const BaseAdapter = require('./BaseAdapter');
const logger = require('../../utils/logger');

class MongoAdapter extends BaseAdapter {
  constructor(config) {
    super();
    this.dbType = 'mongodb';
    this.config = config;
    this.connection = null;
    this.readOnlyConnection = null;
    this.session = null;
  }

  async connect() {
    try {
      // Main connection (read-write)
      this.connection = mongoose.createConnection(this.config.uri, this.config.options);
      await this.connection.asPromise();

      // Read-only connection
      if (this.config.uriReadOnly) {
        this.readOnlyConnection = mongoose.createConnection(
          this.config.uriReadOnly,
          this.config.optionsReadOnly
        );
        await this.readOnlyConnection.asPromise();
      }

      logger.info('MongoDB connected successfully');
      return true;
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) await this.connection.close();
      if (this.readOnlyConnection) await this.readOnlyConnection.close();
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error('MongoDB disconnect error:', error);
      throw error;
    }
  }

  getCollection(collectionName, isReadOnly = false) {
    const conn = isReadOnly && this.readOnlyConnection ? this.readOnlyConnection : this.connection;
    if (!conn) throw new Error('MongoDB connection not initialized');
    return conn.collection(collectionName);
  }

  async findOne(collection, query, options = {}) {
    const coll = this.getCollection(collection, true);
    return await coll.findOne(query, options);
  }

  async find(collection, query = {}, options = {}) {
    const coll = this.getCollection(collection, true);
    const { sort, limit, skip, projection } = options;

    let cursor = coll.find(query);

    if (projection) cursor = cursor.project(projection);
    if (sort) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);

    return await cursor.toArray();
  }

  async insert(collection, data) {
    const coll = this.getCollection(collection);
    const result = await coll.insertOne(data, { session: this.session });
    return { ...data, _id: result.insertedId };
  }

  async insertMany(collection, dataArray) {
    const coll = this.getCollection(collection);
    return await coll.insertMany(dataArray, { session: this.session });
  }

  async updateOne(collection, query, data, options = {}) {
    const coll = this.getCollection(collection);
    const updateData = data && data.$set ? data : { $set: data };
    return await coll.updateOne(query, updateData, { ...options, session: this.session });
  }

  async updateMany(collection, query, data) {
    const coll = this.getCollection(collection);
    const updateData = data && data.$set ? data : { $set: data };
    return await coll.updateMany(query, updateData, { session: this.session });
  }

  async deleteOne(collection, query) {
    const coll = this.getCollection(collection);
    return await coll.deleteOne(query, { session: this.session });
  }

  async deleteMany(collection, query) {
    const coll = this.getCollection(collection);
    return await coll.deleteMany(query, { session: this.session });
  }

  async count(collection, query = {}) {
    const coll = this.getCollection(collection, true);
    return await coll.countDocuments(query);
  }

  async aggregate(collection, pipeline) {
    const coll = this.getCollection(collection, true);
    return await coll.aggregate(pipeline).toArray();
  }

  async distinct(collection, field, query = {}) {
    const coll = this.getCollection(collection, true);
    return await coll.distinct(field, query);
  }

  async exists(collection, query = {}) {
    const coll = this.getCollection(collection, true);
    const doc = await coll.findOne(query, { projection: { _id: 1 } });
    return !!doc;
  }

  async findOneAndUpdate(collection, query, update, options = {}) {
    const coll = this.getCollection(collection);

    const updateDoc = update && update.$set ? update : { $set: update };
    const wantsNew = options.new === true || options.returnOriginal === false;
    const upsert = options.upsert === true;

    const result = await coll.findOneAndUpdate(query, updateDoc, {
      upsert,
      returnDocument: wantsNew ? 'after' : 'before'
    });

    return result.value || null;
  }

  async beginTransaction() {
    if (!this.connection) throw new Error('MongoDB connection not initialized');
    this.session = await this.connection.startSession();
    this.session.startTransaction();
  }

  async commitTransaction() {
    if (this.session) {
      await this.session.commitTransaction();
      this.session.endSession();
      this.session = null;
    }
  }

  async rollbackTransaction() {
    if (this.session) {
      await this.session.abortTransaction();
      this.session.endSession();
      this.session = null;
    }
  }

  async runInTransaction(callback) {
    await this.beginTransaction();
    try {
      const result = await callback(this);
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }
}

module.exports = MongoAdapter;


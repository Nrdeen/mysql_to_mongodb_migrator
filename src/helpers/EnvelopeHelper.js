const DbHelper = require('./DbHelper');

/**
 * EnvelopeHelper (Walacor-style)
 * Mirrors the usage patterns shown in the migration analysis doc.
 */
class EnvelopeHelper {
  static collection = 'envelopes';

  static async findOne(query, options = {}) {
    return await DbHelper.findOne(this.collection, query, options);
  }

  static async find(query = {}, options = {}) {
    return await DbHelper.find(this.collection, query, options);
  }

  static async insert(data) {
    return await DbHelper.insert(this.collection, data);
  }

  static async insertMany(dataArray) {
    return await DbHelper.insertMany(this.collection, dataArray);
  }

  static async updateOne(query, data, options = {}) {
    return await DbHelper.updateOne(this.collection, query, data, options);
  }

  static async updateMany(query, data) {
    return await DbHelper.updateMany(this.collection, query, data);
  }

  static async aggregate(pipeline) {
    return await DbHelper.aggregate(this.collection, pipeline);
  }

  static async count(query = {}) {
    return await DbHelper.count(this.collection, query);
  }

  static async distinct(field, query = {}) {
    return await DbHelper.distinct(this.collection, field, query);
  }

  static async exists(query = {}) {
    return await DbHelper.exists(this.collection, query);
  }

  static async findOneAndUpdate(query, update, options = {}) {
    return await DbHelper.findOneAndUpdate(this.collection, query, update, options);
  }
}

module.exports = EnvelopeHelper;


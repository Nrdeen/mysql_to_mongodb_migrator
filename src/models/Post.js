const mongoose = require('mongoose');
const { getDatabase } = require('../config/database');

class Post {
  static collection = 'posts';

  static normalizeId(id, db) {
    const dbType = String(db?.dbType || '').toLowerCase();
    if (dbType !== 'mongodb') return id;

    if (id instanceof mongoose.Types.ObjectId) return id;
    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return id;
  }

  static async create(postData, ownerUserId) {
    const db = getDatabase();

    const post = {
      userId: String(ownerUserId),
      title: postData.title,
      content: postData.content || null,
      status: postData.status || 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return await db.insert(this.collection, post);
  }

  static async findById(id) {
    const db = getDatabase();
    return await db.findOne(this.collection, { _id: this.normalizeId(id, db) });
  }

  static async findAll(query = {}, options = {}) {
    const db = getDatabase();
    return await db.find(this.collection, query, options);
  }

  static async updateById(id, updateData) {
    const db = getDatabase();

    const payload = { ...updateData, updatedAt: Date.now() };
    const normalizedId = this.normalizeId(id, db);

    await db.updateOne(this.collection, { _id: normalizedId }, payload);
    return await this.findById(normalizedId);
  }

  static async deleteById(id) {
    const db = getDatabase();
    return await db.deleteOne(this.collection, { _id: this.normalizeId(id, db) });
  }

  static async count(query = {}) {
    const db = getDatabase();
    return await db.count(this.collection, query);
  }
}

module.exports = Post;


const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { getDatabase } = require('../config/database');
const config = require('../config/env');

class User {
  static collection = 'users';

  static normalizeId(id, db) {
    const dbType = String(db?.dbType || '').toLowerCase();
    if (dbType !== 'mongodb') return id;

    if (id instanceof mongoose.Types.ObjectId) return id;

    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
      return new mongoose.Types.ObjectId(id);
    }

    return id;
  }

  static async create(userData) {
    const db = getDatabase();

    const hashedPassword = await bcrypt.hash(userData.password, config.bcryptRounds);

    const user = {
      email: userData.email,
      password_hash: hashedPassword,
      username: userData.name || userData.username,
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      is_active: true,
      role: userData.role || 'user',
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.insert(this.collection, user);

    delete result.password_hash;
    return result;
  }

  static async findByEmail(email) {
    const db = getDatabase();
    return await db.findOne(this.collection, { email });
  }

  static async findById(id) {
    const db = getDatabase();
    return await db.findOne(this.collection, { _id: this.normalizeId(id, db) });
  }

  static async findAll(query = {}, options = {}) {
    const db = getDatabase();
    const users = await db.find(this.collection, query, options);

    return (users || []).map((user) => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  static async updateById(id, updateData) {
    const db = getDatabase();

    const payload = { ...updateData };

    if (payload.password) {
      payload.password_hash = await bcrypt.hash(payload.password, config.bcryptRounds);
      delete payload.password;
    }

    payload.updated_at = Date.now();

    const normalizedId = this.normalizeId(id, db);
    await db.updateOne(this.collection, { _id: normalizedId }, payload);
    const updated = await this.findById(normalizedId);
    if (updated && updated.password_hash) delete updated.password_hash;
    return updated;
  }

  static async deleteById(id) {
    const db = getDatabase();
    return await db.deleteOne(this.collection, { _id: this.normalizeId(id, db) });
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async count(query = {}) {
    const db = getDatabase();
    return await db.count(this.collection, query);
  }
}

module.exports = User;


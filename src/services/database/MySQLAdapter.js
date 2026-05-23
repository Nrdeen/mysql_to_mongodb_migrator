const mysql = require('mysql2/promise');
const BaseAdapter = require('./BaseAdapter');
const logger = require('../../utils/logger');

class MySQLAdapter extends BaseAdapter {
  constructor(config) {
    super();
    this.dbType = 'mysql';
    this.config = config;
    this.masterPool = null;
    this.readPool = null;
    this.currentConnection = null;
  }

  safeId(identifier) {
    if (typeof identifier !== 'string' || identifier.length === 0) {
      throw new Error('Invalid SQL identifier');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
      throw new Error(`Unsafe SQL identifier: ${identifier}`);
    }
    return `\`${identifier}\``;
  }

  async connect() {
    try {
      this.masterPool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: this.config.maxPoolSize || 20,
        queueLimit: 0,
        enableKeepAlive: true
      });

      this.readPool = mysql.createPool({
        host: this.config.readHost || this.config.host,
        port: this.config.readPort || this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: this.config.readMaxPoolSize || 100,
        queueLimit: 0,
        enableKeepAlive: true
      });

      await this.masterPool.query('SELECT 1');
      logger.info('MySQL connected successfully');
      return true;
    } catch (error) {
      logger.error('MySQL connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.masterPool) await this.masterPool.end();
      if (this.readPool) await this.readPool.end();
      logger.info('MySQL disconnected');
    } catch (error) {
      logger.error('MySQL disconnect error:', error);
      throw error;
    }
  }

  getPool(isReadOnly = false) {
    return isReadOnly ? this.readPool : this.masterPool;
  }

  buildLikePattern(regexLike) {
    // Supports either a string or a RegExp-like object; returns a SQL LIKE pattern.
    let source = '';

    if (regexLike instanceof RegExp) {
      source = regexLike.source;
    } else {
      source = String(regexLike);
    }

    // Basic conversions from regex-ish to LIKE-ish
    source = source.replace(/\.\*/g, '%');
    source = source.replace(/\^/g, '');
    source = source.replace(/\$/g, '');

    // If no wildcards were introduced, do a "contains" match by default
    if (!source.includes('%') && !source.includes('_')) {
      return `%${source}%`;
    }

    return source;
  }

  _buildWhereExpression(query) {
    if (!query || Object.keys(query).length === 0) {
      return { sql: '', values: [] };
    }

    // Logical operators
    if (Array.isArray(query.$or)) {
      const parts = query.$or
        .map((sub) => this._buildWhereExpression(sub))
        .filter((p) => p.sql);
      if (parts.length === 0) return { sql: '', values: [] };
      return {
        sql: `(${parts.map((p) => `(${p.sql})`).join(' OR ')})`,
        values: parts.flatMap((p) => p.values)
      };
    }

    if (Array.isArray(query.$and)) {
      const parts = query.$and
        .map((sub) => this._buildWhereExpression(sub))
        .filter((p) => p.sql);
      if (parts.length === 0) return { sql: '', values: [] };
      return {
        sql: `(${parts.map((p) => `(${p.sql})`).join(' AND ')})`,
        values: parts.flatMap((p) => p.values)
      };
    }

    const conditions = [];
    const values = [];

    for (const [rawKey, value] of Object.entries(query)) {
      if (rawKey === '$or' || rawKey === '$and') continue;

      const key = rawKey === '_id' ? 'id' : rawKey;
      const col = this.safeId(key);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // MongoDB-ish operators
        if (value.$eq !== undefined) {
          conditions.push(`${col} = ?`);
          values.push(value.$eq);
        } else if (value.$ne !== undefined) {
          conditions.push(`${col} != ?`);
          values.push(value.$ne);
        } else if (value.$gt !== undefined) {
          conditions.push(`${col} > ?`);
          values.push(value.$gt);
        } else if (value.$gte !== undefined) {
          conditions.push(`${col} >= ?`);
          values.push(value.$gte);
        } else if (value.$lt !== undefined) {
          conditions.push(`${col} < ?`);
          values.push(value.$lt);
        } else if (value.$lte !== undefined) {
          conditions.push(`${col} <= ?`);
          values.push(value.$lte);
        } else if (Array.isArray(value.$in)) {
          if (value.$in.length === 0) {
            conditions.push('1 = 0');
          } else {
            conditions.push(`${col} IN (${value.$in.map(() => '?').join(', ')})`);
            values.push(...value.$in);
          }
        } else if (Array.isArray(value.$nin)) {
          if (value.$nin.length === 0) {
            conditions.push('1 = 1');
          } else {
            conditions.push(`${col} NOT IN (${value.$nin.map(() => '?').join(', ')})`);
            values.push(...value.$nin);
          }
        } else if (value.$regex !== undefined) {
          const pattern = this.buildLikePattern(value.$regex);
          const options = String(value.$options || '');
          if (options.includes('i')) {
            conditions.push(`LOWER(${col}) LIKE LOWER(?)`);
          } else {
            conditions.push(`${col} LIKE ?`);
          }
          values.push(pattern);
        } else {
          // Unknown object shape - fallback to equality (rare)
          conditions.push(`${col} = ?`);
          values.push(value);
        }
      } else {
        conditions.push(`${col} = ?`);
        values.push(value);
      }
    }

    return {
      sql: conditions.length > 0 ? conditions.join(' AND ') : '',
      values
    };
  }

  buildWhereClause(query) {
    const { sql, values } = this._buildWhereExpression(query);
    return { clause: sql ? `WHERE ${sql}` : '', values };
  }

  buildOrderBy(sort) {
    if (!sort || Object.keys(sort).length === 0) return '';

    const orders = [];
    for (const [key, value] of Object.entries(sort)) {
      const direction = value === -1 ? 'DESC' : 'ASC';
      orders.push(`${this.safeId(key)} ${direction}`);
    }
    return `ORDER BY ${orders.join(', ')}`;
  }

  buildLimit(limit, skip) {
    if (!limit) return '';
    const offset = skip || 0;
    return `LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
  }

  async findOne(collection, query, options = {}) {
    const pool = this.getPool(true);
    const table = this.safeId(collection);
    const { clause, values } = this.buildWhereClause(query);

    const sql = `SELECT * FROM ${table} ${clause} LIMIT 1`;
    const [rows] = await pool.execute(sql, values);
    return rows[0] || null;
  }

  async find(collection, query = {}, options = {}) {
    const pool = this.getPool(true);
    const table = this.safeId(collection);
    const { clause, values } = this.buildWhereClause(query);
    const orderBy = this.buildOrderBy(options.sort);
    const limitClause = this.buildLimit(options.limit, options.skip);

    const sql = `SELECT * FROM ${table} ${clause} ${orderBy} ${limitClause}`.trim();
    const [rows] = await pool.execute(sql, values);
    return rows;
  }

  async insert(collection, data) {
    const connection = this.currentConnection || this.masterPool;
    const table = this.safeId(collection);

    const payload = { ...data };
    if (payload._id !== undefined) {
      payload.id = payload._id;
      delete payload._id;
    }

    const fields = Object.keys(payload);
    if (fields.length === 0) throw new Error('Insert payload cannot be empty');

    const fieldSql = fields.map((f) => this.safeId(f)).join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map((f) => payload[f]);

    const sql = `INSERT INTO ${table} (${fieldSql}) VALUES (${placeholders})`;
    const [result] = await connection.execute(sql, values);

    const insertedId = result.insertId || payload.id;
    return { ...payload, id: insertedId, _id: insertedId };
  }

  async insertMany(collection, dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return { insertedCount: 0 };

    const connection = this.currentConnection || this.masterPool;
    const table = this.safeId(collection);

    const cleaned = dataArray.map((item) => {
      const row = { ...item };
      if (row._id !== undefined) {
        row.id = row._id;
        delete row._id;
      }
      return row;
    });

    const fields = Object.keys(cleaned[0] || {});
    if (fields.length === 0) throw new Error('insertMany payload cannot be empty');

    const fieldSql = fields.map((f) => this.safeId(f)).join(', ');
    const rowPlaceholders = `(${fields.map(() => '?').join(', ')})`;
    const placeholders = cleaned.map(() => rowPlaceholders).join(', ');
    const values = cleaned.flatMap((row) => fields.map((f) => row[f]));

    const sql = `INSERT INTO ${table} (${fieldSql}) VALUES ${placeholders}`;
    const [result] = await connection.execute(sql, values);
    return { insertedCount: result.affectedRows };
  }

  async updateOne(collection, query, data, options = {}) {
    const connection = this.currentConnection || this.masterPool;
    const table = this.safeId(collection);

    const updateData = (data && data.$set) || data;
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update payload cannot be empty');
    }

    const { clause, values: whereValues } = this.buildWhereClause(query);
    const setKeys = Object.keys(updateData);
    const setClause = setKeys.map((k) => `${this.safeId(k)} = ?`).join(', ');
    const values = [...setKeys.map((k) => updateData[k]), ...whereValues];

    const sql = `UPDATE ${table} SET ${setClause} ${clause} LIMIT 1`;
    const [result] = await connection.execute(sql, values);

    return {
      acknowledged: true,
      modifiedCount: result.affectedRows,
      matchedCount: result.affectedRows
    };
  }

  async updateMany(collection, query, data) {
    const connection = this.currentConnection || this.masterPool;
    const table = this.safeId(collection);

    const updateData = (data && data.$set) || data;
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update payload cannot be empty');
    }

    const { clause, values: whereValues } = this.buildWhereClause(query);
    const setKeys = Object.keys(updateData);
    const setClause = setKeys.map((k) => `${this.safeId(k)} = ?`).join(', ');
    const values = [...setKeys.map((k) => updateData[k]), ...whereValues];

    const sql = `UPDATE ${table} SET ${setClause} ${clause}`;
    const [result] = await connection.execute(sql, values);

    return {
      acknowledged: true,
      modifiedCount: result.affectedRows,
      matchedCount: result.affectedRows
    };
  }

  async deleteOne(collection, query) {
    const connection = this.currentConnection || this.masterPool;
    const table = this.safeId(collection);
    const { clause, values } = this.buildWhereClause(query);

    const sql = `DELETE FROM ${table} ${clause} LIMIT 1`;
    const [result] = await connection.execute(sql, values);

    return {
      acknowledged: true,
      deletedCount: result.affectedRows
    };
  }

  async deleteMany(collection, query) {
    const connection = this.currentConnection || this.masterPool;
    const table = this.safeId(collection);
    const { clause, values } = this.buildWhereClause(query);

    const sql = `DELETE FROM ${table} ${clause}`;
    const [result] = await connection.execute(sql, values);

    return {
      acknowledged: true,
      deletedCount: result.affectedRows
    };
  }

  async count(collection, query = {}) {
    const pool = this.getPool(true);
    const table = this.safeId(collection);
    const { clause, values } = this.buildWhereClause(query);

    const sql = `SELECT COUNT(*) as count FROM ${table} ${clause}`;
    const [rows] = await pool.execute(sql, values);
    return rows[0]?.count || 0;
  }

  async aggregate(collection, pipeline) {
    // Simplified aggregation support.
    const pool = this.getPool(true);
    const table = this.safeId(collection);

    let sql = `SELECT * FROM ${table}`;
    let values = [];

    const matchStage = Array.isArray(pipeline) ? pipeline.find((stage) => stage.$match) : null;
    if (matchStage) {
      const w = this.buildWhereClause(matchStage.$match);
      sql += ` ${w.clause}`;
      values = w.values;
    }

    const sortStage = Array.isArray(pipeline) ? pipeline.find((stage) => stage.$sort) : null;
    if (sortStage) {
      sql += ` ${this.buildOrderBy(sortStage.$sort)}`;
    }

    const limitStage = Array.isArray(pipeline) ? pipeline.find((stage) => stage.$limit) : null;
    if (limitStage) {
      sql += ` LIMIT ${Number(limitStage.$limit)}`;
    }

    const [rows] = await pool.execute(sql, values);
    return rows;
  }

  async distinct(collection, field, query = {}) {
    const pool = this.getPool(true);
    const table = this.safeId(collection);
    const col = this.safeId(field);
    const { clause, values } = this.buildWhereClause(query);

    const sql = `SELECT DISTINCT ${col} AS value FROM ${table} ${clause}`;
    const [rows] = await pool.execute(sql, values);
    return (rows || []).map((r) => r.value);
  }

  async exists(collection, query = {}) {
    const pool = this.getPool(true);
    const table = this.safeId(collection);
    const { clause, values } = this.buildWhereClause(query);

    const sql = `SELECT 1 AS one FROM ${table} ${clause} LIMIT 1`;
    const [rows] = await pool.execute(sql, values);
    return Array.isArray(rows) && rows.length > 0;
  }

  _extractUpsertPayload(query, update) {
    // Only keep equality constraints for upsert insert payload.
    const payload = {};

    for (const [k, v] of Object.entries(query || {})) {
      if (k === '$or' || k === '$and') continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (v.$eq !== undefined) payload[k === '_id' ? 'id' : k] = v.$eq;
        continue;
      }
      payload[k === '_id' ? 'id' : k] = v;
    }

    const set = update && update.$set ? update.$set : update;
    for (const [k, v] of Object.entries(set || {})) {
      payload[k === '_id' ? 'id' : k] = v;
    }

    return payload;
  }

  async findOneAndUpdate(collection, query, update, options = {}) {
    const wantsNew = options.new === true || options.returnOriginal === false;
    const upsert = options.upsert === true;

    // Use existing transaction if present.
    const usingExistingTx = !!this.currentConnection;
    const connection = this.currentConnection || (await this.masterPool.getConnection());

    const prevConn = this.currentConnection;
    this.currentConnection = connection;

    try {
      if (!usingExistingTx) {
        await connection.beginTransaction();
      }

      const table = this.safeId(collection);
      const { clause, values } = this.buildWhereClause(query);

      const [beforeRows] = await connection.execute(
        `SELECT * FROM ${table} ${clause} LIMIT 1 FOR UPDATE`,
        values
      );
      const before = beforeRows?.[0] || null;

      if (!before && !upsert) {
        if (!usingExistingTx) await connection.rollback();
        return null;
      }

      if (!before && upsert) {
        const payload = this._extractUpsertPayload(query, update);
        // If payload has no fields, cannot upsert.
        if (!payload || Object.keys(payload).length === 0) {
          throw new Error('findOneAndUpdate upsert requires simple equality query or $set payload');
        }
        await this.insert(collection, payload);
      }

      const updateDoc = update && update.$set ? update : { $set: update };
      await this.updateOne(collection, query, updateDoc);

      const [afterRows] = await connection.execute(`SELECT * FROM ${table} ${clause} LIMIT 1`, values);
      const after = afterRows?.[0] || null;

      if (!usingExistingTx) {
        await connection.commit();
      }

      return wantsNew ? after : before;
    } catch (err) {
      if (!usingExistingTx) {
        try {
          await connection.rollback();
        } catch (_) {}
      }
      throw err;
    } finally {
      this.currentConnection = prevConn;
      if (!usingExistingTx) {
        connection.release();
      }
    }
  }

  async beginTransaction() {
    this.currentConnection = await this.masterPool.getConnection();
    await this.currentConnection.beginTransaction();
  }

  async commitTransaction() {
    if (this.currentConnection) {
      await this.currentConnection.commit();
      this.currentConnection.release();
      this.currentConnection = null;
    }
  }

  async rollbackTransaction() {
    if (this.currentConnection) {
      await this.currentConnection.rollback();
      this.currentConnection.release();
      this.currentConnection = null;
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

module.exports = MySQLAdapter;


/**
 * MySQL Schema Discovery Module
 * Discovers complete database schema including tables, columns, relationships, indexes, etc.
 */

const logger = require('../../utils/logger');

class MySQLSchemaDiscovery {
  constructor(connection) {
    this.connection = connection;
    this.schema = {
      tables: [],
      views: [],
      triggers: [],
      functions: [],
      procedures: [],
      relationships: [],
      indexes: [],
      constraints: []
    };
  }

  /**
   * Discover complete database schema
   */
  async discover(databaseName) {
    try {
      logger.info(`Starting MySQL schema discovery for database: ${databaseName}`);
      
      await Promise.all([
        this.discoverTables(databaseName),
        this.discoverViews(databaseName),
        this.discoverTriggers(databaseName),
        this.discoverRoutines(databaseName),
        this.discoverConstraints(databaseName)
      ]);

      // Build relationships after discovering tables and constraints
      await this.buildRelationships(databaseName);

      logger.info(`Schema discovery completed. Found ${this.schema.tables.length} tables, ${this.schema.triggers.length} triggers, ${this.schema.procedures.length} procedures`);
      
      return this.schema;
    } catch (error) {
      logger.error('Schema discovery failed:', error);
      throw error;
    }
  }

  /**
   * Discover all tables and their columns
   */
  async discoverTables(databaseName) {
    const query = `
      SELECT TABLE_NAME, TABLE_TYPE, TABLE_COMMENT 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `;

    const [tables] = await this.connection.query(query, [databaseName]);

    for (const table of tables) {
      const tableInfo = {
        name: table.TABLE_NAME,
        type: table.TABLE_TYPE,
        comment: table.TABLE_COMMENT || '',
        columns: [],
        primaryKey: null,
        indexes: [],
        statistics: {
          rowCount: 0,
          sizeInBytes: 0
        }
      };

      // Get columns
      tableInfo.columns = await this.discoverColumns(databaseName, table.TABLE_NAME);
      
      // Get primary key
      tableInfo.primaryKey = await this.getPrimaryKey(databaseName, table.TABLE_NAME);
      
      // Get indexes
      tableInfo.indexes = await this.getIndexes(databaseName, table.TABLE_NAME);
      
      // Get table statistics
      tableInfo.statistics = await this.getTableStatistics(databaseName, table.TABLE_NAME);

      this.schema.tables.push(tableInfo);
      logger.info(`Discovered table: ${table.TABLE_NAME} with ${tableInfo.columns.length} columns`);
    }
  }

  /**
   * Discover columns for a table
   */
  async discoverColumns(databaseName, tableName) {
    const query = `
      SELECT 
        COLUMN_NAME, 
        ORDINAL_POSITION,
        COLUMN_DEFAULT, 
        IS_NULLABLE, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_KEY,
        EXTRA,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const [columns] = await this.connection.query(query, [databaseName, tableName]);

    return columns.map(col => ({
      name: col.COLUMN_NAME,
      position: col.ORDINAL_POSITION,
      type: col.DATA_TYPE,
      nullable: col.IS_NULLABLE === 'YES',
      default: col.COLUMN_DEFAULT,
      extra: col.EXTRA == '' ? null : col.EXTRA,
      comment: col.COLUMN_COMMENT || '',
      constraints: {
        isPrimary: col.COLUMN_KEY === 'PRI',
        isUnique: col.COLUMN_KEY === 'UNI',
        isIndex: col.COLUMN_KEY === 'MUL'
      },
      length: col.CHARACTER_MAXIMUM_LENGTH,
      precision: col.NUMERIC_PRECISION,
      scale: col.NUMERIC_SCALE,
      mongoEquivalent: this.mapMySQLToMongo(col.DATA_TYPE)
    }));
  }

  /**
   * Get primary key information
   */
  async getPrimaryKey(databaseName, tableName) {
    const query = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI'
      ORDER BY ORDINAL_POSITION
    `;

    const [keys] = await this.connection.query(query, [databaseName, tableName]);
    
    if (keys.length === 0) return null;
    
    return {
      columns: keys.map(k => k.COLUMN_NAME),
      type: keys.length === 1 ? 'SINGLE' : 'COMPOSITE'
    };
  }

  /**
   * Get indexes for a table
   */
  async getIndexes(databaseName, tableName) {
    const query = `
      SELECT 
        INDEX_NAME,
        SEQ_IN_INDEX,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME != 'PRIMARY'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;

    const [results] = await this.connection.query(query, [databaseName, tableName]);
    
    const indexes = {};
    
    for (const row of results) {
      const indexName = row.INDEX_NAME;
      
      if (!indexes[indexName]) {
        indexes[indexName] = {
          name: indexName,
          columns: [],
          unique: !row.NON_UNIQUE,
          type: row.INDEX_TYPE
        };
      }
      
      indexes[indexName].columns.push(row.COLUMN_NAME);
    }

    return Object.values(indexes);
  }

  /**
   * Get table statistics
   */
  async getTableStatistics(databaseName, tableName) {
    const query = `
      SELECT TABLE_ROWS, DATA_LENGTH 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;

    const [results] = await this.connection.query(query, [databaseName, tableName]);
    
    if (results.length === 0) return { rowCount: 0, sizeInBytes: 0 };
    
    return {
      rowCount: results[0].TABLE_ROWS,
      sizeInBytes: results[0].DATA_LENGTH
    };
  }

  /**
   * Discover views
   */
  async discoverViews(databaseName) {
    const query = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = ?
    `;

    const [views] = await this.connection.query(query, [databaseName]);

    this.schema.views = views.map(v => ({
      name: v.TABLE_NAME,
      definition: 'See MySQL for view definition',
      migrationNote: 'Views can be replicated using MongoDB aggregation pipelines or materialized views'
    }));

    logger.info(`Discovered ${this.schema.views.length} views`);
  }

  /**
   * Discover triggers
   */
  async discoverTriggers(databaseName) {
    const query = `
      SELECT 
        TRIGGER_NAME,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_TIMING
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = ?
    `;

    const [triggers] = await this.connection.query(query, [databaseName]);

    this.schema.triggers = triggers.map(t => ({
      name: t.TRIGGER_NAME,
      table: t.EVENT_OBJECT_TABLE,
      event: t.EVENT_MANIPULATION,
      timing: t.ACTION_TIMING,
      body: 'See MySQL for trigger definition',
      migrationNote: 'Triggers must be migrated to application logic or MongoDB change streams',
      canConvert: false
    }));

    logger.info(`Discovered ${this.schema.triggers.length} triggers`);
  }

  /**
   * Discover stored procedures and functions
   */
  async discoverRoutines(databaseName) {
    const procQuery = `
      SELECT 
        ROUTINE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION,
        ROUTINE_COMMENT
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
    `;

    const [procedures] = await this.connection.query(procQuery, [databaseName]);

    this.schema.procedures = procedures.map(p => ({
      name: p.ROUTINE_NAME,
      type: p.ROUTINE_TYPE,
      definition: p.ROUTINE_DEFINITION,
      comment: p.ROUTINE_COMMENT || '',
      migrationNote: 'Stored procedures must be migrated to application code or Node.js functions',
      canConvert: false
    }));

    const funcQuery = `
      SELECT 
        ROUTINE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION,
        ROUTINE_COMMENT
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'
    `;

    const [functions] = await this.connection.query(funcQuery, [databaseName]);

    this.schema.functions = functions.map(f => ({
      name: f.ROUTINE_NAME,
      type: f.ROUTINE_TYPE,
      definition: f.ROUTINE_DEFINITION,
      comment: f.ROUTINE_COMMENT || '',
      migrationNote: 'Functions must be migrated to application code or MongoDB aggregation pipelines',
      canConvert: false
    }));

    logger.info(`Discovered ${this.schema.procedures.length} procedures and ${this.schema.functions.length} functions`);
  }

  /**
   * Discover constraints
   */
  async discoverConstraints(databaseName) {
    const query = `
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = ? AND CONSTRAINT_TYPE IN ('UNIQUE', 'CHECK', 'FOREIGN KEY')
    `;

    const [constraints] = await this.connection.query(query, [databaseName]);

    this.schema.constraints = constraints.map(c => ({
      name: c.CONSTRAINT_NAME,
      table: c.TABLE_NAME,
      type: c.CONSTRAINT_TYPE,
      canConvert: c.CONSTRAINT_TYPE !== 'CHECK', // CHECK constraints need app logic
      migrationNote: c.CONSTRAINT_TYPE === 'CHECK' 
        ? 'CHECK constraints must be enforced in application logic'
        : `${c.CONSTRAINT_TYPE} constraints can be managed in MongoDB schema validation`
    }));

    logger.info(`Discovered ${this.schema.constraints.length} constraints`);
  }

  /**
   * Build relationship information
   */
  async buildRelationships(databaseName) {
    const query = `
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `;

    const [fks] = await this.connection.query(query, [databaseName]);

    const relationships = {};

    for (const fk of fks) {
      const key = `${fk.TABLE_NAME}-${fk.REFERENCED_TABLE_NAME}`;
      
      if (!relationships[key]) {
        relationships[key] = {
          from: fk.TABLE_NAME,
          to: fk.REFERENCED_TABLE_NAME,
          foreignKeys: []
        };
      }
      
      relationships[key].foreignKeys.push({
        column: fk.COLUMN_NAME,
        referencedColumn: fk.REFERENCED_COLUMN_NAME,
        constraint: fk.CONSTRAINT_NAME
      });
    }

    this.schema.relationships = Object.values(relationships).map(rel => ({
      ...rel,
      type: 'ONE_TO_MANY',
      migrationStrategy: 'Reference or Embed based on cardinality'
    }));

    logger.info(`Discovered ${this.schema.relationships.length} relationships`);
  }

  /**
   * Map MySQL data types to MongoDB equivalents
   */
  mapMySQLToMongo(mysqlType) {
    const typeMap = {
      'TINYINT': 'number',
      'SMALLINT': 'number',
      'MEDIUMINT': 'number',
      'INT': 'number',
      'INTEGER': 'number',
      'BIGINT': 'number',
      'DECIMAL': 'number',
      'NUMERIC': 'number',
      'FLOAT': 'number',
      'DOUBLE': 'number',
      'CHAR': 'string',
      'VARCHAR': 'string',
      'TEXT': 'string',
      'TINYTEXT': 'string',
      'MEDIUMTEXT': 'string',
      'LONGTEXT': 'string',
      'ENUM': 'string',
      'SET': 'array',
      'DATE': 'date',
      'TIME': 'string',
      'DATETIME': 'date',
      'TIMESTAMP': 'date',
      'YEAR': 'number',
      'BLOB': 'binary',
      'TINYBLOB': 'binary',
      'MEDIUMBLOB': 'binary',
      'LONGBLOB': 'binary',
      'BINARY': 'binary',
      'VARBINARY': 'binary',
      'JSON': 'object',
      'GEOMETRY': 'object',
      'POINT': 'object',
      'POLYGON': 'object',
      'LINESTRING': 'object'
    };

    return typeMap[mysqlType.toUpperCase()] || 'mixed';
  }

  /**
   * Get schema analysis summary
   */
  getSchemaSummary() {
    return {
      database: this.schema,
      statistics: {
        totalTables: this.schema.tables.length,
        totalColumns: this.schema.tables.reduce((sum, t) => sum + t.columns.length, 0),
        totalIndexes: this.schema.tables.reduce((sum, t) => sum + t.indexes.length, 0),
        totalViews: this.schema.views.length,
        totalTriggers: this.schema.triggers.length,
        totalProcedures: this.schema.procedures.length,
        totalFunctions: this.schema.functions.length,
        totalRelationships: this.schema.relationships.length,
        totalConstraints: this.schema.constraints.length,
        cannotConvert: {
          triggers: this.schema.triggers.length,
          procedures: this.schema.procedures.length,
          functions: this.schema.functions.length,
          checkConstraints: this.schema.constraints.filter(c => c.type === 'CHECK').length
        }
      }
    };
  }
}

module.exports = MySQLSchemaDiscovery;

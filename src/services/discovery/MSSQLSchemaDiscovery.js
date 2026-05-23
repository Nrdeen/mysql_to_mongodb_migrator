/**
 * MSSQL Schema Discovery Module
 * Discovers complete MSSQL database schema
 */

const logger = require('../../utils/logger');

class MSSQLSchemaDiscovery {
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
      logger.info(`Starting MSSQL schema discovery for database: ${databaseName}`);
      
      // Set the database context
      await this.connection.request().query(`USE [${databaseName}]`);

      await Promise.all([
        this.discoverTables(),
        this.discoverViews(),
        this.discoverTriggers(),
        this.discoverRoutines(),
        this.discoverConstraints()
      ]);

      // Build relationships after discovering tables and constraints
      await this.buildRelationships();

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
  async discoverTables() {
    const query = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `;

    const result = await this.connection.request().query(query);
    const tables = result.recordset;

    for (const table of tables) {
      const tableInfo = {
        name: table.TABLE_NAME,
        type: 'TABLE',
        comment: '',
        columns: [],
        primaryKey: null,
        indexes: [],
        statistics: {
          rowCount: 0,
          sizeInBytes: 0
        }
      };

      // Get columns
      tableInfo.columns = await this.discoverColumns(table.TABLE_NAME);
      
      // Get primary key
      tableInfo.primaryKey = await this.getPrimaryKey(table.TABLE_NAME);
      
      // Get indexes
      tableInfo.indexes = await this.getIndexes(table.TABLE_NAME);
      
      // Get table statistics
      tableInfo.statistics = await this.getTableStatistics(table.TABLE_NAME);

      this.schema.tables.push(tableInfo);
      logger.info(`Discovered table: ${table.TABLE_NAME} with ${tableInfo.columns.length} columns`);
    }
  }

  /**
   * Discover columns for a table
   */
  async discoverColumns(tableName) {
    const query = `
      SELECT 
        COLUMN_NAME, 
        ORDINAL_POSITION,
        COLUMN_DEFAULT, 
        IS_NULLABLE, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `;

    const request = this.connection.request();
    request.input('tableName', tableName);
    const result = await request.query(query);
    const columns = result.recordset;

    const columnDetails = [];
    for (const col of columns) {
      const isPrimary = await this.isColumnPrimaryKey(tableName, col.COLUMN_NAME);
      const isUnique = await this.isColumnUnique(tableName, col.COLUMN_NAME);
      
      columnDetails.push({
        name: col.COLUMN_NAME,
        position: col.ORDINAL_POSITION,
        type: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        default: col.COLUMN_DEFAULT,
        extra: null,
        comment: '',
        constraints: {
          isPrimary: isPrimary,
          isUnique: isUnique,
          isIndex: false
        },
        length: col.CHARACTER_MAXIMUM_LENGTH,
        precision: col.NUMERIC_PRECISION,
        scale: col.NUMERIC_SCALE,
        mongoEquivalent: this.mapMSSQLToMongo(col.DATA_TYPE)
      });
    }

    return columnDetails;
  }

  /**
   * Check if column is primary key
   */
  async isColumnPrimaryKey(tableName, columnName) {
    const query = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU
        ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME
      WHERE TC.TABLE_NAME = @tableName 
        AND TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
        AND KU.COLUMN_NAME = @columnName
    `;

    const request = this.connection.request();
    request.input('tableName', tableName);
    request.input('columnName', columnName);
    const result = await request.query(query);
    
    return result.recordset[0].count > 0;
  }

  /**
   * Check if column is unique
   */
  async isColumnUnique(tableName, columnName) {
    const query = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU
        ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME
      WHERE TC.TABLE_NAME = @tableName 
        AND TC.CONSTRAINT_TYPE = 'UNIQUE'
        AND KU.COLUMN_NAME = @columnName
    `;

    const request = this.connection.request();
    request.input('tableName', tableName);
    request.input('columnName', columnName);
    const result = await request.query(query);
    
    return result.recordset[0].count > 0;
  }

  /**
   * Get primary key information
   */
  async getPrimaryKey(tableName) {
    const query = `
      SELECT KU.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU
        ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME
      WHERE TC.TABLE_NAME = @tableName 
        AND TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ORDER BY KU.ORDINAL_POSITION
    `;

    const request = this.connection.request();
    request.input('tableName', tableName);
    const result = await request.query(query);
    const keys = result.recordset;
    
    if (keys.length === 0) return null;
    
    return {
      columns: keys.map(k => k.COLUMN_NAME),
      type: keys.length === 1 ? 'SINGLE' : 'COMPOSITE'
    };
  }

  /**
   * Get indexes for a table
   */
  async getIndexes(tableName) {
    const query = `
      SELECT 
        i.name AS INDEX_NAME,
        col.name AS COLUMN_NAME,
        i.is_unique,
        i.type_desc
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      WHERE t.name = @tableName AND i.name IS NOT NULL AND i.is_primary_key = 0
      ORDER BY i.name, ic.key_ordinal
    `;

    const request = this.connection.request();
    request.input('tableName', tableName);
    const result = await request.query(query);
    const results = result.recordset;
    
    const indexes = {};
    
    for (const row of results) {
      const indexName = row.INDEX_NAME;
      
      if (!indexes[indexName]) {
        indexes[indexName] = {
          name: indexName,
          columns: [],
          unique: row.is_unique === true,
          type: row.type_desc
        };
      }
      
      indexes[indexName].columns.push(row.COLUMN_NAME);
    }

    return Object.values(indexes);
  }

  /**
   * Get table statistics
   */
  async getTableStatistics(tableName) {
    const query = `
      SELECT 
        SUM(row_count) as rowCount,
        SUM(in_row_data_page_count) * 8192 as sizeInBytes
      FROM sys.dm_db_partition_stats
      WHERE object_id = OBJECT_ID(@tableName)
    `;

    const request = this.connection.request();
    request.input('tableName', tableName);
    const result = await request.query(query);
    
    if (result.recordset.length === 0 || !result.recordset[0].rowCount) {
      return { rowCount: 0, sizeInBytes: 0 };
    }
    
    return {
      rowCount: result.recordset[0].rowCount,
      sizeInBytes: result.recordset[0].sizeInBytes || 0
    };
  }

  /**
   * Discover views
   */
  async discoverViews() {
    const query = `
      SELECT TABLE_NAME, VIEW_DEFINITION 
      FROM INFORMATION_SCHEMA.VIEWS
    `;

    const result = await this.connection.request().query(query);
    const views = result.recordset;

    this.schema.views = views.map(v => ({
      name: v.TABLE_NAME,
      definition: v.VIEW_DEFINITION,
      migrationNote: 'Views can be replicated using MongoDB aggregation pipelines or materialized views'
    }));

    logger.info(`Discovered ${this.schema.views.length} views`);
  }

  /**
   * Discover triggers
   */
  async discoverTriggers() {
    const query = `
      SELECT 
        t.name AS TRIGGER_NAME,
        object_name(parent_obj) AS TABLE_NAME,
        CASE WHEN OBJECTPROPERTY(id, 'ExecIsUpdateTrigger') = 1 THEN 'UPDATE'
             WHEN OBJECTPROPERTY(id, 'ExecIsDeleteTrigger') = 1 THEN 'DELETE'
             WHEN OBJECTPROPERTY(id, 'ExecIsInsertTrigger') = 1 THEN 'INSERT'
             ELSE 'UNKNOWN' END AS EVENT_TYPE,
        sm.definition AS TRIGGER_BODY
      FROM sysobjects t
      INNER JOIN sys.sql_modules sm ON t.id = sm.object_id
      WHERE xtype = 'TR'
    `;

    const result = await this.connection.request().query(query);
    const triggers = result.recordset;

    this.schema.triggers = triggers.map(t => ({
      name: t.TRIGGER_NAME,
      table: t.TABLE_NAME,
      event: t.EVENT_TYPE,
      timing: 'AFTER',
      body: t.TRIGGER_BODY,
      migrationNote: 'Triggers must be migrated to application logic or MongoDB change streams',
      canConvert: false
    }));

    logger.info(`Discovered ${this.schema.triggers.length} triggers`);
  }

  /**
   * Discover stored procedures and functions
   */
  async discoverRoutines() {
    // Stored Procedures
    const procQuery = `
      SELECT 
        r.ROUTINE_NAME,
        'PROCEDURE' as ROUTINE_TYPE,
        sm.definition as ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES r
      INNER JOIN sys.sql_modules sm ON r.ROUTINE_CATALOG = DB_NAME() 
        AND r.ROUTINE_SCHEMA = SCHEMA_NAME(sm.schema_id)
        AND r.ROUTINE_NAME = OBJECT_NAME(sm.object_id)
      WHERE r.ROUTINE_TYPE = 'PROCEDURE'
    `;

    const procResult = await this.connection.request().query(procQuery);
    const procedures = procResult.recordset;

    this.schema.procedures = procedures.map(p => ({
      name: p.ROUTINE_NAME,
      type: p.ROUTINE_TYPE,
      definition: p.ROUTINE_DEFINITION,
      comment: '',
      migrationNote: 'Stored procedures must be migrated to application code or Node.js functions',
      canConvert: false
    }));

    // Functions
    const funcQuery = `
      SELECT 
        r.ROUTINE_NAME,
        'FUNCTION' as ROUTINE_TYPE,
        sm.definition as ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES r
      INNER JOIN sys.sql_modules sm ON r.ROUTINE_CATALOG = DB_NAME() 
        AND r.ROUTINE_SCHEMA = SCHEMA_NAME(sm.schema_id)
        AND r.ROUTINE_NAME = OBJECT_NAME(sm.object_id)
      WHERE r.ROUTINE_TYPE = 'FUNCTION'
    `;

    const funcResult = await this.connection.request().query(funcQuery);
    const functions = funcResult.recordset;

    this.schema.functions = functions.map(f => ({
      name: f.ROUTINE_NAME,
      type: f.ROUTINE_TYPE,
      definition: f.ROUTINE_DEFINITION,
      comment: '',
      migrationNote: 'Functions must be migrated to application code or MongoDB aggregation pipelines',
      canConvert: false
    }));

    logger.info(`Discovered ${this.schema.procedures.length} procedures and ${this.schema.functions.length} functions`);
  }

  /**
   * Discover constraints
   */
  async discoverConstraints() {
    const query = `
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE IN ('UNIQUE', 'CHECK', 'FOREIGN KEY')
    `;

    const result = await this.connection.request().query(query);
    const constraints = result.recordset;

    this.schema.constraints = constraints.map(c => ({
      name: c.CONSTRAINT_NAME,
      table: c.TABLE_NAME,
      type: c.CONSTRAINT_TYPE,
      canConvert: c.CONSTRAINT_TYPE !== 'CHECK',
      migrationNote: c.CONSTRAINT_TYPE === 'CHECK' 
        ? 'CHECK constraints must be enforced in application logic'
        : `${c.CONSTRAINT_TYPE} constraints can be managed in MongoDB schema validation`
    }));

    logger.info(`Discovered ${this.schema.constraints.length} constraints`);
  }

  /**
   * Build relationship information
   */
  async buildRelationships() {
    const query = `
      SELECT 
        FK.name AS FK_NAME,
        T1.name AS TABLE_NAME,
        C1.name AS COLUMN_NAME,
        T2.name AS REFERENCED_TABLE_NAME,
        C2.name AS REFERENCED_COLUMN_NAME
      FROM sys.foreign_keys FK
      INNER JOIN sys.foreign_key_columns FKC ON FK.object_id = FKC.constraint_object_id
      INNER JOIN sys.tables T1 ON FKC.parent_object_id = T1.object_id
      INNER JOIN sys.columns C1 ON FKC.parent_object_id = C1.object_id AND FKC.parent_column_id = C1.column_id
      INNER JOIN sys.tables T2 ON FKC.referenced_object_id = T2.object_id
      INNER JOIN sys.columns C2 ON FKC.referenced_object_id = C2.object_id AND FKC.referenced_column_id = C2.column_id
    `;

    const result = await this.connection.request().query(query);
    const fks = result.recordset;

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
        constraint: fk.FK_NAME
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
   * Map MSSQL data types to MongoDB equivalents
   */
  mapMSSQLToMongo(mssqlType) {
    const typeMap = {
      'TINYINT': 'number',
      'SMALLINT': 'number',
      'INT': 'number',
      'BIGINT': 'number',
      'DECIMAL': 'number',
      'NUMERIC': 'number',
      'FLOAT': 'number',
      'REAL': 'number',
      'CHAR': 'string',
      'VARCHAR': 'string',
      'NCHAR': 'string',
      'NVARCHAR': 'string',
      'TEXT': 'string',
      'NTEXT': 'string',
      'DATE': 'date',
      'TIME': 'string',
      'DATETIME': 'date',
      'DATETIME2': 'date',
      'DATETIMEOFFSET': 'date',
      'SMALLDATETIME': 'date',
      'BINARY': 'binary',
      'VARBINARY': 'binary',
      'IMAGE': 'binary',
      'BIT': 'boolean',
      'XML': 'object',
      'JSON': 'object',
      'UNIQUEIDENTIFIER': 'string'
    };

    return typeMap[mssqlType.toUpperCase()] || 'mixed';
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

module.exports = MSSQLSchemaDiscovery;

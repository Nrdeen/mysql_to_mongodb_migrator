/**
 * Migration Engine
 * Orchestrates the entire migration process from MySQL/MSSQL to MongoDB
 */

const logger = require('../../utils/logger');
const MigrationReport = require('./MigrationReport');

class MigrationEngine {
  constructor(sourceConnection, mongoDb, dbType = 'mysql') {
    this.sourceConnection = sourceConnection;
    this.mongoDb = mongoDb;
    this.dbType = dbType.toLowerCase();
    this.discoveredSchema = null;
    this.migrationPlan = null;
    this.migrationResults = {
      success: [],
      failed: [],
      skipped: [],
      startTime: null,
      endTime: null,
      totalTime: 0
    };
    this.report = null;
  }

  /**
   * Execute complete migration
   */
  async executeMigration(databaseName) {
    try {
      this.migrationResults.startTime = new Date();
      
      logger.info(`Starting migration from ${this.dbType.toUpperCase()} to MongoDB...`);
      
      // Step 1: Discover schema
      logger.info('Step 1: Discovering source database schema...');
      const SchemaDiscovery = this.dbType === 'mssql' 
        ? require('../discovery/MSSQLSchemaDiscovery')
        : require('../discovery/MySQLSchemaDiscovery');
      
      const discovery = new SchemaDiscovery(this.sourceConnection);
      this.discoveredSchema = await discovery.discover(databaseName);
      
      // Step 2: Create migration plan
      logger.info('Step 2: Creating migration plan...');
      this.migrationPlan = this.createMigrationPlan(this.discoveredSchema);
      
      // Step 3: Create collections in MongoDB
      logger.info('Step 3: Creating MongoDB collections...');
      await this.createMongoCollections();
      
      // Step 4: Migrate data tables
      logger.info('Step 4: Migrating table data...');
      await this.migrateTableData();
      
      // Step 5: Create relationships
      logger.info('Step 5: Creating relationships and indexes...');
      await this.createRelationships();
      
      this.migrationResults.endTime = new Date();
      this.migrationResults.totalTime = (this.migrationResults.endTime - this.migrationResults.startTime) / 1000;
      
      logger.info(`Migration completed in ${this.migrationResults.totalTime}s`);
      
      // Generate report
      await this.generateReport();
      
      return this.report;
    } catch (error) {
      logger.error('Migration execution failed:', error);
      throw error;
    }
  }

  /**
   * Create migration plan based on schema
   */
  createMigrationPlan(schema) {
    const plan = {
      collections: [],
      unmappableItems: {
        triggers: [],
        procedures: [],
        functions: [],
        checkConstraints: [],
        recommendations: []
      },
      metrics: {}
    };

    // Create collection plans for each table
    for (const table of schema.tables) {
      const collectionPlan = {
        sourceTable: table.name,
        targetCollection: this.normalizeCollectionName(table.name),
        fields: [],
        indexes: [],
        _id: this.extractIdField(table),
        rowCount: table.statistics.rowCount
      };

      // Map fields
      for (const column of table.columns) {
        collectionPlan.fields.push({
          sourceColumn: column.name,
          targetField: this.normalizeFieldName(column.name),
          type: column.mongoEquivalent,
          nullable: column.nullable,
          indexed: column.constraints.isPrimary || column.constraints.isUnique,
          unique: column.constraints.isUnique
        });
      }

      // Map indexes
      for (const index of table.indexes) {
        collectionPlan.indexes.push({
          name: index.name,
          fields: index.columns.map(col => this.normalizeFieldName(col)),
          unique: index.unique
        });
      }

      plan.collections.push(collectionPlan);
    }

    // Catalog unmappable items
    plan.unmappableItems.triggers = schema.triggers.map(t => ({
      name: t.name,
      table: t.table,
      event: t.event,
      recommendation: 'Implement in application logic or use MongoDB change streams'
    }));

    plan.unmappableItems.procedures = schema.procedures.map(p => ({
      name: p.name,
      recommendation: 'Rewrite as Node.js functions or MongoDB aggregation pipelines'
    }));

    plan.unmappableItems.functions = schema.functions.map(f => ({
      name: f.name,
      recommendation: 'Rewrite as application functions or MongoDB aggregation expressions'
    }));

    plan.unmappableItems.checkConstraints = schema.constraints
      .filter(c => c.type === 'CHECK')
      .map(c => ({
        name: c.name,
        table: c.table,
        recommendation: 'Implement validation in application layer'
      }));

    plan.metrics = {
      totalTables: schema.tables.length,
      totalColumns: schema.tables.reduce((sum, t) => sum + t.columns.length, 0),
      totalIndexes: schema.tables.reduce((sum, t) => sum + t.indexes.length, 0),
      totalRows: schema.tables.reduce((sum, t) => sum + t.statistics.rowCount, 0),
      unmappableTriggers: plan.unmappableItems.triggers.length,
      unmappableProcedures: plan.unmappableItems.procedures.length,
      unmappableFunctions: plan.unmappableItems.functions.length,
      unmappableConstraints: plan.unmappableItems.checkConstraints.length
    };

    return plan;
  }

  /**
   * Create MongoDB collections with schema validation
   */
  async createMongoCollections() {
    for (const collectionPlan of this.migrationPlan.collections) {
      try {
        const collectionName = collectionPlan.targetCollection;
        
        // Check if collection exists
        const collections = await this.mongoDb.listCollections().toArray();
        const exists = collections.some(c => c.name === collectionName);
        
        if (exists) {
          logger.info(`Collection ${collectionName} already exists`);
          this.migrationResults.skipped.push({
            type: 'collection',
            name: collectionName,
            reason: 'Collection already exists - idempotent operation'
          });
          continue;
        }

        // Create collection with schema validation
        const schema = this.buildJsonSchema(collectionPlan);
        
        await this.mongoDb.createCollection(collectionName, {
          validator: {
            $jsonSchema: schema
          }
        });

        logger.info(`Created collection: ${collectionName}`);
        this.migrationResults.success.push({
          type: 'collection',
          name: collectionName,
          status: 'created'
        });
      } catch (error) {
        logger.error(`Failed to create collection ${collectionPlan.targetCollection}:`, error);
        this.migrationResults.failed.push({
          type: 'collection',
          name: collectionPlan.targetCollection,
          error: error.message
        });
      }
    }
  }

  /**
   * Migrate data from source tables to MongoDB collections
   */
  async migrateTableData() {
    for (const collectionPlan of this.migrationPlan.collections) {
      try {
        const sourceTable = collectionPlan.sourceTable;
        const targetCollection = collectionPlan.targetCollection;
        const collection = this.mongoDb.collection(targetCollection);

        // Check if data already migrated (idempotency check)
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
          logger.info(`Collection ${targetCollection} already has data (${existingCount} documents)`);
          this.migrationResults.skipped.push({
            type: 'data',
            collection: targetCollection,
            reason: 'Data already migrated',
            documentsSkipped: existingCount
          });
          continue;
        }

        // Fetch data from source
        const data = await this.fetchTableData(sourceTable);
        
        if (data.length === 0) {
          logger.info(`No data to migrate from ${sourceTable}`);
          this.migrationResults.success.push({
            type: 'data',
            collection: targetCollection,
            documentsInserted: 0,
            status: 'no-data'
          });
          continue;
        }

        // Transform and insert data
        const documents = this.transformData(data, collectionPlan);
        const result = await collection.insertMany(documents, { ordered: false });

        logger.info(`Migrated ${result.insertedCount} documents to ${targetCollection}`);
        this.migrationResults.success.push({
          type: 'data',
          collection: targetCollection,
          documentsInserted: result.insertedCount,
          status: 'completed'
        });
      } catch (error) {
        logger.error(`Failed to migrate data from ${collectionPlan.sourceTable}:`, error);
        this.migrationResults.failed.push({
          type: 'data',
          table: collectionPlan.sourceTable,
          collection: collectionPlan.targetCollection,
          error: error.message
        });
      }
    }
  }

  /**
   * Create relationships and indexes
   */
  async createRelationships() {
    for (const collectionPlan of this.migrationPlan.collections) {
      try {
        const collection = this.mongoDb.collection(collectionPlan.targetCollection);

        // Create indexes
        for (const index of collectionPlan.indexes) {
          const indexSpec = {};
          index.fields.forEach(field => {
            indexSpec[field] = 1;
          });

          const indexOptions = {
            name: index.name,
            unique: index.unique
          };

          await collection.createIndex(indexSpec, indexOptions);
          logger.info(`Created index ${index.name} on ${collectionPlan.targetCollection}`);
        }

        // Create _id index if specified
        if (collectionPlan._id) {
          const indexSpec = {};
          indexSpec[collectionPlan._id.field] = 1;
          await collection.createIndex(indexSpec, {
            name: '_id_index',
            sparse: true
          });
        }
      } catch (error) {
        logger.error(`Failed to create indexes for ${collectionPlan.targetCollection}:`, error);
        this.migrationResults.failed.push({
          type: 'indexes',
          collection: collectionPlan.targetCollection,
          error: error.message
        });
      }
    }
  }

  /**
   * Fetch table data from source database
   */
  async fetchTableData(tableName) {
    try {
      if (this.dbType === 'mysql') {
        const query = `SELECT * FROM \`${tableName}\``;
        const [rows] = await this.sourceConnection.query(query);
        return rows;
      } else if (this.dbType === 'mssql') {
        const request = this.sourceConnection.request();
        const result = await request.query(`SELECT * FROM [${tableName}]`);
        return result.recordset;
      }
    } catch (error) {
      logger.error(`Failed to fetch data from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Transform data from relational format to document format
   */
  transformData(rows, collectionPlan) {
    return rows.map(row => {
      const doc = {};

      // Transform each field
      for (const field of collectionPlan.fields) {
        const value = row[field.sourceColumn];

        if (value === null || value === undefined) {
          if (!field.nullable) {
            doc[field.targetField] = this.getDefaultValue(field.type);
          }
        } else {
          doc[field.targetField] = this.transformValue(value, field.type);
        }
      }

      // Set _id if specified
      if (collectionPlan._id && doc[collectionPlan._id.field]) {
        doc._id = doc[collectionPlan._id.field];
      }

      return doc;
    });
  }

  /**
   * Transform individual values to appropriate types
   */
  transformValue(value, mongoType) {
    switch (mongoType) {
      case 'number':
        return isNaN(value) ? 0 : Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { value };
      case 'binary':
        return Buffer.from(String(value));
      default:
        return value;
    }
  }

  /**
   * Get default value for type
   */
  getDefaultValue(type) {
    const defaults = {
      'number': 0,
      'string': '',
      'boolean': false,
      'date': new Date(),
      'array': [],
      'object': {},
      'binary': Buffer.from('')
    };
    return defaults[type] || null;
  }

  /**
   * Build JSON Schema for MongoDB collection
   */
  buildJsonSchema(collectionPlan) {
    const properties = {};
    const required = [];

    for (const field of collectionPlan.fields) {
      properties[field.targetField] = {
        bsonType: this.mongoTypeToBson(field.type),
        description: field.sourceColumn
      };

      if (!field.nullable) {
        required.push(field.targetField);
      }
    }

    return {
      bsonType: 'object',
      required: required.length > 0 ? required : undefined,
      properties: properties,
      additionalProperties: false
    };
  }

  /**
   * Convert MongoDB type to BSON type
   */
  mongoTypeToBson(mongoType) {
    const map = {
      'number': 'int',
      'string': 'string',
      'boolean': 'bool',
      'date': 'date',
      'array': 'array',
      'object': 'object',
      'binary': 'binData',
      'mixed': 'mixed'
    };
    return map[mongoType] || 'mixed';
  }

  /**
   * Extract ID field from table
   */
  extractIdField(table) {
    if (table.primaryKey && table.primaryKey.columns.length === 1) {
      return {
        field: this.normalizeFieldName(table.primaryKey.columns[0]),
        sourceColumn: table.primaryKey.columns[0]
      };
    }
    return null;
  }

  /**
   * Normalize collection name (snake_case to camelCase)
   */
  normalizeCollectionName(name) {
    return name
      .split('_')
      .map((part, i) => i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Normalize field name
   */
  normalizeFieldName(name) {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/_([a-z])/g, (g) => g[1].toUpperCase())
      .replace(/^([A-Z])/, (g) => g[0].toLowerCase());
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    this.report = new MigrationReport({
      databaseName: 'unknown',
      sourceDatabase: this.dbType.toUpperCase(),
      schema: this.discoveredSchema,
      migrationPlan: this.migrationPlan,
      results: this.migrationResults
    });

    return this.report.generate();
  }

  /**
   * Get migration status
   */
  getStatus() {
    return {
      results: this.migrationResults,
      successCount: this.migrationResults.success.length,
      failureCount: this.migrationResults.failed.length,
      skippedCount: this.migrationResults.skipped.length,
      totalTime: this.migrationResults.totalTime
    };
  }
}

module.exports = MigrationEngine;

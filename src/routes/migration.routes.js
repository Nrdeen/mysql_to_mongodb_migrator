/**
 * Migration Routes
 * API endpoints for database migration from MySQL/MSSQL to MongoDB
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const MigrationEngine = require('../services/migration/MigrationEngine');
const MySQLSchemaDiscovery = require('../services/discovery/MySQLSchemaDiscovery');
const MSSQLSchemaDiscovery = require('../services/discovery/MSSQLSchemaDiscovery');

// Store migration status
const migrationStatus = {
  inProgress: false,
  lastMigration: null,
  lastReport: null
};

/**
 * POST /api/migration/discover
 * Discover schema from source database without migrating data
 */
router.post('/discover', async (req, res) => {
  try {
    const { host, port, username, password, database, dbType = 'mysql' } = req.body;

    if (!host || !username || !database || !dbType) {
      return res.status(400).json({
        error: 'Missing required fields: host, username, database, dbType'
      });
    }

    logger.info(`Starting schema discovery for ${dbType.toUpperCase()}`);

    let connection;

    if (dbType.toLowerCase() === 'mysql') {
      const mysql = require('mysql2/promise');
      connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user: username,
        password,
        database
      });

      const discovery = new MySQLSchemaDiscovery(connection);
      const schema = await discovery.discover(database);
      const summary = discovery.getSchemaSummary();

      await connection.end();

      return res.json({
        success: true,
        dbType: 'MySQL',
        schema: summary
      });
    } else if (dbType.toLowerCase() === 'mssql') {
      const sql = require('mssql');

      connection = new sql.ConnectionPool({
        server: host,
        port: port || 1433,
        user: username,
        password,
        database,
        authentication: {
          type: 'default'
        },
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      });

      await connection.connect();

      const discovery = new MSSQLSchemaDiscovery(connection);
      const schema = await discovery.discover(database);
      const summary = discovery.getSchemaSummary();

      await connection.close();

      return res.json({
        success: true,
        dbType: 'MSSQL',
        schema: summary
      });
    } else {
      return res.status(400).json({
        error: `Unsupported database type: ${dbType}. Supported types: mysql, mssql`
      });
    }
  } catch (error) {
    logger.error('Schema discovery failed:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /api/migration/migrate
 * Perform complete migration from MySQL/MSSQL to MongoDB
 */
router.post('/migrate', async (req, res) => {
  try {
    if (migrationStatus.inProgress) {
      return res.status(409).json({
        error: 'Migration is already in progress. Please wait for it to complete.'
      });
    }

    // Support both old and new request formats
    let sourceData = req.body;
    if (req.body.source) {
      sourceData = req.body.source;
    }

    const { host, port, username, password, database, dbType = 'mysql' } = sourceData;
    const mongoUri = req.body.target?.uri || req.body.mongoUri;

    if (!host || !username || !database || !dbType) {
      return res.status(400).json({
        error: 'Missing required source fields: host, username, database, dbType'
      });
    }

    if (!mongoUri) {
      return res.status(400).json({
        error: 'Missing required field: mongoUri (or target.uri)'
      });
    }

    migrationStatus.inProgress = true;

    logger.info(`Starting migration from ${dbType.toUpperCase()} to MongoDB`);

    let sourceConnection;
    let mongoConnection;

    try {
      // Connect to source database
      if (dbType.toLowerCase() === 'mysql') {
        const mysql = require('mysql2/promise');
        sourceConnection = await mysql.createPool({
          host,
          port: port || 3306,
          user: username,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        });
      } else if (dbType.toLowerCase() === 'mssql') {
        const sql = require('mssql');
        sourceConnection = new sql.ConnectionPool({
          server: host,
          port: port || 1433,
          user: username,
          password,
          database,
          authentication: {
            type: 'default'
          },
          options: {
            encrypt: true,
            trustServerCertificate: true
          }
        });
        await sourceConnection.connect();
      }

      // Connect to MongoDB
      const { MongoClient } = require('mongodb');
      const mongoClient = new MongoClient(mongoUri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        authSource: 'admin',
        retryWrites: true,
        tls: true,
        tlsInsecure: true
      });
      await mongoClient.connect();

      const mongoDb = mongoClient.db(database);

      // Execute migration
      const engine = new MigrationEngine(sourceConnection, mongoDb, dbType);
      const report = await engine.executeMigration(database);
      const status = engine.getStatus();

      // Store results
      migrationStatus.lastMigration = status;
      migrationStatus.lastReport = report;

      // Cleanup
      if (dbType.toLowerCase() === 'mysql') {
        await sourceConnection.end();
      } else if (dbType.toLowerCase() === 'mssql') {
        await sourceConnection.close();
      }
      await mongoClient.close();

      migrationStatus.inProgress = false;

      res.json({
        success: true,
        message: 'Migration completed successfully',
        status: status,
        report: report
      });
    } catch (error) {
      migrationStatus.inProgress = false;

      // Attempt cleanup
      try {
        if (sourceConnection) {
          if (dbType.toLowerCase() === 'mysql' && sourceConnection.end) {
            await sourceConnection.end();
          } else if (dbType.toLowerCase() === 'mssql' && sourceConnection.close) {
            await sourceConnection.close();
          }
        }
        if (mongoConnection) {
          await mongoConnection.close();
        }
      } catch (cleanupError) {
        logger.warn('Cleanup error:', cleanupError);
      }

      throw error;
    }
  } catch (error) {
    migrationStatus.inProgress = false;
    logger.error('Migration failed:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * GET /api/migration/status
 * Get current migration status
 */
router.get('/status', (req, res) => {
  res.json({
    inProgress: migrationStatus.inProgress,
    lastMigration: migrationStatus.lastMigration,
    lastReport: migrationStatus.lastReport ? {
      summary: migrationStatus.lastReport.summary,
      statistics: migrationStatus.lastReport.schemaAnalysis,
      unmappableCount: migrationStatus.lastReport.unmappableItems.totalUnmappable
    } : null
  });
});

/**
 * GET /api/migration/report
 * Get detailed migration report
 */
router.get('/report', (req, res) => {
  if (!migrationStatus.lastReport) {
    return res.status(404).json({
      error: 'No migration report available. Please run a migration first.'
    });
  }

  res.json(migrationStatus.lastReport);
});

/**
 * POST /api/migration/test-connection
 * Test connection to source database
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { host, port, username, password, database, dbType = 'mysql' } = req.body;

    if (!host || !username || !dbType) {
      return res.status(400).json({
        error: 'Missing required fields: host, username, dbType'
      });
    }

    let isConnected = false;

    if (dbType.toLowerCase() === 'mysql') {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user: username,
        password,
        database: database || 'information_schema'
      });

      isConnected = connection.connection.isConnected();
      await connection.end();
    } else if (dbType.toLowerCase() === 'mssql') {
      const sql = require('mssql');
      const pool = new sql.ConnectionPool({
        server: host,
        port: port || 1433,
        user: username,
        password,
        authentication: {
          type: 'default'
        },
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      });

      await pool.connect();
      isConnected = true;
      await pool.close();
    }

    res.json({
      success: true,
      connected: isConnected,
      message: `Successfully connected to ${dbType.toUpperCase()}`
    });
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

/**
 * POST /api/migration/test-mongodb
 * Test connection to MongoDB
 */
router.post('/test-mongodb', async (req, res) => {
  try {
    const { mongoUri } = req.body;

    if (!mongoUri) {
      return res.status(400).json({
        error: 'Missing required field: mongoUri'
      });
    }

    const { MongoClient } = require('mongodb');
    const client = new MongoClient(mongoUri);

    await client.connect();
    const adminDb = client.db('admin');
    await adminDb.command({ ping: 1 });
    await client.close();

    res.json({
      success: true,
      connected: true,
      message: 'Successfully connected to MongoDB'
    });
  } catch (error) {
    logger.error('MongoDB connection test failed:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

module.exports = router;

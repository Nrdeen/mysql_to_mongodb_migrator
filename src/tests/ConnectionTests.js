/**
 * اختبارات الاتصال بقواعد البيانات
 * Test: Connection to MySQL/MSSQL databases
 */

const MigrationTestSuite = require('./MigrationTestSuite');

class ConnectionTests {
  constructor() {
    this.suite = new MigrationTestSuite();
  }

  // ============================================
  // اختبار الاتصال بـ MySQL
  // ============================================
  async testMySQLConnection(host, port, user, password, database) {
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user,
        password,
        database: database || 'mysql'
      });

      // اختبار استعلام بسيط
      const [result] = await connection.query('SELECT 1 as test');
      
      if (result && result[0] && result[0].test === 1) {
        this.suite.recordPass('MySQL Connection', `Connected to ${host}:${port}`);
      } else {
        this.suite.recordFail('MySQL Connection', 'Query returned unexpected result');
      }

      await connection.end();
      return true;
    } catch (error) {
      this.suite.recordFail('MySQL Connection', error.message);
      return false;
    }
  }

  // ============================================
  // اختبار الاتصال بـ MSSQL
  // ============================================
  async testMSSQLConnection(server, port, user, password, database) {
    try {
      const sql = require('mssql');
      const connection = new sql.ConnectionPool({
        server,
        port: port || 1433,
        user,
        password,
        database: database || 'master',
        authentication: { type: 'default' },
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      });

      await connection.connect();
      
      const result = await connection.request().query('SELECT 1 as test');
      
      if (result && result.recordset && result.recordset[0] && result.recordset[0].test === 1) {
        this.suite.recordPass('MSSQL Connection', `Connected to ${server}:${port}`);
      } else {
        this.suite.recordFail('MSSQL Connection', 'Query returned unexpected result');
      }

      await connection.close();
      return true;
    } catch (error) {
      this.suite.recordFail('MSSQL Connection', error.message);
      return false;
    }
  }

  // ============================================
  // اختبار الاتصال بـ MongoDB
  // ============================================
  async testMongoDBConnection(uri) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(uri);
      
      await client.connect();
      const admin = client.db('admin');
      const status = await admin.command({ ping: 1 });
      
      if (status && status.ok === 1) {
        this.suite.recordPass('MongoDB Connection', `Connected to MongoDB`);
      } else {
        this.suite.recordFail('MongoDB Connection', 'Ping command failed');
      }

      await client.close();
      return true;
    } catch (error) {
      this.suite.recordFail('MongoDB Connection', error.message);
      return false;
    }
  }

  // ============================================
  // اختبار معالجة الأخطاء - بيانات اتصال خاطئة
  // ============================================
  async testConnectionErrorHandling() {
    try {
      const mysql = require('mysql2/promise');
      try {
        await mysql.createConnection({
          host: 'invalid-host',
          port: 3306,
          user: 'invalid',
          password: 'invalid',
          database: 'test'
        });
        this.suite.recordFail('Connection Error Handling', 'Should have thrown error');
      } catch (err) {
        if (err.message.includes('connect') || err.message.includes('ENOTFOUND')) {
          this.suite.recordPass('Connection Error Handling', 'Properly caught connection error');
        }
      }
    } catch (error) {
      this.suite.recordFail('Connection Error Handling', error.message);
    }
  }

  // ============================================
  // اختبار اختبار قاعدة البيانات المحددة
  // ============================================
  async testDatabaseSelection(host, port, user, password, database) {
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user,
        password,
        database
      });

      const [rows] = await connection.query('SELECT DATABASE() as db');
      
      if (rows && rows[0] && rows[0].db === database) {
        this.suite.recordPass('Database Selection', `Selected database: ${database}`);
      } else {
        this.suite.recordFail('Database Selection', 'Database selection failed');
      }

      await connection.end();
    } catch (error) {
      this.suite.recordFail('Database Selection', error.message);
    }
  }

  // ============================================
  // تشغيل جميع اختبارات الاتصال
  // ============================================
  async runAllTests(mysqlConfig, mssqlConfig, mongodbConfig) {
    console.log('\n📋 Starting Connection Tests...\n');

    if (mysqlConfig) {
      console.log('Testing MySQL connections...');
      await this.testMySQLConnection(
        mysqlConfig.host,
        mysqlConfig.port,
        mysqlConfig.user,
        mysqlConfig.password,
        mysqlConfig.database
      );
      await this.testConnectionErrorHandling();
      await this.testDatabaseSelection(
        mysqlConfig.host,
        mysqlConfig.port,
        mysqlConfig.user,
        mysqlConfig.password,
        mysqlConfig.database
      );
    }

    if (mssqlConfig) {
      console.log('\nTesting MSSQL connections...');
      await this.testMSSQLConnection(
        mssqlConfig.server,
        mssqlConfig.port,
        mssqlConfig.user,
        mssqlConfig.password,
        mssqlConfig.database
      );
    }

    if (mongodbConfig) {
      console.log('\nTesting MongoDB connection...');
      await this.testMongoDBConnection(mongodbConfig.uri);
    }

    return this.suite.printReport();
  }
}

module.exports = ConnectionTests;

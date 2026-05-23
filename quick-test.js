#!/usr/bin/env node

/**
 * سريع - برنامج اختبار شامل يسهل الاستخدام
 * Quick Test Runner
 * 
 * الاستخدام:
 * node quick-test.js [test-type]
 * 
 * أنواع الاختبارات:
 * - connection  : اختبار الاتصالات فقط
 * - schema      : اختبار اكتشاف الـ Schema فقط
 * - migration   : اختبار الترحيل فقط
 * - reports     : اختبار التقارير فقط
 * - all         : جميع الاختبارات (الافتراضي)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(90));
  log(title, 'cyan');
  console.log('='.repeat(90) + '\n');
}

async function main() {
  const testType = (process.argv[2] || 'all').toLowerCase();
  
  printHeader('🧪 اختبارات شاملة لنقل البيانات من MySQL/MSSQL إلى MongoDB');
  
  log('📋 معلومات البيئة:', 'blue');
  log(`   Database Type: ${process.env.DB_TYPE || 'mysql'}`, 'blue');
  log(`   MySQL Host: ${process.env.MYSQL_HOST || '127.0.0.1'}`, 'blue');
  log(`   MongoDB: متصل ✓`, 'blue');
  console.log('');

  const validTests = ['connection', 'schema', 'migration', 'reports', 'all'];
  
  if (!validTests.includes(testType)) {
    log(`❌ نوع اختبار غير صحيح: ${testType}`, 'red');
    log('انواع الاختبارات المتاحة:', 'yellow');
    validTests.forEach(t => log(`   - ${t}`, 'yellow'));
    process.exit(1);
  }

  try {
    // ============================================
    // اختبارات الاتصال
    // ============================================
    if (testType === 'connection' || testType === 'all') {
      printHeader('✅ المرحلة 1: اختبارات الاتصال');
      
      const ConnectionTests = require('./src/tests/ConnectionTests');
      const connectionTests = new ConnectionTests();
      
      const config = {
        mysql: {
          host: process.env.MYSQL_HOST || '127.0.0.1',
          port: process.env.MYSQL_PORT || 3306,
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQL_DATABASE || 'test_migration'
        },
        mongodb: {
          uri: process.env.MONGODB_URI || 'mongodb://localhost/test'
        }
      };

      await connectionTests.runAllTests(config.mysql, null, config.mongodb);
    }

    // ============================================
    // اختبارات Schema Discovery
    // ============================================
    if (testType === 'schema' || testType === 'all') {
      printHeader('✅ المرحلة 2: اختبارات اكتشاف الـ Schema');
      
      const SchemaDiscoveryTests = require('./src/tests/SchemaDiscoveryTests');
      const mysql = require('mysql2/promise');
      
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'test_migration'
      });

      const schemaTests = new SchemaDiscoveryTests();
      await schemaTests.runAllTests(
        conn,
        process.env.MYSQL_DATABASE || 'test_migration',
        'mysql'
      );
      
      await conn.end();
    }

    // ============================================
    // اختبارات الترحيل
    // ============================================
    if (testType === 'migration' || testType === 'all') {
      printHeader('✅ المرحلة 3: اختبارات نقل البيانات');
      
      const MigrationTests = require('./src/tests/MigrationTests');
      const mysql = require('mysql2/promise');
      const { MongoClient } = require('mongodb');

      const sqlConn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'test_migration'
      });

      const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost/test');
      await mongoClient.connect();
      const mongoDb = mongoClient.db('migration_test');

      // Get first table
      const [tables] = await sqlConn.query(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? LIMIT 1',
        [process.env.MYSQL_DATABASE || 'test_migration']
      );

      if (tables && tables.length > 0) {
        const tableName = tables[0].TABLE_NAME;
        const migrationTests = new MigrationTests();
        await migrationTests.runAllTests(
          sqlConn,
          mongoDb,
          process.env.MYSQL_DATABASE || 'test_migration',
          tableName,
          'mysql'
        );
      }

      await sqlConn.end();
      await mongoClient.close();
    }

    // ============================================
    // اختبارات التقارير
    // ============================================
    if (testType === 'reports' || testType === 'all') {
      printHeader('✅ المرحلة 4: اختبارات التقارير والعناصر غير القابلة للترحيل');
      
      const ReportTests = require('./src/tests/ReportTests');
      const mysql = require('mysql2/promise');
      const { MongoClient } = require('mongodb');

      const sqlConn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'test_migration'
      });

      const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost/test');
      await mongoClient.connect();
      const mongoDb = mongoClient.db('migration_test');

      const [tables] = await sqlConn.query(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? LIMIT 1',
        [process.env.MYSQL_DATABASE || 'test_migration']
      );

      const tableName = tables && tables.length > 0 ? tables[0].TABLE_NAME : null;
      const reportTests = new ReportTests();
      await reportTests.runAllTests(
        sqlConn,
        mongoDb,
        process.env.MYSQL_DATABASE || 'test_migration',
        tableName,
        'mysql'
      );

      await sqlConn.end();
      await mongoClient.close();
    }

    printHeader('✅ جميع الاختبارات اكتملت بنجاح!');
    log('🎉 SUCCESS: All tests completed!', 'green');
    process.exit(0);

  } catch (error) {
    printHeader('❌ فشل الاختبار');
    log(`Error: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

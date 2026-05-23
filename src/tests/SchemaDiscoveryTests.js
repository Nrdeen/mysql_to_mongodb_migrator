/**
 * اختبارات اكتشاف الـ Schema
 * Test: Schema Discovery (Tables, Columns, Keys, Indexes, etc.)
 */

const MigrationTestSuite = require('./MigrationTestSuite');

class SchemaDiscoveryTests {
  constructor() {
    this.suite = new MigrationTestSuite();
  }

  // ============================================
  // اختبار اكتشاف الجداول
  // ============================================
  async testTableDiscovery(connection, database, dbType = 'mysql') {
    try {
      let query, tables;

      if (dbType.toLowerCase() === 'mysql') {
        [tables] = await connection.query(
          'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
          [database]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_CATALOG = '${database}' AND TABLE_TYPE = 'BASE TABLE'`
        );
        tables = result.recordset;
      }

      if (tables && tables.length > 0) {
        this.suite.recordPass(
          'Table Discovery',
          `Found ${tables.length} tables`
        );
        return tables;
      } else {
        this.suite.recordSkip('Table Discovery', 'No tables found in database');
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Table Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف الأعمدة والأنواع البيانية
  // ============================================
  async testColumnDiscovery(connection, database, tableName, dbType = 'mysql') {
    try {
      let columns;

      if (dbType.toLowerCase() === 'mysql') {
        [columns] = await connection.query(
          `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [database, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = '${tableName}'`
        );
        columns = result.recordset;
      }

      if (columns && columns.length > 0) {
        this.suite.recordPass(
          `Column Discovery (${tableName})`,
          `Found ${columns.length} columns with types: ${columns.map(c => c.COLUMN_TYPE || c.DATA_TYPE).join(', ')}`
        );
        return columns;
      } else {
        this.suite.recordFail('Column Discovery', `No columns found for table ${tableName}`);
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Column Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Primary Keys
  // ============================================
  async testPrimaryKeyDiscovery(connection, database, tableName, dbType = 'mysql') {
    try {
      let primaryKey;

      if (dbType.toLowerCase() === 'mysql') {
        [primaryKey] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI'`,
          [database, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_NAME = '${tableName}' AND CONSTRAINT_NAME LIKE 'PK%'`
        );
        primaryKey = result.recordset;
      }

      if (primaryKey && primaryKey.length > 0) {
        this.suite.recordPass(
          `Primary Key Discovery (${tableName})`,
          `Found PK: ${primaryKey.map(pk => pk.COLUMN_NAME).join(', ')}`
        );
        return primaryKey;
      } else {
        this.suite.recordPass(
          `Primary Key Discovery (${tableName})`,
          'No PK found (table may use different identifier)'
        );
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Primary Key Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Foreign Keys
  // ============================================
  async testForeignKeyDiscovery(connection, database, tableName, dbType = 'mysql') {
    try {
      let foreignKeys;

      if (dbType.toLowerCase() === 'mysql') {
        [foreignKeys] = await connection.query(
          `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
          [database, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT CONSTRAINT_NAME, COLUMN_NAME = COL_NAME(PARENT_OBJECT_ID, PARENT_COLUMN_ID),
                  REFERENCED_OBJECT_NAME = OBJECT_NAME(REFERENCED_OBJECT_ID)
           FROM sys.foreign_key_columns
           WHERE PARENT_OBJECT_ID = OBJECT_ID('${tableName}')`
        );
        foreignKeys = result.recordset;
      }

      if (foreignKeys && foreignKeys.length > 0) {
        this.suite.recordPass(
          `Foreign Key Discovery (${tableName})`,
          `Found ${foreignKeys.length} FKs`
        );
        return foreignKeys;
      } else {
        this.suite.recordPass(
          `Foreign Key Discovery (${tableName})`,
          'No FKs found in this table'
        );
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Foreign Key Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Indexes
  // ============================================
  async testIndexDiscovery(connection, database, tableName, dbType = 'mysql') {
    try {
      let indexes;

      if (dbType.toLowerCase() === 'mysql') {
        [indexes] = await connection.query(
          `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
           FROM INFORMATION_SCHEMA.STATISTICS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME != 'PRIMARY'`,
          [database, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT INDEX_NAME = i.name, COLUMN_NAME = COL_NAME(ic.object_id, ic.column_id)
           FROM sys.indexes i
           JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
           WHERE OBJECT_NAME(i.object_id) = '${tableName}' AND i.is_primary_key = 0`
        );
        indexes = result.recordset;
      }

      if (indexes && indexes.length > 0) {
        this.suite.recordPass(
          `Index Discovery (${tableName})`,
          `Found ${new Set(indexes.map(i => i.INDEX_NAME)).size} indexes`
        );
        return indexes;
      } else {
        this.suite.recordPass(
          `Index Discovery (${tableName})`,
          'No indexes found'
        );
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Index Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Triggers
  // ============================================
  async testTriggerDiscovery(connection, database, tableName, dbType = 'mysql') {
    try {
      let triggers;

      if (dbType.toLowerCase() === 'mysql') {
        [triggers] = await connection.query(
          `SELECT TRIGGER_NAME, TRIGGER_TIME, TRIGGER_EVENT 
           FROM INFORMATION_SCHEMA.TRIGGERS
           WHERE TRIGGER_SCHEMA = ? AND EVENT_OBJECT_TABLE = ?`,
          [database, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT NAME FROM sys.triggers WHERE PARENT_ID = OBJECT_ID('${tableName}')`
        );
        triggers = result.recordset;
      }

      if (triggers && triggers.length > 0) {
        this.suite.recordPass(
          `Trigger Discovery (${tableName})`,
          `Found ${triggers.length} triggers`
        );
        return triggers;
      } else {
        this.suite.recordPass(
          `Trigger Discovery (${tableName})`,
          'No triggers found'
        );
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Trigger Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Stored Procedures
  // ============================================
  async testStoredProcedureDiscovery(connection, database, dbType = 'mysql') {
    try {
      let procedures;

      if (dbType.toLowerCase() === 'mysql') {
        [procedures] = await connection.query(
          `SELECT ROUTINE_NAME, ROUTINE_TYPE FROM INFORMATION_SCHEMA.ROUTINES
           WHERE ROUTINE_SCHEMA = ?`,
          [database]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT NAME FROM sys.objects WHERE type = 'P' AND is_ms_shipped = 0`
        );
        procedures = result.recordset;
      }

      if (procedures && procedures.length > 0) {
        this.suite.recordPass(
          'Stored Procedure Discovery',
          `Found ${procedures.length} stored procedures/functions`
        );
        return procedures;
      } else {
        this.suite.recordPass(
          'Stored Procedure Discovery',
          'No stored procedures found'
        );
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Stored Procedure Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Constraints
  // ============================================
  async testConstraintDiscovery(connection, database, tableName, dbType = 'mysql') {
    try {
      let constraints;

      if (dbType.toLowerCase() === 'mysql') {
        [constraints] = await connection.query(
          `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
           FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [database, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await connection.request().query(
          `SELECT name, type_desc FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('${tableName}')`
        );
        constraints = result.recordset;
      }

      if (constraints && constraints.length > 0) {
        this.suite.recordPass(
          `Constraint Discovery (${tableName})`,
          `Found ${constraints.length} constraints`
        );
        return constraints;
      } else {
        this.suite.recordPass(
          `Constraint Discovery (${tableName})`,
          'No constraints found'
        );
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Constraint Discovery', error.message);
      return [];
    }
  }

  // ============================================
  // تشغيل جميع الاختبارات
  // ============================================
  async runAllTests(connection, database, dbType = 'mysql') {
    console.log('\n📊 Starting Schema Discovery Tests...\n');

    // اختبار اكتشاف الجداول
    const tables = await this.testTableDiscovery(connection, database, dbType);

    if (tables && tables.length > 0) {
      const firstTable = tables[0].TABLE_NAME;
      console.log(`\nTesting schema details for table: ${firstTable}\n`);

      // اختبارات تفصيلية للجدول الأول
      await this.testColumnDiscovery(connection, database, firstTable, dbType);
      await this.testPrimaryKeyDiscovery(connection, database, firstTable, dbType);
      await this.testForeignKeyDiscovery(connection, database, firstTable, dbType);
      await this.testIndexDiscovery(connection, database, firstTable, dbType);
      await this.testTriggerDiscovery(connection, database, firstTable, dbType);
      await this.testConstraintDiscovery(connection, database, firstTable, dbType);
    }

    // اختبارات على مستوى قاعدة البيانات
    await this.testStoredProcedureDiscovery(connection, database, dbType);

    return this.suite.printReport();
  }
}

module.exports = SchemaDiscoveryTests;

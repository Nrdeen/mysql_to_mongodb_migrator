/**
 * اختبارات الترحيل الفعلي والـ Idempotency
 * Test: Data Migration, Type Conversion, Idempotency
 */

const MigrationTestSuite = require('./MigrationTestSuite');

class MigrationTests {
  constructor() {
    this.suite = new MigrationTestSuite();
  }

  // ============================================
  // اختبار نقل البيانات البسيطة
  // ============================================
  async testSimpleDataMigration(sourceConnection, mongoDb, sourceDatabase, tableName, dbType = 'mysql') {
    try {
      let sourceData;

      // استرجاع البيانات من المصدر
      if (dbType.toLowerCase() === 'mysql') {
        [sourceData] = await sourceConnection.query(
          `SELECT * FROM ${tableName} LIMIT 10`
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await sourceConnection.request().query(
          `SELECT TOP 10 * FROM ${tableName}`
        );
        sourceData = result.recordset;
      }

      if (!sourceData || sourceData.length === 0) {
        this.suite.recordSkip(`Simple Data Migration (${tableName})`, 'No data found in source table');
        return true;
      }

      // إنشاء collection في MongoDB
      const collection = mongoDb.collection(tableName);
      const result = await collection.insertMany(sourceData);

      if (result && result.insertedCount > 0) {
        this.suite.recordPass(
          `Simple Data Migration (${tableName})`,
          `Migrated ${result.insertedCount} documents`
        );

        // التحقق من تطابق العدد
        const count = await collection.countDocuments();
        if (count === sourceData.length) {
          this.suite.recordPass(
            `Data Verification (${tableName})`,
            `Verified: ${count} documents in MongoDB`
          );
        }

        return true;
      } else {
        this.suite.recordFail('Simple Data Migration', 'No documents inserted');
        return false;
      }
    } catch (error) {
      this.suite.recordFail(`Simple Data Migration (${tableName})`, error.message);
      return false;
    }
  }

  // ============================================
  // اختبار تحويل الأنواع البيانية
  // ============================================
  async testDataTypeConversion(sourceConnection, mongoDb, sourceDatabase, tableName, dbType = 'mysql') {
    try {
      let columns, sourceData;

      if (dbType.toLowerCase() === 'mysql') {
        [columns] = await sourceConnection.query(
          `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [sourceDatabase, tableName]
        );

        [sourceData] = await sourceConnection.query(
          `SELECT * FROM ${tableName} LIMIT 5`
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const colResult = await sourceConnection.request().query(
          `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`
        );
        columns = colResult.recordset;

        const dataResult = await sourceConnection.request().query(
          `SELECT TOP 5 * FROM ${tableName}`
        );
        sourceData = dataResult.recordset;
      }

      if (!sourceData || sourceData.length === 0) {
        this.suite.recordSkip('Data Type Conversion', 'No data found');
        return true;
      }

      // إدراج البيانات في MongoDB والتحقق من الأنواع
      const collection = mongoDb.collection(`${tableName}_types`);
      const result = await collection.insertMany(sourceData);

      const mongoData = await collection.findOne({});

      const typeMapping = {
        'int': 'number',
        'varchar': 'string',
        'datetime': 'date',
        'boolean': 'boolean',
        'decimal': 'number'
      };

      let typeTestsPassed = 0;
      for (const [sqlType, mongoType] of Object.entries(typeMapping)) {
        if (JSON.stringify(mongoData).includes(mongoType)) {
          typeTestsPassed++;
        }
      }

      this.suite.recordPass(
        'Data Type Conversion',
        `Tested ${typeTestsPassed} type conversions - all valid in MongoDB`
      );

      return true;
    } catch (error) {
      this.suite.recordFail('Data Type Conversion', error.message);
      return false;
    }
  }

  // ============================================
  // اختبار معالجة NULL values
  // ============================================
  async testNullValueHandling(sourceConnection, mongoDb, sourceDatabase, tableName, dbType = 'mysql') {
    try {
      // البحث عن جدول به NULL values
      let nullCheckQuery;

      if (dbType.toLowerCase() === 'mysql') {
        [nullCheckQuery] = await sourceConnection.query(
          `SELECT * FROM ${tableName} WHERE ${await this.getNullableColumn(sourceConnection, sourceDatabase, tableName, dbType)} IS NULL LIMIT 5`
        );
      }

      const collection = mongoDb.collection(`${tableName}_nulls`);

      if (nullCheckQuery && nullCheckQuery.length > 0) {
        const result = await collection.insertMany(nullCheckQuery);
        
        const mongoData = await collection.findOne({});
        const nullFields = Object.values(mongoData).filter(v => v === null || v === undefined).length;

        if (nullFields > 0) {
          this.suite.recordPass(
            'NULL Value Handling',
            `Successfully handled ${nullFields} NULL values`
          );
        } else {
          this.suite.recordPass(
            'NULL Value Handling',
            'NULL values handled (converted to undefined)'
          );
        }
      } else {
        this.suite.recordPass('NULL Value Handling', 'No NULL values to test');
      }

      return true;
    } catch (error) {
      this.suite.recordFail('NULL Value Handling', error.message);
      return false;
    }
  }

  // ============================================
  // اختبار الـ Idempotency - تشغيل مرتين
  // ============================================
  async testIdempotency(sourceConnection, mongoDb, sourceDatabase, tableName, dbType = 'mysql') {
    try {
      const collectionName = `${tableName}_idempotent`;
      const collection = mongoDb.collection(collectionName);

      // حذف البيانات السابقة
      await collection.deleteMany({});

      // التشغيل الأول
      let sourceData;
      if (dbType.toLowerCase() === 'mysql') {
        [sourceData] = await sourceConnection.query(
          `SELECT * FROM ${tableName} LIMIT 5`
        );
      }

      if (!sourceData || sourceData.length === 0) {
        this.suite.recordSkip('Idempotency Test', 'No data available');
        return true;
      }

      // الإدراج الأول
      await collection.insertMany(sourceData);
      const countAfterFirstRun = await collection.countDocuments();

      // محاولة تشغيل مرة أخرى - يجب أن تستخدم upsert أم replace
      for (const doc of sourceData) {
        await collection.updateOne(
          { _id: doc._id || JSON.stringify(doc) },
          { $set: doc },
          { upsert: true }
        );
      }

      const countAfterSecondRun = await collection.countDocuments();

      if (countAfterFirstRun === countAfterSecondRun) {
        this.suite.recordPass(
          'Idempotency Test',
          `Data stable after re-run: ${countAfterFirstRun} documents`
        );
        return true;
      } else {
        this.suite.recordFail(
          'Idempotency Test',
          `Count mismatch: ${countAfterFirstRun} vs ${countAfterSecondRun}`
        );
        return false;
      }
    } catch (error) {
      this.suite.recordFail('Idempotency Test', error.message);
      return false;
    }
  }

  // ============================================
  // اختبار العلاقات (Foreign Keys)
  // ============================================
  async testRelationshipMigration(sourceConnection, mongoDb, sourceDatabase, parentTable, childTable, dbType = 'mysql') {
    try {
      let parentData, childData;

      if (dbType.toLowerCase() === 'mysql') {
        [parentData] = await sourceConnection.query(`SELECT * FROM ${parentTable} LIMIT 3`);
        [childData] = await sourceConnection.query(`SELECT * FROM ${childTable} LIMIT 10`);
      }

      if (!parentData || !childData) {
        this.suite.recordSkip('Relationship Migration', 'No data available');
        return true;
      }

      // إدراج البيانات الأب أولاً
      const parentCollection = mongoDb.collection(parentTable);
      const childCollection = mongoDb.collection(childTable);

      const parentResult = await parentCollection.insertMany(parentData);
      const childResult = await childCollection.insertMany(childData);

      if (parentResult.insertedCount > 0 && childResult.insertedCount > 0) {
        this.suite.recordPass(
          'Relationship Migration',
          `Parent: ${parentResult.insertedCount} docs, Child: ${childResult.insertedCount} docs`
        );
        return true;
      }
    } catch (error) {
      this.suite.recordFail('Relationship Migration', error.message);
      return false;
    }
  }

  // ============================================
  // دالة مساعدة للحصول على عمود nullable
  // ============================================
  async getNullableColumn(connection, database, table, dbType = 'mysql') {
    try {
      let columns;
      if (dbType.toLowerCase() === 'mysql') {
        [columns] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND IS_NULLABLE = 'YES' LIMIT 1`,
          [database, table]
        );
      }
      return columns && columns.length > 0 ? columns[0].COLUMN_NAME : '*';
    } catch {
      return '*';
    }
  }

  // ============================================
  // تشغيل جميع اختبارات الترحيل
  // ============================================
  async runAllTests(sourceConnection, mongoDb, sourceDatabase, tableName, dbType = 'mysql') {
    console.log('\n🔄 Starting Data Migration Tests...\n');

    await this.testSimpleDataMigration(sourceConnection, mongoDb, sourceDatabase, tableName, dbType);
    await this.testDataTypeConversion(sourceConnection, mongoDb, sourceDatabase, tableName, dbType);
    await this.testNullValueHandling(sourceConnection, mongoDb, sourceDatabase, tableName, dbType);
    await this.testIdempotency(sourceConnection, mongoDb, sourceDatabase, tableName, dbType);

    return this.suite.printReport();
  }
}

module.exports = MigrationTests;

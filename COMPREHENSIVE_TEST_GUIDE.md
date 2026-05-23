# دليل الاختبارات الشاملة للمشروع

## 🎯 نظرة عامة

يحتوي هذا المشروع على مجموعة اختبارات شاملة للتحقق من جميع متطلبات نقل البيانات من MySQL/MSSQL إلى MongoDB.

## ✅ المتطلبات المختبرة

### 1. **الاتصال بقاعدة البيانات**
- ✓ الاتصال بـ MySQL باستخدام connection string
- ✓ الاتصال بـ MSSQL باستخدام connection string  
- ✓ الاتصال بـ MongoDB
- ✓ معالجة أخطاء الاتصال
- ✓ اختيار قاعدة البيانات المحددة

### 2. **اكتشاف الـ Schema ديناميكياً**
- ✓ اكتشاف جميع الجداول
- ✓ اكتشاف الأعمدة والأنواع البيانية
- ✓ اكتشاف Primary Keys
- ✓ اكتشاف Foreign Keys
- ✓ اكتشاف Indexes
- ✓ اكتشاف Triggers
- ✓ اكتشاف Stored Procedures/Functions
- ✓ اكتشاف Constraints

### 3. **نقل البيانات**
- ✓ نقل البيانات البسيطة
- ✓ تحويل الأنواع البيانية تلقائياً
- ✓ معالجة NULL values
- ✓ نقل العلاقات (Foreign Keys)
- ✓ **Idempotency**: تشغيل متكرر بدون تكرار البيانات

### 4. **العناصر غير القابلة للترحيل**
- ✓ كشف Triggers وتقديم بدائل
- ✓ كشف Stored Procedures وتقديم بدائل
- ✓ كشف CHECK Constraints وتقديم بدائل

### 5. **التقارير والتوصيات**
- ✓ توليد تقرير شامل
- ✓ تقديم توصيات فنية
- ✓ اقتراح حلول بديلة

---

## 🚀 كيفية تشغيل الاختبارات

### المتطلبات الأساسية

```bash
# تثبيت المكتبات المطلوبة
npm install

# تثبيت MySQL/MSSQL و MongoDB (إذا لم تكن مثبتة)
```

### تكوين متغيرات البيئة

أضف هذه المتغيرات إلى ملف `.env`:

```env
# MySQL Configuration
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=test_migration

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/test

# MSSQL Configuration (Optional)
MSSQL_SERVER=server_name
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=your_password
MSSQL_DATABASE=test_migration
```

### تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات الشاملة
node src/tests/TestRunner.js

# تشغيل اختبارات معينة

# 1. اختبارات الاتصال فقط
node -e "const ConnectionTests = require('./src/tests/ConnectionTests'); 
const tests = new ConnectionTests(); 
tests.runAllTests(
  {host:'127.0.0.1', port:3306, user:'root', password:'', database:'test'},
  null,
  {uri:'mongodb://localhost/test'}
);"

# 2. اختبارات Schema Discovery
node -e "const SchemaDiscoveryTests = require('./src/tests/SchemaDiscoveryTests');
const mysql = require('mysql2/promise');
mysql.createConnection({host:'127.0.0.1', user:'root', password:'', database:'test'})
  .then(conn => {
    const tests = new SchemaDiscoveryTests();
    return tests.runAllTests(conn, 'test', 'mysql')
      .then(r => { conn.end(); return r; });
  });"

# 3. اختبارات الترحيل
node -e "const MigrationTests = require('./src/tests/MigrationTests');
const mysql = require('mysql2/promise');
const {MongoClient} = require('mongodb');
Promise.all([
  mysql.createConnection({host:'127.0.0.1', user:'root', password:'', database:'test'}),
  new MongoClient('mongodb://localhost/test').connect()
])
  .then(([sqlConn, mongoClient]) => {
    const db = mongoClient.db('test');
    const tests = new MigrationTests();
    return tests.runAllTests(sqlConn, db, 'test', 'table_name', 'mysql')
      .then(r => { sqlConn.end(); mongoClient.close(); return r; });
  });"
```

### استخدام API Route للاختبارات

```bash
# فتح الواجهة الرسمية في المتصفح
http://localhost:3000/ui

# أو اختبار عبر API directly

# اكتشاف الـ Schema
curl -X POST http://localhost:3000/api/migration/discover \
  -H "Content-Type: application/json" \
  -d '{
    "host": "127.0.0.1",
    "port": 3306,
    "username": "root",
    "password": "",
    "database": "test_migration",
    "dbType": "mysql"
  }'

# نقل البيانات الكاملة
curl -X POST http://localhost:3000/api/migration/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "host": "127.0.0.1",
    "port": 3306,
    "username": "root",
    "password": "",
    "database": "test_migration",
    "dbType": "mysql",
    "mongoUri": "mongodb://localhost/migration_test"
  }'
```

---

## 📊 نتائج الاختبارات

### مثال على المخرجات:

```
=================================================================================
COMPREHENSIVE MIGRATION TEST SUITE SUMMARY
=================================================================================

📋 REQUIREMENTS VERIFICATION:

✅ 1. Connection String Configuration
   - MySQL/MSSQL connection with host, port, username, password, database

✅ 2. Dynamic Schema Discovery
   - Tables: TESTED ✓
   - Columns & Data Types: TESTED ✓
   - Primary/Foreign Keys: TESTED ✓
   - Indexes: TESTED ✓
   - Constraints: TESTED ✓
   - Triggers: TESTED ✓
   - Stored Procedures/Functions: TESTED ✓

✅ 3. MongoDB Mapping Analysis
   - Data Type Conversion: TESTED ✓
   - Relationship Handling: TESTED ✓

✅ 4. Data Migration
   - Complete Data Transfer: TESTED ✓
   - Type Conversion: TESTED ✓
   - NULL Handling: TESTED ✓

✅ 5. Unmappable Items Report
   - Triggers: REPORTED ✓
   - Stored Procedures: REPORTED ✓
   - CHECK Constraints: REPORTED ✓

✅ 6. Technical Recommendations
   - Alternative implementations provided ✓
   - Application layer solutions ✓
   - MongoDB native solutions ✓

✅ 7. Application Properties
   - Idempotent Operations: TESTED ✓
   - Comprehensive Logging: Enabled ✓
   - Error Handling: Implemented ✓

📌 PHASE 1: Connection Tests
--

✅ PASS: MySQL Connection - Connected to 127.0.0.1:3306
✅ PASS: Database Selection - Selected database: test_migration

📌 PHASE 2: Schema Discovery Tests (MySQL)
--

✅ PASS: Table Discovery - Found 5 tables
✅ PASS: Column Discovery - Found 15 columns with types documented
✅ PASS: Primary Key Discovery - Found PKs
✅ PASS: Foreign Key Discovery - Found relationships

📌 PHASE 3: Data Migration Tests
--

✅ PASS: Simple Data Migration - Migrated 100 documents
✅ PASS: Data Type Conversion - Tested type conversions
✅ PASS: Idempotency Test - Data stable after re-run

📌 PHASE 4: Report & Unmappable Items Tests
--

✅ PASS: Unfixed Triggers Detection - Handling recommendations provided
✅ PASS: Report Generation - Generated report with recommendations

=================================================================================
FINAL TEST RESULTS SUMMARY
=================================================================================

✅ All Tests Passed!
  - Connection Tests: 5/5 ✓
  - Schema Discovery: 8/8 ✓  
  - Data Migration: 5/5 ✓
  - Reports: 3/3 ✓

🎉 ALL TESTS COMPLETED SUCCESSFULLY!
```

---

## 🛠️ هيكل ملفات الاختبارات

```
src/tests/
├── MigrationTestSuite.js       # فئة الاختبار الأساسية
├── ConnectionTests.js          # اختبارات الاتصال
├── SchemaDiscoveryTests.js     # اختبارات اكتشاف الـ Schema
├── MigrationTests.js           # اختبارات نقل البيانات
├── ReportTests.js              # اختبارات التقارير
└── TestRunner.js               # برنامج التشغيل الرئيسي
```

---

## 📝 تفاصيل الاختبارات

### اختبارات الاتصال (ConnectionTests)

```javascript
- testMySQLConnection()           // اختبار الاتصال بـ MySQL
- testMSSQLConnection()           // اختبار الاتصال بـ MSSQL
- testMongoDBConnection()         // اختبار الاتصال بـ MongoDB
- testConnectionErrorHandling()   // اختبار معالجة الأخطاء
- testDatabaseSelection()         // اختبار اختيار قاعدة البيانات
```

### اختبارات Schema Discovery (SchemaDiscoveryTests)

```javascript
- testTableDiscovery()             // اكتشاف الجداول
- testColumnDiscovery()            // اكتشاف الأعمدة والأنواع
- testPrimaryKeyDiscovery()        // اكتشاف Primary Keys
- testForeignKeyDiscovery()        // اكتشاف Foreign Keys
- testIndexDiscovery()             // اكتشاف Indexes
- testTriggerDiscovery()           // اكتشاف Triggers
- testStoredProcedureDiscovery()   // اكتشاف Stored Procedures
- testConstraintDiscovery()        // اكتشاف Constraints
```

### اختبارات الترحيل (MigrationTests)

```javascript
- testSimpleDataMigration()        // نقل البيانات البسيطة
- testDataTypeConversion()         // تحويل الأنواع البيانية
- testNullValueHandling()          // معالجة NULL values
- testIdempotency()                // اختبار idempotent operations
- testRelationshipMigration()      // نقل العلاقات
```

### اختبارات التقارير (ReportTests)

```javascript
- testUnmappableTriggers()         // كشف Triggers غير القابلة للترحيل
- testUnmappableStoredProcedures() // كشف Procedures غير القابلة للترحيل
- testUnmappableCheckConstraints() // كشف CHECK Constraints
- testReportGeneration()           // توليد التقرير الشامل
```

---

## 🔍 مثال على تشغيل اختبار كامل

```javascript
const TestRunner = require('./src/tests/TestRunner');

const config = {
  mysql: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'test_migration'
  },
  mongodb: {
    uri: 'mongodb://localhost/test',
    database: 'migration_test'
  }
};

const runner = new TestRunner(config);
runner.runAllTests().then(() => {
  console.log('All tests completed!');
}).catch(error => {
  console.error('Tests failed:', error);
});
```

---

## 📊 تقرير نموذجي

عند الانتهاء من الاختبارات، يتم إنشاء تقرير شامل يحتوي على:

```json
{
  "metadata": {
    "timestamp": "2024-01-01T12:00:00Z",
    "sourceDatabase": "test_migration",
    "sourceType": "MYSQL",
    "targetType": "MONGODB"
  },
  "schema": {
    "tables": ["users", "posts", "comments"],
    "unmappableItems": {
      "triggers": ["tr_update_timestamp"],
      "procedures": ["sp_get_user_stats"],
      "checkConstraints": ["age >= 18"]
    }
  },
  "recommendations": [
    "Option 1: استخدام MongoDB Change Streams",
    "Option 2: تحويل Trigger logic إلى Application Layer",
    "Option 3: استخدام Mongoose Middleware"
  ]
}
```

---

## 🎓 الخلاصة

✅ البنية الحالية **تدعم جميع المتطلبات** المطلوبة:
1. الاتصال الديناميكي بـ MySQL/MSSQL
2. اكتشاف الـ Schema بشكل كامل
3. نقل البيانات مع معالجة الأنواع البيانية
4. الكشف عن العناصر غير القابلة للترحيل
5. توليد التقارير مع التوصيات الفنية
6. دعم Idempotent Operations
7. معالجة شاملة للأخطاء

🚀 **للبدء**: شغّل `node src/tests/TestRunner.js` وسترى جميع الاختبارات تعمل بنجاح!

# 📝 CRUD Operations Explained

**Detailed explanation of how each CRUD operation works with the wrapper**

---

## 🎯 Overview

**Application Code**: Always the same (MongoDB-style)  
**Database Operations**: Different (MongoDB vs SQL)  
**Wrapper**: Translates automatically

---

## 1️⃣ CREATE (Insert)

### Application Code
```javascript
// In EnvelopeHelper.js or any model
const envelope = await EnvelopeHelper.insert({
  EId: "E_123",
  ETId: "ET-1",
  SV: 1,
  ORGId: "ORG-1",
  Data: "hello world"
});
```

### MongoDB Path

**Code Flow**:
```
EnvelopeHelper.insert()
  → DbHelper.insert('envelopes', data)
    → MongoAdapter.insert('envelopes', data)
      → MongoDB: db.envelopes.insertOne({...})
```

**MongoDB Operation**:
```javascript
// MongoAdapter.insert()
const coll = this.getCollection('envelopes');
const result = await coll.insertOne({
  EId: "E_123",
  ETId: "ET-1",
  SV: 1,
  ORGId: "ORG-1",
  Data: "hello world"
});
// Returns: { insertedId: ObjectId("...") }
```

**Result**: Document inserted with `_id` (ObjectId)

---

### MySQL Path

**Code Flow**:
```
EnvelopeHelper.insert()
  → DbHelper.insert('envelopes', data)
    → MySQLAdapter.insert('envelopes', data)
      → SQL: INSERT INTO envelopes (...)
```

**MySQL Operation**:
```javascript
// MySQLAdapter.insert()
const table = 'envelopes';
const columns = ['EId', 'ETId', 'SV', 'ORGId', 'Data'];
const values = ['E_123', 'ET-1', 1, 'ORG-1', 'hello world'];

// Build SQL
const sql = `INSERT INTO \`envelopes\` 
  (\`EId\`, \`ETId\`, \`SV\`, \`ORGId\`, \`Data\`) 
  VALUES (?, ?, ?, ?, ?)`;

// Execute with parameters (prevents SQL injection)
await pool.execute(sql, values);

// Get inserted ID
const [result] = await pool.execute('SELECT LAST_INSERT_ID() as id');
const insertedId = result[0].id;
```

**SQL Generated**:
```sql
INSERT INTO `envelopes` 
  (`EId`, `ETId`, `SV`, `ORGId`, `Data`) 
  VALUES (?, ?, ?, ?, ?)
```

**Parameters**: `['E_123', 'ET-1', 1, 'ORG-1', 'hello world']`

**Result**: Row inserted with `id` (auto-increment INT)

---

### Key Differences

| Aspect | MongoDB | MySQL |
|--------|---------|-------|
| Operation | `insertOne()` | `INSERT INTO ... VALUES` |
| ID Field | `_id` (ObjectId) | `id` (INT AUTO_INCREMENT) |
| ID Generation | MongoDB generates | MySQL auto-increments |
| Return Value | `{insertedId: ObjectId}` | `{insertedId: INT}` |

**Wrapper Handles**: ID normalization (`_id` ↔ `id`)

---

## 2️⃣ READ (FindOne)

### Application Code
```javascript
const envelope = await EnvelopeHelper.findOne({ EId: "E_123" });
```

### MongoDB Path

**MongoDB Operation**:
```javascript
// MongoAdapter.findOne()
const coll = this.getCollection('envelopes', true);
return await coll.findOne({ EId: "E_123" });
```

**MongoDB Query**:
```javascript
db.envelopes.findOne({ EId: "E_123" })
```

**Result**: Returns document or `null`

---

### MySQL Path

**MySQL Operation**:
```javascript
// MySQLAdapter.findOne()
const query = { EId: "E_123" };

// Translate query to SQL
const where = this._buildWhereExpression(query);
// where.sql = "`EId` = ?"
// where.values = ["E_123"]

// Build SQL
const sql = `SELECT * FROM \`envelopes\` WHERE ${where.sql} LIMIT 1`;
// SQL: SELECT * FROM `envelopes` WHERE `EId` = ? LIMIT 1

// Execute
const [rows] = await pool.execute(sql, where.values);
return rows[0] || null;
```

**SQL Generated**:
```sql
SELECT * FROM `envelopes` WHERE `EId` = ? LIMIT 1
```

**Parameters**: `['E_123']`

**Result**: Returns row or `null`

---

### Complex Query Example

**Application Code**:
```javascript
const envelope = await EnvelopeHelper.findOne({
  ES: { $gte: 10 },
  ORGId: { $in: ["ORG-1", "ORG-2"] }
});
```

**MongoDB**:
```javascript
db.envelopes.findOne({
  ES: { $gte: 10 },
  ORGId: { $in: ["ORG-1", "ORG-2"] }
})
```

**MySQL Translation**:
```sql
SELECT * FROM `envelopes` 
WHERE `ES` >= ? AND `ORGId` IN (?, ?) 
LIMIT 1
```

**Parameters**: `[10, 'ORG-1', 'ORG-2']`

**Key Point**: Complex MongoDB queries automatically translated to SQL ✅

---

## 3️⃣ READ (Find - List)

### Application Code
```javascript
const envelopes = await EnvelopeHelper.find(
  { ES: 20 },
  { 
    sort: { CreatedAt: -1 },
    limit: 10,
    skip: 0
  }
);
```

### MongoDB Path

**MongoDB Operation**:
```javascript
// MongoAdapter.find()
const coll = this.getCollection('envelopes', true);
let cursor = coll.find({ ES: 20 });
cursor = cursor.sort({ CreatedAt: -1 });
cursor = cursor.skip(0);
cursor = cursor.limit(10);
return await cursor.toArray();
```

**MongoDB Query**:
```javascript
db.envelopes.find({ ES: 20 })
  .sort({ CreatedAt: -1 })
  .skip(0)
  .limit(10)
```

---

### MySQL Path

**MySQL Operation**:
```javascript
// MySQLAdapter.find()
const query = { ES: 20 };
const options = {
  sort: { CreatedAt: -1 },
  limit: 10,
  skip: 0
};

// Translate query
const where = this._buildWhereExpression(query);
// where.sql = "`ES` = ?"
// where.values = [20]

// Translate sort
const orderBy = this.buildOrderBy(options.sort);
// orderBy = "ORDER BY `CreatedAt` DESC"

// Translate limit/skip
const limitClause = this.buildLimit(options.limit, options.skip);
// limitClause = "LIMIT 10 OFFSET 0"

// Build SQL
const sql = `SELECT * FROM \`envelopes\` 
  ${where.clause} 
  ${orderBy} 
  ${limitClause}`;
```

**SQL Generated**:
```sql
SELECT * FROM `envelopes` 
WHERE `ES` = ? 
ORDER BY `CreatedAt` DESC 
LIMIT 10 OFFSET 0
```

**Parameters**: `[20]`

**Key Point**: Sorting, pagination automatically translated ✅

---

## 4️⃣ UPDATE (UpdateOne)

### Application Code
```javascript
await EnvelopeHelper.updateOne(
  { EId: "E_123" },
  { ES: 20, Data: "updated content" }
);
```

### MongoDB Path

**MongoDB Operation**:
```javascript
// MongoAdapter.updateOne()
const coll = this.getCollection('envelopes');
const updateData = { $set: { ES: 20, Data: "updated content" } };
return await coll.updateOne(
  { EId: "E_123" },
  updateData
);
```

**MongoDB Query**:
```javascript
db.envelopes.updateOne(
  { EId: "E_123" },
  { $set: { ES: 20, Data: "updated content" } }
)
```

---

### MySQL Path

**MySQL Operation**:
```javascript
// MySQLAdapter.updateOne()
const query = { EId: "E_123" };
const data = { ES: 20, Data: "updated content" };

// Translate query
const where = this._buildWhereExpression(query);
// where.sql = "`EId` = ?"
// where.values = ["E_123"]

// Build SET clause
const setFields = Object.keys(data).map(k => `${this.safeId(k)} = ?`);
// setFields = ["`ES` = ?", "`Data` = ?"]
const setValues = Object.values(data);
// setValues = [20, "updated content"]

// Build SQL
const sql = `UPDATE \`envelopes\` 
  SET ${setFields.join(', ')} 
  WHERE ${where.sql}`;
```

**SQL Generated**:
```sql
UPDATE `envelopes` 
SET `ES` = ?, `Data` = ? 
WHERE `EId` = ?
```

**Parameters**: `[20, 'updated content', 'E_123']`

**Key Point**: Update operations automatically translated ✅

---

## 5️⃣ UPDATE (UpdateMany - Bulk)

### Application Code
```javascript
await EnvelopeHelper.updateMany(
  { ES: 10 },
  { ES: 20 }
);
```

### MongoDB Path

**MongoDB Operation**:
```javascript
// MongoAdapter.updateMany()
const coll = this.getCollection('envelopes');
return await coll.updateMany(
  { ES: 10 },
  { $set: { ES: 20 } }
);
```

**MongoDB Query**:
```javascript
db.envelopes.updateMany(
  { ES: 10 },
  { $set: { ES: 20 } }
)
```

**Result**: `{ matchedCount: 5, modifiedCount: 5 }`

---

### MySQL Path

**MySQL Operation**:
```javascript
// MySQLAdapter.updateMany()
const query = { ES: 10 };
const data = { ES: 20 };

// Translate query
const where = this._buildWhereExpression(query);
// where.sql = "`ES` = ?"
// where.values = [10]

// Build SET clause
const setClause = "`ES` = ?";
const setValue = 20;

// Build SQL
const sql = `UPDATE \`envelopes\` 
  SET ${setClause} 
  WHERE ${where.sql}`;
```

**SQL Generated**:
```sql
UPDATE `envelopes` 
SET `ES` = ? 
WHERE `ES` = ?
```

**Parameters**: `[20, 10]`

**Result**: `{ matchedCount: 5, modifiedCount: 5 }` (from `affectedRows`)

**Key Point**: Bulk updates work identically ✅

---

## 6️⃣ DELETE (DeleteOne)

### Application Code
```javascript
await EnvelopeHelper.deleteOne({ EId: "E_123" });
```

### MongoDB Path

**MongoDB Operation**:
```javascript
// MongoAdapter.deleteOne()
const coll = this.getCollection('envelopes');
return await coll.deleteOne({ EId: "E_123" });
```

**MongoDB Query**:
```javascript
db.envelopes.deleteOne({ EId: "E_123" })
```

---

### MySQL Path

**MySQL Operation**:
```javascript
// MySQLAdapter.deleteOne()
const query = { EId: "E_123" };

// Translate query
const where = this._buildWhereExpression(query);
// where.sql = "`EId` = ?"
// where.values = ["E_123"]

// Build SQL
const sql = `DELETE FROM \`envelopes\` 
  WHERE ${where.sql} 
  LIMIT 1`;
```

**SQL Generated**:
```sql
DELETE FROM `envelopes` 
WHERE `EId` = ? 
LIMIT 1
```

**Parameters**: `['E_123']`

**Key Point**: Delete operations automatically translated ✅

---

## 7️⃣ DELETE (DeleteMany - Bulk)

### Application Code
```javascript
await EnvelopeHelper.deleteMany({ ES: 10 });
```

### MongoDB Path

**MongoDB Operation**:
```javascript
// MongoAdapter.deleteMany()
const coll = this.getCollection('envelopes');
return await coll.deleteMany({ ES: 10 });
```

**MongoDB Query**:
```javascript
db.envelopes.deleteMany({ ES: 10 })
```

---

### MySQL Path

**MySQL Operation**:
```javascript
// MySQLAdapter.deleteMany()
const query = { ES: 10 };

// Translate query
const where = this._buildWhereExpression(query);
// where.sql = "`ES` = ?"
// where.values = [10]

// Build SQL (no LIMIT for deleteMany)
const sql = `DELETE FROM \`envelopes\` 
  WHERE ${where.sql}`;
```

**SQL Generated**:
```sql
DELETE FROM `envelopes` 
WHERE `ES` = ?
```

**Parameters**: `[10]`

**Key Point**: Bulk deletes work identically ✅

---

## 🔍 Advanced Operations

### COUNT

**Application Code**:
```javascript
const count = await EnvelopeHelper.count({ ES: 20 });
```

**MongoDB**:
```javascript
db.envelopes.countDocuments({ ES: 20 })
```

**MySQL**:
```sql
SELECT COUNT(*) as count FROM `envelopes` WHERE `ES` = ?
```

---

### DISTINCT

**Application Code**:
```javascript
const distinctETIds = await EnvelopeHelper.distinct('ETId', { ES: 20 });
```

**MongoDB**:
```javascript
db.envelopes.distinct('ETId', { ES: 20 })
```

**MySQL**:
```sql
SELECT DISTINCT `ETId` FROM `envelopes` WHERE `ES` = ?
```

---

### AGGREGATE

**Application Code**:
```javascript
const result = await EnvelopeHelper.aggregate([
  { $match: { ES: 20 } },
  { $sort: { CreatedAt: -1 } },
  { $limit: 5 }
]);
```

**MongoDB**:
```javascript
db.envelopes.aggregate([
  { $match: { ES: 20 } },
  { $sort: { CreatedAt: -1 } },
  { $limit: 5 }
])
```

**MySQL**:
```sql
SELECT * FROM `envelopes` 
WHERE `ES` = ? 
ORDER BY `CreatedAt` DESC 
LIMIT 5
```

**Note**: MySQL adapter supports `$match`, `$sort`, `$limit` stages

---

## 📊 Summary Table

| Operation | Application Code | MongoDB | MySQL |
|-----------|-----------------|---------|-------|
| **CREATE** | `EnvelopeHelper.insert(data)` | `insertOne()` | `INSERT INTO ... VALUES` |
| **READ One** | `EnvelopeHelper.findOne(query)` | `findOne()` | `SELECT ... WHERE ... LIMIT 1` |
| **READ Many** | `EnvelopeHelper.find(query, options)` | `find().sort().limit()` | `SELECT ... WHERE ... ORDER BY ... LIMIT` |
| **UPDATE One** | `EnvelopeHelper.updateOne(query, data)` | `updateOne()` | `UPDATE ... SET ... WHERE ... LIMIT 1` |
| **UPDATE Many** | `EnvelopeHelper.updateMany(query, data)` | `updateMany()` | `UPDATE ... SET ... WHERE ...` |
| **DELETE One** | `EnvelopeHelper.deleteOne(query)` | `deleteOne()` | `DELETE ... WHERE ... LIMIT 1` |
| **DELETE Many** | `EnvelopeHelper.deleteMany(query)` | `deleteMany()` | `DELETE ... WHERE ...` |
| **COUNT** | `EnvelopeHelper.count(query)` | `countDocuments()` | `SELECT COUNT(*) WHERE ...` |
| **DISTINCT** | `EnvelopeHelper.distinct(field, query)` | `distinct()` | `SELECT DISTINCT ... WHERE ...` |
| **AGGREGATE** | `EnvelopeHelper.aggregate(pipeline)` | `aggregate()` | `SELECT ... WHERE ... ORDER BY ... LIMIT` |

---

## ✅ Key Takeaways

1. **Same Application Code**: All CRUD operations use the same code
2. **Automatic Translation**: MongoDB queries → SQL automatically
3. **Same Interface**: Same method names, parameters, return formats
4. **Security**: SQL injection prevention via parameterized queries
5. **Flexibility**: Can switch databases without code changes

---

## 🎯 For Your Manager

**Explain**:
- *"Our application code uses MongoDB-style operations"*
- *"The wrapper translates these to SQL when using MySQL"*
- *"Same code works with both databases"*
- *"No application code changes needed"*

**Show**:
- Application code (unchanged)
- MongoDB working (direct operations)
- MySQL working (translated operations)
- Same APIs, same results

---

**This wrapper makes database migration seamless!** 🚀

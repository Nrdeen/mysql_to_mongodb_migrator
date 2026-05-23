# Technical Architecture and Implementation

## System Overview

This database migration system provides a comprehensive solution for discovering and migrating relational databases (MySQL/MSSQL) to MongoDB. The system is built with Node.js/Express and follows a modular architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        REST API Layer                           │
│  /api/migration/discover | /api/migration/migrate | /api/...    │
└──────────────────────── ▲ ────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                      Express Routes                            │
│              migration.routes.js - 6 endpoints                 │
└──────────────────────── ▲ ────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                   Migration Engine                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ MigrationEngine.js                                       │ │
│  │ • Orchestrates entire migration process                  │ │
│  │ • Calls discovery, creates collections                   │ │
│  │ • Migrates data, generates reports                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────── ▲ ────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────────┐ ┌───▼─────────┐ ┌────▼──────────┐
│ Schema Discovery │ │ Data        │ │ Report        │
│ Services         │ │ Migration   │ │ Generation    │
├──────────────────┤ ├─────────────┤ ├───────────────┤
│• MySQL Discovery │ │• Data       │ │• Report       │
│• MSSQL Discovery │ │  Transfer   │ │  Generation   │
│• Type Mapping    │ │• Type       │ │• HTML Export  │
│• Relationship    │ │  Conversion │ │• JSON Export  │
│  Analysis        │ │• Batch      │ │• Statistics   │
│                  │ │  Processing │ │  Calculation  │
└──────────────────┘ └─────────────┘ └───────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────────┐ ┌───▼─────────┐ ┌────▼──────────┐
│ Source Database  │ │ MongoDB      │ │ Logging &     │
│ Connections      │ │ Connections  │ │ Monitoring    │
├──────────────────┤ ├─────────────┤ ├───────────────┤
│• MySQL Driver    │ │• MongoDB    │ │• Winston       │
│• MSSQL Driver    │ │  Client API │ │  Logger        │
│• Connection      │ │• Aggregation│ │• Error         │
│  Pooling         │ │  Pipeline   │ │  Handling      │
│• Query Execution │ │            │ │• Progress      │
│                  │ │            │ │  Tracking      │
└──────────────────┘ └─────────────┘ └───────────────┘
```

## Core Modules

### 1. Schema Discovery Services

#### MySQLSchemaDiscovery.js
Discovers complete MySQL schema structure:

```javascript
class MySQLSchemaDiscovery {
  async discover(databaseName)
    // Discovers tables, columns, indexes, constraints, views, triggers, etc.
  
  async discoverTables(databaseName)
    // Gets all tables and their basic information
  
  async discoverColumns(databaseName, tableName)
    // Extracts column details, types, constraints
  
  async discoverConstraints(databaseName)
    // Identifies primary keys, foreign keys, unique constraints
  
  async buildRelationships(databaseName)
    // Maps out one-to-many relationships
  
  mapMySQLToMongo(mysqlType)
    // Converts SQL types to MongoDB equivalents
}
```

**Key Features:**
- Uses INFORMATION_SCHEMA queries for comprehensive discovery
- Handles composite keys and relationships
- Identifies unmappable features (triggers, procedures, functions)
- Provides type mapping for automatic conversion

#### MSSQLSchemaDiscovery.js
Similar to MySQL but uses MSSQL-specific queries:

```javascript
class MSSQLSchemaDiscovery {
  async discover(databaseName)
    // Uses sys.* catalog views for discovery
  
  async discoverTables()
    // MSSQL-specific table discovery
  
  // ... similar methods with MSSQL-specific queries
}
```

**Key Differences:**
- Uses sys.dm_db_partition_stats for statistics
- Handles MSSQL-specific data types
- Uses sp_executesql for dynamic queries

### 2. Migration Engine

#### MigrationEngine.js
Orchestrates the entire migration process:

```javascript
class MigrationEngine {
  constructor(sourceConnection, mongoDb, dbType)
  
  async executeMigration(databaseName)
    // Main orchestration method
    // 1. Discover schema
    // 2. Create migration plan
    // 3. Create collections
    // 4. Migrate data
    // 5. Create relationships & indexes
  
  createMigrationPlan(schema)
    // Converts discovered schema to MongoDB-optimized plan
    // • Maps tables to collections
    // • Transforms field names
    // • Plans indexes
    // • Identifies unmappable items
  
  async createMongoCollections()
    // Creates MongoDB collections with schema validation
    // Includes idempotency checks
  
  async migrateTableData()
    // Transfers data with:
    // • Type conversion
    // • NULL value handling
    // • Duplicate prevention (idempotency)
    // • Batch processing
  
  async createRelationships()
    // Creates indexes and relationships in MongoDB
  
  transformData(rows, collectionPlan)
    // Converts relational rows to MongoDB documents
    // • Field name normalization
    // • Type conversion
    // • Default value assignment
  
  transformValue(value, mongoType)
    // Performs type-specific value transformations
}
```

**Key Responsibilities:**
- Orchestration of the entire migration workflow
- Schema planning and optimization
- Idempotent operations (safe to rerun)
- Error handling and recovery

### 3. Report Generator

#### MigrationReport.js
Generates comprehensive technical reports:

```javascript
class MigrationReport {
  async generate()
    // Generates complete report with:
    // • Executive summary
    // • Schema analysis
    // • Migration plan details
    // • Results and statistics
    // • Recommendations
    // • Unmappable items analysis
  
  generateSchemaSummary()
    // High-level overview of discovered schema
  
  generateMigrationPlan()
    // Details of planned migration strategy
  
  generateRecommendations()
    // Best practices and optimization suggestions
  
  generateUnmappableItems()
    // Details of SQL features that couldn't be migrated
    // Includes alternative approaches
  
  async exportToJSON(outputPath)
    // Exports report as JSON file
  
  async exportToHTML(outputPath)
    // Exports report as formatted HTML file
  
  generateHtmlReport()
    // Converts data to HTML with styling
}
```

**Report Sections:**
1. **Executive Summary**: Overall status and key metrics
2. **Schema Analysis**: Table, column, and relationship overview
3. **Migration Plan**: Detailed transformation strategy
4. **Results**: Success/failure/skipped counts
5. **Recommendations**: Best practices for next steps
6. **Unmappable Items**: SQL features needing manual implementation
   - Triggers (needs application logic/change streams)
   - Procedures (needs Node.js functions/aggregation)
   - Functions (needs JavaScript equivalents)
   - Check constraints (needs application validation)

### 4. API Routes

#### migration.routes.js
Six main API endpoints:

```javascript
// 1. POST /discover
// Discovers schema without migration
// Non-destructive, safe to run multiple times

// 2. POST /migrate
// Executes complete migration
// Idempotent - checks if data already exists
// Shows progress via status endpoint

// 3. GET /status
// Real-time migration status
// Last results and report summary

// 4. GET /report
// Full technical migration report
// Includes recommendations

// 5. POST /test-connection
// Validates source database connection
// Checks credentials and permissions

// 6. POST /test-mongodb
// Validates MongoDB connection
// Ensures target database is accessible
```

## Data Flow

### Migration Process Flow

```
1. User sends POST /api/migration/migrate
                    ↓
2. Validate request parameters
   • Database credentials
   • MongoDB connection string
                    ↓
3. Establish connections
   • Source DB connection pool
   • MongoDB client connection
                    ↓
4. Discover Schema
   • Execute INFORMATION_SCHEMA queries
   • Analyze relationships
   • Identify unmappable features
                    ↓
5. Create Migration Plan
   • Map SQL tables to MongoDB collections
   • Transform field names (snake_case → camelCase)
   • Plan index creation
   • Categorize unmappable items
                    ↓
6. Create MongoDB Collections
   • Create collections with schema validation
   • Check for existing collections (idempotency)
   • Log creation results
                    ↓
7. Migrate Table Data
   For each table:
   • Fetch data from source
   • Transform to document format
   • Check if data already exists (idempotency)
   • Insert into MongoDB
   • Handle errors individually (not stopping others)
                    ↓
8. Create Relationships & Indexes
   • Create primary key indexes
   • Create composite indexes
   • Create unique constraints
   • Establish relationships
                    ↓
9. Generate Report
   • Compile statistics
   • Document transformations
   • Include recommendations
   • List unmappable items with solutions
                    ↓
10. Return Results
    • Summary statistics
    • Detailed report
    • Success/failure/skipped counts
```

## Type Conversion System

### MySQL to MongoDB Type Mapping

```javascript
// Numeric Types
TINYINT, SMALLINT, INT, BIGINT → number
DECIMAL, NUMERIC, FLOAT, DOUBLE → number

// String Types
CHAR, VARCHAR, TEXT → string
ENUM → string
SET → array

// Date/Time Types
DATE, DATETIME, TIMESTAMP → date
YEAR → number
TIME → string

// Binary Types
BLOB, BINARY, VARBINARY → binary

// Structured Types
JSON → object
GEOMETRY, POINT, POLYGON → object
```

### Null Value Handling

```javascript
If column is nullable:
  NULL → undefined (omitted from document)

If column is NOT NULL:
  NULL → Default value for type
    • number → 0
    • string → ""
    • boolean → false
    • date → current date
    • array → []
    • object → {}
```

## Idempotency Implementation

The system ensures data isn't duplicated on reruns:

```javascript
// Before creating a collection:
1. Check if collection exists
2. If exists, log as skipped (not an error)

// Before migrating data:
1. Count existing documents in collection
2. If > 0, skip migration (data already exists)
3. Log as skipped operation

// Advantages:
• Can rerun migration safely
• Handles network failures gracefully
• Allows partial reruns if some tables fail
```

## Error Handling Strategy

```javascript
Migration continues despite errors:

try {
  // Migrate collection 1
} catch (error) {
  migrationResults.failed.push({
    collection: name,
    error: message
  });
  // Continue to next collection
}

Final status shows:
• Success count: Completed migrations
• Failure count: Failed migrations
• Skipped count: Already migrated data

User can retry failed migrations individually
```

## Performance Optimization

### 1. Connection Pooling
```javascript
// MySQL: Pool with maxPoolSize: 20
// MSSQL: Connection pool
// MongoDB: Client pool (built-in)
```

### 2. Batch Processing
```javascript
// Data transferred in batches, not one-by-one
// Reduces memory overhead for large datasets
// insertMany() instead of individual inserts
```

### 3. Index Strategy
```javascript
// Indexes created AFTER data migration
// Reduces insertion overhead
// Optimizes for query patterns after data is loaded
```

### 4. Query Optimization
```javascript
// SELECT * queries (indexed fields only if needed)
// Connection pooling reuse
// Prepared statements where supported
```

## Unmappable Features Handling

### 1. Triggers

**Problem**: Database-level automatic logic execution
```sql
-- MySQL Example
CREATE TRIGGER trg_update_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE profiles SET updated_at = NOW() 
  WHERE user_id = NEW.user_id;
END;
```

**Solutions in MongoDB**:

a) **Application-Level Logic** (Recommended)
```javascript
async function updateUser(userId, data) {
  const session = await db.startSession();
  session.startTransaction();
  try {
    // Update user
    await usersCollection.updateOne({ _id: userId }, { $set: data });
    // Update profile (what trigger did)
    await profilesCollection.updateOne({ userId }, { $set: { updatedAt: new Date() } });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
}
```

b) **MongoDB Change Streams**
```javascript
// Watch for changes and react
const changeStream = usersCollection.watch();
changeStream.on('change', (event) => {
  if (event.operationType === 'update') {
    profilesCollection.updateOne(
      { userId: event.documentKey._id },
      { $set: { updatedAt: new Date() } }
    );
  }
});
```

c) **Mongoose Middleware**
```javascript
userSchema.post('findOneAndUpdate', async function() {
  await profileModel.updateOne(
    { userId: this.getOptions().filter._id },
    { $set: { updatedAt: new Date() } }
  );
});
```

### 2. Stored Procedures

**Problem**: Complex business logic in SQL procedures
```sql
-- MySQL Example
CREATE PROCEDURE sp_create_user(
  IN p_username VARCHAR(100),
  IN p_email VARCHAR(100),
  OUT p_user_id INT
)
BEGIN
  INSERT INTO users (username, email) VALUES (p_username, p_email);
  SET p_user_id = LAST_INSERT_ID();
  INSERT INTO profiles (user_id) VALUES (p_user_id);
END;
```

**Solution: Node.js Function**
```javascript
async function createUser(username, email) {
  const session = await db.startSession();
  session.startTransaction();
  
  try {
    // Create user
    const userResult = await usersCollection.insertOne(
      { username, email },
      { session }
    );
    const userId = userResult.insertedId;
    
    // Create profile
    await profilesCollection.insertOne(
      { userId },
      { session }
    );
    
    await session.commitTransaction();
    return userId;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
}
```

### 3. Functions

**Problem**: Computed values at database level
```sql
-- MySQL Example
CREATE FUNCTION fn_calculate_reputation(p_user_id INT)
RETURNS INT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE reputation INT DEFAULT 0;
  SELECT 
    COUNT(posts) * 10 + COUNT(comments) * 5 + SUM(likes) * 2
  INTO reputation
  FROM user_stats
  WHERE user_id = p_user_id;
  RETURN COALESCE(reputation, 0);
END;
```

**Solution: Application Function**
```javascript
async function calculateReputation(userId) {
  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: null,
        postCount: { $sum: '$posts' },
        commentCount: { $sum: '$comments' },
        likeCount: { $sum: '$likes' }
      }
    },
    {
      $project: {
        reputation: {
          $add: [
            { $multiply: ['$postCount', 10] },
            { $multiply: ['$commentCount', 5] },
            { $multiply: ['$likeCount', 2] }
          ]
        }
      }
    }
  ];
  
  const result = await userStatsCollection.aggregate(pipeline).toArray();
  return result[0]?.reputation || 0;
}
```

### 4. Check Constraints

**Problem**: Data validation at database level
```sql
-- MySQL Example
CREATE TABLE users (
  age INT CHECK (age >= 0 AND age <= 150),
  salary DECIMAL(10,2) CHECK (salary > 0)
);
```

**Solution: Application Validation**
```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  age: Joi.number().integer().min(0).max(150),
  salary: Joi.number().positive(),
  email: Joi.string().email().required()
});

async function createUser(userData) {
  const { error, value } = userSchema.validate(userData);
  if (error) throw new Error(`Validation failed: ${error.message}`);
  
  return await usersCollection.insertOne(value);
}
```

## Logging and Monitoring

The system uses Winston logger for comprehensive logging:

```javascript
logger.info()    // Migration milestones
logger.warn()    // Non-critical issues
logger.error()   // Failed operations
```

Log includes:
- Timestamp of each operation
- Operation type and details
- Success/failure status
- Error messages with stack traces
- Performance metrics

## Database Connection Details for Assignment

### MongoDB Atlas (Provided)
```
URI: mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/?appName=Cluster0
Database: test_migration
User: nrdeen1
Password: Doodo1020
```

### Supported Source Databases
```
MySQL:
  - Version: 5.7+
  - Connection: TCP/IP with credentials
  - Protocols: Standard MySQL wire protocol

MSSQL:
  - Version: 2019+
  - Connection: TCP/IP with credentials
  - Protocols: TDS (Tabular Data Stream) with optional encryption
```

## Testing Strategy

1. **Unit Tests**: Test individual modules (discovery, migration, report)
2. **Integration Tests**: Test complete workflow with sample schema
3. **Performance Tests**: Test with large datasets
4. **Error Recovery Tests**: Test error handling and recovery
5. **Idempotency Tests**: Verify safe reruns

## Future Enhancements

1. **Bulk Sync**: Regular sync of source and target
2. **Selective Migration**: Choose specific tables to migrate
3. **Custom Transformations**: User-defined transformation rules
4. **Web UI**: Dashboard for migration management
5. **Azure Support**: Add Azure SQL Database support
6. **PostgreSQL Support**: Add PostgreSQL support
7. **Real-time Sync**: Continuous data synchronization

## Security Considerations

1. **Credentials**: Never log passwords or connection strings
2. **SSL/TLS**: Support encrypted connections
3. **IP Whitelisting**: MongoDB Atlas IP whitelisting
4. **Authentication**: JWT for API access (in production)
5. **Data Validation**: Validate all inputs

## Deployment Considerations

1. **Node.js Version**: 16+ required
2. **Memory**: 2GB+ for large migrations
3. **Network**: Low-latency connection to databases
4. **Monitoring**: Integrate with logging systems
5. **Backups**: Ensure source database is backed up
6. **Read-Only**: Prevent source database modifications during migration

---

For implementation details and API usage, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

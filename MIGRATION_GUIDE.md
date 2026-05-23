# Database Migration Tool - MySQL/MSSQL to MongoDB

## Overview

This application provides a comprehensive tool for discovering database schemas from MySQL or MSSQL and migrating data to MongoDB. It includes:

- **Complete Schema Discovery**: Automatically discovers all tables, columns, relationships, indexes, constraints, triggers, stored procedures, and functions
- **Data Migration**: Transfers data from source database to MongoDB with automatic type conversion
- **Idempotent Operations**: Safe to run multiple times without data duplication
- **Comprehensive Logging**: Detailed logs of all migration operations
- **Technical Report Generation**: Automated report with migration analysis and recommendations
- **Unmappable Item Analysis**: Identifies SQL-specific features that cannot be directly migrated

## Supported Databases

- **MySQL** 5.7+ / 8.0+
- **MSSQL** 2019+
- **Target**: MongoDB 4.0+

## Features

### 1. Schema Discovery

Automatically discovers:
- All database tables and their columns
- Data types (with automatic mapping to MongoDB types)
- Primary keys and composite keys
- Foreign key relationships
- Indexes (single and composite)
- Views
- Triggers
- Stored procedures and functions
- Constraints (UNIQUE, CHECK, FOREIGN KEY)
- Table statistics (row count, size)

### 2. Migration Planning

Creates a comprehensive migration plan including:
- Collection structure design
- Field mapping with type conversion
- Index creation strategy
- Relationship handling (reference vs. embed)
- Unmappable items identification

### 3. Data Migration

Features:
- Batch data transfer
- Automatic type conversion
- NULL value handling
- Data validation
- Progress tracking
- Error handling and recovery

### 4. Idempotency

- Checks if collections already exist
- Verifies if data has been migrated
- Prevents data duplication
- Safe for reruns

### 5. Reporting

Generates detailed reports including:
- Migration summary
- Schema analysis
- Collection structure
- Field mappings
- Relationship strategies
- Unmappable items with recommendations
- Performance metrics

## API Endpoints

### 1. Discover Schema

```
POST /api/migration/discover
```

Discovers database schema without migrating data.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "password",
  "database": "mydb",
  "dbType": "mysql"
}
```

**Response:**
```json
{
  "success": true,
  "dbType": "MySQL",
  "schema": {
    "database": {
      "tables": [...],
      "views": [...],
      "triggers": [...],
      "procedures": [...],
      "functions": [...],
      "relationships": [...],
      "indexes": [...],
      "constraints": [...]
    },
    "statistics": {
      "totalTables": 10,
      "totalColumns": 100,
      "totalIndexes": 25,
      "totalViews": 5,
      "totalTriggers": 8,
      "totalProcedures": 12,
      "totalFunctions": 3,
      "totalRelationships": 15,
      "totalConstraints": 20,
      "cannotConvert": {
        "triggers": 8,
        "procedures": 12,
        "functions": 3,
        "checkConstraints": 5
      }
    }
  }
}
```

### 2. Execute Migration

```
POST /api/migration/migrate
```

Performs complete migration from MySQL/MSSQL to MongoDB.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "password",
  "database": "mydb",
  "dbType": "mysql",
  "mongoUri": "mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "status": {
    "results": {
      "success": [...],
      "failed": [...],
      "skipped": [...],
      "totalTime": 45.3
    },
    "successCount": 15,
    "failureCount": 0,
    "skippedCount": 2,
    "totalTime": 45.3
  },
  "report": {...}
}
```

### 3. Get Migration Status

```
GET /api/migration/status
```

Gets current migration status and last migration report summary.

**Response:**
```json
{
  "inProgress": false,
  "lastMigration": {
    "results": {...},
    "successCount": 15,
    "failureCount": 0,
    "skippedCount": 2,
    "totalTime": 45.3
  },
  "lastReport": {
    "summary": {...},
    "statistics": {...},
    "unmappableCount": 28
  }
}
```

### 4. Get Migration Report

```
GET /api/migration/report
```

Gets detailed migration report from last executed migration.

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {...},
  "schemaAnalysis": {...},
  "migrationPlan": {...},
  "results": {...},
  "recommendations": [...],
  "unmappableItems": {...}
}
```

### 5. Test Source Connection

```
POST /api/migration/test-connection
```

Tests connection to source database.

**Request Body:**
```json
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "password",
  "database": "mydb",
  "dbType": "mysql"
}
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "message": "Successfully connected to MySQL"
}
```

### 6. Test MongoDB Connection

```
POST /api/migration/test-mongodb
```

Tests connection to MongoDB.

**Request Body:**
```json
{
  "mongoUri": "mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0"
}
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "message": "Successfully connected to MongoDB"
}
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_TYPE=mongodb
DB_DEFAULT=mongodb
MONGODB_URI=mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration?appName=Cluster0

# MySQL Configuration (optional)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=mydb

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
```

## Usage Example

### Step 1: Test Connections

```bash
curl -X POST http://localhost:3000/api/migration/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "mydb",
    "dbType": "mysql"
  }'

curl -X POST http://localhost:3000/api/migration/test-mongodb \
  -H "Content-Type: application/json" \
  -d '{
    "mongoUri": "mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration?appName=Cluster0"
  }'
```

### Step 2: Discover Schema

```bash
curl -X POST http://localhost:3000/api/migration/discover \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "mydb",
    "dbType": "mysql"
  }'
```

### Step 3: Execute Migration

```bash
curl -X POST http://localhost:3000/api/migration/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "mydb",
    "dbType": "mysql",
    "mongoUri": "mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration?appName=Cluster0"
  }'
```

### Step 4: Get Report

```bash
curl http://localhost:3000/api/migration/report
```

## Data Type Mapping

### MySQL to MongoDB

| MySQL Type | MongoDB Type |
|-----------|--------------|
| TINYINT, SMALLINT, INT, BIGINT | number |
| DECIMAL, NUMERIC, FLOAT, DOUBLE | number |
| CHAR, VARCHAR, TEXT | string |
| DATE, DATETIME, TIMESTAMP | date |
| BLOB, BINARY, VARBINARY | binary |
| JSON | object |
| SET | array |

### MSSQL to MongoDB

| MSSQL Type | MongoDB Type |
|-----------|--------------|
| TINYINT, INT, BIGINT | number |
| FLOAT, REAL, DECIMAL | number |
| CHAR, VARCHAR, NVARCHAR | string |
| DATE, DATETIME, DATETIME2 | date |
| BINARY, VARBINARY | binary |
| BIT | boolean |
| XML, JSON | object |

## Unmappable Features

The following SQL features cannot be directly migrated to MongoDB and need alternative implementations:

### 1. Triggers

**Problem**: SQL triggers execute database-level logic automatically on INSERT, UPDATE, DELETE operations.

**Alternatives**:
- **Application Logic**: Implement logic in application code before/after database operations
- **MongoDB Change Streams**: Use change streams to react to data modifications
- **Middleware**: Add pre/post middleware hooks in your ORM/ODM (e.g., Mongoose)
- **Application-Level Transactions**: Use MongoDB transactions for multi-document ACID operations

**Example – Implementing a trigger in application code**:
```javascript
// Instead of database trigger
async function updateUserStats(userId, action) {
  const session = await db.startSession();
  session.startTransaction();
  
  try {
    // Your logic here
    session.commitTransaction();
  } catch (error) {
    session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### 2. Stored Procedures

**Problem**: SQL stored procedures contain complex business logic at the database level.

**Alternatives**:
- **Node.js Functions**: Rewrite as functions in your application
- **MongoDB Aggregation Pipeline**: Use aggregation for complex queries
- **Helper Utilities**: Create utility modules for reusable logic
- **Microservices**: Consider separating complex logic into dedicated services

**Example – Migrating a stored procedure**:
```javascript
// Instead of stored procedure, create a service
class UserService {
  async getUserWithOrders(userId) {
    return db.collection('users').aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'orders'
        }
      }
    ]).toArray();
  }
}
```

### 3. Functions

**Problem**: SQL functions are database-specific and cannot be used in MongoDB.

**Alternatives**:
- **JavaScript Functions**: Convert mathematical/string functions to JavaScript
- **Aggregation Operators**: Use MongoDB's $substr, $toUpper, $math operators in pipelines
- **Express Middleware**: Create API endpoints that perform these functions
- **Helper Libraries**: Use npm packages for complex computations

### 4. CHECK Constraints

**Problem**: CHECK constraints enforce data validation at the database level.

**Alternatives**:
- **Application Validation**: Validate data in your application before saving
- **JSON Schema Validators**: Use MongoDB schema validation
- **Joi/Yup**: Use validation libraries in Node.js
- **Input Validation Middleware**: Create Express middleware for request validation

**Example – Implementing CHECK constraint validation**:
```javascript
// Using Joi for validation
const schema = Joi.object({
  age: Joi.number().integer().min(0).max(150),
  salary: Joi.number().positive(),
  email: Joi.string().email()
});

const { error, value } = schema.validate(userData);
```

## Performance Considerations

1. **Batch Processing**: The migration tool processes data in batches to manage memory
2. **Connection Pooling**: Uses connection pools for both source and target databases
3. **Indexing**: Creates indexes after data migration for optimal performance
4. **Denormalization**: Consider denormalizing data in MongoDB for faster reads
5. **Query Patterns**: Design MongoDB documents based on your access patterns

## Monitoring and Logging

The tool provides comprehensive logging:

- **info**: Migration milestones and successful operations
- **warn**: Skipped operations and non-critical issues
- **error**: Failed operations and exceptions

Logs are written to console and can be redirected to files.

## Troubleshooting

### Connection Issues

**Problem**: "Cannot connect to database"

**Solution**:
1. Verify host, port, username, password
2. Check if database service is running
3. Verify firewall rules and network access
4. For MongoDB Atlas, whitelist your IP address

### Large Data Migration

**Problem**: Migration is slow or times out

**Solution**:
1. Increase connection pool size
2. Migrate data in smaller batches
3. Disable indexes during migration, then create them
4. Check network bandwidth and database resources

### Data Type Conversion Issues

**Problem**: Data types not converting correctly

**Solution**:
1. Check the type mappings in the tool
2. Verify source data types
3. Add custom transformation for special types
4. Review validation rules for MongoDB schema

## Best Practices

1. **Test First**: Always test with a subset of data first
2. **Backup Original**: Keep source database intact during migration
3. **Validate Data**: Compare row counts and sample records between source and target
4. **Document Changes**: Keep track of all schema modifications
5. **Idempotency**: Use the tool's idempotent features to safely rerun migrations
6. **Gradual Cutover**: Consider running both databases in parallel initially
7. **Update Application**: Update all application code to use MongoDB drivers
8. **Monitor Performance**: Track query performance in MongoDB after migration

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MSSQL Documentation](https://docs.microsoft.com/sql/)
- [MongoDB Change Streams](https://docs.mongodb.com/manual/changeStreams/)
- [MongoDB Schema Validation](https://docs.mongodb.com/manual/core/schema-validation/)

## Support

For issues and questions:
1. Check the logs for detailed error messages
2. Review the migration report
3. Verify database connections and permissions
4. Test with smaller datasets first

## License

MIT License

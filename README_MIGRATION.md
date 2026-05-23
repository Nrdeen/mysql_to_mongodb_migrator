# Database Migration Tool: MySQL/MSSQL to MongoDB

**🎯 Purpose**: Comprehensive tool for discovering and migrating database schemas from MySQL or MSSQL to MongoDB with complete analysis and reporting.

## 📋 Overview

This project provides a complete database migration solution that:

1. **Discovers** entire database schemas from MySQL or MSSQL
2. **Analyzes** schema structure and identifies unmappable features
3. **Plans** the migration strategy with optimal data structure
4. **Migrates** data safely and idempotently to MongoDB
5. **Reports** comprehensive technical documentation
6. **Handles** incompatibilities with practical solutions

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- MongoDB Atlas or local MongoDB instance
- MySQL/MSSQL database (optional, for testing)

### Installation

```bash
# Clone and setup
npm install
cp .env.example .env

# Configure your databases in .env
# MONGODB_URI=mongodb+srv://...
# MYSQL_HOST=localhost, MYSQL_USER=root, etc.

# Start the server
npm run dev
```

**Server runs on**: `http://localhost:3000`

### API Documentation

Access the interactive API documentation:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** | Complete migration API reference and examples |
| **[schema.sql](./schema.sql)** | Sample SQL schema for testing |
| **Swagger UI** | Interactive API documentation at `/api-docs` |

## 🔧 Core Features

### 1. Schema Discovery
- Automatically discovers all tables, columns, indexes, constraints
- Identifies relationships, triggers, stored procedures, functions
- Collects statistics (row counts, data sizes)
- Supports both MySQL and MSSQL

### 2. Data Type Mapping
Intelligent conversion between SQL and MongoDB types:
```
MySQL INT → MongoDB number
MySQL DATETIME → MongoDB date
MySQL VARCHAR → MongoDB string
MySQL JSON → MongoDB object
MySQL BLOB → MongoDB binary
```

### 3. Migration Planning
- Creates optimal MongoDB collection structure
- Plans index creation
- Identifies relationship handling strategies
- Documents unmappable features

### 4. Safe Data Migration
- **Idempotent**: Safe to rerun without duplicating data
- **Batch Processing**: Handles large datasets efficiently
- **Error Recovery**: Comprehensive error handling
- **Progress Tracking**: Monitor migration status in real-time

### 5. Comprehensive Reporting
Generates detailed technical reports with:
- Schema analysis and statistics
- Migration plan details
- Field mappings and transformations
- Unmappable items with alternatives
- Performance recommendations

## 🛣️ Migration Workflow

```
1. Test Connections
   ├─ Verify source database
   └─ Verify MongoDB connection
   
2. Discover Schema
   ├─ Analyze tables and columns
   ├─ Identify relationships
   ├─ Find triggers/procedures
   └─ Generate schema summary
   
3. Plan Migration
   ├─ Map tables to collections
   ├─ Transform field names
   ├─ Plan indexes
   └─ Identify unmappable items
   
4. Migrate Data
   ├─ Create collections with schema validation
   ├─ Transfer data with type conversion
   ├─ Create indexes
   └─ Handle relationships
   
5. Generate Report
   ├─ Analysis and statistics
   ├─ Recommendations
   ├─ Unmappable items with solutions
   └─ Performance metrics
```

## 📡 API Endpoints

### Discover Schema (Non-Destructive)
```bash
POST /api/migration/discover
```

Returns complete schema analysis without modifying any data.

### Execute Migration
```bash
POST /api/migration/migrate
```

Performs complete migration from MySQL/MSSQL to MongoDB.

### Check Status
```bash
GET /api/migration/status
```

Returns current migration status and last report summary.

### Get Full Report
```bash
GET /api/migration/report
```

Retrieves detailed technical report from last migration.

### Test Connections
```bash
POST /api/migration/test-connection          # Test source database
POST /api/migration/test-mongodb             # Test MongoDB
```

## 💡 Usage Examples

### Example 1: Discover Schema

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

### Example 2: Execute Full Migration

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

### Example 3: Get Migration Report

```bash
curl http://localhost:3000/api/migration/report
```

## 🔄 Supported Database Types

| Database | Version | Status |
|----------|---------|--------|
| **MySQL** | 5.7+ | ✅ Supported |
| **MSSQL** | 2019+ | ✅ Supported |
| **MongoDB** | 4.0+ | ✅ Target |

## ⚠️ Unmappable Features

The following SQL features require manual implementation:

### 1. **Triggers** (SQL → Application Logic)
- Use MongoDB Change Streams for reactive logic
- Implement in application code (pre/post hooks)
- Use Mongoose middleware for Node.js

### 2. **Stored Procedures** (SQL → Node.js Functions)
- Rewrite as application functions
- Use MongoDB aggregation pipelines
- Create dedicated microservices

### 3. **Functions** (SQL → JavaScript)
- Convert to JavaScript functions
- Use aggregation operators
- Implement as API endpoints

### 4. **CHECK Constraints** (SQL → Validation)
- Implement in application layer
- Use MongoDB JSON Schema validators
- Add Joi/Yup validation

**See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed solutions and code examples.**

## 📊 MongoDB Design Patterns

### 1. One-to-Many Relationships
```javascript
// Embed (if children are few)
{
  _id: 1,
  name: "John",
  addresses: [
    { street: "123 Main", city: "NYC" },
    { street: "456 Oak", city: "LA" }
  ]
}

// Reference (if children are many)
{
  _id: 1,
  name: "John",
  addressIds: [ObjectId(...), ObjectId(...)]
}
```

### 2. Composite Keys
```javascript
// Use _id with multiple fields
{
  _id: {
    userId: 1,
    date: ISODate("2024-01-01")
  },
  data: {...}
}
```

### 3. Indexed Fields
MongoDB automatically creates indexes for:
- Primary keys (`_id`)
- Foreign key references
- Unique fields
- Frequently queried fields

## 🔒 Security Features

- **Connection Validation**: Tests database connections before migration
- **Data Encryption**: Supports SSL/TLS connections
- **Credentials Handling**: Secure password management (never logged)
- **Rate Limiting**: Prevents abuse of migration endpoints
- **JWT Authentication**: Protect sensitive endpoints

## 🎯 Configuration

### Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration?appName=Cluster0

# MySQL (for testing)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=test_db

# Security
JWT_SECRET=your_complex_secret_key
BCRYPT_ROUNDS=10
```

## 📈 Performance Optimization

1. **Batch Processing**: Data transferred in optimized batches
2. **Connection Pooling**: Reuses database connections efficiently
3. **Index Creation**: Optimized index creation strategy
4. **Data Validation**: Built-in schema validation
5. **Monitoring**: Detailed logging for performance analysis

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test source database connection
POST /api/migration/test-connection

# Test MongoDB connection
POST /api/migration/test-mongodb
```

### Large Dataset Migration
- Increase connection pool size in `.env`
- Run migration during off-peak hours
- Monitor MongoDB CPU and memory usage
- Consider partial migrations (table by table)

### Data Type Issues
- Review the migration report for type mappings
- Check Source vs converted data in MongoDB
- Implement custom transformation if needed

## 📋 Project Structure

```
.
├── src/
│   ├── services/
│   │   ├── discovery/          # Schema discovery modules
│   │   │   ├── MySQLSchemaDiscovery.js
│   │   │   └── MSSQLSchemaDiscovery.js
│   │   └── migration/          # Migration engine
│   │       ├── MigrationEngine.js
│   │       └── MigrationReport.js
│   ├── routes/
│   │   └── migration.routes.js # API endpoints
│   ├── config/                 # Configuration files
│   └── utils/                  # Utilities (logging, etc.)
├── MIGRATION_GUIDE.md          # Complete migration documentation
├── schema.sql                  # Sample schema for testing
└── .env.example                # Environment configuration template
```

## 🎬 Next Steps

1. **Configure MongoDB Connection**
   - Add MONGODB_URI to `.env`
   - Ensure connection credentials are correct

2. **Test with Sample Data**
   - Import `schema.sql` to your MySQL database
   - Use discovery endpoint to analyze the schema
   - Execute migration to MongoDB

3. **Review Migration Report**
   - Analyze the generated report
   - Review unmappable features
   - Implement application-level solutions

4. **Update Your Application**
   - Update connection strings to MongoDB
   - Migrate application code to use MongoDB drivers
   - Test all database operations

5. **Monitor and Optimize**
   - Check query performance
   - Review index usage
   - Optimize based on access patterns

## 📞 Support

For detailed information:
- **API Documentation**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Swagger UI**: Access at `http://localhost:3000/api-docs`
- **Logs**: Check console output for detailed migration logs
- **Reports**: Review generated migration reports

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Useful Resources

- [MongoDB Official Docs](https://docs.mongodb.com/)
- [MongoDB Schema Validation](https://docs.mongodb.com/manual/core/schema-validation/)
- [MongoDB Change Streams](https://docs.mongodb.com/manual/changeStreams/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MSSQL Documentation](https://docs.microsoft.com/sql/)

---

**Last Updated**: January 2024
**Version**: 1.0.0

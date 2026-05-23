# Database Migration Tool + MongoDB/MySQL Wrapper

**🎯 Purpose**: Comprehensive database migration solution with MongoDB/MySQL compatibility wrapper. Discover and migrate relational databases (MySQL/MSSQL) to MongoDB with complete schema analysis and reporting.

## 🆕 NEW: Database Migration Tool

This project now includes a powerful **MySQL/MSSQL to MongoDB Migration Tool** with:

- ✅ **Complete Schema Discovery** - Automatically discovers all database objects
- ✅ **Intelligent Data Migration** - Converts data with automatic type mapping
- ✅ **Idempotent Operations** - Safe to rerun without data duplication  
- ✅ **Unmappable Feature Analysis** - Identifies triggers, procedures, functions with solutions
- ✅ **Technical Reporting** - Generates comprehensive migration reports
- ✅ **Error Handling** - Continues migration despite errors, logs all issues

### Quick Migration Example

```bash
# 1. Install and setup (see below)
npm install && cp .env.example .env

# 2. Start server
npm run dev

# 3. Discover schema (non-destructive)
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

# 4. Execute migration
curl -X POST http://localhost:3000/api/migration/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "mydb",
    "dbType": "mysql",
    "mongoUri": "mongodb+srv://..."
  }'

# 5. Get report
curl http://localhost:3000/api/migration/report
```

## ⚡ Quick Start (3 Commands)

```bash
npm install          # Install dependencies
cp .env.example .env # Copy environment file
npm run dev          # Start server
```

**Then open**:
- **Swagger UI** (API Docs): `http://localhost:3000/api-docs` ⭐ Start here
- **Health Check**: `http://localhost:3000/health`
- **Built-in UI**: `http://localhost:3000/ui`

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[ASSIGNMENT_QUICK_START.md](./ASSIGNMENT_QUICK_START.md)** | ⭐ Quick start for this specific assignment |
| **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** | Complete API reference and usage examples |
| **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** | Architecture, design patterns, implementation details |
| **[README_MIGRATION.md](./README_MIGRATION.md)** | Detailed migration features overview |
| **[sample_migration_schema.sql](./sample_migration_schema.sql)** | Sample SQL schema for testing migration |
| **Swagger UI** | Interactive API docs at `/api-docs` |

## 🎯 Key Features

### Database Migration
- **MySQL to MongoDB**: Complete schema discovery and intelligent data migration
- **MSSQL to MongoDB**: Full support for MSSQL with type mapping
- **Schema Discovery**: Tables, columns, indexes, relationships, constraints, triggers, procedures, functions
- **Type Conversion**: Automatic mapping from SQL types to MongoDB types
- **Idempotent Operations**: Safe to rerun multiple times without data duplication
- **Comprehensive Reporting**: Technical reports with statistics and recommendations
- **Unmappable Features**: Analysis of triggers, procedures with alternative solutions

### Database Wrapper (Original Feature)
- **Universal Interface**: Use same APIs with MongoDB OR MySQL
- **Dynamic Selection**: Choose database per-request via headers
- **Mongo-like Operators**: MySQL supports `$or`, `$and`, `$in`, `$regex`
- **JWT Authentication**: Secure endpoints with token-based auth
- **Role-Based Access**: Admin, moderator, user roles

## 📋 Project Overview

```
Features:
├── MongoDB + MySQL Wrapper
│   ├── Unified API for both databases
│   ├── Dynamic per-request database selection
│   ├── JWT authentication
│   └── CRUD operations with filtering
│
└── Database Migration Tool
    ├── Schema discovery (tables, indexes, relationships)
    ├── Data type conversion (SQL → MongoDB)
    ├── Idempotent data migration
    ├── Comprehensive technical reporting
    └── Unmappable feature analysis
```

## 🚀 API Endpoints

### Migration Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/migration/discover` | Discover database schema |
| `POST` | `/api/migration/migrate` | Execute complete migration |
| `GET` | `/api/migration/status` | Get migration status |
| `GET` | `/api/migration/report` | Get detailed report |
| `POST` | `/api/migration/test-connection` | Test source database connection |
| `POST` | `/api/migration/test-mongodb` | Test MongoDB connection |

### Application Endpoints (Wrapper)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/signup` | Create new user |
| `POST` | `/api/auth/login` | Login user |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user |
| `GET` | `/api/posts` | List posts |
| `POST` | `/api/posts` | Create post |

## 📁 Project Structure

```
migration-mongo-mysql/
├── src/
│   ├── services/
│   │   ├── discovery/
│   │   │   ├── MySQLSchemaDiscovery.js
│   │   │   └── MSSQLSchemaDiscovery.js
│   │   ├── migration/
│   │   │   ├── MigrationEngine.js
│   │   │   └── MigrationReport.js
│   │   └── database/
│   │       ├── MongoAdapter.js
│   │       ├── MySQLAdapter.js
│   │       └── DatabaseManager.js
│   ├── routes/
│   │   ├── migration.routes.js  (NEW)
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── post.routes.js
│   ├── app.js
│   └── config/
│
├── MIGRATION_GUIDE.md
├── TECHNICAL_DOCUMENTATION.md
├── ASSIGNMENT_QUICK_START.md
├── sample_migration_schema.sql
├── .env.example
└── package.json
```

## 🔧 Setup

### Prerequisites
- **Node.js** 16+ (tested with v20.18.0)
- **npm** 10+ (or yarn)
- **MongoDB** 4.0+ (Atlas or local)
- **MySQL** 5.7+ (optional, for source migrations)
- **MSSQL** 2019+ (optional, for source migrations)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd migration-mongo-mysql-main

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Update .env with your database credentials
# MONGODB_URI=mongodb+srv://...
# MYSQL_HOST=localhost, etc.

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`

## 📊 Supported Databases

### Source (for Migration)
- ✅ **MySQL** 5.7, 5.8, 8.0+
- ✅ **MSSQL** 2019+

### Target (Always MongoDB)
- ✅ **MongoDB** 4.0+ (Local or Atlas)

## 🔄 Data Type Mapping

### MySQL/MSSQL → MongoDB

```
Numeric:      INT, BIGINT, DECIMAL       → number
Strings:      VARCHAR, TEXT, CHAR        → string
Dates:        DATE, DATETIME, TIMESTAMP  → date
Binary:       BLOB, VARBINARY            → binary
Boolean:      BIT (MSSQL)                → boolean
Structured:   JSON                       → object
Collections:  SET, ENUM                  → array
```

## 📈 Migration Process

1. **Test Connections** - Verify database access
2. **Discover Schema** - Analyze entire database structure
3. **Create Plan** - Map SQL schema to MongoDB collections
4. **Create Collections** - Set up MongoDB with schema validation
5. **Migrate Data** - Transfer data with type conversion
6. **Create Indexes** - Optimize for query performance
7. **Generate Report** - Provide comprehensive analysis

## ⚠️ Unmappable Features

The tool identifies and provides solutions for:

| Feature | Solution |
|---------|----------|
| **Triggers** | Application logic, Change Streams, Mongoose middleware |
| **Stored Procedures** | Node.js functions, Aggregation pipelines |
| **Functions** | JavaScript equivalents, Aggregation operators |
| **Check Constraints** | Application validation, JSON Schema validators |

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed code examples.

## 🧪 Testing with Sample Data

```bash
# Import sample SQL schema
mysql -u root -p < sample_migration_schema.sql

# Test migration discovery
curl -X POST http://localhost:3000/api/migration/discover \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "migration_test",
    "dbType": "mysql"
  }'
```

## 🔐 Configuration

### Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=3000

# Database Type (mongodb | mysql | both)
DB_TYPE=both
DB_DEFAULT=mongodb

# MongoDB
MONGODB_URI=mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration

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

## 📋 Response Examples

### Discovery Response
```json
{
  "success": true,
  "dbType": "MySQL",
  "schema": {
    "statistics": {
      "totalTables": 10,
      "totalColumns": 100,
      "totalIndexes": 25,
      "totalRelationships": 15,
      "cannotConvert": {
        "triggers": 4,
        "procedures": 8,
        "functions": 2,
        "checkConstraints": 3
      }
    }
  }
}
```

### Migration Response
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "status": {
    "successCount": 15,
    "failureCount": 0,
    "skippedCount": 2,
    "totalTime": 45.3
  },
  "report": {...}
}
```

### Report Contents
- Executive summary
- Schema analysis
- Migration plan
- Field mappings
- Index strategy
- Unmappable items with alternatives
- Performance recommendations
- Statistics and metrics

## 🔍 Idempotency

Safe to rerun migrations:
- ✅ Checks if collections already exist
- ✅ Verifies if data has been migrated
- ✅ Prevents data duplication
- ✅ Handles partial failures gracefully

## 📝 Logging

Comprehensive logging for all operations:
```bash
# View logs in console (when running npm run dev)
# Includes: timestamps, operation types, success/failure status, error details
```

## 🎯 API Authentication

Some endpoints require JWT tokens (optional in dev mode):

```bash
# Get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use token in Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/users
```

## 🚨 Error Handling

Migration continues despite errors:
- Logs all failures with detailed messages
- Tracks successful and failed operations separately
- Allows retrying individual failed items
- Reports summary of what succeeded/failed

## 📊 Performance Notes

- **Batch Processing**: Data transferred in optimized batches
- **Connection Pooling**: Reuses database connections
- **Index Strategy**: Creates indexes after data migration
- **Type Conversion**: Efficient in-memory transformations

## 🐛 Troubleshooting

### Issue: Connection failed
```bash
# Test connection
curl -X POST http://localhost:3000/api/migration/test-connection
curl -X POST http://localhost:3000/api/migration/test-mongodb
```

### Issue: Migration hangs
- Check network connection to databases
- Verify database credentials
- Reduce dataset size for testing
- Check MongoDB storage limits

### Issue: Data type mismatch
- Review generated migration report
- Check type mapping in MIGRATION_GUIDE.md
- Implement custom transformation if needed

## 📚 Learning Resources

- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [MongoDB Change Streams](https://docs.mongodb.com/manual/changeStreams/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MSSQL Documentation](https://docs.microsoft.com/sql/)
- [Express.js Guide](https://expressjs.com/)
- [Mongoose ODM](https://mongoosejs.com/)

## 👥 Usage Examples

### Migrate MySQL Database

```bash
curl -X POST http://localhost:3000/api/migration/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "host": "mysql.example.com",
    "port": 3306,
    "username": "admin",
    "password": "secure_password",
    "database": "production_db",
    "dbType": "mysql",
    "mongoUri": "mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration"
  }'
```

### Migrate MSSQL Database

```bash
curl -X POST http://localhost:3000/api/migration/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "host": "mssql.example.com",
    "port": 1433,
    "username": "sa",
    "password": "secure_password",
    "database": "production_db",
    "dbType": "mssql",
    "mongoUri": "mongodb+srv://nrdeen1:Doodo1020@cluster0.5r7fghk.mongodb.net/test_migration"
  }'
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- **API Documentation**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Architecture**: See [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)
- **Quick Start**: See [ASSIGNMENT_QUICK_START.md](./ASSIGNMENT_QUICK_START.md)
- **Swagger UI**: `http://localhost:3000/api-docs`

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Node Version**: 16+  
**Status**: ✅ Production Ready

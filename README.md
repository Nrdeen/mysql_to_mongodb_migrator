# Node Manager Demo — MongoDB + MySQL Wrapper

**🎯 Purpose**: Demonstrate that our MongoDB-based application now works with MySQL using the **same API contract**, achieved via a database wrapper.

> ⭐ **NEW TO THIS PROJECT?** Start with [`START_HERE.md`](START_HERE.md) - Simple 3-step guide!
> 
> 📋 **FOR MANAGERS**: See [`MANAGER_QUICK_GUIDE.md`](MANAGER_QUICK_GUIDE.md) for 5-minute demo guide

## ⚡ Quick Start (3 Commands)

```bash
npm install          # Install dependencies
cp .env.example .env # Copy environment file
npm run dev          # Start server
```

**Or use automated setup**:
```bash
npm run setup        # Installs dependencies and creates .env
npm run dev          # Start server
```

**Then open**:
- **Swagger UI**: `http://localhost:3000/api-docs` ⭐ **Start here**
- **Built-in UI**: `http://localhost:3000/ui`
- **Health Check**: `http://localhost:3000/health`

## 📋 Quick Overview

- ✅ **MongoDB**: Already implemented and working
- ✅ **MySQL**: Added via wrapper — **same APIs work identically**
- ✅ **Both Simultaneously**: Optional — choose database per request

## 📖 Documentation

- **`MANAGER_README.md`** ← **Read this first** (manager-focused overview)
- **`API_DOCUMENTATION.md`** ← Complete API reference
- **`docs/MANAGER_DEMO.md`** ← Step-by-step demo script
- **Swagger UI**: `http://localhost:3000/api-docs` ← Interactive API docs

## Features

- Universal DB wrapper (`MongoAdapter`, `MySQLAdapter`) behind a common interface
- Run **both DBs together** and choose backend per request via header `x-db-type: mongodb|mysql`
- JWT auth (signup/login/me)
- User CRUD with role-based authorization (admin vs user)
- MySQL supports Mongo-like operators including `$or`, `$and`, `$in`, `$regex`
- Security middleware: Helmet, CORS, rate limiting
- Graceful shutdown
- Demo endpoints to show **5+ wrapper operations**: `insertMany`, `updateMany`, `deleteMany`, `count`, `aggregate`

## Project Structure

```
.
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── dbContext.js
│   │   ├── database.js
│   │   └── env.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── dbSelector.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Post.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── demo.routes.js
│   │   ├── post.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   └── database/
│   │       ├── BaseAdapter.js
│   │       ├── DatabaseFactory.js
│   │       ├── DatabaseManager.js
│   │       ├── MongoAdapter.js
│   │       └── MySQLAdapter.js
│   └── utils/
│       ├── jwt.js
│       └── logger.js
├── .env
├── .env.example
├── package.json
├── schema.sql
└── postman_collection.json
```

## Setup

### 1) Install

```bash
npm install
```

### 2) Configure env

Copy `.env.example` → `.env` and set values.

### 3) Database setup

#### MongoDB

No schema required. Ensure Mongo is running and `MONGODB_URI` is correct.

#### MySQL

Create schema:

```bash
/opt/homebrew/bin/mysql -u root -p < schema.sql
```

Then set `DB_TYPE=mysql` in `.env`.

#### Both at the same time

In `.env`:

```env
DB_TYPE=both
DB_DEFAULT=mongodb
```

Then select DB per request:

- Header: `x-db-type: mongodb` or `x-db-type: mysql`
- Or query: `?db=mongodb` / `?db=mysql`

### 4) Run

```bash
npm run dev
```

Server: `http://localhost:3000`
Health: `GET /health`

### Quick smoke test (MongoDB mode)

Start the server, then:

```bash
npm run smoke:mongo
```

### One-command demo (Mongo → MySQL)

If your MySQL credentials are set and schema exists, run:

```bash
npm run demo:mongo-mysql
```

## Postman

Import `postman_collection.json` into Postman.

Collection variables:
- `baseUrl` (default `http://localhost:3000`)
- `dbType` (default `mongodb`) — collection auto-sends header `x-db-type: {{dbType}}`
- `token` (set automatically by the Login request test script)

## UI (testing only)

This repo includes a simple built-in UI to test all APIs without Postman:

- Start the server: `npm run dev`
- Open: `http://localhost:3000/ui`

The UI lets you:

- choose `dbType` (mongodb/mysql)
- signup/login to store a token **per dbType**
- call endpoints and see JSON + `x-db-used` response header

## Swagger / OpenAPI

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## 📚 Documentation

### ⭐ For Managers - Start Here
- **`START_HERE.md`** ⭐⭐⭐ **READ THIS FIRST** — 3-step quick start
- **`MANAGER_QUICK_GUIDE.md`** ⭐⭐ — 5-minute demo guide
- **`DEMO_SCRIPT.md`** ⭐⭐ — Complete demo script for presentation
- **`MANAGER_README.md`** — Complete manager overview
- **`COMMANDS_AND_APIS.md`** — All commands & APIs reference
- **`QUICK_REFERENCE.md`** — Quick reference card

### API Usage & Testing
- **`RUN_API_TESTS.md`** ⭐⭐ — **Run all API tests** (MongoDB → MySQL → Both)
- **`API_TESTING_GUIDE.md`** ⭐ — Complete testing guide with examples
- **`POSTMAN_API_GUIDE.md`** ⭐ — Complete Postman API usage guide (all 28+ APIs explained)
- **`FIX_USER_NOT_FOUND.md`** — Fix for "User not found" error
- **`SWAGGER_AUTH_GUIDE.md`** — Swagger UI authentication guide
- **`POSTMAN_MYSQL_SETUP.md`** — Postman setup for MySQL mode

### Technical Documentation
- **`IMPLEMENTATION_FILES.md`** ⭐⭐⭐ — **Main files** where MySQL wrapper logic is implemented
- **`KEY_FILES_QUICK_REFERENCE.md`** ⭐⭐ — Quick reference to key files and methods
- **`WRAPPER_IMPLEMENTATION_GUIDE.md`** ⭐⭐ — **How wrapper works** (complete technical explanation)
- **`CRUD_OPERATIONS_EXPLAINED.md`** ⭐⭐ — **CRUD operations** explained (MongoDB vs MySQL)
- **`MANAGER_TECHNICAL_EXPLANATION.md`** ⭐ — Manager-friendly technical explanation
- **`PROJECT_DOCUMENTATION.md`** — Architecture + how code works
- **`WRAPPER_USAGE_GUIDE.md`** — How to use the wrapper in your code
- **`TESTING_GUIDE.md`** — Detailed testing instructions
- **`docs/MANAGER_DEMO.md`** — Step-by-step demo script

### Deployment & Scaling
- **`AWS_DEPLOYMENT_GUIDE.md`** — Deploy on AWS (EC2 + RDS + DocumentDB)
- **`SCALABILITY_GUIDE.md`** — Production scaling strategies


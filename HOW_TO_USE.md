# 📖 How to Use This Project

**Simple step-by-step guide for managers**

---

## 🎯 Goal

Demonstrate that our MongoDB-based application can work with MySQL using the same APIs.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Setup (First Time Only)

```bash
npm run setup
```

**What it does**:
- Installs all dependencies
- Creates `.env` file
- Sets up everything automatically

**Or manually**:
```bash
npm install
cp .env.example .env
```

### Step 2: Start Server

```bash
npm run dev
```

**Wait for**: `Server running on http://localhost:3000`

### Step 3: Open Swagger UI

**Open in browser**: `http://localhost:3000/api-docs`

**That's it!** You're ready to test APIs.

---

## 🧪 Testing APIs (Swagger UI)

### 1. Signup (Create Account)

1. Find `POST /api/auth/signup`
2. Click "Try it out"
3. Click "Execute"
4. **Copy the token** from response

### 2. Authorize

1. Click **"Authorize"** button (top right, lock icon)
2. Paste your token
3. Click "Authorize"
4. Click "Close"

### 3. Test Any API

Now you can test any endpoint:
- `GET /api/auth/me` - Get your profile
- `POST /api/envelopes` - Create envelope
- `GET /api/envelopes` - List envelopes
- And more!

---

## 🔄 Switch to MySQL

### Method 1: Using npm Script

```bash
# Stop current server (Ctrl+C)
npm run dev:mysql
```

**Note**: Requires MySQL setup (see `MYSQL_SETUP_GUIDE.md`)

### Method 2: Automated Demo

```bash
npm run demo:mongo-mysql
```

This automatically shows MongoDB → MySQL comparison.

---

## 📊 What Each Command Does

| Command | What It Does |
|---------|--------------|
| `npm run setup` | Installs dependencies and creates .env |
| `npm run dev` | Starts server (MongoDB mode) |
| `npm run dev:mysql` | Starts server (MySQL mode) |
| `npm run dev:mongo` | Starts server (MongoDB mode) |
| `npm run verify:mongo` | Tests all APIs automatically |
| `npm run demo:mongo-mysql` | Shows MongoDB → MySQL demo |

---

## 🌐 Important URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/api-docs` | **Swagger UI** - Test APIs here ⭐ |
| `http://localhost:3000/ui` | Built-in UI for testing |
| `http://localhost:3000/health` | Health check endpoint |

---

## ✅ Verification

Test that everything works:

```bash
npm run verify:mongo
```

This runs automated tests and confirms all APIs work.

---

## 🆘 Common Issues

### Server won't start

**Problem**: Port 3000 already in use

**Solution**: 
```bash
PORT=3001 npm run dev
# Then use http://localhost:3001/api-docs
```

### MongoDB connection failed

**Problem**: MongoDB not running

**Solution**: Start MongoDB, then restart server

### APIs return "Unauthorized"

**Problem**: Not authorized in Swagger UI

**Solution**: 
1. Signup/login to get token
2. Click "Authorize" button
3. Paste token
4. Try API again

---

## 📚 More Help

- **`START_HERE.md`** - Quick start guide
- **`MANAGER_QUICK_GUIDE.md`** - 5-minute demo guide
- **`DEMO_SCRIPT.md`** - Complete demo script
- **`COMMANDS_AND_APIS.md`** - All commands and APIs

---

## 🎉 Success!

Once you can:
- ✅ Start the server
- ✅ Open Swagger UI
- ✅ Signup and get token
- ✅ Test APIs

You're ready to demonstrate to your manager!

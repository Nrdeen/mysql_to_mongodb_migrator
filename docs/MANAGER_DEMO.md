# Manager Demo Script (Node + MongoDB + MySQL wrapper)

This project proves **we can keep the same API contract** while switching database backends:

- **MongoDB (current / already implemented)**
- **MySQL (new) via wrapper that supports Mongo-like query operators**
- Optional: run **both at the same time** and choose per request with `x-db-type`

## 5-minute demo (MongoDB only)

### 1) Start

```bash
npm install
cp .env.example .env
# in .env: DB_TYPE=mongodb
npm run dev
```

Open:

- UI: `http://localhost:3000/ui`
- Swagger: `http://localhost:3000/api-docs`

### 2) Show “login + JWT”

Use Swagger UI or Postman:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (uses JWT)

### 3) Show “CRUD”

- Users CRUD: `GET/PUT/DELETE /api/users/...` (RBAC enforced)
- Posts CRUD: `POST/GET/PUT/DELETE /api/posts/...`
- Envelopes CRUD: `POST/GET/PUT /api/envelopes/...`

### 4) Show “wrapper operations” (Walacor-style)

These endpoints demonstrate wrapper parity (same calls work on MongoDB and MySQL):

- `POST /api/demo/insert-many`
- `POST /api/demo/update-many`
- `POST /api/demo/delete-many`
- `GET  /api/demo/count`
- `POST /api/demo/aggregate`

## 5-minute demo (MySQL via wrapper)

### 1) Create schema

```bash
mysql -h 127.0.0.1 -P 3306 -u myapp_user -p < schema.sql
```

### 2) Start in MySQL mode

In `.env`:

```env
DB_TYPE=mysql
```

Start:

```bash
npm run dev
```

Run the **exact same API requests** again (signup/login/CRUD/envelopes/demo).

## Bonus demo: both DBs at the same time (per-request DB selection)

In `.env`:

```env
DB_TYPE=both
DB_DEFAULT=mongodb
```

Then choose DB per request:

- `x-db-type: mongodb`
- `x-db-type: mysql`

The app returns `x-db-used` response header so you can show which backend handled the request.

## One-command demo (Mongo → MySQL)

If MySQL is configured and schema is applied, you can run:

```bash
npm run demo:mongo-mysql
```

This will:

1) start the server in **MongoDB** mode and run a full API flow
2) restart the server in **MySQL** mode and run the **same flow** again

### Notes for your machine

- `root` access is not required; this works with `myapp_user` as long as it has permissions and schema is applied.


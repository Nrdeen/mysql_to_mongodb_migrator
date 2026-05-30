# Database Migrator - Technical Documentation

**Version:** 1.0.0  
**Date:** May 30, 2026  
**Language:** English & Turkish

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Discovery Process](#database-discovery-process)
3. [Detected Objects List](#detected-objects-list)
4. [MongoDB Data Model](#mongodb-data-model)
5. [Transformed Structures](#transformed-structures)
6. [Untransformable Structures and Reasons](#untransformable-structures-and-reasons)
7. [Encountered Problems and Solutions](#encountered-problems-and-solutions)
8. [Setup Guide](#setup-guide)
9. [API Endpoints](#api-endpoints)

---

## System Overview

### Purpose

This project was developed to automatically migrate data from **MySQL** and **MSSQL** databases to **MongoDB**. Sistem aşağıdaki önemli özellikleri sunar:

- ✅ **Dinamik Şema Keşfi** - Connection string bilgileriyle bağlanıp veritabanını tam otomatik analiz eder
- ✅ **Kapsamlı Nesne Tespit** - Tablolar, kolonlar, ilişkiler, indeksler, constraint'ler, trigger'ler ve stored procedure'lar
- ✅ **Yazılımda Dönüştürülebilir İş Mantığı** - MongoDB'ye doğrudan aktarılamayan yapılar için öneriler
- ✅ **İdempotent (Tekrarlanabilir)** - Birden fazla çalıştırma güvenlidir
- ✅ **Detaylı Raporlama** - Sürecin tüm aşamalarını, hataları ve önerileri belge haline getirir

### Hedef Veritabanları

- **MySQL** 5.7 ve üzeri
- **MSSQL** 2012 ve üzeri

### Desteklenen İşlemler

- Tablo şemasının keşfi
- Veri tipi dönüşümü
- Anahtar ve ilişkiler
- İndeks oluşturma
- Veri migrasyon

---

## Veritabanı Keşif Süreci

### Keşif Mimarisi

Sistem, **iki stage'li keşif mekanizması** kullanır:

```
[Bağlantı Bilgileri]
        ↓
   [Keşif Modülü Seçimi]
   /                  \
MySQL Discovery    MSSQL Discovery
        ↓                  ↓
  Information_Schema   System Catalogs
        ↓                  ↓
  Tablo Bilgileri     Nesne Bilgileri
        ↓                  ↓
  [Şema Analizi]
        ↓
  [İlişki Haritası]
        ↓
  [Dönüştürme Planı]
```

### Aşamalar

#### 1. **Tablo Keşfi**
```sql
-- MySQL
SELECT TABLE_NAME, TABLE_TYPE, TABLE_COMMENT 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = ?

-- MSSQL
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
```

**Bilgi Toplama:**
- Tablo adları
- Tablo türü (TABLE, VIEW)
- Tablo açıklamaları
- Satır sayısı
- Boyutu

#### 2. **Kolon Keşfi**
```sql
-- MySQL
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, 
       COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?

-- MSSQL
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = ?
```

**Çıkarılan Bilgiler:**
- Kolon adı
- Veri tipi
- NULL olabilirlik
- Varsayılan değer
- Otomatik artış (AUTO_INCREMENT)
- Açıklama

#### 3. **Anahtar Keşfi**
```sql
-- MySQL
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?

-- MSSQL
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_NAME = ?
```

**Primary Key, Unique Key, Foreign Key tespit ediliyor.**

#### 4. **İlişki Keşfi**
```sql
-- MySQL
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL

-- MSSQL
SELECT OBJECT_NAME(f.parent_object_id) AS table_name,
       COL_NAME(f.parent_object_id, f.parent_column_id) AS column_name,
       OBJECT_NAME(f.referenced_object_id) AS referenced_table
FROM sys.foreign_keys f
```

#### 5. **İndeks Keşfi**
```sql
-- MySQL
SELECT INDEX_NAME, COLUMN_NAME, NOT_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?

-- MSSQL
SELECT i.name, col.name
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id
JOIN sys.columns col ON ic.object_id = col.object_id
```

#### 6. **Trigger'ler, Stored Procedure'lar ve Fonksiyonlar**

```sql
-- MySQL
SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = ?

SELECT TRIGGER_NAME, ACTION_STATEMENT, EVENT_MANIPULATION
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = ?

-- MSSQL
SELECT OBJECT_NAME(id), type FROM sysobjects
WHERE type IN ('P', 'FN', 'TR')
```

---

## Tespit Edilen Nesnelerin Listesi

Sistem aşağıdaki veritabanı nesnelerini otomatik olarak tespit eder:

### 1. **Tablolar (Tables)**

| Özellik | Tespit Ediliyor |
|---------|-----------------|
| Tablo Adı | ✅ Evet |
| Kolon Sayısı | ✅ Evet |
| Satır Sayısı | ✅ Evet |
| Boyutu | ✅ Evet |
| Birincil Anahtar | ✅ Evet |
| Yorum/Açıklama | ✅ Evet |

### 2. **Kolonlar (Columns)**

| Özellik | Tespit Ediliyor |
|---------|-----------------|
| Kolon Adı | ✅ Evet |
| Veri Tipi | ✅ Evet |
| NULL Olabilirlik | ✅ Evet |
| Varsayılan Değer | ✅ Evet |
| Otomatik Artış | ✅ Evet |
| Ön tanımlı değer | ✅ Evet |

### 3. **Anahtarlar (Keys)**

| Tür | Tespit Ediliyor | İşlev |
|-----|-----------------|-------|
| Primary Key | ✅ Evet | Benzersiz kayıt tanımı |
| Foreign Key | ✅ Evet | Tablo ilişkileri |
| Unique Key | ✅ Evet | Tekil veri garantisi |

### 4. **İndeksler (Indexes)**

| Özellikleri | Tespit Ediliyor |
|-------------|-----------------|
| İndeks Adı | ✅ Evet |
| Kolonlar | ✅ Evet |
| Benzersizlik | ✅ Evet |
| Sıralama | ✅ Evet |

### 5. **Constraint'ler (Constraints)**

| Tür | Tespit Ediliyor | MongoDB'ye |
|-----|-----------------|-----------|
| PRIMARY KEY | ✅ Evet | Evet |
| FOREIGN KEY | ✅ Evet | Referans olarak |
| UNIQUE | ✅ Evet | Evet |
| NOT NULL | ✅ Evet | Evet |
| CHECK | ✅ Evet | ❌ Uygulama katmanı |
| DEFAULT | ✅ Evet | Evet (şema olarak) |

### 6. **Trigger'ler**

| Bilgisi | Tespit Ediliyor |
|---------|-----------------|
| Trigger Adı | ✅ Evet |
| Tetikleme Olayı | ✅ Evet (INSERT, UPDATE, DELETE) |
| Tetikleme Zamanı | ✅ Evet (BEFORE, AFTER) |
| İş Mantığı | ✅ Evet |

### 7. **Stored Procedure'lar ve Fonksiyonlar**

| Özelliği | Tespit Ediliyor |
|----------|-----------------|
| Adı | ✅ Evet |
| Parametreleri | ✅ Evet |
| Dönüş Tipi | ✅ Evet |
| Kaynak Kodu | ✅ Evet |

### 8. **Görünüşler (Views)**

| Özelliği | Tespit Ediliyor |
|----------|-----------------|
| View Adı | ✅ Evet |
| SQL Sorgusu | ✅ Evet |
| Bağlı Tablolar | ✅ Evet |

---

## MongoDB Veri Modeli

### Dönüştürme Stratejisi

SQL tablolarından MongoDB collection'larına dönüştürme aşağıdaki kurallara uyar:

#### 1. **Tablo → Collection**

```javascript
// SQL
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at DATETIME
);

// MongoDB Collection (users)
{
  "_id": ObjectId(),
  "id": 1,
  "name": "Ahmet Yilmaz",
  "email": "ahmet@example.com",
  "created_at": ISODate("2024-01-15T10:30:00Z")
}
```

#### 2. **Veri Tipi Dönüşümleri**

| SQL Veri Tipi | MongoDB Tipi | Örnek |
|---------------|--------------|--------|
| INT, BIGINT | Number | `42` |
| DECIMAL, FLOAT | Number | `3.14` |
| VARCHAR, TEXT | String | `"Metni"` |
| CHAR | String | `"A"` |
| DATE | Date | `ISODate("2024-01-15")` |
| DATETIME, TIMESTAMP | Date | `ISODate("2024-01-15T10:30:00Z")` |
| BOOLEAN, TINYINT(1) | Boolean | `true`, `false` |
| JSON | Object | `{...}` |
| BLOB, LONGBLOB | BinData | `Binary(...)` |
| NULL | null | `null` |

#### 3. **İlişkilerin Dönüştürülmesi**

**a) Embedded Documents (Gömülü Belgeler)**

Bire-çok ilişkiler küçük koleksiyonlar için gömülmesi önerilir:

```javascript
// SQL: users ve posts (1:N ilişki)
// Tablo1: users (id, name)
// Tablo2: posts (id, user_id, title, content)

// MongoDB (posts'lar embedded):
{
  "_id": ObjectId(),
  "name": "Ahmet",
  "posts": [
    {
      "post_id": 1,
      "title": "İlk yazı",
      "content": "İçerik..."
    },
    {
      "post_id": 2,
      "title": "İkinci yazı",
      "content": "İçerik..."
    }
  ]
}
```

**b) Referanslar (References)**

Büyük koleksiyonlar veya çok-çok ilişkiler için:

```javascript
// Orijinal Yöntem (Foreign Key):
db.posts.insertOne({
  "_id": ObjectId(),
  "title": "Yazı",
  "user_id": ObjectId("...") // Reference
});

// Query için join:
db.posts.aggregate([
  { $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user"
    }
  }
]);
```

#### 4. **MongoDB Şeması (JSON Schema)**

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["id", "name"],
    "properties": {
      "_id": { "bsonType": "objectId" },
      "id": { "bsonType": "int" },
      "name": { "bsonType": "string" },
      "email": { "bsonType": "string" },
      "created_at": { "bsonType": "date" },
      "is_active": { "bsonType": "bool" }
    }
  }
}
```

#### 5. **İndeksler**

```javascript
// Birincil İndeks (her koleksiyonda otomatik):
// db.collection.createIndex({ "_id": 1 })

// Diğer İndeksler:
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "created_at": -1 });
db.posts.createIndex({ "user_id": 1, "created_at": -1 });
```

---

## Dönüştürülen Yapılar

### ✅ Başarıyla Dönüştürülen Öğeler

#### 1. **Tablolar ve Veri**

- ✅ Tüm tablolar MongoDB collection'larına dönüştürülür
- ✅ Her tablo satırı, bir MongoDB belgesi olur
- ✅ Orijinal veri tipi ve yapısı korunur

**Örnek:**

```javascript
// SQL (posts tablosu):
INSERT INTO posts (id, user_id, title, content, created_at)
VALUES (1, 5, 'Başlık', 'İçerik', NOW());

// MongoDB (posts collection):
db.posts.insertOne({
  "_id": ObjectId(),
  "id": 1,
  "user_id": 5,
  "title": "Başlık",
  "content": "İçerik",
  "created_at": ISODate("2024-01-15T10:30:00Z")
});
```

#### 2. **Birincil Anahtarlar (Primary Keys)**

- ✅ SQL PRIMARY KEY → MongoDB `_id` alanı
- ✅ Unique Constraint → MongoDB unique index

```javascript
db.users.createIndex({ "email": 1 }, { unique: true });
```

#### 3. **Foreign Keys (Yabancı Anahtarlar)**

- ✅ İlişkili verileri referans/embed olarak saklar
- ✅ Büyük koleksiyonlar için referans
- ✅ Küçük koleksiyonlar için embedding

```javascript
// Referans Yöntemi:
db.posts.insertOne({
  "title": "Yazı",
  "user_id": ObjectId("507f1f77bcf86cd799439011")
});
```

#### 4. **İndeksler**

- ✅ Performans için indeksler dönüştürülür
- ✅ Composite indeksler desteklenir
- ✅ Full-text indeksler kurulur

```javascript
// Index dönüşümü:
db.users.createIndex({ "email": 1 });
db.posts.createIndex({ "user_id": 1, "created_at": -1 });
db.posts.createIndex(
  { "title": "text", "content": "text" },
  { default_language: "turkish" }
);
```

#### 5. **Kısıtlamalar (Constraints)**

- ✅ NOT NULL → Uygulama seviyesi doğrulama
- ✅ CHECK → Uygulama seviyesi kuralları
- ✅ UNIQUE → MongoDB unique index
- ✅ DEFAULT → Uygulama default değerleri

```javascript
// Örnek: NOT NULL ve DEFAULT dönüşümü
// SQL: created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

// MongoDB: Application Layer / Schema Validation
db.createCollection("posts", {
  validator: {
    $jsonSchema: {
      required: ["created_at"],
      properties: {
        created_at: {
          bsonType: "date"
        }
      }
    }
  }
});

// Uygulama Kodu (Node.js):
const post = {
  title: "Yazı",
  created_at: new Date(), // Otomatik set
  is_active: true // DEFAULT true
};
```

---

## Dönüştürülemeyen Yapılar ve Gerekçeleri

### ❌ Doğrudan Dönüştürülemeyen Öğeler

#### 1. **Trigger'ler (Tetikleyiciler)**

| Özellik | Durum | Gerekçe |
|---------|-------|--------|
| Otomatik Tetikleme | ❌ Desteklenmiyor | MongoDB event-driven mimarisi yoktur |
| Zaman Tabanlı | ❌ Desteklenmiyor | Built-in scheduler bulunmamaktadır |
| Koşullu İş Mantığı | Kısmen | Uygulama seviyesinde yapılmalıdır |

**Gerekçe:**

MongoDB, trigger konseptini natively desteklemiyor. Bunun nedenleri:
- Non-relational yapı
- Event-driven model yetersiz
- Distributed systems için uygun değil

**Çözüm Önerileri:**

**a) Change Streams (Önerilen)**
```javascript
// Tablo güncellendiğinde işlemi tetikle
const changeStream = db.collection('posts').watch();
changeStream.on('change', (change) => {
  if (change.operationType === 'insert') {
    // Yeni yazı eklendiğinde log tut
    db.collection('post_logs').insertOne({
      post_id: change.fullDocument._id,
      action: 'CREATE',
      timestamp: new Date()
    });
  }
});
```

**b) Application-Level Triggers**
```javascript
// POST /api/posts
app.post('/api/posts', async (req, res) => {
  const session = db.startSession();
  try {
    session.startTransaction();
    
    // 1. Post ekle
    const result = await posts.insertOne(req.body, { session });
    
    // 2. Trigger: Kullanıcı istatistiğini güncelle
    await users.updateOne(
      { _id: req.body.user_id },
      { $inc: { post_count: 1 } },
      { session }
    );
    
    // 3. Trigger: Activity log oluştur
    await logs.insertOne({
      action: 'POST_CREATED',
      user_id: req.body.user_id,
      timestamp: new Date()
    }, { session });
    
    await session.commitTransaction();
    res.json(result);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  }
});
```

**c) Job Scheduler**
```javascript
// Node.js Job Scheduler (node-schedule)
const schedule = require('node-schedule');

// Her saat başında rapor üret
schedule.scheduleJob('0 * * * *', async () => {
  const hourlyStats = await posts.aggregate([
    {
      $match: {
        created_at: {
          $gte: new Date(Date.now() - 3600000)
        }
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  
  // İstatistiği kaydet
  await reports.insertOne({
    type: 'HOURLY',
    data: hourlyStats,
    created_at: new Date()
  });
});
```

#### 2. **Stored Procedure'lar ve Fonksiyonlar**

| Özellik | Durum | Gerekçe |
|---------|-------|--------|
| Kompleks İş Mantığı | ❌ Desteklenmiyor | MongoDB stored procedures yoktur |
| Parametreli Sorgular | Kısmen | Aggregation pipeline ile yapılır |
| Geriye Değer Dönme | Kısmen | Sonuç collection'a yazılır |

**Gerekçe:**

- MongoDB, server-side JavaScript yürütmeyi teşvik etmez
- Skalabilite ve security sorunları
- Microservices'de tercih edilmez

**Çözüm Önerileri:**

**a) Aggregation Pipeline ile Dönüştürme**

```sql
-- SQL Stored Procedure
CREATE PROCEDURE sp_get_user_stats(IN p_user_id INT)
BEGIN
  SELECT 
    u.id,
    u.name,
    COUNT(p.id) as post_count,
    COUNT(c.id) as comment_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  LEFT JOIN comments c ON p.id = c.post_id
  WHERE u.id = p_user_id
  GROUP BY u.id;
END
```

```javascript
// MongoDB Aggregation Pipeline
db.users.aggregate([
  { $match: { _id: ObjectId("...") } },
  {
    $lookup: {
      from: "posts",
      localField: "_id",
      foreignField: "user_id",
      as: "posts"
    }
  },
  {
    $lookup: {
      from: "comments",
      let: { post_ids: "$posts._id" },
      pipeline: [
        { $match: { $expr: { $in: ["$post_id", "$$post_ids"] } } }
      ],
      as: "comments"
    }
  },
  {
    $project: {
      _id: 1,
      name: 1,
      post_count: { $size: "$posts" },
      comment_count: { $size: "$comments" }
    }
  }
]);
```

**b) Microservice ile Dönüştürme**

```javascript
// Bağımsız API endpoint'i
app.get('/api/users/:id/stats', async (req, res) => {
  try {
    const userId = new ObjectId(req.params.id);
    
    const stats = await db.collection('users').aggregate([
      { $match: { _id: userId } },
      // ... gerisini yukarıdaki gibi
    ]).toArray();
    
    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**c) Helper Fonksiyon**

```javascript
// utils/database.js
async function getUserStats(userId) {
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error('User not found');
  
  const posts = await posts.find({ user_id: user._id }).toArray();
  const comments = await comments.find({
    post_id: { $in: posts.map(p => p._id) }
  }).toArray();
  
  return {
    ...user,
    post_count: posts.length,
    comment_count: comments.length,
    stats_calculated_at: new Date()
  };
}
```

#### 3. **CHECK Constraint'lar**

| Özellik | Durum | Gerekçe |
|---------|-------|--------|
| Koşul Doğrulama | ❌ Desteklenmiyor | MongoDB otomatik kontrol yapmaz |
| Aralık Kontrolü | Kısmen | Schema validation ile yapılır |
| Özel Kurallar | ❌ Desteklenmiyor | Uygulama seviyesinde gerekir |

**SQL Örnek:**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY,
  price DECIMAL(10, 2),
  stock INT,
  CHECK (price > 0 AND stock >= 0)
);
```

**Çözüm Önerileri:**

**a) Schema Validation**
```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        price: {
          bsonType: "number",
          minimum: 0,
          description: "Fiyat 0'dan büyük olmalı"
        },
        stock: {
          bsonType: "int",
          minimum: 0,
          description: "Stok negatif olamaz"
        }
      }
    }
  }
});
```

**b) Uygulama Seviyesi Doğrulama**
```javascript
// services/productService.js
class ProductService {
  validateProduct(product) {
    const errors = [];
    
    if (!product.price || product.price <= 0) {
      errors.push("Fiyat 0'dan büyük olmalıdır");
    }
    if (!Number.isInteger(product.stock) || product.stock < 0) {
      errors.push("Stok negatif olamaz");
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  }

  async createProduct(productData) {
    this.validateProduct(productData);
    return await products.insertOne(productData);
  }

  async updateProduct(id, updates) {
    this.validateProduct(updates);
    return await products.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
  }
}
```

**c) Joi Validation (Express.js)**
```javascript
const joi = require('joi');

const productSchema = joi.object({
  name: joi.string().required(),
  price: joi.number().min(0.01).required(),
  stock: joi.number().integer().min(0).required()
});

app.post('/api/products', async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details });
    
    const result = await products.insertOne(value);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

#### 4. **Views (Görünüşler)**

| Özellik | Durum | Gerekçe |
|---------|-------|--------|
| Virtual Tables | ❌ Desteklenmiyor | MongoDB bunu natively desteklemiyor |
| Complex Queries | Kısmen | Aggregation pipeline ile yapılır |
| Caching | Kısmen | Separate collection'da saklanabilir |

**Çözüm Önerileri:**

**a) Aggregation Pipeline**
```sql
-- SQL View
CREATE VIEW active_users_view AS
SELECT u.id, u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active'
GROUP BY u.id
ORDER BY post_count DESC;
```

```javascript
// MongoDB: Fonksiyon olarak
async function getActiveUsersView() {
  return await db.collection('users').aggregate([
    { $match: { status: 'active' } },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "user_id",
        as: "posts"
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        post_count: { $size: "$posts" }
      }
    },
    { $sort: { post_count: -1 } }
  ]).toArray();
}
```

**b) Materialized View (Cached)**
```javascript
// Her saat güncelle
const schedule = require('node-schedule');

schedule.scheduleJob('0 * * * *', async () => {
  const data = await db.collection('users').aggregate([
    // ... aggregation pipeline
  ]).toArray();
  
  // Sonucu cache collection'a yaz
  await db.collection('active_users_cache').deleteMany({});
  await db.collection('active_users_cache').insertMany(data);
});
```

---

## Karşılaşılan Problemler ve Çözüm Önerileri

### 1. **Veri Tipi Dönüşümü Sorunları**

#### Problem: DECIMAL/NUMERIC Hassasiyeti Kaybı

```sql
-- SQL
CREATE TABLE financial (
  id INT,
  amount DECIMAL(19, 4) -- 99999999999999.9999
);
```

MongoDB Number tipi (double) hassasiyeti kaybedebilir.

**Çözüm:**
```javascript
// Yöntem 1: String olarak sakla
db.financial.insertOne({
  _id: ObjectId(),
  amount: "12345.6789", // String
  amount_minor: 123456789 // Cent cinsinden
});

// Yöntem 2: Decimal128 kullan
const Decimal128 = require('mongodb').Decimal128;
db.financial.insertOne({
  _id: ObjectId(),
  amount: new Decimal128("12345.6789")
});

// Yöntem 3: Multiply to Integer
db.financial.insertOne({
  _id: ObjectId(),
  amount_cents: 123456789 // 12345.6789 * 10000
});

// Query zamanında dönüştür
db.financial.find().map(doc => {
  doc.amount = doc.amount_cents / 10000;
  return doc;
});
```

### 2. **Büyük Veri Taşıma (Bulk Insert)**

#### Problem: Heap Memory Yetersiz

```javascript
// ❌ Yanlış: Tümü bellekte
async function migrateAllData() {
  const records = await sqlDb.query('SELECT * FROM large_table');
  await mongoDb.collection('large_collection').insertMany(records);
  // OutOfMemory hatası!
}
```

**Çözüm: Batch Processing**
```javascript
// ✅ Doğru: Batch'ler halinde
async function migrateWithBatches(batchSize = 10000) {
  const offset = 0;
  let count = 0;
  
  while (true) {
    const batch = await sqlDb.query(
      'SELECT * FROM large_table LIMIT ? OFFSET ?',
      [batchSize, offset]
    );
    
    if (batch.length === 0) break;
    
    await mongoDb.collection('large_collection').insertMany(batch);
    
    count += batch.length;
    console.log(`Migrated: ${count} records`);
    offset += batchSize;
  }
}
```

### 3. **İlişkisel Veri Göçü**

#### Problem: Foreign Key Violations

```sql
-- SQL: Referenced tablodan önce dependent tablo göçürürse hata!
CREATE TABLE orders (id INT PRIMARY KEY);
CREATE TABLE order_items (
  id INT,
  order_id INT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

**Çözüm: Doğru Sıra ile Göçürme**
```javascript
async function migrateWithDependencies() {
  // Bağımlılığı olmayan tablolardan başla
  const tables = [
    'users',       // Hiçbir bağımlılık yok
    'categories',  // Hiçbir bağımlılık yok
    'posts',       // users'a bağlı
    'comments',    // posts'a bağlı
    'likes'        // posts ve users'a bağlı
  ];
  
  for (const table of tables) {
    console.log(`Migrating: ${table}`);
    await migrateTable(table);
  }
}
```

### 4. **Karakter Seti (Character Set) Sorunları**

#### Problem: UTF-8 Encoding Hataları

```sql
-- MySQL de farklı collation'lar
CREATE TABLE products (
  name VARCHAR(255) COLLATE utf8_general_ci
);
```

**Çözüm:**
```javascript
const iconv = require('iconv-lite');

async function migrateWithCharacterEncoding() {
  const records = await sqlDb.query('SELECT * FROM products');
  
  const converted = records.map(record => ({
    ...record,
    name: iconv.decode(
      Buffer.from(record.name, 'latin1'),
      'utf8'
    )
  }));
  
  await mongoDb.collection('products').insertMany(converted);
}
```

### 5. **Transaction ve ACID Garantileri**

#### Problem: Middleware Transaction'lar

```sql
-- SQL: Transaction garantisi
START TRANSACTION;
INSERT INTO orders ...;
INSERT INTO order_items ...;
COMMIT;
```

MongoDB da transaction'lar farklı çalışır.

**Çözüm: MongoDB Sessions**
```javascript
const session = db.startSession();
try {
  session.startTransaction();
  
  // 1. Order oluştur
  const order = await orders.insertOne({
    user_id: userId,
    total: 100,
    status: 'pending'
  }, { session });
  
  // 2. Order items ekle
  await order_items.insertMany([
    { order_id: order.insertedId, product_id: 1, qty: 2 },
    { order_id: order.insertedId, product_id: 2, qty: 1 }
  ], { session });
  
  // 3. Kullanıcı bakiyesini güncelle
  await users.updateOne(
    { _id: userId },
    { $inc: { balance: -100 } },
    { session }
  );
  
  await session.commitTransaction();
  console.log('Transaction başarılı');
} catch (error) {
  await session.abortTransaction();
  console.error('Transaction başarısız:', error);
  throw error;
} finally {
  await session.endSession();
}
```

### 6. **Eksik/NULL Veri Yönetimi**

#### Problem: NULL Değerlerin Saklanması

```javascript
// ❌ Yanlış: Tüm alanları depola
{ name: "Ahmet", phone: null, address: null }

// ✅ Doğru: NULL alanları omit et
{ name: "Ahmet" }
```

**Çözüm:**
```javascript
function cleanDocument(doc) {
  return Object.fromEntries(
    Object.entries(doc).filter(([_, v]) => v !== null && v !== undefined)
  );
}

const cleaned = records.map(cleanDocument);
```

### 7. **Duplicate Key Hatası**

#### Problem: Unique Constraint Violation

```javascript
// Idempotent migration için: 
// İkinci çalıştırmada duplicate key error

db.users.createIndex({ email: 1 }, { unique: true });

// İlk çalıştırma: Başarılı
db.users.insertOne({ email: "ahmet@example.com" });

// İkinci çalıştırma: E11000 duplicate key error
db.users.insertOne({ email: "ahmet@example.com" }); // Hata!
```

**Çözüm: Upsert Kullan**
```javascript
async function migrateIdempotent() {
  for (const user of users) {
    await db.collection('users').updateOne(
      { email: user.email },
      { $set: user },
      { upsert: true }
    );
  }
}
```

### 8. **Performance İçin Index Stratejisi**

#### Problem: Yavaş Sorgular

```javascript
// ❌ İndekssiz sorgu - yavaş
db.posts.find({ user_id: userId, created_at: { $gte: startDate } });
```

**Çözüm:** Composite Index
```javascript
// ✅ Hızlı sorgu
db.posts.createIndex({ 
  user_id: 1, 
  created_at: -1 
});

// Verify
db.posts.find({ 
  user_id: userId, 
  created_at: { $gte: startDate } 
}).explain("executionStats");
```

### 9. **Şema Evolüsyon (Schema Versioning)**

#### Problem: Schema Değişiklikleri Sırasında Hata

```javascript
// Eski ve yeni format birlikte olabilir
// Eski: { name: "Ahmet" }
// Yeni: { name: { first: "Ahmet", last: "Yılmaz" } }
```

**Çözüm: Backward Compatible Migration**
```javascript
async function upgradeSchema() {
  // Step 1: Yeni field'i add et (tüm docs'a)
  await db.collection('users').updateMany(
    { name_new: { $exists: false } },
    [{
      $set: {
        name_new: {
          first: { $arrayElemAt: [{ $split: ["$name", " "] }, 0] },
          last: { $arrayElemAt: [{ $split: ["$name", " "] }, 1] }
        }
      }
    }]
  );
  
  // Step 2: Old field'i sil
  await db.collection('users').updateMany(
    {},
    { $unset: { name: "" } }
  );
  
  // Step 3: Rename et
  await db.collection('users').updateMany(
    {},
    [{ $rename: { "name_new": "name" } }]
  );
}
```

### 10. **Logging ve Monitoring**

#### Problem: Hata İzlemesi Zor

**Çözüm: Detaylı Logging**
```javascript
const logger = require('winston');

const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'migration.log' }),
    new winston.transports.Console()
  ]
});

async function migrateTable(tableName) {
  try {
    logger.info(`Migration başlangıç: ${tableName}`);
    const startTime = Date.now();
    
    const records = await sqlDb.query(`SELECT * FROM ${tableName}`);
    logger.info(`${records.length} kayıt bulundu`);
    
    await mongoDb.collection(tableName).insertMany(records);
    
    const duration = Date.now() - startTime;
    logger.info(`Migration tamamlandı: ${tableName} (${duration}ms)`);
  } catch (error) {
    logger.error(`Migration başarısız: ${tableName}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```

---

## Çalıştırma Rehberi

### Gereksinimler

- Node.js 14+
- npm 6+
- MongoDB 4.4+
- MySQL 5.7+ veya MSSQL 2012+

### Kurulum

```bash
# 1. Projeyi klonla
git clone <repository-url>
cd migration-mongo-mysql

# 2. Bağımlılıkları yükle
npm install

# 3. .env dosyası oluştur
cp .env.example .env
```

### .env Konfigürasyonu

```env
# MongoDB Bağlantısı
MONGODB_URI=mongodb://localhost:27017/migration_db
MONGODB_USER=admin
MONGODB_PASSWORD=your_password

# MySQL Bağlantısı (Opsiyonel)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=source_db

# MSSQL Bağlantısı (Opsiyonel)
MSSQL_SERVER=localhost
MSSQL_USER=sa
MSSQL_PASSWORD=password
MSSQL_DATABASE=source_db

# Uygulama Ayarları
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### Başlangıç

```bash
# Production
npm start

# Development (Auto-reload)
npm run dev

# Swagger UI ile API explorer'ı aç:
# http://localhost:3000/api-docs
```

---

## API Endpoints

### 1. **Schema Discovery**

**Endpoint:** `POST /api/migration/discover`

**İstek:**
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

**Yanıt:**
```json
{
  "success": true,
  "dbType": "MySQL",
  "schema": {
    "tables": 15,
    "views": 3,
    "triggers": 5,
    "procedures": 2,
    "relationships": 20,
    "tableDetails": [
      {
        "name": "users",
        "columns": 8,
        "rows": 1000,
        "primaryKey": "id",
        "indexes": 3
      }
    ]
  }
}
```

### 2. **Verileri Göçür**

**Endpoint:** `POST /api/migration/migrate`

**İstek:**
```json
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "password",
  "database": "mydb",
  "dbType": "mysql",
  "mongoUri": "mongodb://localhost:27017/target_db"
}
```

**Yanıt:**
```json
{
  "success": true,
  "migrationId": "mig_12345",
  "status": "COMPLETED",
  "summary": {
    "totalTables": 15,
    "successfulTables": 14,
    "failedTables": 1,
    "totalRecords": 50000,
    "durationSeconds": 125,
    "report": {
      "successful": [...],
      "failed": [...],
      "skipped": [...]
    }
  }
}
```

### 3. **Göçü Durdur**

**Endpoint:** `POST /api/migration/cancel/:migrationId`

**Yanıt:**
```json
{
  "success": true,
  "message": "Migration cancelled",
  "migrationId": "mig_12345"
}
```

### 4. **Göçü Kontrol Et**

**Endpoint:** `GET /api/migration/status/:migrationId`

**Yanıt:**
```json
{
  "migrationId": "mig_12345",
  "status": "IN_PROGRESS",
  "progress": {
    "tablesProcessed": 8,
    "totalTables": 15,
    "percentComplete": 53,
    "recordsProcessed": 28500,
    "totalRecords": 50000
  }
}
```

### 5. **Raport Al**

**Endpoint:** `GET /api/migration/report/:migrationId`

**Yanıt:** (Bkz. Raporlama bölümü)

---

## Raporlama

Her migration işleminden sonra comprehensive bir raport oluşturulur ve `.migration_reports/` klasöründe saklanır.

### Raport Yapısı

```
MIGRATION_REPORT_[timestamp].json
├── summary
│   ├── sourceDatabase
│   ├── targetDatabase
│   ├── migrationStatus
│   └── statistics
├── schemaAnalysis
│   ├── tables
│   ├── columns
│   ├── indexes
│   └── relationships
├── migrationPlan
│   ├── transformations
├── results
│   ├── successful
│   ├── failed
│   └── skipped
├── recommendations
└── unmappableItems
    ├── triggers
    ├── procedures
    ├── functions
    └── checkConstraints
```

---

## Lisans

MIT

## Destek

Sorular için: [destek@example.com](mailto:destek@example.com)

---

**Dokümantasyon Sürümü:** 1.0  
**Son Güncelleme:** 30 Mayıs 2026

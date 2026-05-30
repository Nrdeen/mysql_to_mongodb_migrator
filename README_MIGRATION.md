# Database Migrator: MySQL/MSSQL - MongoDB

**🎯 Amaç**: MySQL veya MSSQL veritabanlarından MongoDB'ye tam analiz ve raporlama ile veritabanı şemalarını keşfetmek ve göçürmek için kapsamlı bir araç.

## 📋 Özet

Bu proje tam bir veritabanı göç çözümü sağlar:

1. **Keşfeder** - MySQL veya MSSQL'den tam veritabanı şemalarını
2. **Analiz Eder** - Şema yapısını analiz eder ve dönüştürülemeyen özellikleri tanımlar
3. **Planlama Yapar** - Optimal veri yapısı ile göç stratejisini planlar
4. **Verileri Göçürür** - Verileri güvenli ve idempotent şekilde MongoDB'ye taşır
5. **Raporlar** - Kapsamlı teknik dokümantasyon oluşturur
6. **Uyumluluğu Yönetir** - Uyumsuzlukları pratik çözümlerle giderir

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 16+
- npm veya yarn
- MongoDB Atlas veya yerel MongoDB örneği
- MySQL/MSSQL veritabanı (isteğe bağlı, test için)

### Kurulum

```bash
# Klonla ve kur
npm install
cp .env.example .env

# Veritabanlarını .env dosyasında yapılandır
# MONGODB_URI=mongodb+srv://...
# MYSQL_HOST=localhost, MYSQL_USER=root, vb.

# Sunucuyu başlat
npm run dev
```

**Sunucu çalışması**: `http://localhost:3000`

### API Dokümantasyon

İnteraktif API dokümantasyonuna erişin:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Sağlık Kontrolü**: `http://localhost:3000/health`

## 📚 Dokümantasyon

| Dokument | Amaç |
|----------|------|
| **[DOCUMENTATION.md](./DOCUMENTATION.md)** | Tam göç API referansı ve örnekler |
| **[schema.sql](./schema.sql)** | Test için örnek SQL şeması |
| **Swagger UI** | `/api-docs` adresinde interaktif API dokusu |

## 🔧 Temel Özellikler

### 1. Şema Keşfi
- Tüm tabloları, kolonları, indeksleri, constraint'leri otomatik keşfeder
- İlişkileri, trigger'ları, stored procedure'ları, fonksiyonları tanımlar
- İstatistik toplayıp (satır sayıları, veri boyutları)
- MySQL ve MSSQL ikisini de destekler

### 2. Veri Tipi Eşlemesi
SQL ve MongoDB tipleri arasında akıllı dönüşüm:
```
MySQL INT → MongoDB number
MySQL DATETIME → MongoDB date
MySQL VARCHAR → MongoDB string
MySQL JSON → MongoDB object
MySQL BLOB → MongoDB binary
```

### 3. Göç Planlama
- İyi MongoDB koleksiyonu yapısı oluşturur
- İndeks oluşturmayı planlar
- İlişki yönetimi stratejilerini tanımlar
- Dönüştürülemeyen özellikleri belgelendirerek

### 4. Güvenli Veri Göçü
- **İdempotent**: Veri tekrarlanmasız yeniden çalıştırılabilir
- **Batch İşleme**: Büyük veri setlerini verimli şekilde işler
- **Hata Kurtarma**: Kapsamlı hata işleme
- **İlerleme Takibi**: Göç durumunu gerçek zamanda izle

### 5. Kapsamlı Raporlama
Ayrıntılı teknik raporlar oluşturur:
- Şema analizi ve istatistikleri
- Göç planı detayları
- Alan eşlemeleri ve dönüşümleri
- Dönüştürülemeyen öğeler ve alternatifler
- Performance önerileri

## 🛣️ Göç İş Akışı

```
1. Bağlantı Testi
   ├─ Kaynak veritabanını doğrula
   └─ MongoDB bağlantısını doğrula
   
2. Şema Keşfi
   ├─ Tabloları ve kolonları analiz et
   ├─ İlişkileri tanımla
   ├─ Trigger'ları/procedure'ları bul
   └─ Şema özeti oluştur
   
3. Göç Planlama
   ├─ Tabloları koleksiyonlara eşle
   ├─ Alan adlarını dönüştür
   ├─ İndeksleri planla
   └─ Dönüştürülemeyen öğeleri belirle
   
4. Veri Göçürme
   ├─ Şema doğrulaması ile koleksiyonlar oluştur
   ├─ Tür dönüşümü ile veri aktar
   ├─ İndeksler oluştur
   └─ İlişkileri yönet
   
5. Rapor Oluştur
   ├─ Analiz ve istatistikler
   ├─ Öneriler
   ├─ Çözümlü dönüştürülemeyen öğeler
   └─ Performance metrikler
```

## 📡 API Endpoints'ler

### Şema Keşfi (Veri Değiştirmez)
```bash
POST /api/migration/discover
```

Verileri değiştirmeden tam şema analizi döndürür.

### Göçü Çalıştır
```bash
POST /api/migration/migrate
```

MySQL/MSSQL'den MongoDB'ye tam göçü yapıp bilgiye aktarır.

### Durumu Kontrol Et
```bash
GET /api/migration/status
```

Mevcut göç durumunu ve son rapor özetini döndürür.

### Tam Rapor Al
```bash
GET /api/migration/report
```

Son göçün ayrıntılı teknik raporunu alır.

### Bağlantı Testi
```bash
POST /api/migration/test-connection          # Kaynak veritabanını test et
POST /api/migration/test-mongodb             # MongoDB'yi test et
```

## 💡 Kullanım Örnekleri

### Örnek 1: Şema Keşfi

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

### Örnek 2: Tam Göçü Çalıştır

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
    "mongoUri": "mongodb+srv://kullanici:sifre@cluster.mongodb.net/test_migration"
  }'
```

### Örnek 3: Göç Raporunu Al

```bash
curl http://localhost:3000/api/migration/report
```

## 🔄 Desteklenen Veritabanı Türleri

| Veritabanı | Sürüm | Durum |
|----------|-------|-------|
| **MySQL** | 5.7+ | ✅ Desteklenir |
| **MSSQL** | 2019+ | ✅ Desteklenir |
| **MongoDB** | 4.0+ | ✅ Hedef |

## ⚠️ Dönüştürülemeyen Özellikler

Aşağıdaki SQL özellikleri manuel uygulama gerektirir:

### 1. **Trigger'lar** (SQL → Uygulama Mantığı)
- MongoDB Change Streams kullan
- Uygulama kodunda uygula (pre/post hooks)
- Node.js için Mongoose middleware kullan

### 2. **Stored Procedure'lar** (SQL → Node.js Fonksiyonları)
- Uygulama fonksiyonları olarak yeniden yaz
- MongoDB aggregation pipeline'larını kullan
- Özel microservice'ler oluştur

### 3. **Fonksiyonlar** (SQL → JavaScript)
- JavaScript fonksiyonlarına dönüştür
- Aggregation operatörlerini kullan
- API uç noktaları olarak uygula

### 4. **CHECK Constraint'ler** (SQL → Doğrulama)
- Uygulama katmanında uygula
- MongoDB JSON Schema doğrulaması kullan
- Joi/Yup doğrulaması ekle

**Detaylı çözümler ve kod örnekleri için [DOCUMENTATION.md](./DOCUMENTATION.md) dosyasını gör.**

## 📊 MongoDB Tasarım Desenleri

### 1. Bire-Çok İlişkileri
```javascript
// Gömme (alt öğe az ise)
{
  _id: 1,
  name: "Ahmet",
  addresses: [
    { street: "123 Main", city: "NYC" },
    { street: "456 Oak", city: "LA" }
  ]
}

// Referans (alt öğe çok ise)
{
  _id: 1,
  name: "Ahmet",
  addressIds: [ObjectId(...), ObjectId(...)]
}
```

### 2. Bileşik Anahtarlar
```javascript
// _id'de birden fazla alan kullan
{
  _id: {
    userId: 1,
    date: ISODate("2024-01-01")
  },
  data: {...}
}
```

### 3. İndekslenen Alanlar
MongoDB otomatik olarak indeks oluşturur:
- Birincil Anahtarlar (`_id`)
- Yabancı Anahtar Referansları
- Benzersiz Alanlar
- Sık Sorgulanan Alanlar

## 🔒 Güvenlik Özellikleri

- **Bağlantı Doğrulaması**: Göç öncesi veritabanı bağlantılarını test et
- **Veri Şifrelemesi**: SSL/TLS bağlantılarını destekle
- **Kimlik Bilgisi Yönetimi**: Güvenli şifre yönetimi (asla loglanmaz)
- **Oran Sınırlaması**: Göç uç noktalarının kötüye kullanılmasını engelle
- **JWT Kimlik Doğrulaması**: Hassas uç noktaları koru

## 🎯 Yapılandırma

### Ortam Değişkenleri (.env)

```env
# Sunucu
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/test_migration

# MySQL (test için)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=test_db

# Güvenlik
JWT_SECRET=your_complex_secret_key
BCRYPT_ROUNDS=10
```

## 📈 Performance İyileştirme

1. **Batch İşleme**: Veri optimize edilmiş batch'lerle aktarılır
2. **Bağlantı Havuzu**: Veritabanı bağlantıları verimli şekilde yeniden kullanılır
3. **İndeks Oluşturma**: İndeks oluşturma stratejisi optimize edilmiştir
4. **Veri Doğrulaması**: Yerleşik şema doğrulaması
5. **İzleme**: Performance analizi için detaylı günlükleme

## 🐛 Sorun Giderme

### Bağlantı Sorunları
```bash
# Kaynak veritabanı bağlantısını test et
POST /api/migration/test-connection

# MongoDB bağlantısını test et
POST /api/migration/test-mongodb
```

### Büyük Veri Kümesi Göçü
- `.env` dosyasında bağlantı havuzu boyutunu artır
- Göçü yoğun olmayan saatlerde çalıştır
- MongoDB CPU ve hafıza kullanımını izle
- Kısmi göç yapmayı düşün (tablo tablo)

### Veri Tipi Sorunları
- Göç raporunda tür eşlemelerini gözden geçir
- Kaynak ile MongoDB'deki dönüştürülen verileri kontrol et
- Gerekirse özel dönüşüm uygula

## 📋 Proje Yapısı

```
.
├── src/
│   ├── services/
│   │   ├── discovery/          # Şema keşfi modülleri
│   │   │   ├── MySQLSchemaDiscovery.js
│   │   │   └── MSSQLSchemaDiscovery.js
│   │   └── migration/          # Göç motoru
│   │       ├── MigrationEngine.js
│   │       └── MigrationReport.js
│   ├── routes/
│   │   └── migration.routes.js # API uç noktaları
│   ├── config/                 # Yapılandırma dosyaları
│   └── utils/                  # Yardımcı Programlar (logging, vb.)
├── DOCUMENTATION.md            # Tam göç dokümantasyonu
├── schema.sql                  # Test için örnek şema
└── .env.example                # Ortam yapılandırma şablonu
```

## 🎬 Sonraki Adımlar

1. **MongoDB Bağlantısını Yapılandır**
   - `.env`'e MONGODB_URI ekle
   - Bağlantı kimlik bilgilerinin doğru olduğundan emin ol

2. **Örnek Veri ile Test Et**
   - `schema.sql`'i MySQL veritabanına içe aktar
   - Şemayı analiz etmek için keşif uç noktasını kullan
   - MongoDB'ye göçü yürüt

3. **Göç Raporunu İnceле**
   - Oluşturulan raporu analiz et
   - Dönüştürülemeyen özellikleri gözden geçir
   - Uygulama seviyesi çözümleri uygula

4. **Uygulamayı Güncelle**
   - Bağlantı dizelerini MongoDB'ye güncelle
   - Uygulama kodunu MongoDB sürücülerini kullanmak üzere migre et
   - Tüm veritabanı işlemlerini test et

5. **İzle ve Optimize Et**
   - Sorgu performansı kontrol et
   - İndeks kullanımını gözden geçir
   - Erişim desenleri tabanlı optimize et

## 📞 Destek

Detaylı bilgi için:
- **API Dokümantasyonu**: [DOCUMENTATION.md](./DOCUMENTATION.md) dosyasına bakın
- **Swagger UI**: `http://localhost:3000/api-docs` adresinde erişin
- **Günlükler**: Ayrıntılı göç günlükleri için konsol çıktısını kontrol edin
- **Raporlar**: Oluşturulan göç raporlarını gözden geçirin

## 📄 Lisans

MIT Lisansı - Detaylar için LICENSE dosyasına bakın

## 🔗 Faydalı Kaynaklar

- [MongoDB Resmi Dokümanları](https://docs.mongodb.com/)
- [MongoDB Şema Doğrulaması](https://docs.mongodb.com/manual/core/schema-validation/)
- [MongoDB Değişim Akışları](https://docs.mongodb.com/manual/changeStreams/)
- [MySQL Dokümantasyonu](https://dev.mysql.com/doc/)
- [MSSQL Dokümantasyonu](https://docs.microsoft.com/sql/)

---

**Son Güncelleme**: Mayıs 2026  
**Sürüm**: 1.0.0

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

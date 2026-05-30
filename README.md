# Database Migrator — MySQL/MSSQL → MongoDB

**🎯 Amaç**: MySQL ve MSSQL veritabanlarını MongoDB'ye otomatik olarak göçürmek için kapsamlı bir araç.

> ⭐ **İLK DEFA MI KULLANIYORSUNUZ?** [DOCUMENTATION.md](DOCUMENTATION.md) dosyasını okuyun - Detaylı teknik rehber
> 
> 🚀 **HIZLI BAŞLANGAÇ**: Aşağıda 3 komutu çalıştırın

## ⚡ Hızlı Başlangıç (3 Komut)

```bash
npm install          # Bağımlılıkları yükle
cp .env.example .env # Ayar dosyası oluştur
npm run dev          # Sunucuyu başlat
```

**Sunucu Adresler:**
- **Swagger API Dokusu**: `http://localhost:3000/api-docs` ⭐ **Buradan başla**
- **Web Arayüzü**: `http://localhost:3000/ui`
- **Sağlık Kontrolü**: `http://localhost:3000/health`

## 📋 Sistem Özeti

Bu sistem aşağıdaki görevleri otomatik olarak yapar:

✅ **Şema Keşfi** - Tüm tabloları, kolonları, ilişkileri, indeksleri ve constraint'leri tespit eder  
✅ **Veri Analizi** - MongoDB'ye dönüştürülebilir ve dönüştürülemeyen yapıları belirler  
✅ **Otomatik Göçürme** - Verileri güvenli ve tekrarlanabilir şekilde MongoDB'ye aktarır  
✅ **Detaylı Raporlama** - Tüm işlemleri ve önerileri teknik rapor olarak sunar  

## 📖 Dokümantasyon

Lütfen aşağıdaki sırada okuyun:

1. **[DOCUMENTATION.md](DOCUMENTATION.md)** ← **Ana Teknik Dokümantasyon** (Tüm detaylar burada)
   - Veritabanı Keşif Süreci
   - Tespit Edilen Nesnelerin Listesi
   - MongoDB Veri Modeli
   - Dönüştürülen Yapılar
   - Dönüştürülemeyen Yapılar ve Çözüm Önerileri
   - Karşılaşılan Problemler ve Çözümleri

2. **Swagger UI**: `http://localhost:3000/api-docs` ← İnteraktif API Dokusu

## 🎯 Temel Özellikler

### 1. **Şema Keşfi**
- MySQL/MSSQL'den tüm tabloları, kolonları otomatik tespit
- Birincil anahtar, yabancı anahtar, unique constraint'ler
- İndeksler, trigger'ler, stored procedure'ları tespit
- Satır sayıları ve veri boyutları

### 2. **Akıllı Veri Tipi Dönüşümü**

| SQL Tipi | MongoDB Tipi |
|----------|--------------|
| INT, BIGINT | Number |
| DECIMAL, FLOAT | Number / Decimal128 |
| VARCHAR, TEXT | String |
| DATE, DATETIME | Date |
| BOOLEAN | Boolean |
| JSON | Object |
| BLOB | Binary |

### 3. **İlişki Yönetimi**
- Bire-çok ilişkiler: Embedding
- Çok-çok ilişkiler: Referencing
- Yabancı Anahtar: MongoDB referansları

### 4. **Güvenli Veri Migrasyon**
- **İdempotent**: Birden çalıştırılabilir (duplicate yok)
- **Batch İşlemi**: Büyük veritabanları için hafiza yönetimi
- **Hata Kurtarma**: Kapsamlı hata işleme
- **Kontrol Noktaları**: Göçü gerçek zamanda izle

### 5. **Kapsamlı Raporlar**
Her göç sonunda:
- Şema analizi
- Dönüştürülen ve dönüştürülemeyen yapılar
- Çözüm önerileri
- Performance tavsiyeleri

## 🛣️ Göç Süreci

```
1. Bağlantı Testi
   ├─ Kaynak SQL veritabanını kontrol et
   └─ MongoDB'ye bağlan

2. Şema Keşfi
   ├─ Tüm tabloları listele
   ├─ Kolonları ve tipleri tespit et
   ├─ İlişkileri harita
   └─ İstatistik toplay

3. Dönüştürme Planı
   ├─ MongoDB koleksiyonlarını tasarla
   ├─ İndeks stratejisini belirle
   ├─ İlişki modelini seç
   └─ Dönüştürülemeyen yapıları rapor et

4. Veri Göçürme
   ├─ Collections oluştur
   ├─ Verileri batch'ler halinde aktar
   ├─ İlişkiler ve referansları kur
   └─ İndeksler oluştur

5. Rapor Oluştur
   ├─ Teknik rapor yaz
   ├─ Başarı/başarısızlıkları belge
   └─ Öneriler sun
```

## 🔌 API Endpoints

### 1. Şema Keşfi
```
POST /api/migration/discover

İstek:
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "şifre",
  "database": "mydb",
  "dbType": "mysql"  // "mysql" veya "mssql"
}

Yanıt:
{
  "success": true,
  "schema": {
    "tables": 15,
    "columns": 120,
    "relationships": 20,
    // ...
  }
}
```

### 2. Veri Göçürme
```
POST /api/migration/migrate

İstek:
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "şifre",
  "database": "mydb",
  "dbType": "mysql",
  "mongoUri": "mongodb://localhost:27017/target"
}
```

### 3. Göç Durumu
```
GET /api/migration/status/:migrationId

Yanıt: Ilerleme yüzdesi, işlenen tablo sayısı, hata bilgileri
```

### 4. Rapor İndir
```
GET /api/migration/report/:migrationId

Yanıt: Detaylı teknik rapor (JSON)
```

## 📁 Proje Yapısı

```
.
├── src/
│   ├── app.js                    # Ana uygulama
│   ├── config/
│   │   ├── env.js               # Çevre değişkenleri
│   │   └── database.js          # Veritabanı bağlantı
│   ├── routes/
│   │   └── migration.routes.js   # Migration API'ları
│   ├── services/
│   │   ├── migration/
│   │   │   ├── MigrationEngine.js      # Göç motor
│   │   │   ├── MigrationReport.js      # Rapor oluşturucu
│   │   │   └── ...
│   │   └── discovery/
│   │       ├── MySQLSchemaDiscovery.js # MySQL keşfi
│   │       └── MSSQLSchemaDiscovery.js # MSSQL keşfi
│   └── utils/
│       └── logger.js             # Hata günlükleme
├── public/
│   ├── index.html               # Web arayüzü
│   └── app.js                   # Frontend kodu
├── docs/
│   └── openapi.js               # Swagger şeması
├── .env.example                 # Örnek ayar dosyası
├── package.json
├── DOCUMENTATION.md             # ← ANA DOKÜMENTASYON
└── README.md                    # Bu dosya
```

## ⚙️ Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Ayar Dosyası Oluştur

```bash
cp .env.example .env
```

`.env` dosyasını açıp bağlantı bilgilerini gir:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/migration

# MySQL (Opsiyonel)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=şifre

# MSSQL (Opsiyonel)
MSSQL_SERVER=localhost
MSSQL_USER=sa
MSSQL_PASSWORD=şifre

# Uygulama
PORT=3000
LOG_LEVEL=info
```

### 3. Testi Çalıştır

```bash
npm test
```

### 4. Sunucuyu Başlat

```bash
# Development (Otomatik yeniden başlatma)
npm run dev

# Production
npm start
```

Server `http://localhost:3000` adresinde çalışacaktır.

## 🎯 İlk Kullanım Örneği

### Adım 1: Swagger UI'ı Aç
```
http://localhost:3000/api-docs
```

### Adım 2: Şema Keşfi Yap
`POST /api/migration/discover` endpoint'ini çalıştır:
```json
{
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "password",
  "database": "müşteri_db",
  "dbType": "mysql"
}
```

### Adım 3: Sonuçları Gözden Geçir
Yanıtı inceleyerek tespit edilen nesneleri gör

### Adım 4: Göçürmeyi Başlat
`POST /api/migration/migrate` endpoint'i ile veri aktarımını başlat

### Adım 5: Raporu İndir
`GET /api/migration/report/:migrationId` ile detaylı teknik raporu indir

## 📊 Desteklenen Veritabanı Nesneleri

| Nesne | Tespit | MongoDB'ye | Açıklama |
|-------|--------|-----------|---------|
| Tablolar | ✅ | ✅ | Collections olarak |
| Kolonlar | ✅ | ✅ | Alanlar olarak |
| Birincil Anahtar | ✅ | ✅ | `_id` olarak |
| Yabancı Anahtar | ✅ | ✅ | Referanslar |
| İndeksler | ✅ | ✅ | MongoDB indeksler |
| Unique Constraint | ✅ | ✅ | Unique indeksler |
| NOT NULL | ✅ | ✅ | Şema doğrulaması |
| CHECK Constraint | ✅ | ⚠️ | Uygulama katmanı |
| Trigger'ler | ✅ | ⚠️ | Change Streams |
| Stored Procedure'lar | ✅ | ⚠️ | Aggregation Pipeline |

## 🔍 Sorun Giderme

### Bağlantı Hatası
```
Error: connect ECONNREFUSED
```
**Çözüm:** `.env` dosyasındaki veritabanı adresini ve portunu kontrol edin

### Out of Memory
```
ERROR: JavaScript heap out of memory
```
**Çözüm:** `npm start` yerine batch işleme kullan (otomatik)

### Duplicate Key Error
```
E11000 duplicate key error
```
**Çözüm:** Göçü yeniden çalıştır (idempotent - otomatik detektlenecek)

## 📞 Destek

- **Teknik Sorular**: [DOCUMENTATION.md](DOCUMENTATION.md) dosyasını kontrol et
- **API Sorguları**: Swagger UI'ı aç (`/api-docs`)
- **Hataları Rapor Et**: `logs/` klasöründeki log dosyalarını kontrol et

## 📄 Lisans

MIT

---

**Son Güncelleme:** 30 Mayıs 2026  
**Sürüm:** 1.0.0

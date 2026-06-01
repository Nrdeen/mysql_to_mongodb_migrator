# MySQL/MSSQL'den MongoDB'ye Geçiş Aracı

ASM523 İleri Veritabanı Yönetim Sistemleri dersinin final projesi.

**Adı Soyadı:** Nrdeen Anber  
**Öğrenci Numarası:** 25619824009

## Proje Bağlantıları

**Tanıtım videosu:** https://drive.google.com/file/d/1sp5GTBJwkxepWOmK3R5nnV_9gwnFOjRG/view?usp=sharing

**Teknik analiz raporu:** [25619824009_NrdeenAnber_DatabaseMigrator_ProjeRaporu.pdf](25619824009_NrdeenAnber_DatabaseMigrator_ProjeRaporu.pdf)

## Projenin Amacı ve Neleri Kapsıyor

Bu proje final ödevinin istediklerine göre yaptılmıştır. Proje şunları yapıyor:

1. Sadece bağlantı adresi (connection string) vererek MySQL ya da MSSQL veritabanlarına bağlanabiliyor.
2. Veritabanının yapısını (şemasını) kendisi buluyor, otomatik olarak anlıyor.
3. Veritabanındaki her şeyi otomatik tanıyor: tabloları, sütunları, veri tiplerini, anahtar ve yabancı anahtarları, indeksleri, kısıtlamaları, tetikleyicileri ve saklı yordamları.
4. Dönüştürebildiği yapıları ve tüm verileri, hiçbir şey kaybolmadan MongoDB'ye aktarıyor.
5. Verileri aktarırken, aynı işlemi tekrar çalıştırsanız bile sorun çıkarmayacak şekilde çalışıyor (idempotent). Ayrıca, işlem sırasında bir hata olursa bunu kaydediyor (logluyor).

## Nasıl Kurulur ve Çalıştırılır

1. Önce gereken şeyleri yükleyin:
```bash
npm install
```

2. Sonra uygulamayı başlatın:
```bash
npm start
```

3. Uygulamanın web sayfasını görmek için tarayıcınızdan şu adrese gidin:
```
http://localhost:3000/ui
```

## Neler Dönüştürüldü, Neler Dönüştürülemedi

### Dönüştürülenler

Tablolar (MongoDB'de 'Collection' oluyor), kayıtlar (MongoDB'de 'Document' oluyor), anahtar (Primary Key, MongoDB'de '_id' oluyor), yabancı anahtar (Foreign Key, referans olarak geçiyor), indeksler ve temel veri tipleri sorunsuz bir şekilde MongoDB yapısına uygun hale getirildi ve oraya taşındı.

### Dönüştürülemeyenler ve Sebepleri

Tetikleyiciler (Trigger'lar), saklı yordamlar/fonksiyonlar (Stored Procedure/Function) ve kontrol kısıtlamaları (CHECK Constraint) MongoDB'de doğrudan olmadığı için bunlar taşınmadı. Bu yapıların neden dönüştürülemediği ve bunları program katmanında (Application Layer) nasıl halledebileceğimizle ilgili teknik detaylar ve çözüm önerileri raporun içinde daha ayrıntılı anlatılıyor.

---

**Lisans:** MIT  
**Sürüm:** 1.0.0



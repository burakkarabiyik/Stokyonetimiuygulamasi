# Sunucu Envanteri Yönetim Sistemi

Bu proje, birden fazla lokasyonda bulunan sunucuların takibi, izlenmesi ve yönetilmesi için tasarlanmış kapsamlı bir envanter yönetim sistemidir.

## Özellikler

- Sunucuların konum bazlı envanterini tutma
- Sunucu durum takibi (Pasif, Kurulum, Gönderilebilir, Transit, Sahada)
- Sunucu detay bilgilerini saklama (IP, kullanıcı adı, şifre)
- Birden fazla sanal makine bilgisi girilebilme
- Lokasyonlar arası sunucu transferi yapabilme
- Sunucular için not ekleme ve düzenleme
- Kullanıcı yönetimi (Admin ve normal kullanıcı rolleri)
- Kapsamlı raporlama ve aktivite takibi

## Teknik Özellikler

- **Frontend**: React.js, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js
- **Veritabanı**: PostgreSQL, Drizzle ORM
- **Kimlik Doğrulama**: JWT tabanlı kullanıcı yetkilendirme
- **Dağıtım**: Docker containerization
- **Güvenlik**: Kod şifreleme (obfuscation) ve güvenli bağlantılar

## Başlarken

### Gereksinimler

- Node.js 18+ veya Docker
- PostgreSQL veritabanı (veya Docker ile otomatik kurulum)

### Kurulum

#### Docker ile Kurulum (Önerilen)

1. Güvenli derleme betiğini çalıştırarak Docker dosyalarını oluşturun:

```bash
node build-secure.cjs
```

2. Docker Compose ile tüm hizmetleri başlatın:

```bash
docker-compose -f docker-compose.yml.new up -d
```

#### Manuel Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Veritabanını oluşturun:

```bash
npm run db:push
```

3. Uygulamayı başlatın:

```bash
npm run dev
```

### Tarayıcıdan Erişim

Uygulama varsayılan olarak aşağıdaki adreste çalışacaktır:

```
http://localhost:5000
```

İlk giriş için varsayılan admin bilgileri:
- Kullanıcı adı: admin
- Şifre: admin123

> **Not**: İlk giriş sonrası güvenlik için şifrenizi değiştirin!

## Kullanım Kılavuzu

### Sunucu Yaşam Döngüsü

Sunucular sistemimizde aşağıdaki statülerde bulunabilir:

1. **Pasif**: Henüz kuruluma alınmamış, envantere yeni eklenen sunucular
2. **Kurulum**: Kurulum aşamasında olan sunucular
3. **Gönderilebilir**: Kurulumu tamamlanmış, gönderime hazır sunucular
4. **Transit**: Bir lokasyondan diğerine transfer halindeki sunucular
5. **Sahada**: Aktif olarak kullanımda olan sunucular

### Sunucu Yönetimi

1. **Yeni Sunucu Ekleme**: "Yeni Sunucu Ekle" butonu ile envantere yeni sunucu ekleyebilirsiniz.
2. **Sunucu Detayları**: Sunucu listesinden bir sunucuya tıklayarak detaylarını görüntüleyebilirsiniz.
3. **Sunucu Düzenleme**: Detay sayfasında "Düzenle" butonu ile sunucu bilgilerini güncelleyebilirsiniz.
4. **Sanal Makine Yönetimi**: Sunucu detay sayfasında sanal makine bilgilerini ekleyebilir ve düzenleyebilirsiniz.
5. **Not Ekleme**: Sunucu detay sayfasında notlar ekleyebilir ve düzenleyebilirsiniz.

### Sunucu Transferi

1. Transfer işlemi için sunucu detay sayfasında "Transfer Et" butonunu kullanın.
2. Hedef lokasyonu seçin ve isteğe bağlı olarak transfer notu ekleyin.
3. Transfer işlemi gerçekleştiğinde sunucunun durumu otomatik olarak "Transit" olarak güncellenecektir.

## Güvenlik Özellikleri

- JWT bazlı kimlik doğrulama
- Rol tabanlı yetkilendirme (admin/kullanıcı)
- Şifreli saklanan hassas veriler
- Kod şifreleme koruması
- Docker güvenlik ayarları

## Önerilen Sistem Gereksinimleri

- **Docker ile**: 1 GB RAM, 1 CPU Çekirdeği
- **Manuel Kurulum**: Node.js 18+, 2 GB RAM
- **Depolama**: En az 1GB boş disk alanı
- **Tarayıcı**: Chrome, Firefox, Safari veya Edge (güncel sürümler)

## Daha Fazla Bilgi

Daha detaylı dağıtım ve yapılandırma bilgisi için lütfen aşağıdaki belgelere bakın:

- [Docker ile Dağıtım](README-DOCKER.md)
- [Kod Şifreleme Bilgileri](README-OBFUSCATION.md)

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
# Docker ile Sunucu Envanteri Uygulama Dağıtımı

Bu belgede, Sunucu Envanteri uygulamasının Docker kullanarak nasıl dağıtılacağı açıklanmaktadır.

## Docker İmaj Boyutunu Optimize Etme

Uygulamamızı Docker ile dağıtırken imaj boyutunu minimize etmek için aşağıdaki stratejileri uyguladık:

1. **Çok Aşamalı (Multi-stage) Build**: Derleme ve çalıştırma aşamalarını ayırarak sadece gerekli dosyaların final imaja kopyalanmasını sağlar.

2. **Alpine Tabanlı İmajlar**: Standart Node.js imajları yerine çok daha küçük olan alpine tabanlı imajları kullanır.

3. **Gereksiz Dosyaları Temizleme**: Node modülleri içindeki gereksiz dosyaları (*.md, *.d.ts, *.map) temizleyerek boyutu küçültür.

4. **Katman Optimizasyonu**: Docker katmanlarını optimize ederek değişmeyen bileşenlerin önbelleğe alınmasını sağlar.

5. **Sıkıştırma ve Performans Ayarları**: Node.js uygulamasını optimize flag'leri ile çalıştırarak bellek kullanımını ve performansı iyileştirir.

## Yeni Docker Yapılandırması

Değişikliklerimizle aşağıdaki optimizasyonlar sağlanmıştır:

- **Güvenli Yapı**: Kod şifreleme (obfuscation) ve güvenlik önlemleri
- **Düşük Kaynak Kullanımı**: Düşük bellek ve CPU kullanımı için optimizasyonlar
- **Hızlı Başlatma**: Veritabanı bağlantı kontrolleri ve hızlı başlatma süreci
- **Sağlık Kontrolleri**: Uygulama ve veritabanı için sağlık kontrolleri

## Dağıtım Adımları

1. Önce güvenli yapıyı oluşturun:

```bash
node build-secure.js
```

Bu komut:
- Frontend ve backend kodlarını şifreleyecek
- Optimize edilmiş Dockerfile.secure dosyasını oluşturacak
- Yapılandırılmış docker-compose.yml.new dosyasını oluşturacak
- Docker başlatma betiğini (docker-entrypoint.sh) oluşturacak

2. Docker ile uygulamayı başlatın:

```bash
docker-compose -f docker-compose.yml.new up -d
```

Bu komut, uygulamayı ve PostgreSQL veritabanını başlatacaktır.

3. Tarayıcınızdan uygulamaya erişin:

```
http://localhost:5000
```

## Kaynak Limitleri

Docker Compose yapılandırmasında, uygulamanın kaynak kullanımı sınırlandırılmıştır:

- **Uygulama**: 0.5 CPU, 500MB RAM
- **Veritabanı**: 0.3 CPU, 300MB RAM

Bu değerleri ihtiyaçlarınıza göre `docker-compose.yml.new` dosyasından ayarlayabilirsiniz.

## Sağlık Kontrolleri

Docker Compose içinde, her iki servis için sağlık kontrolleri yapılandırılmıştır:

- **Uygulama**: /health endpoint'ine HTTP isteği gönderir
- **Veritabanı**: pg_isready komutu ile PostgreSQL hazır olup olmadığını kontrol eder

## Sorun Giderme

Herhangi bir sorunla karşılaşırsanız aşağıdaki komutları kullanabilirsiniz:

```bash
# Logları kontrol etmek için
docker-compose -f docker-compose.yml.new logs

# Sadece uygulama loglarını takip etmek için
docker-compose -f docker-compose.yml.new logs -f app

# Servisleri yeniden başlatmak için
docker-compose -f docker-compose.yml.new restart
```

## Önemli Notlar

- PostgreSQL veritabanı verileri `postgres_data` adlı bir Docker volume'ünde saklanır. Bu verilerinizin container silinse bile korunmasını sağlar.
- Veritabanı şifresi gibi hassas bilgileri üretim ortamında değiştirmeyi unutmayın.
- PostgreSQL bağlantı bilgileri için varsayılan değerler: kullanıcı = postgres, şifre = postgres, veritabanı = serverdb
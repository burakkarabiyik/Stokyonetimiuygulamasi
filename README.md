# Sunucu Envanter Yönetim Sistemi

Bu proje, sunucu envanteri ve depo yönetimi için geliştirilmiş kapsamlı bir web uygulamasıdır. Sistem, farklı depolardaki sunucuları takip etmeyi, sunucuları ekleyip çıkarmayı, konumlar arasında transfer etmeyi, detaylı notlar eklemeyi ve sunucu bilgilerini (IP'ler, şifreler) yönetmeyi sağlar.

## Özellikler

- Kullanıcı yetkilendirme sistemi (Yönetici/Kullanıcı rolleri)
- Sunucu yaşam döngüsü takibi (Pasif -> Kurulum -> Gönderilebilir -> Aktif)
- Sunucu konumları arasında transfer yönetimi
- Detaylı not ekleme ve görüntüleme
- Sunucu modelleri yönetimi
- Görsel raporlama ve istatistikler
- Toplu sunucu ekleme özelliği
- Responsive ve modern kullanıcı arayüzü

## Teknolojiler

- Frontend: React.js, TypeScript, Tailwind CSS, Shadcn/UI
- Backend: Node.js, Express.js, TypeScript
- Veritabanı: PostgreSQL, Drizzle ORM
- Containerization: Docker ve Docker Compose

## Kurulum

### Docker ile Kurulum

1. Örnek çevre değişkenleri dosyasını kopyalayın ve düzenleyin:
   ```bash
   cp .env.example .env
   ```

2. Docker ile başlatın:
   ```bash
   docker-compose up -d
   ```

3. Tarayıcınızda aşağıdaki adresi açın:
   ```
   http://localhost:5000
   ```

### Geliştirme için Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Geliştirme modunda başlatın:
   ```bash
   npm run dev
   ```

## Kullanım

### Varsayılan Yönetici Hesabı

Sistem ilk başlatıldığında, varsayılan bir yönetici hesabı oluşturulur:

- Kullanıcı adı: admin
- Şifre: admin123

**Önemli:** Güvenlik açısından, sistemi canlı ortama geçirdiğinizde bu şifreyi değiştirmeyi unutmayın.
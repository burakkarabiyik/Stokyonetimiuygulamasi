# Sunucu Envanter Yönetim Sistemi

Bu proje, farklı konumlardaki sunucuların envanterini yönetmek, durumlarını takip etmek ve bilgilerini düzenlemek için geliştirilmiş kapsamlı bir web uygulamasıdır.

## Özellikler

- **Sunucu Takibi**: Farklı lokasyonlardaki sunucuları ekleyin, düzenleyin ve takip edin
- **Sunucu Detayları**: Her sunucu için IP, kullanıcı adı, şifre gibi kritik bilgileri saklayın
- **Durum Yönetimi**: Sunucuların durumunu izleyin (Pasif, Kurulum, Gönderilebilir, Sahada vb.)
- **Transfer İşlemleri**: Sunucuları lokasyonlar arasında transfer edin ve geçmişini izleyin
- **Not Sistemi**: Sunuculara notlar ekleyin ve değiştirin
- **Çoklu Sanal Makine Desteği**: Her fiziksel sunucu için birden fazla sanal makine bilgisi ekleyin
- **Admin Paneli**: Kullanıcı ve rol yönetimi yapın
- **Raporlama**: Sunucu durumları ve dağılımı hakkında detaylı raporlar alın
## Kurulum

### Docker ile Kurulum

Docker kullanmak istiyorsanız, sadece docker-compose komutunu çalıştırmanız yeterlidir.

Uygulama varsayılan olarak http://localhost:5000 adresinde çalışacaktır.

## Kod Şifreleme (Obfuscation)

Üretim ortamı için kodları şifrelemek isterseniz build-secure.js dosyasını çalıştırın.

Veya Docker ile güvenli imajı kullanın.

Daha fazla bilgi için [Şifreleme Kılavuzu](README-OBFUSCATION.md) dosyasına bakabilirsiniz.

## Kullanım

### İlk Giriş

Sistem ilk çalıştırıldığında otomatik olarak bir admin kullanıcısı oluşturulur:

- Kullanıcı adı: `admin`
- Şifre: `admin123`

İlk girişten sonra güvenlik için bu şifreyi değiştirmeniz önerilir.

### Sunucu Yaşam Döngüsü

1. **Pasif**: Yeni eklenen sunucular bu durumdadır
2. **Kurulum**: Sunucu kurulum aşamasındadır, IP bilgileri girilebilir
3. **Gönderilebilir**: Kurulumu tamamlanan ve sevkiyata hazır sunucular
4. **Sahada**: Lokasyona teslim edilmiş aktif sunucular

## Lisans

Bu proje [MIT lisansı](LICENSE) altında lisanslanmıştır.

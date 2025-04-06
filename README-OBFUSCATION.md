# Sunucu Envanter Sistemi - Kod Şifreleme (Obfuscation) Kılavuzu

Bu kılavuz, Sunucu Envanter Sistemi kodlarını nasıl şifreleyeceğinizi ve üretim ortamı için güvenli bir dağıtım hazırlayacağınızı açıklar.

## Kod Şifrelemenin Amacı

Kod şifreleme (obfuscation), kaynak kodunu analiz edilmesi zor, karmaşık ve anlaşılmaz hale getirme işlemidir. Bu, aşağıdaki avantajları sağlar:

- **Fikri Mülkiyet Koruması**: Özel algoritmaları ve iş mantığını korur
- **Güvenlik Artışı**: Güvenlik açıklarını ve zayıf noktaları tespit etmeyi zorlaştırır
- **Tersine Mühendisliği Engelleme**: Kodun işleyişini analiz etmeyi ve yeniden oluşturmayı zorlaştırır
- **Lisanssız Kullanımı Caydırma**: Yazılımın yetkisiz kopyalanmasını ve dağıtılmasını engeller

## Şifreleme Özellikleri

Bu projede kullanılan şifreleme stratejisi şunları içerir:

1. **Kontrol Akışı Düzleştirme**: Kodun akış yapısını karmaşıklaştırır
2. **Ölü Kod Enjeksiyonu**: İşlevsel olmayan, yanıltıcı kod parçaları ekler
3. **Hata Ayıklama Koruması**: Hata ayıklayıcıların çalışmasını engeller
4. **İsim Değiştirme**: Değişken ve fonksiyon isimlerini anlamsız ifadelerle değiştirir
5. **Dize Şifreleme**: Kod içindeki metin dizilerini şifreler ve dinamik olarak çözümler
6. **Kendini Koruma**: Şifreli kodun manipüle edilmesini algılar ve engeller
7. **Unicode Dönüşümü**: Karakterleri unicode escape sequences olarak kodlar

## Şifreleme Araçları

Projede JavaScript şifrelemesi için aşağıdaki araçlar kullanılmaktadır:

- **javascript-obfuscator**: Ana JavaScript şifreleme motorudur
- **obfuscate.js**: Frontend kodlarını şifreler (client/dist içindeki JS dosyaları)
- **obfuscate-backend.js**: Backend kodlarını şifreler (dist klasöründeki JS dosyaları)
- **build-secure.js**: Tam bir güvenli derleme süreci yürütür

## Güvenli Dağıtım Oluşturma

Güvenli bir dağıtım oluşturmak için aşağıdaki adımları izleyin:

### 1. Proje Derleme ve Şifreleme

Aşağıdaki komutları sırasıyla çalıştırın:

```bash
# 1. Önce normal derleme yapın
npm run build

# 2. Frontend JS dosyalarını şifreleyin
node obfuscate.js

# 3. Backend JS dosyalarını şifreleyin
node obfuscate-backend.js
```

Ya da tüm süreci tek bir komutla çalıştırabilirsiniz:

```bash
node build-secure.js
```

### 2. Dağıtım Paketi Oluşturma

Şifreleme işlemi tamamlandıktan sonra, `dist` klasörü şifrelenmiş kodları içerecektir. Bu klasörü dağıtım ortamınıza kopyalayabilirsiniz. Docker kullanıyorsanız, Dockerfile'ınızı bu şifreleme süreci ile uyumlu hale getirmeniz önerilir.

## Şifreleme Seviyesini Ayarlama

Şifreleme seviyesini değiştirmek için `obfuscate.js` ve `obfuscate-backend.js` dosyalarındaki `obfuscatorOptions` nesnesini düzenleyebilirsiniz. Önemli parametreler:

- **controlFlowFlatteningThreshold**: (0-1) Kontrol akışı düzleştirmesinin yoğunluğu
- **deadCodeInjectionThreshold**: (0-1) Eklenen ölü kod miktarı
- **stringArrayThreshold**: (0-1) Şifrelenecek dize miktarı
- **selfDefending**: (true/false) Kodun kendini koruması
- **identifierNamesGenerator**: İsimlendirme stratejisi ('hexadecimal', 'mangled' vb.)

## Notlar ve Uyarılar

- Şifreleme, kodun çalışma hızını biraz yavaşlatabilir
- Şifreleme seviyesi arttıkça dosya boyutu büyüyebilir
- Şifrelenmiş kodu debugging yapmak çok zordur, bu nedenle sadece üretim sürümlerinde kullanın
- Aşırı şifreleme bazen uygulamanın çalışmasını engelleyebilir, bu yüzden şifrelenmiş kodu mutlaka test edin
- Bu şifreleme yöntemleri mutlak güvenlik sağlamaz, ancak kodu anlamayı ve manipüle etmeyi önemli ölçüde zorlaştırır

## Sorun Giderme

Şifreleme sonrası uygulamada sorun yaşıyorsanız:

1. Önce şifrelemesiz sürümle test edin
2. Şifreleme seviyesini düşürün (özellikle `controlFlowFlattening` ve `stringArray` parametrelerini)
3. Kritik fonksiyonları `reservedNames` listesine ekleyerek şifrelenmelerini engelleyin
4. Browser konsolundaki hataları kontrol edin

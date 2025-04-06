# Kod Şifreleme (Obfuscation) Sistemi

Bu belge, Sunucu Envanteri uygulamasının kod şifreleme (obfuscation) sistemi hakkında teknik bilgiler içermektedir.

## Genel Bakış

Kod şifreleme, kaynak kodunun okunabilirliğini azaltırken aynı işlevselliği koruyarak tersine mühendislik girişimlerine karşı koruma sağlayan bir tekniğidir. Uygulamamız, dağıtım öncesinde hem frontend hem de backend kodlarını şifreleyerek koruma sağlamaktadır.

## Şifreleme Araçları

Projede iki farklı şifreleme aracı kullanılmaktadır:

1. **Frontend Şifreleme**: `javascript-obfuscator` paketi
2. **Backend Şifreleme**: `javascript-obfuscator` paketi

## Şifreleme Süreci

Şifreleme işlemi `build-secure.cjs` betiği tarafından koordine edilir ve aşağıdaki adımları içerir:

1. Proje normal olarak derlenir (`npm run build`)
2. Frontend JavaScript dosyaları `obfuscate.js` betiği ile şifrelenir
3. Backend JavaScript dosyaları `obfuscate-backend.js` betiği ile şifrelenir
4. Docker dağıtım dosyaları oluşturulur

## Frontend Şifreleme (obfuscate.js)

Frontend şifreleme işlemi, `dist/client` klasöründeki JavaScript dosyalarını işler ve aşağıdaki koruma yöntemlerini uygular:

- **Tanımlayıcı Adlarını Gizleme**: Değişken ve fonksiyon adları anlamsız karakterlerle değiştirilir
- **Karakter Kodlama**: String değerler karakter kodlarına dönüştürülür
- **Kontrol Akışı Karıştırma**: Kodun yürütme sırası karmaşıklaştırılır
- **Ölü Kod Enjeksiyonu**: Yanıltıcı kod parçacıkları eklenir
- **Kontrol Akışı Düzleştirme**: If-else yapıları ve döngüler yapılandırılır

## Backend Şifreleme (obfuscate-backend.js)

Backend şifreleme işlemi, `dist` klasöründeki sunucu kodunu işler ve aşağıdaki koruma tekniklerini uygular:

- **Tanımlayıcı Adlarını Gizleme**: Değişken ve fonksiyon adları değiştirilir
- **String Gizleme**: String değerler maskelenir
- **Kontrol Akışı Karıştırma**: Kod mantığı karmaşıklaştırılır
- **Yorum ve Gereksiz Boşlukların Kaldırılması**: Tüm yorum ve boşluklar kaldırılır

## Şifreleme Yapılandırması

Her iki şifreleme işlemi için kullanılan yapılandırma şu özellikleri içerir:

```javascript
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.7,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: true,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};
```

## Güvenlik Konuları

Kod şifreleme sistemi, aşağıdaki güvenlik katmanlarını sağlar:

1. **Tersine Mühendislik Koruması**: Kodun yapısını ve mantığını anlaşılması zor hale getirir
2. **Fikri Mülkiyet Koruması**: Özel algoritmaları ve iş mantığını korur
3. **Güvenlik Açığı Gizleme**: Potansiyel zayıflıkların doğrudan tanımlanmasını önler
4. **Kendi Kendini Savunma**: Şifrelenmiş kodun değiştirilmesini tespit eder ve engeller

## Sınırlamalar

Kod şifreleme, aşağıdaki sınırlamalara sahiptir:

1. **Performans Etkileri**: Şifrelenmiş kod çalışma süresinde hafif bir performans cezası getirebilir
2. **Hata Ayıklama Zorlukları**: Şifrelenmiş kodda hata ayıklama daha zordur
3. **Mutlak Güvenlik Olmaması**: Kararlı bir saldırgan yeterli zaman ve kaynak ile şifrelenmiş kodu hala analiz edebilir

## Özelleştirme

Şifreleme seviyesini değiştirmek isterseniz, `obfuscate.js` ve `obfuscate-backend.js` dosyalarındaki `obfuscatorOptions` nesnesini düzenleyebilirsiniz. Yüksek şifreleme seviyesi daha iyi koruma sağlar ancak performans üzerinde daha büyük bir etkiye sahip olabilir.

## En İyi Uygulamalar

1. Şifrelenmiş kodla birlikte kaynak haritaları dağıtmayın
2. Hassas bilgileri (API anahtarları, şifreler vb.) kod içinde saklamaktan kaçının
3. Şifreleme tek başına bir güvenlik çözümü olarak düşünmeyin, bütünsel bir güvenlik stratejisinin bir parçası olarak kullanın

## Şifrelenmiş Uygulama Çalıştırma

Şifrelenmiş uygulamayı Docker ile çalıştırmak için:

```bash
docker-compose -f docker-compose.yml.new up -d
```

Şifrelenmiş uygulamayı doğrudan çalıştırmak için:

```bash
cd dist
node index.js
```
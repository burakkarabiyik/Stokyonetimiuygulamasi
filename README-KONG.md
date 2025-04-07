# Kong API Gateway Entegrasyonu

Bu belge, Sunucu Envanteri uygulamasının Kong API Gateway ile birlikte nasıl yapılandırılacağını açıklamaktadır.

## Genel Bakış

Uygulama, Kong API Gateway ile `/stok` yolu üzerinden erişilebilecek şekilde yapılandırılmıştır. Kong API Gateway, API trafiğini yönetmek, güvenliği sağlamak ve ölçeklenebilirliği iyileştirmek için kullanılır.

## Kong API Gateway Yapılandırması

Kong'u yapılandırmak için aşağıdaki adımları izleyin:

### 1. Servis Tanımlama

```bash
curl -i -X POST http://kong:8001/services \
  --data "name=sunucu-envanter" \
  --data "url=http://sunucu-envanter:5000"
```

### 2. Route Tanımlama

```bash
curl -i -X POST http://kong:8001/services/sunucu-envanter/routes \
  --data "name=stok-route" \
  --data "paths[]=/stok" \
  --data "paths[]=/stok/" \
  --data "strip_path=false"
```

### Önemli Parametreler

- **strip_path=false**: Bu parametre, Kong'un `/stok` ön ekini kaldırmamasını ve isteği olduğu gibi uygulamaya iletmesini sağlar. Uygulamamız, bu ön eki beklediği için bu ayar önemlidir.

## Kong ile Docker-Compose Yapılandırması

Kong'u Docker Compose ile birlikte kullanmak için aşağıdaki örnek yapılandırmayı kullanabilirsiniz:

```yaml
version: "3.8"

services:
  # Mevcut app ve db servisleriniz burada...

  kong-db:
    image: postgres:15-alpine
    volumes:
      - kong_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=kong
      - POSTGRES_DB=kong
      - POSTGRES_PASSWORD=kongpass
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "kong"]
      interval: 10s
      timeout: 5s
      retries: 5

  kong-migration:
    image: kong:3.0
    depends_on:
      - kong-db
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=kong-db
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=kongpass
    command: kong migrations bootstrap
    restart: on-failure

  kong:
    image: kong:3.0
    depends_on:
      - kong-db
      - kong-migration
      - app
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=kong-db
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=kongpass
      - KONG_PROXY_ACCESS_LOG=/dev/stdout
      - KONG_ADMIN_ACCESS_LOG=/dev/stdout
      - KONG_PROXY_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_LISTEN=0.0.0.0:8001
      - KONG_PROXY_LISTEN=0.0.0.0:8000
    ports:
      - "8000:8000"  # Kong proxy port
      - "8001:8001"  # Kong admin API
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  kong_data:
```

## Kong Servisini Otomatik Yapılandırma

Uygulamanız çalıştıktan sonra Kong'u yapılandırmak için `/kong-config` endpoint'ini kullanabilirsiniz:

```bash
# Bu API, Kong yapılandırma bilgilerini döndürür
curl http://localhost:5000/kong-config
```

## Uygulamaya Erişim

Kong API Gateway üzerinden uygulamaya erişim URL'i:

```
http://kong:8000/stok/
```

## Sorun Giderme

1. **API istekleri 404 hatası veriyor**

   Çözüm: Kong'un routes yapılandırmasını kontrol edin. `strip_path=false` ayarı doğru mu?

   ```bash
   curl http://kong:8001/routes
   ```

2. **Sayfalar yükleniyor ancak API istekleri başarısız oluyor**

   Çözüm: API isteklerinin `/stok/api` formatında olduğunu doğrulayın.

3. **Sayfalar yüklenmiyor**

   Çözüm: HTML dosyasındaki `<base href="/stok/">` etiketinin olduğunu doğrulayın.

## Notlar

- Uygulamanın Kong ile çalışabilmesi için client/index.html dosyasına `<base href="/stok/">` etiketi eklenmiştir.
- API istekleri için queryClient.ts dosyasında gerekli yapılandırmalar yapılmıştır.
- Express.js sunucusunda `/stok` ön ekini işlemek için bir middleware eklenmiştir.

#!/bin/sh
set -e

# dist klasörünü kontrol et ve gerekirse oluştur
if [ ! -d "dist" ]; then
  echo "dist klasörü oluşturuluyor..."
  mkdir -p dist
fi

# dist/index.js dosyasını kontrol et ve gerekirse oluştur
if [ ! -f "dist/index.js" ]; then
  echo "dist/index.js dosyası oluşturuluyor..."
  echo '// Bu Docker için özel başlatma dosyası' > dist/index.js
  echo 'console.log("Uygulama başlatılıyor...");' >> dist/index.js
  echo 'require("../server/index");' >> dist/index.js
fi

# Veritabanı bağlantısını kontrol et
echo "PostgreSQL bekleniyor..."
RETRIES=15
until [ $RETRIES -eq 0 ] || nc -z ${PGHOST:-db} ${PGPORT:-5432}; do
  echo "PostgreSQL bekleniyor... $RETRIES kalan deneme"
  RETRIES=$((RETRIES-1))
  sleep 3
done

echo "Veritabanı düzeltme scripti çalıştırılıyor..."
node fix-db-script.js

echo "Veritabanı migration'ları çalıştırılıyor..."
npm run db:push || echo "Migration hatası, devam ediliyor"

echo "Uygulama başlatılıyor..."
exec "$@"

#!/bin/sh
set -e

# Maksimum bekleme süresi (saniye)
MAX_WAIT=60
COUNTER=0

echo "Veritabanı bağlantısı kontrol ediliyor..."

# PostgreSQL veritabanının hazır olup olmadığını kontrol eder
until pg_isready -h db -U postgres -d serverdb || [ $COUNTER -eq $MAX_WAIT ]; do
  echo "PostgreSQL veritabanı başlatılıyor - $COUNTER/$MAX_WAIT..."
  sleep 1
  COUNTER=$((COUNTER+1))
done

# Maksimum bekleme süresine ulaşıldı mı kontrol et
if [ $COUNTER -eq $MAX_WAIT ]; then
  echo "Veritabanı bağlantısı zaman aşımına uğradı!"
  exit 1
fi

echo "PostgreSQL veritabanı hazır, uygulama başlatılıyor..."

# Uygulamayı başlat
exec "$@"

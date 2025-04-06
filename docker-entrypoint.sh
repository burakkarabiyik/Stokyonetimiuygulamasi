#!/bin/sh

# PostgreSQL veritabanının hazır olup olmadığını kontrol eder
while ! nc -z db 5432; do
  echo "PostgreSQL veritabanı başlatılıyor - lütfen bekleyin..."
  sleep 2
done

echo "PostgreSQL veritabanı hazır, uygulama başlatılıyor..."

# Uygulamayı başlat
exec "$@"

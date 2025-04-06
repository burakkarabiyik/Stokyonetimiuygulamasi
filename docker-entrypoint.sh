#!/bin/sh

echo "Waiting for PostgreSQL..."
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

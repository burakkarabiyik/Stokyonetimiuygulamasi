FROM node:20-alpine

WORKDIR /app

# Gerekli araçları kur
RUN apk add --no-cache netcat-openbsd

# Uygulama dosyalarını kopyala
COPY package*.json ./
RUN npm ci

# Uygulama kodlarını kopyala
COPY . .

# Derleme klasörü ve basit bir HTML dosyası oluştur
RUN mkdir -p dist/public
RUN echo '<!DOCTYPE html><html><head><title>API Sunucusu</title></head><body><h1>API Sunucusu Çalışıyor</h1></body></html>' > dist/public/index.html

# Ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV USE_DATABASE=true

# Port aç
EXPOSE 5000

# Giriş noktası scriptini ayarla
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]

# Varsayılan komut
CMD ["node", "index.js"]
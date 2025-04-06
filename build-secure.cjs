const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

console.log('Güvenli derleme işlemi başlatılıyor...');

// Docker dosyalarını hazırla
const prepareDockerFiles = () => {
  console.log('Adım 0: Docker dosyalarını hazırlama');
  
  // docker-entrypoint.sh dosyasını oluştur
  const entryPointContent = `#!/bin/sh
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
`;

  // Dockerfile.secure dosyasını oluştur
  const dockerfileContent = `# Derleme aşaması
FROM node:20-alpine AS builder

# Çalışma dizini oluştur
WORKDIR /app

# Önce sadece package.json ve package-lock.json dosyalarını kopyala
# Bu, bağımlılıklar değişmediğinde önbelleği kullanmamızı sağlar
COPY package*.json ./

# Sadece üretim bağımlılıklarını yükle
RUN npm ci --only=production

# Kaynak kodları kopyala
COPY . .

# Projeyi derle ve şifrele
RUN npm run build && \\
    node obfuscate.js && \\
    node obfuscate-backend.js

# Çalıştırma aşaması için minimal imaj
FROM node:20-alpine

# PostgreSQL istemci araçlarını ekle
RUN apk add --no-cache postgresql-client

# Güvenlik için root olmayan kullanıcı oluştur
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Çalışma dizini oluştur ve kullanıcıya izin ver
WORKDIR /app
RUN chown -R appuser:appgroup /app

# Sadece gerekli dosyaları kopyala
COPY --from=builder --chown=appuser:appgroup /app/dist/ ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
COPY --chown=appuser:appgroup docker-entrypoint.sh /docker-entrypoint.sh

# Docker imaj boyutunu küçültmek için gereksiz dosyaları temizle
RUN npm cache clean --force && \\
    rm -rf /tmp/* && \\
    find ./node_modules -name "*.d.ts" -delete && \\
    find ./node_modules -name "*.map" -delete && \\
    find ./node_modules -name "*.md" -delete && \\
    find ./node_modules -name "LICENSE" -delete && \\
    find ./node_modules -name "licence*" -delete && \\
    find ./node_modules -name "LICENCE*" -delete

# Çalıştırma script'ine çalıştırma izni ver
RUN chmod +x /docker-entrypoint.sh

# Güvenlik için root olmayan kullanıcı kullan
USER appuser

# Ortam değişkenlerini tanımla
ENV NODE_ENV=production
ENV PORT=5000

# Uygulama portunu belirt
EXPOSE 5000

# Uygulamayı başlat
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "--optimize_for_size", "--max_old_space_size=460", "--gc_interval=100", "index.js"]
`;

  // docker-compose.yml.new dosyasını oluştur
  const dockerComposeContent = `version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.secure
    image: server-inventory:latest
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:postgres@db:5432/serverdb
      - PORT=5000
    depends_on:
      - db
    networks:
      - server-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 500M
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=serverdb
    ports:
      - "5432:5432"
    networks:
      - server-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.3'
          memory: 300M
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

networks:
  server-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
`;

  // Dosyaları kaydet
  fs.writeFileSync('docker-entrypoint.sh', entryPointContent, { mode: 0o755 });
  console.log('docker-entrypoint.sh dosyası oluşturuldu');
  
  fs.writeFileSync('Dockerfile.secure', dockerfileContent);
  console.log('Dockerfile.secure dosyası oluşturuldu');
  
  fs.writeFileSync('docker-compose.yml.new', dockerComposeContent);
  console.log('docker-compose.yml.new dosyası oluşturuldu');
};

// Docker dosyalarını hazırla
prepareDockerFiles();

// 1. Normal derleme işlemini gerçekleştir
console.log('Adım 1: Projeyi derleme');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Derleme hatası: ${error}`);
    return;
  }
  
  console.log(stdout);
  
  // 2. Frontend JS dosyalarını şifrele
  console.log('Adım 2: Frontend JS dosyalarını şifreleme');
  exec('node obfuscate.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Frontend şifreleme hatası: ${error}`);
      return;
    }
    
    console.log(stdout);
    
    // 3. Backend JS dosyalarını şifrele
    console.log('Adım 3: Backend JS dosyalarını şifreleme');
    exec('node obfuscate-backend.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Backend şifreleme hatası: ${error}`);
        return;
      }
      
      console.log(stdout);
      console.log('Güvenli derleme işlemi tamamlandı!');
      console.log('Dağıtım için:');
      console.log('1. docker-compose -f docker-compose.yml.new up -d komutunu kullanabilirsiniz');
      console.log('2. veya sadece "dist" klasörünü kullanabilirsiniz.');
    });
  });
});
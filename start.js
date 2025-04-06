// Sunucu başlatma dosyası
// Bu dosya Docker içinde çalıştırılır
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// dist klasörünü oluştur (eğer yoksa)
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// dist/index.js dosyasını oluştur
const indexContent = `
// Bu otomatik oluşturulan bir dosyadır
console.log('Sunucu başlatılıyor...');
require('../server/index.js');
`;

try {
  fs.writeFileSync('dist/index.js', indexContent);
  console.log('dist/index.js dosyası başarıyla oluşturuldu.');
} catch (error) {
  console.error('Dosya oluşturma hatası:', error);
}

// Uygulamayı başlat
console.log('Ana sunucu uygulaması başlatılıyor...');
require('./server/index.js');
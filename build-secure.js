const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Güvenli derleme işlemi başlatılıyor...');

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
      console.log('Dağıtım için "dist" klasörünü kullanabilirsiniz.');
    });
  });
});
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

function obfuscateBackendFiles() {
  const distDir = path.join(__dirname, 'dist');

  // Dağıtım klasörünün var olup olmadığını kontrol et
  if (!fs.existsSync(distDir)) {
    console.error('Hata: dist klasörü bulunamadı. Önce "npm run build" komutunu çalıştırın.');
    process.exit(1);
  }

  console.log('Backend JS dosyaları şifreleniyor...');

  // Backend için güvenlik açısından daha kritik obfuscation yapılandırması
  const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.8, // Backend için daha yüksek değer
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.5,
    debugProtection: true,
    debugProtectionInterval: true,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1,
    stringArrayEncoding: ['base64', 'rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 3,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1, // Backend için tüm stringleri şifrele
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    // Özel rezerve edilen fonksiyon/değişken isimleri (şifreleme dışında tutulacak)
    reservedNames: [
      'express', 
      'app', 
      'module.exports', 
      'PORT', 
      'DATABASE_URL', 
      'server',
      'req',
      'res',
      'next',
      'db',
      'console'
    ]
  };

  // Klasörü gezin ve JS dosyalarını şifrele
  function processDirectory(directory) {
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (stat.isFile() && path.extname(itemPath) === '.js') {
        try {
          const code = fs.readFileSync(itemPath, 'utf8');
          const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions).getObfuscatedCode();
          fs.writeFileSync(itemPath, obfuscatedCode);
          console.log(`Şifrelendi: ${itemPath}`);
        } catch (error) {
          console.error(`Şifreleme hatası (${itemPath}): ${error.message}`);
        }
      }
    }
  }

  processDirectory(distDir);
  console.log('Backend JS dosyaları şifreleme işlemi tamamlandı.');
}

obfuscateBackendFiles();
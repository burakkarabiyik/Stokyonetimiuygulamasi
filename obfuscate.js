const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

function obfuscateDistFiles() {
  const distDir = path.join(__dirname, 'client', 'dist');

  // Dağıtım klasörünün var olup olmadığını kontrol et
  if (!fs.existsSync(distDir)) {
    console.error('Hata: client/dist klasörü bulunamadı. Önce "npm run build" komutunu çalıştırın.');
    process.exit(1);
  }

  console.log('Frontend JS dosyaları şifreleniyor...');

  // Obfuscation yapılandırması
  const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.7,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
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
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.8,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
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
  console.log('Frontend JS dosyaları şifreleme işlemi tamamlandı.');
}

obfuscateDistFiles();
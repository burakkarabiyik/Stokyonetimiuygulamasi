// Bu script, veritabanı bağlantısını test eder ve eksik kolonları ekler
// Docker'da çalıştırılmak üzere tasarlanmıştır.
const { Client } = require('pg');
const fs = require('fs');

async function fixDatabase() {
  console.log('Veritabanı düzeltme scripti başlatılıyor...');
  
  // Drizzle _journal.json dosyasını oluştur
  try {
    if (!fs.existsSync('drizzle')) {
      fs.mkdirSync('drizzle', { recursive: true });
    }
    
    if (!fs.existsSync('drizzle/_journal.json')) {
      fs.writeFileSync('drizzle/_journal.json', JSON.stringify({
        version: "5",
        dialect: "pg",
        entries: []
      }));
      console.log('drizzle/_journal.json dosyası oluşturuldu');
    }
  } catch (err) {
    console.warn('Journal dosyası oluşturma hatası:', err.message);
  }
  
  // Veritabanına bağlan
  const client = new Client({
    host: process.env.PGHOST || 'db',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres'
  });
  
  try {
    console.log('Veritabanına bağlanılıyor...');
    await client.connect();
    console.log('Veritabanı bağlantısı başarılı.');
    
    // Eksik kolonları ekle
    const tablesQuery = `
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.tablename);
    
    console.log('Mevcut tablolar:', tables);
    
    // Servers tablosunu kontrol et
    if (tables.includes('servers')) {
      const serverColumnsQuery = `
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'servers'
      `;
      
      const serverColumns = (await client.query(serverColumnsQuery)).rows.map(row => row.column_name);
      
      if (!serverColumns.includes('network_info')) {
        console.log('servers tablosuna network_info kolonu ekleniyor...');
        await client.query('ALTER TABLE servers ADD COLUMN network_info text');
        console.log('servers tablosuna network_info kolonu eklendi');
      }
    }
    
    // Users tablosunu kontrol et
    if (tables.includes('users')) {
      const userColumnsQuery = `
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users'
      `;
      
      const userColumns = (await client.query(userColumnsQuery)).rows.map(row => row.column_name);
      
      if (!userColumns.includes('fullname')) {
        console.log('users tablosuna fullname kolonu ekleniyor...');
        await client.query('ALTER TABLE users ADD COLUMN fullname text');
        console.log('users tablosuna fullname kolonu eklendi');
      }
    }
    
    // server_notes tablosunu kontrol et
    if (tables.includes('server_notes')) {
      const notesColumnsQuery = `
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'server_notes'
      `;
      
      const notesColumns = (await client.query(notesColumnsQuery)).rows.map(row => row.column_name);
      
      if (!notesColumns.includes('updated_at')) {
        console.log('server_notes tablosuna updated_at kolonu ekleniyor...');
        await client.query('ALTER TABLE server_notes ADD COLUMN updated_at timestamp');
        console.log('server_notes tablosuna updated_at kolonu eklendi');
      }
      
      if (!notesColumns.includes('updated_by')) {
        console.log('server_notes tablosuna updated_by kolonu ekleniyor...');
        await client.query('ALTER TABLE server_notes ADD COLUMN updated_by integer');
        console.log('server_notes tablosuna updated_by kolonu eklendi');
      }
      
      if (!notesColumns.includes('is_deleted')) {
        console.log('server_notes tablosuna is_deleted kolonu ekleniyor...');
        await client.query('ALTER TABLE server_notes ADD COLUMN is_deleted boolean DEFAULT false');
        console.log('server_notes tablosuna is_deleted kolonu eklendi');
      }
    }
    
    console.log('Veritabanı kolon kontrolü tamamlandı.');
  } catch (err) {
    console.error('Veritabanı hatası:', err.message);
  } finally {
    try {
      await client.end();
      console.log('Veritabanı bağlantısı kapatıldı.');
    } catch (err) {
      console.error('Bağlantı kapatma hatası:', err.message);
    }
  }
}

// Script'i çalıştır
fixDatabase().catch(err => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
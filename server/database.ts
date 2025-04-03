import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Veritabanı bağlantısı için bağlantı havuzu oluştur
const client = postgres(process.env.DATABASE_URL || ''); 

// Drizzle ORM için veritabanı nesnesi
export const db = drizzle(client, { schema });
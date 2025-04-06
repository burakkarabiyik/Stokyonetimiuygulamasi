import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { serverModels, users, locations, servers, UserRole } from '@shared/schema';
import { hashPassword } from './auth';

// Database connection string from environment variable
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/server_inventory';

// Create a postgres client
const client = postgres(connectionString, { max: 10 });

// Create drizzle database instance with your schema
export const db = drizzle(client, { schema });

// Initialize the database
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Run migrations (this will create tables if they don't exist)
    await migrate(db, { migrationsFolder: './drizzle' });
    
    // Check if admin user exists, create one if not
    const adminUsers = await db.select().from(users).where(({ eq }) => eq(users.username, 'admin'));
    
    if (adminUsers.length === 0) {
      console.log('Creating default admin user...');
      
      // Create default admin user
      await db.insert(users).values({
        username: 'admin',
        password: await hashPassword('admin123'),
        fullName: 'Admin Kullanıcı',
        email: null,
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date()
      });
      
      console.log('Default admin user created successfully');
    }
    
    // Initialize locations if there are none
    const existingLocations = await db.select().from(locations);
    
    if (existingLocations.length === 0) {
      console.log('Creating default locations...');
      
      // Create some default locations
      await db.insert(locations).values([
        {
          name: "Ankara Veri Merkezi",
          type: "depot",
          address: "Ankara, Yenimahalle, Batı Sanayi Sitesi 2. Cadde No:25",
          capacity: 50,
          isActive: true,
          createdAt: new Date()
        },
        {
          name: "İstanbul Merkez Ofis",
          type: "office",
          address: "İstanbul, Maslak, Büyükdere Cad. No:128",
          capacity: 15,
          isActive: true,
          createdAt: new Date()
        }
      ]);
      
      console.log('Default locations created successfully');
    }
    
    // Initialize server models if there are none
    const existingModels = await db.select().from(serverModels);
    
    if (existingModels.length === 0) {
      console.log('Creating default server models...');
      
      // Create some default server models
      await db.insert(serverModels).values([
        {
          name: "PowerEdge R740",
          brand: "Dell",
          specs: "2x Intel Xeon Gold 6230, 128GB RAM, 4x 1.8TB SSD",
          createdAt: new Date()
        },
        {
          name: "ProLiant DL380 Gen10",
          brand: "HPE",
          specs: "2x Intel Xeon Silver 4210, 64GB RAM, 2x 960GB SSD",
          createdAt: new Date()
        }
      ]);
      
      console.log('Default server models created successfully');
    }
    
    console.log('Database initialization completed');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}
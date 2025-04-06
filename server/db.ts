import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { serverModels, users, locations, servers, UserRole } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const scryptAsync = promisify(scrypt);

// Hash password using scrypt
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

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
    try {
      console.log('Running migrations to create database tables...');
      
      // Try different migration folder paths to handle Docker vs local env differences
      const potentialMigrationPaths = [
        './migrations',
        '/app/migrations',
        '../migrations',
        '/migrations',
        './drizzle/migrations'
      ];
      
      let migrationSuccess = false;
      
      // Try each potential path until one works
      for (const migrationPath of potentialMigrationPaths) {
        try {
          console.log(`Attempting migrations from ${migrationPath}...`);
          
          // Check if the directory exists before attempting migration
          if (!fs.existsSync(migrationPath)) {
            console.log(`Path ${migrationPath} does not exist, skipping...`);
            continue;
          }
          
          // Check if there are SQL files in the directory
          const files = fs.readdirSync(migrationPath);
          const sqlFiles = files.filter(file => file.endsWith('.sql'));
          
          if (sqlFiles.length === 0) {
            console.log(`No SQL files found in ${migrationPath}, skipping...`);
            continue;
          }
          
          console.log(`Found ${sqlFiles.length} SQL migration files in ${migrationPath}`);
          
          // Run the migration with this path
          await migrate(db, { 
            migrationsFolder: migrationPath,
            migrationsTable: 'drizzle_migrations'
          });
          
          console.log(`Migrations from ${migrationPath} completed successfully`);
          migrationSuccess = true;
          break;
        } catch (error) {
          console.warn(`Error running migrations from ${migrationPath}:`, error);
        }
      }
      
      if (!migrationSuccess) {
        console.warn('All migration attempts failed. Will proceed to manual table creation...');
        
        // As a last resort, create tables directly with SQL statements
        console.log('Attempting to manually create tables with direct SQL...');
        
        try {
          // Create users table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              username VARCHAR(255) NOT NULL UNIQUE,
              password TEXT NOT NULL,
              fullname TEXT,
              email TEXT,
              role VARCHAR(50) NOT NULL DEFAULT 'user',
              "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          
          // Create locations table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS locations (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              type VARCHAR(50) NOT NULL,
              address TEXT,
              capacity INTEGER NOT NULL DEFAULT 0,
              "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          
          // Create server_models table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS server_models (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              brand VARCHAR(255) NOT NULL,
              specs TEXT,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          
          // Create servers table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS servers (
              id SERIAL PRIMARY KEY,
              "serverId" VARCHAR(255) NOT NULL UNIQUE,
              model VARCHAR(255) NOT NULL,
              specs TEXT NOT NULL,
              "locationId" INTEGER NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'passive',
              username TEXT,
              password TEXT,
              "ipAddress" TEXT,
              network_info TEXT,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          
          // Create server_notes table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS server_notes (
              id SERIAL PRIMARY KEY,
              "serverId" INTEGER NOT NULL,
              note TEXT NOT NULL,
              "createdBy" INTEGER NOT NULL,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP,
              "updatedBy" INTEGER,
              "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE
            );
          `);
          
          // Create server_transfers table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS server_transfers (
              id SERIAL PRIMARY KEY,
              "serverId" INTEGER NOT NULL,
              "fromLocationId" INTEGER NOT NULL,
              "toLocationId" INTEGER NOT NULL,
              "transferredBy" INTEGER NOT NULL,
              "transferDate" TIMESTAMP NOT NULL,
              notes TEXT,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          
          // Create activities table if it doesn't exist
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS activities (
              id SERIAL PRIMARY KEY,
              type VARCHAR(50) NOT NULL,
              description TEXT NOT NULL,
              "serverId" INTEGER,
              "userId" INTEGER,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          
          console.log('Manual table creation completed');
        } catch (manualError) {
          console.error('Error during manual table creation:', manualError);
          
          // Still try to use migrations from SQL files as a last resort
          try {
            console.log('Attempting to find SQL files for manual execution...');
            
            // Search for any SQL file to use as a manual migration
            const searchPaths = [
              './migrations', 
              '/app/migrations', 
              '../migrations',
              './drizzle/migrations'
            ];
            
            let sqlContent = '';
            let sqlFileFound = false;
            
            for (const dirPath of searchPaths) {
              if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                  if (file.endsWith('.sql')) {
                    sqlContent = fs.readFileSync(path.join(dirPath, file), 'utf8');
                    console.log(`Found SQL file: ${path.join(dirPath, file)}`);
                    sqlFileFound = true;
                    break;
                  }
                }
                if (sqlFileFound) break;
              }
            }
            
            if (sqlFileFound) {
              // Execute the SQL content directly
              await db.execute(sqlContent);
              console.log('SQL file execution completed');
            } else {
              console.error('No SQL migration files found for manual creation');
            }
          } catch (fileError) {
            console.error('Error reading or executing SQL files:', fileError);
          }
        }
      }
    } catch (migrateError) {
      console.error('Migration error:', migrateError);
      console.warn('Attempting to continue despite migration error...');
      // Continue execution even if migrations fail
    }
    
    // Check if admin user exists, create one if not
    const adminUsers = await db.select().from(users).where(eq(users.username, 'admin'));
    
    if (adminUsers.length === 0) {
      console.log('Creating default admin user...');
      
      // Create default admin user
      await db.insert(users).values({
        username: 'admin',
        password: await hashPassword('admin123'),
        fullname: 'Admin Kullanıcı', // fullname olarak düzeltildi
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
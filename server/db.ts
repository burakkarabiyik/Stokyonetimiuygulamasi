import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { serverModels, users, locations, servers, UserRole } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

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
          const fs = require('fs');
          
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
        
        // As a last resort, manually run the SQL to create tables
        console.log('Attempting to manually create tables...');
        
        try {
          // This will only run if all migration attempts failed
          // Read the base migration file to extract table creation statements
          const fs = require('fs');
          const path = require('path');
          
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
            console.log('Manual table creation completed');
          } else {
            console.error('No SQL migration files found for manual creation');
          }
        } catch (manualError) {
          console.error('Error during manual table creation:', manualError);
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
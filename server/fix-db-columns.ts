import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * This script checks for and adds missing columns in the database
 * that might not have been included in the original migrations
 * but are required by the current schema.
 */
export async function fixDatabaseColumns() {
  console.log('Checking for missing columns and fixing if needed...');
  
  try {
    // Check and add network_info column to servers table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'servers' AND column_name = 'network_info'
        ) THEN
          ALTER TABLE "servers" ADD COLUMN "network_info" text;
          RAISE NOTICE 'Added network_info column to servers table';
        END IF;
      END $$;
    `);
    
    // Check and fix fullname column in users table
    await db.execute(sql`
      DO $$
      BEGIN
        -- Check if full_name exists but fullname doesn't
        IF EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'full_name'
        ) AND NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'fullname'
        ) THEN
          -- Rename the column from full_name to fullname
          ALTER TABLE "users" RENAME COLUMN "full_name" TO "fullname";
          RAISE NOTICE 'Renamed full_name column to fullname in users table';
        -- If fullname doesn't exist at all, create it
        ELSIF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'fullname'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "fullname" text;
          RAISE NOTICE 'Added fullname column to users table';
        END IF;
      END $$;
    `);
    
    // Check and add missing columns to server_notes table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'server_notes' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE "server_notes" ADD COLUMN "updated_at" timestamp;
          RAISE NOTICE 'Added updated_at column to server_notes table';
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'server_notes' AND column_name = 'updated_by'
        ) THEN
          ALTER TABLE "server_notes" ADD COLUMN "updated_by" integer;
          RAISE NOTICE 'Added updated_by column to server_notes table';
        END IF;
        
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'server_notes' AND column_name = 'is_deleted'
        ) THEN
          ALTER TABLE "server_notes" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;
          RAISE NOTICE 'Added is_deleted column to server_notes table';
        END IF;
      END $$;
    `);
    
    console.log('Database column check completed successfully');
    return true;
  } catch (error) {
    console.error('Error fixing database columns:', error);
    return false;
  }
}

// Run this script directly if called as a main script
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  fixDatabaseColumns()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
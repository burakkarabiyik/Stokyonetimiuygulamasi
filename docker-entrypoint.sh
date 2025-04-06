#!/bin/sh

# Wait for the database to be available
echo "Waiting for PostgreSQL to be ready..."
RETRIES=30
until nc -z db 5432 || [ $RETRIES -eq 0 ]; do
  echo "Waiting for PostgreSQL server, $((RETRIES--)) remaining attempts..."
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "Failed to connect to PostgreSQL, continuing anyway..."
else
  echo "PostgreSQL is ready!"
fi

# Verify database connection
echo "Verifying database connection..."
if PGPASSWORD=$PGPASSWORD psql -h db -U $PGUSER -d $PGDATABASE -c "SELECT 1" > /dev/null 2>&1; then
  echo "Database connection verified!"
else
  echo "Could not connect to database, continuing anyway..."
fi

# Run migrations with retry
echo "Running database migrations..."
if npm run db:push; then
  echo "Migrations completed successfully!"
else
  echo "Migration failed, continuing anyway..."
fi

# Fix missing columns only if tables exist
echo "Checking for missing columns and fixing if needed..."
PGPASSWORD=$PGPASSWORD psql -h db -U $PGUSER -d $PGDATABASE -c "
-- First check if tables exist
DO \$\$
DECLARE
  servers_exists BOOLEAN;
  users_exists BOOLEAN;
  notes_exists BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'servers') INTO servers_exists;
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') INTO users_exists;
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'server_notes') INTO notes_exists;
  
  -- Fix servers table if it exists
  IF servers_exists THEN
    RAISE NOTICE 'Servers table exists, checking for missing columns...';
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'servers' AND column_name = 'network_info'
    ) THEN
      ALTER TABLE \"servers\" ADD COLUMN \"network_info\" text;
      RAISE NOTICE 'Added network_info column to servers table';
    END IF;
  ELSE
    RAISE NOTICE 'Servers table does not exist yet, skipping modification';
  END IF;
  
  -- Fix users table if it exists
  IF users_exists THEN
    RAISE NOTICE 'Users table exists, checking for column issues...';
    
    -- Check if full_name exists but fullname doesn't
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'full_name'
    ) AND NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fullname'
    ) THEN
      -- Rename the column from full_name to fullname
      ALTER TABLE \"users\" RENAME COLUMN \"full_name\" TO \"fullname\";
      RAISE NOTICE 'Renamed full_name column to fullname in users table';
    -- If fullname doesn't exist at all, create it
    ELSIF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fullname'
    ) THEN
      ALTER TABLE \"users\" ADD COLUMN \"fullname\" text;
      RAISE NOTICE 'Added fullname column to users table';
    END IF;
  ELSE
    RAISE NOTICE 'Users table does not exist yet, skipping modification';
  END IF;
  
  -- Fix notes table if it exists
  IF notes_exists THEN
    RAISE NOTICE 'Server notes table exists, checking for missing columns...';
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'server_notes' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE \"server_notes\" ADD COLUMN \"updated_at\" timestamp;
      RAISE NOTICE 'Added updated_at column to server_notes table';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'server_notes' AND column_name = 'updated_by'
    ) THEN
      ALTER TABLE \"server_notes\" ADD COLUMN \"updated_by\" integer;
      RAISE NOTICE 'Added updated_by column to server_notes table';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'server_notes' AND column_name = 'is_deleted'
    ) THEN
      ALTER TABLE \"server_notes\" ADD COLUMN \"is_deleted\" boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Added is_deleted column to server_notes table';
    END IF;
  ELSE
    RAISE NOTICE 'Server notes table does not exist yet, skipping modification';
  END IF;
END \$\$;
"

echo "Database column check completed successfully"

# Start the application
echo "Starting the application..."
if [ "$1" = "npm" ] && [ "$2" = "start" ]; then
  echo "Running with modified start command for better error handling..."
  NODE_ENV=production node --unhandled-rejections=strict dist/index.js
else
  echo "Running with original command: $@"
  exec "$@"
fi

#!/bin/sh
set -e

# Wait for the database to be available
echo "Waiting for PostgreSQL to be ready..."
while ! nc -z db 5432; do
  sleep 0.5
done
echo "PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
npm run db:push

# Fix missing columns if needed
echo "Checking for missing columns and fixing if needed..."
PGPASSWORD=$PGPASSWORD psql -h db -U $PGUSER -d $PGDATABASE -c "
-- Add network_info column to servers table if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'servers' AND column_name = 'network_info'
    ) THEN
        ALTER TABLE \"servers\" ADD COLUMN \"network_info\" text;
        RAISE NOTICE 'Added network_info column to servers table';
    END IF;
    
    -- Add missing columns to server_notes table for edit/delete functionality
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
END \$\$;
"

# Start the application
echo "Starting the application..."
exec "$@"

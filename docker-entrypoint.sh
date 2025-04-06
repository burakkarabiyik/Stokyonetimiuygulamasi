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

# Start the application
echo "Starting the application..."
exec "$@"

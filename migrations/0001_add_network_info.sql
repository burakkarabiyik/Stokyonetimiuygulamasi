-- Add network_info column to servers table
ALTER TABLE "servers" ADD COLUMN "network_info" text;

-- Add missing columns to server_notes table for edit/delete functionality
ALTER TABLE "server_notes" ADD COLUMN IF NOT EXISTS "updated_at" timestamp;
ALTER TABLE "server_notes" ADD COLUMN IF NOT EXISTS "updated_by" integer;
ALTER TABLE "server_notes" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false NOT NULL;
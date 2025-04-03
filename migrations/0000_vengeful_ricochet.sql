CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"transfer_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"model" text NOT NULL,
	"specs" text NOT NULL,
	"location" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "servers_server_id_unique" UNIQUE("server_id")
);

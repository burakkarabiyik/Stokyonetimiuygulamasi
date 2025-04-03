import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  model: text("model").notNull(),
  specs: text("specs").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull(), // "active", "transit", "maintenance"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serverNotes = pgTable("server_notes", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serverTransfers = pgTable("server_transfers", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  transferDate: timestamp("transfer_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id"),
  type: text("type").notNull(), // "add", "transfer", "note", "maintenance", "delete"
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas
export const insertServerSchema = createInsertSchema(servers)
  .omit({ id: true, createdAt: true });

export const insertNoteSchema = createInsertSchema(serverNotes)
  .omit({ id: true, createdAt: true });

export const insertTransferSchema = createInsertSchema(serverTransfers)
  .omit({ id: true, createdAt: true });

export const insertActivitySchema = createInsertSchema(activities)
  .omit({ id: true, createdAt: true });

// Types
export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;

export type ServerNote = typeof serverNotes.$inferSelect;
export type InsertServerNote = z.infer<typeof insertNoteSchema>;

export type ServerTransfer = typeof serverTransfers.$inferSelect;
export type InsertServerTransfer = z.infer<typeof insertTransferSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Enums for type safety
export enum ServerStatus {
  ACTIVE = "active",
  TRANSIT = "transit",
  MAINTENANCE = "maintenance"
}

export enum ActivityType {
  ADD = "add",
  TRANSFER = "transfer",
  NOTE = "note",
  MAINTENANCE = "maintenance",
  DELETE = "delete"
}

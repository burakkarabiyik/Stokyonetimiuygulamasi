import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  model: text("model").notNull(),
  specs: text("specs").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull(), // "active", "transit", "setup", "field", "ready", "inactive"
  ipAddress: text("ip_address"),
  username: text("username"),
  password: text("password"),
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

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  address: text("address"),
  type: text("type").notNull(), // "depot", "office", "field"
  capacity: integer("capacity").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("user").notNull(), // "admin", "user"
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

export const insertLocationSchema = createInsertSchema(locations)
  .omit({ id: true, createdAt: true });
  
export const insertUserSchema = createInsertSchema(users)
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

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Enums for type safety
export enum ServerStatus {
  ACTIVE = "active",       // Aktif (Depoda)
  TRANSIT = "transit",     // Transfer Sürecinde
  SETUP = "setup",         // Kurulumda
  FIELD = "field",         // Sahada Kullanımda
  READY = "ready",         // Gönderilebilir
  INACTIVE = "inactive"    // Pasif
}

export enum ActivityType {
  ADD = "add",
  TRANSFER = "transfer",
  NOTE = "note",
  MAINTENANCE = "maintenance",  // We keep "maintenance" in activities for backward compatibility
  SETUP = "setup",              // But add a new SETUP type for new activities
  EDIT = "edit",                // For editing server information
  STATUS = "status",            // For status changes
  DELETE = "delete"
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user"
}

export enum LocationType {
  DEPOT = "depot",     // Depo
  OFFICE = "office",   // Ofis
  FIELD = "field"      // Saha
}

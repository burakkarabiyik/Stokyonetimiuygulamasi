import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sunucu modelleri tablosu
export const serverModels = pgTable("server_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  specs: text("specs").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User and Auth Tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  full_name: text("full_name"),  // Changed from camelCase to snake_case for consistency
  email: text("email"),
  role: text("role").default("user").notNull(), // "admin" or "user"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Locations Table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // depot, office, field
  address: text("address"),
  capacity: integer("capacity").default(10).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Servers Table with more fields
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  model: text("model").notNull(),
  specs: text("specs").notNull(),
  ipAddress: text("ip_address"),
  username: text("username"),
  password: text("password"),
  locationId: integer("location_id").notNull(),
  status: text("status").notNull(), // "passive", "setup", "shippable", "active"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serverNotes = pgTable("server_notes", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  note: text("note").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serverTransfers = pgTable("server_transfers", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  fromLocationId: integer("from_location_id").notNull(),
  toLocationId: integer("to_location_id").notNull(),
  transferredBy: integer("transferred_by").notNull(),
  transferDate: timestamp("transfer_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id"),
  type: text("type").notNull(), // "add", "transfer", "note", "maintenance", "delete", "setup", "shippable"
  description: text("description").notNull(),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas
export const insertServerModelSchema = createInsertSchema(serverModels)
  .omit({ id: true, createdAt: true });

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true });

export const insertLocationSchema = createInsertSchema(locations)
  .omit({ id: true, createdAt: true });

export const insertServerSchema = createInsertSchema(servers)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertNoteSchema = createInsertSchema(serverNotes)
  .omit({ id: true, createdAt: true });

export const insertTransferSchema = createInsertSchema(serverTransfers)
  .omit({ id: true, createdAt: true });

export const insertActivitySchema = createInsertSchema(activities)
  .omit({ id: true, createdAt: true });

// Batch ekleme için şema
export const batchServerSchema = z.object({
  quantity: z.number().min(1).max(10),
  modelId: z.number().min(1, "Sunucu modeli seçilmelidir"),
  locationId: z.number().min(1, "Lokasyon seçilmelidir"),
  status: z.string().default(ServerStatus.PASSIVE),
});

// Types
export type ServerModel = typeof serverModels.$inferSelect;
export type InsertServerModel = z.infer<typeof insertServerModelSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

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
  PASSIVE = "passive",  // Yeni eklendi, henüz setup yapılmamış
  SETUP = "setup",      // Kurulum aşamasında
  SHIPPABLE = "shippable", // Kurulum tamamlandı, gönderilebilir
  ACTIVE = "active",     // Sahada aktif
  TRANSIT = "transit"    // Taşıma sürecinde
}

export enum ActivityType {
  ADD = "add",
  TRANSFER = "transfer",
  NOTE = "note",
  SETUP = "setup",
  SHIPPABLE = "shippable",
  ACTIVE = "active",
  DELETE = "delete"
}

export enum LocationType {
  DEPOT = "depot",
  OFFICE = "office",
  FIELD = "field"
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user"
}

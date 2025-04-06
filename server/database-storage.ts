import { IStorage } from './storage';
import { db } from './db';
import { 
  users, 
  locations, 
  serverModels, 
  servers, 
  serverNotes, 
  serverTransfers, 
  activities,
  serverDetails,
  User,
  InsertUser,
  Location,
  InsertLocation,
  ServerModel,
  InsertServerModel,
  Server,
  InsertServer,
  ServerNote,
  InsertServerNote,
  ServerTransfer,
  InsertServerTransfer,
  Activity,
  InsertActivity,
  ServerDetail,
  InsertServerDetail,
  ServerStatus,
  ActivityType
} from '@shared/schema';
import { eq, desc, asc, isNull, and, sql } from 'drizzle-orm';
import session from 'express-session';
import connectPg from 'connect-pg-simple';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/server_inventory';
    
    this.sessionStore = new PostgresSessionStore({
      conString: connectionString,
      createTableIfMissing: true
    });
  }
  
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      createdAt: new Date()
    }).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Location operations
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }
  
  async getLocationById(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }
  
  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values({
      ...locationData,
      createdAt: new Date()
    }).returning();
    
    return location;
  }
  
  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updatedLocation] = await db.update(locations)
      .set(locationData)
      .where(eq(locations.id, id))
      .returning();
    
    return updatedLocation;
  }
  
  async deleteLocation(id: number): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }
  
  // Server Model operations
  async getAllServerModels(): Promise<ServerModel[]> {
    return await db.select().from(serverModels);
  }
  
  async getServerModelById(id: number): Promise<ServerModel | undefined> {
    const [model] = await db.select().from(serverModels).where(eq(serverModels.id, id));
    return model;
  }
  
  async createServerModel(modelData: InsertServerModel): Promise<ServerModel> {
    const [model] = await db.insert(serverModels).values({
      ...modelData,
      createdAt: new Date()
    }).returning();
    
    return model;
  }
  
  async updateServerModel(id: number, modelData: Partial<InsertServerModel>): Promise<ServerModel | undefined> {
    const [updatedModel] = await db.update(serverModels)
      .set(modelData)
      .where(eq(serverModels.id, id))
      .returning();
    
    return updatedModel;
  }
  
  async deleteServerModel(id: number): Promise<boolean> {
    const result = await db.delete(serverModels).where(eq(serverModels.id, id)).returning();
    return result.length > 0;
  }
  
  // Server operations
  async getAllServers(): Promise<Server[]> {
    return await db.select().from(servers);
  }
  
  async getServerById(id: number): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server;
  }
  
  async getServerByServerId(serverId: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.serverId, serverId));
    return server;
  }
  
  async getServersByLocation(locationId: number): Promise<Server[]> {
    return await db.select().from(servers).where(eq(servers.locationId, locationId));
  }
  
  async createServer(serverData: InsertServer): Promise<Server> {
    const now = new Date();
    const [server] = await db.insert(servers).values({
      ...serverData,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // Add activity
    await this.addActivity({
      serverId: server.id,
      type: 'add',
      description: `Sunucu eklendi: ${server.serverId}`,
      userId: null
    });
    
    return server;
  }
  
  async createBatchServers(modelId: number, locationId: number, quantity: number, status: string): Promise<Server[]> {
    const model = await this.getServerModelById(modelId);
    if (!model) {
      throw new Error("Sunucu modeli bulunamadı");
    }
    
    const createdServers: Server[] = [];
    
    for (let i = 0; i < quantity; i++) {
      const now = new Date();
      
      // Server ID formatı: SRV-YIL-SAYAÇ
      const year = now.getFullYear();
      const [{ nextId }] = await db.select({
        nextId: sql`nextval('server_id_seq')`
      });
      const counter = String(nextId).padStart(3, '0');
      const serverId = `SRV-${year}-${counter}`;
      
      const [newServer] = await db.insert(servers).values({
        serverId,
        model: `${model.brand} ${model.name}`,
        specs: model.specs,
        locationId,
        status,
        ipAddress: null,
        username: null,
        password: null,
        createdAt: now,
        updatedAt: now
      }).returning();
      
      createdServers.push(newServer);
      
      // Add activity
      await this.addActivity({
        serverId: newServer.id,
        type: 'add',
        description: `Toplu ekleme: ${newServer.serverId} (${model.brand} ${model.name})`,
        userId: null
      });
    }
    
    return createdServers;
  }
  
  async updateServer(id: number, serverData: Partial<InsertServer>): Promise<Server | undefined> {
    const existingServer = await this.getServerById(id);
    
    if (!existingServer) {
      return undefined;
    }
    
    const [updatedServer] = await db.update(servers)
      .set({
        ...serverData,
        updatedAt: new Date()
      })
      .where(eq(servers.id, id))
      .returning();
    
    // Add activity if status changed
    if (serverData.status && serverData.status !== existingServer.status) {
      await this.addActivity({
        serverId: id,
        type: 'setup',
        description: `Sunucu durumu değiştirildi: ${existingServer.status} -> ${serverData.status}`,
        userId: null
      });
    }
    
    return updatedServer;
  }
  
  async deleteServer(id: number): Promise<boolean> {
    const server = await this.getServerById(id);
    if (!server) {
      return false;
    }
    
    // Delete server
    const result = await db.delete(servers).where(eq(servers.id, id)).returning();
    const deleted = result.length > 0;
    
    if (deleted) {
      // Add activity
      await this.addActivity({
        serverId: id,
        type: 'delete',
        description: `Sunucu silindi: ${server.serverId}`,
        userId: null
      });
    }
    
    return deleted;
  }
  
  // Note operations
  async getServerNotes(serverId: number): Promise<ServerNote[]> {
    return await db
      .select()
      .from(serverNotes)
      .where(eq(serverNotes.serverId, serverId))
      .orderBy(desc(serverNotes.createdAt));
  }
  
  async getServerNoteById(id: number): Promise<ServerNote | undefined> {
    const [note] = await db
      .select()
      .from(serverNotes)
      .where(eq(serverNotes.id, id));
    return note;
  }
  
  async addServerNote(noteData: InsertServerNote): Promise<ServerNote> {
    const [note] = await db.insert(serverNotes).values({
      ...noteData,
      createdAt: new Date()
    }).returning();
    
    // Add activity
    const server = await this.getServerById(noteData.serverId);
    await this.addActivity({
      serverId: noteData.serverId,
      type: 'note',
      description: `Not eklendi: ${server?.serverId || `ID: ${noteData.serverId}`}`,
      userId: noteData.createdBy
    });
    
    return note;
  }
  
  async updateServerNote(id: number, noteUpdate: Partial<InsertServerNote>): Promise<ServerNote | undefined> {
    // İlk önce notu bul
    const note = await this.getServerNoteById(id);
    if (!note) return undefined;
    
    // Notu güncelle
    const [updatedNote] = await db
      .update(serverNotes)
      .set(noteUpdate)
      .where(eq(serverNotes.id, id))
      .returning();
    
    if (!updatedNote) return undefined;
    
    // Activity ekle
    await this.addActivity({
      serverId: updatedNote.serverId,
      type: 'note',
      description: `Not güncellendi: ${updatedNote.note?.substring(0, 30)}${updatedNote.note && updatedNote.note.length > 30 ? '...' : ''}`,
      userId: note.createdBy
    });
    
    return updatedNote;
  }
  
  async deleteServerNote(id: number): Promise<boolean> {
    // Notu bul
    const note = await this.getServerNoteById(id);
    if (!note) return false;
    
    // Notu sil
    const result = await db
      .delete(serverNotes)
      .where(eq(serverNotes.id, id))
      .returning();
    
    if (result.length === 0) return false;
    
    // Activity ekle
    await this.addActivity({
      serverId: note.serverId,
      type: 'delete',
      description: `Not silindi: ${note.note?.substring(0, 30)}${note.note && note.note.length > 30 ? '...' : ''}`,
      userId: note.createdBy
    });
    
    return true;
  }
  
  // Transfer operations
  async getServerTransfers(serverId: number): Promise<ServerTransfer[]> {
    return await db
      .select()
      .from(serverTransfers)
      .where(eq(serverTransfers.serverId, serverId))
      .orderBy(desc(serverTransfers.createdAt));
  }
  
  async getAllTransfers(): Promise<ServerTransfer[]> {
    return await db
      .select()
      .from(serverTransfers)
      .orderBy(desc(serverTransfers.createdAt));
  }
  
  async createTransfer(transferData: InsertServerTransfer): Promise<ServerTransfer> {
    const [transfer] = await db.insert(serverTransfers).values({
      ...transferData,
      createdAt: new Date()
    }).returning();
    
    // Update server location and status
    await this.updateServer(transferData.serverId, {
      locationId: transferData.toLocationId,
      status: ServerStatus.TRANSIT
    });
    
    // Get location names
    const [fromLocation] = await db.select().from(locations).where(eq(locations.id, transferData.fromLocationId));
    const [toLocation] = await db.select().from(locations).where(eq(locations.id, transferData.toLocationId));
    
    // Add activity
    await this.addActivity({
      serverId: transferData.serverId,
      type: 'transfer',
      description: `${fromLocation?.name || 'Bilinmeyen konum'}'dan ${toLocation?.name || 'Bilinmeyen konum'}'a transfer başlatıldı`,
      userId: transferData.transferredBy
    });
    
    return transfer;
  }
  
  // Activity operations
  async getAllActivities(limit?: number): Promise<Activity[]> {
    let query = db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }
  
  async getServerActivities(serverId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.serverId, serverId))
      .orderBy(desc(activities.createdAt));
  }
  
  async addActivity(activityData: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values({
      ...activityData,
      createdAt: new Date()
    }).returning();
    
    return activity;
  }
  
  // Server Detail operations
  async getServerDetails(serverId: number): Promise<ServerDetail[]> {
    return await db
      .select()
      .from(serverDetails)
      .where(eq(serverDetails.serverId, serverId))
      .orderBy(asc(serverDetails.id));
  }

  async getServerDetailById(id: number): Promise<ServerDetail | undefined> {
    const [detail] = await db
      .select()
      .from(serverDetails)
      .where(eq(serverDetails.id, id));
    return detail;
  }

  async addServerDetail(detail: InsertServerDetail): Promise<ServerDetail> {
    const [newDetail] = await db
      .insert(serverDetails)
      .values({
        ...detail,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Add activity
    await this.addActivity({
      serverId: detail.serverId,
      type: ActivityType.SETUP,
      description: `Sanal makine eklendi: ${detail.vmName || 'VM'} (${detail.ipAddress})`
    });
    
    return newDetail;
  }

  async updateServerDetail(id: number, detailUpdate: Partial<InsertServerDetail>): Promise<ServerDetail | undefined> {
    const [detail] = await db
      .select()
      .from(serverDetails)
      .where(eq(serverDetails.id, id));
    
    if (!detail) {
      return undefined;
    }
    
    const [updatedDetail] = await db
      .update(serverDetails)
      .set({
        ...detailUpdate,
        updatedAt: new Date()
      })
      .where(eq(serverDetails.id, id))
      .returning();
    
    // Add activity
    await this.addActivity({
      serverId: detail.serverId,
      type: ActivityType.SETUP,
      description: `Sanal makine güncellendi: ${updatedDetail.vmName || 'VM'} (${updatedDetail.ipAddress})`
    });
    
    return updatedDetail;
  }

  async deleteServerDetail(id: number): Promise<boolean> {
    const [detail] = await db
      .select()
      .from(serverDetails)
      .where(eq(serverDetails.id, id));
    
    if (!detail) {
      return false;
    }
    
    const result = await db
      .delete(serverDetails)
      .where(eq(serverDetails.id, id))
      .returning({
        id: serverDetails.id
      });
    
    if (result.length > 0) {
      // Add activity
      await this.addActivity({
        serverId: detail.serverId,
        type: ActivityType.DELETE,
        description: `Sanal makine silindi: ${detail.vmName || 'VM'} (${detail.ipAddress})`
      });
      
      return true;
    }
    
    return false;
  }
  
  // Dashboard statistics
  async getServerStats(): Promise<{ total: number; active: number; transit: number; setup: number; passive: number; shippable: number }> {
    const allServers = await this.getAllServers();
    
    return {
      total: allServers.length,
      active: allServers.filter(s => s.status === ServerStatus.ACTIVE).length,
      transit: allServers.filter(s => s.status === ServerStatus.TRANSIT).length,
      setup: allServers.filter(s => s.status === ServerStatus.SETUP).length,
      passive: allServers.filter(s => s.status === ServerStatus.PASSIVE).length,
      shippable: allServers.filter(s => s.status === ServerStatus.SHIPPABLE).length
    };
  }
}
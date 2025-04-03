import { 
  Server, 
  InsertServer, 
  ServerNote, 
  InsertServerNote, 
  ServerTransfer, 
  InsertServerTransfer, 
  Activity, 
  InsertActivity,
  ServerStatus,
  ActivityType
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Server operations
  getAllServers(): Promise<Server[]>;
  getServerById(id: number): Promise<Server | undefined>;
  getServerByServerId(serverId: string): Promise<Server | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: number, server: Partial<InsertServer>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<boolean>;
  
  // Note operations
  getServerNotes(serverId: number): Promise<ServerNote[]>;
  addServerNote(note: InsertServerNote): Promise<ServerNote>;
  
  // Transfer operations
  getServerTransfers(serverId: number): Promise<ServerTransfer[]>;
  getAllTransfers(): Promise<ServerTransfer[]>;
  createTransfer(transfer: InsertServerTransfer): Promise<ServerTransfer>;
  
  // Activity operations
  getAllActivities(limit?: number): Promise<Activity[]>;
  getServerActivities(serverId: number): Promise<Activity[]>;
  addActivity(activity: InsertActivity): Promise<Activity>;
  
  // Dashboard statistics
  getServerStats(): Promise<{
    total: number;
    active: number;
    transit: number;
    setup: number; // Changed from maintenance to setup
  }>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private servers: Map<number, Server>;
  private serverNotes: Map<number, ServerNote[]>;
  private serverTransfers: Map<number, ServerTransfer[]>;
  private activities: Activity[];
  private serverIdCounter: number;
  private noteIdCounter: number;
  private transferIdCounter: number;
  private activityIdCounter: number;

  constructor() {
    this.servers = new Map();
    this.serverNotes = new Map();
    this.serverTransfers = new Map();
    this.activities = [];
    this.serverIdCounter = 1;
    this.noteIdCounter = 1;
    this.transferIdCounter = 1;
    this.activityIdCounter = 1;
    
    // Initialize with sample data
    this.initSampleData();
  }

  // Server operations
  async getAllServers(): Promise<Server[]> {
    return Array.from(this.servers.values());
  }

  async getServerById(id: number): Promise<Server | undefined> {
    return this.servers.get(id);
  }

  async getServerByServerId(serverId: string): Promise<Server | undefined> {
    return Array.from(this.servers.values()).find(
      (server) => server.serverId === serverId
    );
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const id = this.serverIdCounter++;
    const now = new Date();
    const server: Server = { 
      ...insertServer, 
      id,
      createdAt: now
    };
    
    this.servers.set(id, server);
    
    // Add activity
    this.addActivity({
      serverId: id,
      type: ActivityType.ADD,
      description: `Sunucu eklendi: ${server.serverId}`
    });
    
    return server;
  }

  async updateServer(id: number, serverUpdate: Partial<InsertServer>): Promise<Server | undefined> {
    const existingServer = this.servers.get(id);
    
    if (!existingServer) {
      return undefined;
    }
    
    const updatedServer = { 
      ...existingServer, 
      ...serverUpdate 
    };
    
    this.servers.set(id, updatedServer);
    
    // Add activity if status changed
    if (serverUpdate.status && serverUpdate.status !== existingServer.status) {
      this.addActivity({
        serverId: id,
        type: ActivityType.SETUP,
        description: `Sunucu durumu değiştirildi: ${existingServer.status} -> ${serverUpdate.status}`
      });
    }
    
    return updatedServer;
  }

  async deleteServer(id: number): Promise<boolean> {
    const server = this.servers.get(id);
    if (!server) {
      return false;
    }
    
    const deleted = this.servers.delete(id);
    
    if (deleted) {
      // Add activity
      this.addActivity({
        serverId: id,
        type: ActivityType.DELETE,
        description: `Sunucu silindi: ${server.serverId}`
      });
      
      // Remove related data
      this.serverNotes.delete(id);
      this.serverTransfers.delete(id);
    }
    
    return deleted;
  }

  // Note operations
  async getServerNotes(serverId: number): Promise<ServerNote[]> {
    return this.serverNotes.get(serverId) || [];
  }

  async addServerNote(note: InsertServerNote): Promise<ServerNote> {
    const id = this.noteIdCounter++;
    const now = new Date();
    const newNote: ServerNote = { 
      ...note, 
      id,
      createdAt: now
    };
    
    const serverNotes = this.serverNotes.get(note.serverId) || [];
    serverNotes.push(newNote);
    this.serverNotes.set(note.serverId, serverNotes);
    
    // Add activity
    const server = this.servers.get(note.serverId);
    this.addActivity({
      serverId: note.serverId,
      type: ActivityType.NOTE,
      description: `Not eklendi: ${server?.serverId || `ID: ${note.serverId}`}`
    });
    
    return newNote;
  }

  // Transfer operations
  async getServerTransfers(serverId: number): Promise<ServerTransfer[]> {
    return this.serverTransfers.get(serverId) || [];
  }

  async getAllTransfers(): Promise<ServerTransfer[]> {
    const allTransfers: ServerTransfer[] = [];
    this.serverTransfers.forEach((transfers) => {
      allTransfers.push(...transfers);
    });
    return allTransfers;
  }

  async createTransfer(transfer: InsertServerTransfer): Promise<ServerTransfer> {
    const id = this.transferIdCounter++;
    const now = new Date();
    const newTransfer: ServerTransfer = { 
      id,
      serverId: transfer.serverId,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      transferDate: transfer.transferDate,
      notes: transfer.notes || null,
      createdAt: now 
    };
    
    const serverTransfers = this.serverTransfers.get(transfer.serverId) || [];
    serverTransfers.push(newTransfer);
    this.serverTransfers.set(transfer.serverId, serverTransfers);
    
    // Update server location and status
    const server = this.servers.get(transfer.serverId);
    if (server) {
      this.servers.set(transfer.serverId, {
        ...server,
        location: transfer.toLocation,
        status: ServerStatus.TRANSIT
      });
    }
    
    // Add activity
    this.addActivity({
      serverId: transfer.serverId,
      type: ActivityType.TRANSFER,
      description: `${transfer.fromLocation}'dan ${transfer.toLocation}'a transfer başlatıldı`
    });
    
    return newTransfer;
  }

  // Activity operations
  async getAllActivities(limit?: number): Promise<Activity[]> {
    const sorted = [...this.activities].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getServerActivities(serverId: number): Promise<Activity[]> {
    return this.activities
      .filter(activity => activity.serverId === serverId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async addActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const now = new Date();
    
    // Ensure serverId is not undefined
    const serverId = insertActivity.serverId === undefined ? null : insertActivity.serverId;
    
    const activity: Activity = { 
      id,
      serverId,
      type: insertActivity.type, 
      description: insertActivity.description,
      createdAt: now 
    };
    
    this.activities.push(activity);
    
    return activity;
  }

  // Dashboard statistics
  async getServerStats(): Promise<{ total: number; active: number; transit: number; setup: number; }> {
    const servers = Array.from(this.servers.values());
    
    return {
      total: servers.length,
      active: servers.filter(s => s.status === ServerStatus.ACTIVE).length,
      transit: servers.filter(s => s.status === ServerStatus.TRANSIT).length,
      setup: servers.filter(s => s.status === ServerStatus.SETUP).length
    };
  }
  
  // Initialize with sample data
  private initSampleData() {
    const servers: InsertServer[] = [
      {
        serverId: "SRV-2023-091",
        model: "Dell PowerEdge R740",
        specs: "2x Intel Xeon Gold 6230, 128GB RAM, 4x 1.8TB SSD",
        location: "Ankara Depo",
        status: ServerStatus.ACTIVE
      },
      {
        serverId: "SRV-2023-090",
        model: "HPE ProLiant DL380 Gen10",
        specs: "2x Intel Xeon Silver 4210, 64GB RAM, 2x 960GB SSD",
        location: "İzmir Depo",
        status: ServerStatus.TRANSIT
      },
      {
        serverId: "SRV-2023-089",
        model: "Lenovo ThinkSystem SR650",
        specs: "1x Intel Xeon Silver 4214, 32GB RAM, 2x 480GB SSD",
        location: "İstanbul Merkez",
        status: ServerStatus.ACTIVE
      },
      {
        serverId: "SRV-2023-088",
        model: "Dell PowerEdge R640",
        specs: "2x Intel Xeon Gold 5218, 96GB RAM, 4x 960GB SSD",
        location: "Ankara Depo",
        status: ServerStatus.SETUP
      }
    ];
    
    // Create servers
    servers.forEach(server => {
      const now = new Date();
      const id = this.serverIdCounter++;
      const newServer: Server = { 
        ...server, 
        id,
        createdAt: new Date(now.getTime() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000) // Random date within last 10 days
      };
      
      this.servers.set(id, newServer);
      
      // Add activity
      this.addActivity({
        serverId: id,
        type: ActivityType.ADD,
        description: `Sunucu eklendi: ${server.serverId}`
      });
    });
    
    // Create a transfer for SRV-2023-089
    const server = Array.from(this.servers.values()).find(s => s.serverId === "SRV-2023-089");
    if (server) {
      const transferDate = new Date();
      transferDate.setDate(transferDate.getDate() - 2);
      
      const transfer: InsertServerTransfer = {
        serverId: server.id,
        fromLocation: "Ankara Depo",
        toLocation: "İstanbul Merkez",
        transferDate: transferDate,
        notes: "Düzenli bakım sonrası merkez ofise transfer"
      };
      
      const id = this.transferIdCounter++;
      const newTransfer: ServerTransfer = { 
        id,
        serverId: transfer.serverId,
        fromLocation: transfer.fromLocation,
        toLocation: transfer.toLocation,
        transferDate: transfer.transferDate,
        notes: transfer.notes || null,
        createdAt: new Date(transferDate.getTime() - 1000 * 60 * 60) // 1 hour before transfer
      };
      
      const serverTransfers = this.serverTransfers.get(server.id) || [];
      serverTransfers.push(newTransfer);
      this.serverTransfers.set(server.id, serverTransfers);
      
      // Add activity
      this.addActivity({
        serverId: server.id,
        type: ActivityType.TRANSFER,
        description: `${transfer.fromLocation}'dan ${transfer.toLocation}'a transfer edildi`
      });
    }
    
    // Add maintenance activity for SRV-2023-088
    const maintenanceServer = Array.from(this.servers.values()).find(s => s.serverId === "SRV-2023-088");
    if (maintenanceServer) {
      const maintenanceDate = new Date();
      maintenanceDate.setDate(maintenanceDate.getDate() - 1);
      
      const setupActivity: InsertActivity = {
        serverId: maintenanceServer.id,
        type: ActivityType.SETUP,
        description: `SRV-2023-088 sunucusu kuruluma alındı`
      };
      
      const activityId = this.activityIdCounter++;
      const activity: Activity = {
        ...setupActivity,
        id: activityId,
        createdAt: maintenanceDate
      };
      
      this.activities.push(activity);
    }
  }
}

// Import dependencies
import { eq, desc } from 'drizzle-orm';
import * as schema from '../shared/schema';

// PostgreSQL storage implementation
export class PostgresStorage implements IStorage {
  constructor() {
    // PostgreSQL storage otomatik olarak drizzle kullanır, constructor'da
    // ekstra işlem yapılmasına gerek yok.
  }

  async getAllServers(): Promise<Server[]> {
    const { db } = await import('./database');
    return await db.select().from(schema.servers).orderBy(schema.servers.createdAt);
  }

  async getServerById(id: number): Promise<Server | undefined> {
    const { db } = await import('./database');
    const results = await db.select().from(schema.servers).where(
      eq(schema.servers.id, id)
    ).limit(1);
    return results[0];
  }

  async getServerByServerId(serverId: string): Promise<Server | undefined> {
    const { db } = await import('./database');
    const results = await db.select().from(schema.servers).where(
      eq(schema.servers.serverId, serverId)
    ).limit(1);
    return results[0];
  }

  async createServer(server: InsertServer): Promise<Server> {
    const { db } = await import('./database');
    const result = await db.insert(schema.servers).values(server).returning();
    const createdServer = result[0];
    
    // Add activity
    await this.addActivity({
      serverId: createdServer.id,
      type: ActivityType.ADD,
      description: `Sunucu eklendi: ${createdServer.serverId}`
    });
    
    return createdServer;
  }

  async updateServer(id: number, serverUpdate: Partial<InsertServer>): Promise<Server | undefined> {
    const { db } = await import('./database');
    const existingServer = await this.getServerById(id);
    
    if (!existingServer) {
      return undefined;
    }
    
    const result = await db.update(schema.servers)
      .set(serverUpdate)
      .where(eq(schema.servers.id, id))
      .returning();
    
    const updatedServer = result[0];
    
    // Add activity if status changed
    if (serverUpdate.status && serverUpdate.status !== existingServer.status) {
      await this.addActivity({
        serverId: id,
        type: ActivityType.SETUP,
        description: `Sunucu durumu değiştirildi: ${existingServer.status} -> ${serverUpdate.status}`
      });
    }
    
    return updatedServer;
  }

  async deleteServer(id: number): Promise<boolean> {
    const { db } = await import('./database');
    const server = await this.getServerById(id);
    
    if (!server) {
      return false;
    }
    
    // Delete server
    await db.delete(schema.servers).where(eq(schema.servers.id, id));
    
    // Add activity
    await this.addActivity({
      serverId: id,
      type: ActivityType.DELETE,
      description: `Sunucu silindi: ${server.serverId}`
    });
    
    return true;
  }

  async getServerNotes(serverId: number): Promise<ServerNote[]> {
    const { db } = await import('./database');
    return await db.select().from(schema.serverNotes)
      .where(eq(schema.serverNotes.serverId, serverId))
      .orderBy(desc(schema.serverNotes.createdAt));
  }

  async addServerNote(note: InsertServerNote): Promise<ServerNote> {
    const { db } = await import('./database');
    const result = await db.insert(schema.serverNotes).values(note).returning();
    const newNote = result[0];
    
    // Add activity
    const server = await this.getServerById(note.serverId);
    await this.addActivity({
      serverId: note.serverId,
      type: ActivityType.NOTE,
      description: `Not eklendi: ${server?.serverId || `ID: ${note.serverId}`}`
    });
    
    return newNote;
  }

  async getServerTransfers(serverId: number): Promise<ServerTransfer[]> {
    const { db } = await import('./database');
    return await db.select().from(schema.serverTransfers)
      .where(eq(schema.serverTransfers.serverId, serverId))
      .orderBy(desc(schema.serverTransfers.createdAt));
  }

  async getAllTransfers(): Promise<ServerTransfer[]> {
    const { db } = await import('./database');
    return await db.select().from(schema.serverTransfers)
      .orderBy(desc(schema.serverTransfers.createdAt));
  }

  async createTransfer(transfer: InsertServerTransfer): Promise<ServerTransfer> {
    const { db } = await import('./database');
    const result = await db.insert(schema.serverTransfers).values(transfer).returning();
    const newTransfer = result[0];
    
    // Update server location and status
    await this.updateServer(transfer.serverId, {
      location: transfer.toLocation,
      status: ServerStatus.TRANSIT
    });
    
    // Add activity
    await this.addActivity({
      serverId: transfer.serverId,
      type: ActivityType.TRANSFER,
      description: `${transfer.fromLocation}'dan ${transfer.toLocation}'a transfer başlatıldı`
    });
    
    return newTransfer;
  }

  async getAllActivities(limit?: number): Promise<Activity[]> {
    const { db } = await import('./database');
    let query = db.select().from(schema.activities)
      .orderBy(desc(schema.activities.createdAt));
      
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async getServerActivities(serverId: number): Promise<Activity[]> {
    const { db } = await import('./database');
    return await db.select().from(schema.activities)
      .where(eq(schema.activities.serverId, serverId))
      .orderBy(desc(schema.activities.createdAt));
  }

  async addActivity(activity: InsertActivity): Promise<Activity> {
    const { db } = await import('./database');
    const result = await db.insert(schema.activities).values(activity).returning();
    return result[0];
  }

  async getServerStats(): Promise<{ total: number; active: number; transit: number; setup: number; field: number; }> {
    const { db } = await import('./database');
    const servers = await this.getAllServers();
    
    return {
      total: servers.length,
      active: servers.filter(s => s.status === ServerStatus.ACTIVE).length,
      transit: servers.filter(s => s.status === ServerStatus.TRANSIT).length,
      setup: servers.filter(s => s.status === ServerStatus.SETUP).length,
      field: servers.filter(s => s.status === ServerStatus.FIELD).length
    };
  }
}

// In memory storage yedekleme
export const memStorage = new MemStorage();

// Default olarak artık PostgreSQL depolama kullanılıyor
export const storage = new PostgresStorage();

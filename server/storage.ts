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
    for (const transfers of this.serverTransfers.values()) {
      allTransfers.push(...transfers);
    }
    return allTransfers;
  }

  async createTransfer(transfer: InsertServerTransfer): Promise<ServerTransfer> {
    const id = this.transferIdCounter++;
    const now = new Date();
    const newTransfer: ServerTransfer = { 
      ...transfer, 
      id,
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
    const activity: Activity = { 
      ...insertActivity, 
      id,
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
        ...transfer, 
        id,
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
      
      this.addActivity({
        serverId: maintenanceServer.id,
        type: ActivityType.SETUP,
        description: `SRV-2023-088 sunucusu kuruluma alındı`,
        createdAt: maintenanceDate
      });
    }
  }
}

export const storage = new MemStorage();

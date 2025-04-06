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
  ActivityType,
  User,
  InsertUser,
  Location,
  InsertLocation,
  ServerModel,
  InsertServerModel,
  LocationType,
  UserRole,
  ServerDetail,
  InsertServerDetail
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Location operations
  getAllLocations(): Promise<Location[]>;
  getLocationById(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;
  
  // Server Model operations
  getAllServerModels(): Promise<ServerModel[]>;
  getServerModelById(id: number): Promise<ServerModel | undefined>;
  createServerModel(model: InsertServerModel): Promise<ServerModel>;
  updateServerModel(id: number, model: Partial<InsertServerModel>): Promise<ServerModel | undefined>;
  deleteServerModel(id: number): Promise<boolean>;
  
  // Server operations
  getAllServers(): Promise<Server[]>;
  getServerById(id: number): Promise<Server | undefined>;
  getServerByServerId(serverId: string): Promise<Server | undefined>;
  getServersByLocation(locationId: number): Promise<Server[]>;
  createServer(server: InsertServer): Promise<Server>;
  createBatchServers(modelId: number, locationId: number, quantity: number, status: string): Promise<Server[]>;
  updateServer(id: number, server: Partial<InsertServer>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<boolean>;
  
  // Note operations
  getServerNotes(serverId: number): Promise<ServerNote[]>;
  getServerNoteById(id: number): Promise<ServerNote | undefined>;
  addServerNote(note: InsertServerNote): Promise<ServerNote>;
  updateServerNote(id: number, note: Partial<InsertServerNote>): Promise<ServerNote | undefined>;
  deleteServerNote(id: number): Promise<boolean>;
  
  // Transfer operations
  getServerTransfers(serverId: number): Promise<ServerTransfer[]>;
  getAllTransfers(): Promise<ServerTransfer[]>;
  createTransfer(transfer: InsertServerTransfer): Promise<ServerTransfer>;
  
  // Activity operations
  getAllActivities(limit?: number): Promise<Activity[]>;
  getServerActivities(serverId: number): Promise<Activity[]>;
  addActivity(activity: InsertActivity): Promise<Activity>;
  
  // Server Details operations - sanal makineler ve diğer ek bilgiler
  getServerDetails(serverId: number): Promise<ServerDetail[]>;
  getServerDetailById(id: number): Promise<ServerDetail | undefined>;
  addServerDetail(detail: InsertServerDetail): Promise<ServerDetail>;
  updateServerDetail(id: number, detail: Partial<InsertServerDetail>): Promise<ServerDetail | undefined>;
  deleteServerDetail(id: number): Promise<boolean>;
  
  // Dashboard statistics
  getServerStats(): Promise<{
    total: number;
    active: number;
    transit: number;
    setup: number;
    passive: number;
    shippable: number;
  }>;
  
  // Session store for auth
  sessionStore: session.Store;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private serverModels: Map<number, ServerModel>;
  private servers: Map<number, Server>;
  private serverNotes: Map<number, ServerNote[]>;
  private serverTransfers: Map<number, ServerTransfer[]>;
  private serverDetails: Map<number, ServerDetail[]>; // Sanal makine detayları için yeni Map
  private activities: Activity[];
  private userIdCounter: number;
  private locationIdCounter: number;
  private serverModelIdCounter: number;
  private serverIdCounter: number;
  private noteIdCounter: number;
  private transferIdCounter: number;
  private activityIdCounter: number;
  private serverDetailIdCounter: number; // Sanal makine detayları ID sayacı
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.serverModels = new Map();
    this.servers = new Map();
    this.serverNotes = new Map();
    this.serverTransfers = new Map();
    this.serverDetails = new Map(); // Sanal makine detayları için Map
    this.activities = [];
    this.userIdCounter = 1;
    this.locationIdCounter = 1;
    this.serverModelIdCounter = 1;
    this.serverIdCounter = 1;
    this.noteIdCounter = 1;
    this.transferIdCounter = 1;
    this.activityIdCounter = 1;
    this.serverDetailIdCounter = 1; // Sanal makine detayları için sayaç
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every 24h
    });
    
    // Initialize with sample data
    this.initSampleData();
  }
  
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { 
      ...existingUser, 
      ...userUpdate 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Location operations
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }
  
  async getLocationById(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }
  
  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.locationIdCounter++;
    const now = new Date();
    const location: Location = { 
      ...insertLocation, 
      id,
      createdAt: now
    };
    
    this.locations.set(id, location);
    return location;
  }
  
  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    
    if (!existingLocation) {
      return undefined;
    }
    
    const updatedLocation = { 
      ...existingLocation, 
      ...locationUpdate 
    };
    
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }
  
  async deleteLocation(id: number): Promise<boolean> {
    return this.locations.delete(id);
  }
  
  async getServersByLocation(locationId: number): Promise<Server[]> {
    return Array.from(this.servers.values()).filter(
      (server) => server.locationId === locationId
    );
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
      this.serverDetails.delete(id); // Sunucu detaylarını da sil
    }
    
    return deleted;
  }
  
  // Server Detail operations (Sanal Makineler)
  async getServerDetails(serverId: number): Promise<ServerDetail[]> {
    return this.serverDetails.get(serverId) || [];
  }

  async getServerDetailById(id: number): Promise<ServerDetail | undefined> {
    for (const details of this.serverDetails.values()) {
      const detail = details.find(d => d.id === id);
      if (detail) {
        return detail;
      }
    }
    return undefined;
  }

  async addServerDetail(detail: InsertServerDetail): Promise<ServerDetail> {
    const id = this.serverDetailIdCounter++;
    const now = new Date();
    const newDetail: ServerDetail = {
      ...detail,
      id,
      createdAt: now,
      updatedAt: now
    };

    const serverDetails = this.serverDetails.get(detail.serverId) || [];
    serverDetails.push(newDetail);
    this.serverDetails.set(detail.serverId, serverDetails);

    // Add an activity
    this.addActivity({
      serverId: detail.serverId,
      type: ActivityType.SETUP,
      description: `Sanal makine eklendi: ${detail.vmName || 'VM'} (${detail.ipAddress})`
    });

    return newDetail;
  }

  async updateServerDetail(id: number, detailUpdate: Partial<InsertServerDetail>): Promise<ServerDetail | undefined> {
    // Önce detayı bul
    let foundDetail: ServerDetail | undefined;
    let serverId: number | undefined;
    
    for (const [serverIdKey, details] of this.serverDetails.entries()) {
      const detailIndex = details.findIndex(d => d.id === id);
      if (detailIndex >= 0) {
        foundDetail = details[detailIndex];
        serverId = serverIdKey;
        break;
      }
    }
    
    if (!foundDetail || !serverId) {
      return undefined;
    }
    
    // Detayı güncelle
    const updatedDetail: ServerDetail = {
      ...foundDetail,
      ...detailUpdate,
      updatedAt: new Date()
    };
    
    // Detay listesini güncelle
    const details = this.serverDetails.get(serverId) || [];
    const updatedDetails = details.map(d => d.id === id ? updatedDetail : d);
    this.serverDetails.set(serverId, updatedDetails);
    
    // Activity ekle
    this.addActivity({
      serverId: serverId,
      type: ActivityType.SETUP,
      description: `Sanal makine güncellendi: ${updatedDetail.vmName || 'VM'} (${updatedDetail.ipAddress})`
    });
    
    return updatedDetail;
  }

  async deleteServerDetail(id: number): Promise<boolean> {
    // Detayı bul ve sil
    for (const [serverId, details] of this.serverDetails.entries()) {
      const detailIndex = details.findIndex(d => d.id === id);
      if (detailIndex >= 0) {
        const detail = details[detailIndex];
        
        // Listeden kaldır
        details.splice(detailIndex, 1);
        this.serverDetails.set(serverId, details);
        
        // Activity ekle
        this.addActivity({
          serverId: serverId,
          type: ActivityType.DELETE,
          description: `Sanal makine silindi: ${detail.vmName || 'VM'} (${detail.ipAddress})`
        });
        
        return true;
      }
    }
    
    return false;
  }

  // Note operations
  async getServerNotes(serverId: number): Promise<ServerNote[]> {
    return this.serverNotes.get(serverId) || [];
  }
  
  async getServerNoteById(id: number): Promise<ServerNote | undefined> {
    for (const notes of this.serverNotes.values()) {
      const note = notes.find(n => n.id === id);
      if (note) {
        return note;
      }
    }
    return undefined;
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
  
  async updateServerNote(id: number, noteUpdate: Partial<InsertServerNote>): Promise<ServerNote | undefined> {
    // Önce notu bul
    let foundNote: ServerNote | undefined;
    let serverId: number | undefined;
    
    for (const [serverIdKey, notes] of this.serverNotes.entries()) {
      const noteIndex = notes.findIndex(n => n.id === id);
      if (noteIndex >= 0) {
        foundNote = notes[noteIndex];
        serverId = serverIdKey;
        break;
      }
    }
    
    if (!foundNote || !serverId) {
      return undefined;
    }
    
    // Notu güncelle
    const updatedNote: ServerNote = {
      ...foundNote,
      ...noteUpdate
    };
    
    // Not listesini güncelle
    const notes = this.serverNotes.get(serverId) || [];
    const updatedNotes = notes.map(n => n.id === id ? updatedNote : n);
    this.serverNotes.set(serverId, updatedNotes);
    
    // Activity ekle
    this.addActivity({
      serverId: serverId,
      type: ActivityType.NOTE,
      description: `Not güncellendi: ${updatedNote.note?.substring(0, 30)}${updatedNote.note && updatedNote.note.length > 30 ? '...' : ''}`
    });
    
    return updatedNote;
  }
  
  async deleteServerNote(id: number): Promise<boolean> {
    // Notu bul ve sil
    for (const [serverId, notes] of this.serverNotes.entries()) {
      const noteIndex = notes.findIndex(n => n.id === id);
      if (noteIndex >= 0) {
        const note = notes[noteIndex];
        
        // Listeden kaldır
        notes.splice(noteIndex, 1);
        this.serverNotes.set(serverId, notes);
        
        // Activity ekle
        this.addActivity({
          serverId: serverId,
          type: ActivityType.DELETE,
          description: `Not silindi: ${note.note?.substring(0, 30)}${note.note && note.note.length > 30 ? '...' : ''}`
        });
        
        return true;
      }
    }
    
    return false;
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
  async getServerStats(): Promise<{ total: number; active: number; transit: number; setup: number; passive: number; shippable: number; }> {
    const servers = Array.from(this.servers.values());
    
    return {
      total: servers.length,
      active: servers.filter(s => s.status === ServerStatus.ACTIVE).length,
      transit: servers.filter(s => s.status === ServerStatus.TRANSIT).length,
      setup: servers.filter(s => s.status === ServerStatus.SETUP).length,
      passive: servers.filter(s => s.status === ServerStatus.PASSIVE).length,
      shippable: servers.filter(s => s.status === ServerStatus.SHIPPABLE).length
    };
  }
  
  // Server Model operations
  async getAllServerModels(): Promise<ServerModel[]> {
    return Array.from(this.serverModels.values());
  }

  async getServerModelById(id: number): Promise<ServerModel | undefined> {
    return this.serverModels.get(id);
  }

  async createServerModel(model: InsertServerModel): Promise<ServerModel> {
    const id = this.serverModelIdCounter++;
    const now = new Date();
    const serverModel: ServerModel = {
      ...model,
      id,
      createdAt: now
    };
    
    this.serverModels.set(id, serverModel);
    return serverModel;
  }

  async updateServerModel(id: number, modelUpdate: Partial<InsertServerModel>): Promise<ServerModel | undefined> {
    const existingModel = this.serverModels.get(id);
    
    if (!existingModel) {
      return undefined;
    }
    
    const updatedModel = {
      ...existingModel,
      ...modelUpdate
    };
    
    this.serverModels.set(id, updatedModel);
    return updatedModel;
  }

  async deleteServerModel(id: number): Promise<boolean> {
    return this.serverModels.delete(id);
  }

  // Batch server creation
  async createBatchServers(modelId: number, locationId: number, quantity: number, status: string): Promise<Server[]> {
    const model = this.serverModels.get(modelId);
    if (!model) {
      throw new Error("Sunucu modeli bulunamadı");
    }
    
    const createdServers: Server[] = [];
    
    for (let i = 0; i < quantity; i++) {
      const now = new Date();
      const id = this.serverIdCounter++;
      
      // Server ID formatı: SRV-YIL-SAYAÇ
      const year = now.getFullYear();
      const counter = String(this.serverIdCounter).padStart(3, '0');
      const serverId = `SRV-${year}-${counter}`;
      
      const newServer: Server = {
        id,
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
      };
      
      this.servers.set(id, newServer);
      createdServers.push(newServer);
      
      // Add activity
      this.addActivity({
        serverId: id,
        type: ActivityType.ADD,
        description: `Toplu ekleme: ${newServer.serverId} (${model.brand} ${model.name})`,
        userId: null
      });
    }
    
    return createdServers;
  }

  // Initialize with sample data
  private initSampleData() {
    // Initialize sample server models
    const serverModels: InsertServerModel[] = [
      {
        name: "PowerEdge R740",
        brand: "Dell",
        specs: "2x Intel Xeon Gold 6230, 128GB RAM, 4x 1.8TB SSD"
      },
      {
        name: "ProLiant DL380 Gen10",
        brand: "HPE",
        specs: "2x Intel Xeon Silver 4210, 64GB RAM, 2x 960GB SSD"
      },
      {
        name: "ThinkSystem SR650",
        brand: "Lenovo",
        specs: "1x Intel Xeon Silver 4214, 32GB RAM, 2x 480GB SSD"
      },
      {
        name: "PowerEdge R640",
        brand: "Dell",
        specs: "2x Intel Xeon Gold 5218, 96GB RAM, 4x 960GB SSD"
      },
      {
        name: "SuperServer 1029U-TR4T",
        brand: "Supermicro",
        specs: "2x Intel Xeon Silver 4216, 64GB RAM, 2x 480GB SSD"
      }
    ];
    
    // Create server models
    serverModels.forEach(model => {
      const id = this.serverModelIdCounter++;
      const now = new Date();
      const newModel: ServerModel = {
        ...model,
        id,
        createdAt: now
      };
      this.serverModels.set(id, newModel);
    });
    
    // Initialize sample locations
    const locations: InsertLocation[] = [
      {
        name: "Ankara Veri Merkezi",
        type: LocationType.DEPOT,
        address: "Ankara, Yenimahalle, Batı Sanayi Sitesi 2. Cadde No:25",
        capacity: 50,
        isActive: true
      },
      {
        name: "İstanbul Merkez Ofis",
        type: LocationType.OFFICE,
        address: "İstanbul, Maslak, Büyükdere Cad. No:128",
        capacity: 15,
        isActive: true
      },
      {
        name: "İzmir Depo",
        type: LocationType.DEPOT,
        address: "İzmir, Konak, Sanayi Sitesi C Blok No:24",
        capacity: 30,
        isActive: true
      },
      {
        name: "Antalya Sunucu Odası",
        type: LocationType.FIELD,
        address: "Antalya, Muratpaşa, Portakal Çiçeği Bulvarı No:12",
        capacity: 5,
        isActive: true
      }
    ];
    
    // Create locations
    const locationMap = new Map<string, number>();
    locations.forEach(location => {
      const id = this.locationIdCounter++;
      const now = new Date();
      const newLocation: Location = {
        ...location,
        id,
        createdAt: now
      };
      this.locations.set(id, newLocation);
      locationMap.set(location.name, id);
    });
    
    // Initialize sample servers with location IDs
    const servers: InsertServer[] = [
      {
        serverId: "SRV-2023-091",
        model: "Dell PowerEdge R740",
        specs: "2x Intel Xeon Gold 6230, 128GB RAM, 4x 1.8TB SSD",
        locationId: locationMap.get("Ankara Veri Merkezi") || 1,
        status: ServerStatus.ACTIVE,
        ipAddress: "192.168.10.25",
        username: "admin",
        password: "securepass123"
      },
      {
        serverId: "SRV-2023-090",
        model: "HPE ProLiant DL380 Gen10",
        specs: "2x Intel Xeon Silver 4210, 64GB RAM, 2x 960GB SSD",
        locationId: locationMap.get("İzmir Depo") || 3,
        status: ServerStatus.TRANSIT
      },
      {
        serverId: "SRV-2023-089",
        model: "Lenovo ThinkSystem SR650",
        specs: "1x Intel Xeon Silver 4214, 32GB RAM, 2x 480GB SSD",
        locationId: locationMap.get("İstanbul Merkez Ofis") || 2,
        status: ServerStatus.ACTIVE,
        ipAddress: "192.168.20.15",
        username: "root",
        password: "p@ssw0rd2023"
      },
      {
        serverId: "SRV-2023-088",
        model: "Dell PowerEdge R640",
        specs: "2x Intel Xeon Gold 5218, 96GB RAM, 4x 960GB SSD",
        locationId: locationMap.get("Ankara Veri Merkezi") || 1,
        status: ServerStatus.SETUP
      },
      {
        serverId: "SRV-2023-087",
        model: "Supermicro SuperServer 1029U-TR4T",
        specs: "2x Intel Xeon Silver 4216, 64GB RAM, 2x 480GB SSD",
        locationId: locationMap.get("Antalya Sunucu Odası") || 4,
        status: ServerStatus.SHIPPABLE,
        ipAddress: "192.168.15.10",
        username: "administrator",
        password: "AntalyaServ2023!"
      },
      {
        serverId: "SRV-2023-086",
        model: "Dell PowerEdge R740xd",
        specs: "2x Intel Xeon Gold 5220, 96GB RAM, 8x 1.2TB SAS",
        locationId: locationMap.get("Ankara Veri Merkezi") || 1,
        status: ServerStatus.PASSIVE
      }
    ];
    
    // Create servers
    servers.forEach(server => {
      const now = new Date();
      const id = this.serverIdCounter++;
      const newServer: Server = { 
        ...server, 
        id,
        createdAt: now,
        updatedAt: now
      };
      
      this.servers.set(id, newServer);
      
      // Add activity
      this.addActivity({
        serverId: id,
        type: ActivityType.ADD,
        description: `Sunucu eklendi: ${server.serverId}`,
        userId: null
      });
    });
    
    // Create server notes
    const notes = [
      {
        serverId: 1,
        note: "RAID yapılandırması güncellendi. RAID-10 olarak ayarlandı.",
        createdBy: 1
      },
      {
        serverId: 3,
        note: "Firmware güncellemesi yapıldı. BIOS version 2.4.6",
        createdBy: 1
      },
      {
        serverId: 4,
        note: "RAM modüllerinden biri arızalı, değişim için talep oluşturuldu.",
        createdBy: 1
      },
      {
        serverId: 5,
        note: "Soğutma sistemi optimize edildi. Fan ayarları düzenlendi.",
        createdBy: 1
      }
    ];
    
    notes.forEach(note => {
      this.addServerNote(note);
    });
    
    // Create a transfer example
    const transferDate = new Date();
    transferDate.setDate(transferDate.getDate() - 2);
    
    const transfer = {
      serverId: 3,
      fromLocationId: locationMap.get("Ankara Veri Merkezi") || 1,
      toLocationId: locationMap.get("İstanbul Merkez Ofis") || 2,
      transferredBy: 1,
      transferDate: transferDate,
      notes: "Merkez ofise tüm kurulumları yapılmış şekilde devredildi."
    };
    
    const transferId = this.transferIdCounter++;
    const newTransfer: ServerTransfer = { 
      ...transfer, 
      id: transferId,
      createdAt: new Date(transferDate.getTime() - 1000 * 60 * 60) // 1 hour before transfer
    };
    
    const serverTransfers = this.serverTransfers.get(transfer.serverId) || [];
    serverTransfers.push(newTransfer);
    this.serverTransfers.set(transfer.serverId, serverTransfers);
    
    // Örnek sanal makineler oluştur
    const virtualMachines: InsertServerDetail[] = [
      {
        serverId: 1, // Active server (Dell PowerEdge R740)
        vmName: "VM-WEB-001",
        ipAddress: "192.168.10.101",
        username: "webadmin",
        password: "websrv123",
        notes: "Web sunucusu - Nginx + PHP-FPM"
      },
      {
        serverId: 1,
        vmName: "VM-DB-001",
        ipAddress: "192.168.10.102",
        username: "dbadmin",
        password: "dbpass456",
        notes: "Veritabanı sunucusu - PostgreSQL"
      },
      {
        serverId: 1,
        vmName: "VM-APP-001",
        ipAddress: "192.168.10.103",
        username: "appadmin",
        password: "appserv789",
        notes: "Uygulama sunucusu - NodeJS"
      },
      {
        serverId: 3, // Active server (Lenovo ThinkSystem SR650)
        vmName: "VM-CACHE-001",
        ipAddress: "192.168.20.101",
        username: "cacheadmin",
        password: "cache234",
        notes: "Önbellek sunucusu - Redis"
      },
      {
        serverId: 3,
        vmName: "VM-QUEUE-001",
        ipAddress: "192.168.20.102",
        username: "queueadmin",
        password: "queue567",
        notes: "Kuyruk sunucusu - RabbitMQ"
      }
    ];

    // Sanal makineleri oluştur
    virtualMachines.forEach(vm => {
      const id = this.serverDetailIdCounter++;
      const now = new Date();
      const newDetail: ServerDetail = {
        ...vm,
        id,
        createdAt: now,
        updatedAt: now
      };
      
      const serverDetails = this.serverDetails.get(vm.serverId) || [];
      serverDetails.push(newDetail);
      this.serverDetails.set(vm.serverId, serverDetails);
    });
    
    // Add activity for transfer
    this.addActivity({
      serverId: transfer.serverId,
      type: ActivityType.TRANSFER,
      description: `Ankara Veri Merkezi'nden İstanbul Merkez Ofis'e transfer edildi`,
      userId: transfer.transferredBy
    });
    
    // Add setup activity for SRV-2023-088
    const setupServer = Array.from(this.servers.values()).find(s => s.serverId === "SRV-2023-088");
    if (setupServer) {
      const setupDate = new Date();
      setupDate.setDate(setupDate.getDate() - 1);
      
      this.addActivity({
        serverId: setupServer.id,
        type: ActivityType.SETUP,
        description: `${setupServer.serverId} sunucusu kuruluma alındı`,
        userId: 1
      });
    }
  }
}

// Choose storage implementation based on environment
import { DatabaseStorage } from './database-storage';

// Default to in-memory storage for development and testing
const useDatabase = process.env.USE_DATABASE === 'true' || process.env.NODE_ENV === 'production';

export const storage = useDatabase ? new DatabaseStorage() : new MemStorage();

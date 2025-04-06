import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServerSchema, 
  insertNoteSchema, 
  insertTransferSchema,
  insertLocationSchema,
  insertUserSchema,
  insertServerModelSchema,
  batchServerSchema,
  ServerStatus,
  ActivityType,
  LocationType,
  UserRole
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";

// Utility functions for password handling
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Docker health checks
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // Import and setup authentication
  const { setupAuth } = await import('./auth');
  setupAuth(app);
  
  // Create admin user if not exists
  try {
    const admin = await storage.getUserByUsername('admin');
    if (!admin) {
      await storage.createUser({
        username: 'admin',
        password: await hashPassword('admin123'),
        role: UserRole.ADMIN,
        fullName: 'Admin Kullanıcı',
        isActive: true
      });
      console.log('Default admin user created');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
  
  // Import auth middlewares from auth.ts
  const { isAuthenticated, isAdmin } = await import('./auth');
  
  // API Routes
  
  // Error handling middleware
  const handleError = (err: unknown, res: Response) => {
    console.error("API Error:", err);
    
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ error: validationError.message });
    }
    
    return res.status(500).json({ error: "Sunucu hatası" });
  };
  
  // Auth routes
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.json(req.user);
  });
  
  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  
  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    res.json(req.user);
  });
  
  // User profile and account routes
  app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { fullName, email } = req.body;
      
      const updatedUser = await storage.updateUser(userId, { 
        fullName, // Use camelCase to match schema
        email 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      
      res.json(updatedUser);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post('/api/user/change-password', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      
      // Get user data
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      
      // Verify current password
      const isValid = await comparePasswords(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(400).json({ error: "Mevcut şifre yanlış" });
      }
      
      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.status(200).json({ message: "Şifre başarıyla değiştirildi" });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // User management routes (Admin only)
  app.get('/api/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      const userData = req.body;
      
      // Validate input
      const validatedData = insertUserSchema.parse(userData);
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      
      res.status(201).json(newUser);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post('/api/users/:id/reset-password', isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır" });
      }
      
      // Check if user exists
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      
      // Hash and update password
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.status(200).json({ message: "Şifre başarıyla sıfırlandı" });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = (req.user as any).id;
      
      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ error: "Kendi hesabınızı silemezsiniz" });
      }
      
      // Check if user exists
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      
      // Delete user
      const success = await storage.deleteUser(userId);
      
      if (success) {
        res.status(200).json({ message: "Kullanıcı başarıyla silindi" });
      } else {
        res.status(500).json({ error: "Kullanıcı silinirken bir hata oluştu" });
      }
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post('/api/register', isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      }
      
      // Hash password
      userData.password = await hashPassword(userData.password);
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.get('/api/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Geçersiz ID' });
      }
      
      const location = await storage.getLocationById(id);
      if (!location) {
        return res.status(404).json({ error: 'Lokasyon bulunamadı' });
      }
      
      res.json(location);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post('/api/locations', isAdmin, async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.put('/api/locations/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Geçersiz ID' });
      }
      
      // Partial validation
      const locationData = insertLocationSchema.partial().parse(req.body);
      
      const updatedLocation = await storage.updateLocation(id, locationData);
      if (!updatedLocation) {
        return res.status(404).json({ error: 'Lokasyon bulunamadı' });
      }
      
      res.json(updatedLocation);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete('/api/locations/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Geçersiz ID' });
      }
      
      // Check if the location is in use by any servers
      const serversAtLocation = await storage.getServersByLocation(id);
      if (serversAtLocation && serversAtLocation.length > 0) {
        return res.status(400).json({ 
          error: 'Bu lokasyonda sunucular bulunuyor. Silmek için önce sunucuları başka bir lokasyona transfer edin.'
        });
      }
      
      const deleted = await storage.deleteLocation(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Lokasyon bulunamadı' });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Server Model routes
  app.get("/api/server-models", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const models = await storage.getAllServerModels();
      res.json(models);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/server-models/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const model = await storage.getServerModelById(id);
      if (!model) {
        return res.status(404).json({ error: "Sunucu modeli bulunamadı" });
      }
      
      res.json(model);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/server-models", isAdmin, async (req: Request, res: Response) => {
    try {
      const modelData = insertServerModelSchema.parse(req.body);
      
      const model = await storage.createServerModel(modelData);
      res.status(201).json(model);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/server-models/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      // Partial validation
      const modelData = insertServerModelSchema.partial().parse(req.body);
      
      const updatedModel = await storage.updateServerModel(id, modelData);
      if (!updatedModel) {
        return res.status(404).json({ error: "Sunucu modeli bulunamadı" });
      }
      
      res.json(updatedModel);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/server-models/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      // Check if model is used by servers
      const servers = await storage.getAllServers();
      const storedModel = await storage.getServerModelById(id);
      
      const modelInUse = servers.some(server => {
        const modelName = `${server.model}`.trim();
        return storedModel && modelName.includes(`${storedModel.brand} ${storedModel.name}`);
      });
      
      if (modelInUse) {
        return res.status(400).json({ error: "Bu model kullanımdadır ve silinemez." });
      }
      
      const deleted = await storage.deleteServerModel(id);
      if (!deleted) {
        return res.status(404).json({ error: "Sunucu modeli bulunamadı" });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Batch server creation
  app.post("/api/servers/batch", isAdmin, async (req: Request, res: Response) => {
    try {
      const batchData = batchServerSchema.parse(req.body);
      
      // Check if model exists
      const model = await storage.getServerModelById(batchData.modelId);
      if (!model) {
        return res.status(404).json({ error: "Sunucu modeli bulunamadı" });
      }
      
      // Check if location exists
      const location = await storage.getLocationById(batchData.locationId);
      if (!location) {
        return res.status(404).json({ error: "Lokasyon bulunamadı" });
      }
      
      // Check capacity constraints
      const existingServersCount = (await storage.getServersByLocation(batchData.locationId)).length;
      if (existingServersCount + batchData.quantity > location.capacity) {
        return res.status(400).json({ 
          error: `Lokasyon kapasitesi aşılıyor. Mevcut: ${existingServersCount}, Eklenmek istenen: ${batchData.quantity}, Kapasite: ${location.capacity}`
        });
      }
      
      const servers = await storage.createBatchServers(
        batchData.modelId,
        batchData.locationId,
        batchData.quantity,
        batchData.status
      );
      
      res.status(201).json(servers);
    } catch (err) {
      handleError(err, res);
    }
  });

  // GET /api/servers - Get all servers
  app.get("/api/servers", async (_req: Request, res: Response) => {
    try {
      const servers = await storage.getAllServers();
      res.json(servers);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id - Get server by ID
  app.get("/api/servers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      res.json(server);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/by-server-id/:serverId - Get server by server ID
  app.get("/api/servers/by-server-id/:serverId", async (req: Request, res: Response) => {
    try {
      const serverId = req.params.serverId;
      const server = await storage.getServerByServerId(serverId);
      
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      res.json(server);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // POST /api/servers - Create a new server
  app.post("/api/servers", async (req: Request, res: Response) => {
    try {
      const serverData = insertServerSchema.parse(req.body);
      
      // Check if server ID already exists
      const existingServer = await storage.getServerByServerId(serverData.serverId);
      if (existingServer) {
        return res.status(400).json({ error: "Bu Sunucu ID'si zaten kullanımda" });
      }
      
      const server = await storage.createServer(serverData);
      res.status(201).json(server);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // PUT /api/servers/:id - Update a server
  app.put("/api/servers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      // Partial validation
      const serverData = insertServerSchema.partial().parse(req.body);
      
      const updatedServer = await storage.updateServer(id, serverData);
      if (!updatedServer) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      res.json(updatedServer);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // DELETE /api/servers/:id - Delete a server
  app.delete("/api/servers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const deleted = await storage.deleteServer(id);
      if (!deleted) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id/notes - Get notes for a server
  app.get("/api/servers/:id/notes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      const notes = await storage.getServerNotes(id);
      res.json(notes);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // POST /api/servers/:id/notes - Add a note to a server
  app.post("/api/servers/:id/notes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      const noteData = insertNoteSchema.parse({
        ...req.body,
        serverId: id
      });
      
      const note = await storage.addServerNote(noteData);
      res.status(201).json(note);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id/transfers - Get transfers for a server
  app.get("/api/servers/:id/transfers", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      const transfers = await storage.getServerTransfers(id);
      res.json(transfers);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // POST /api/servers/:id/transfers - Create a transfer for a server
  app.post("/api/servers/:id/transfers", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      // Sunucunun konumunu bul
      const location = await storage.getLocationById(server.locationId);
      const fromLocationName = location ? location.name : "Bilinmiyor";
      
      const transferData = insertTransferSchema.parse({
        ...req.body,
        serverId: id,
        fromLocationId: server.locationId,
        fromLocationName: fromLocationName
      });
      
      const transfer = await storage.createTransfer(transferData);
      
      // Update server status and location
      await storage.updateServer(id, {
        status: ServerStatus.TRANSIT,
        locationId: transferData.toLocationId
      });
      
      res.status(201).json(transfer);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id/activities - Get activities for a server
  app.get("/api/servers/:id/activities", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      const activities = await storage.getServerActivities(id);
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/activities - Get all activities
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getAllActivities(limit);
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/stats - Get dashboard statistics
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getServerStats();
      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

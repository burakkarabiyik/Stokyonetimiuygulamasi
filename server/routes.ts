import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServerSchema, 
  insertNoteSchema, 
  insertTransferSchema,
  insertLocationSchema,
  insertUserSchema,
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
  // Setup authentication
  const setupAuth = () => {
    app.use(session({
      secret: 'depo-yonetim-app-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());
    
    passport.use(new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Kullanıcı adı veya şifre hatalı' });
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          return done(null, false, { message: 'Kullanıcı adı veya şifre hatalı' });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
    
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await storage.getUserById(id);
        done(null, user);
      } catch (err) {
        done(err);
      }
    });
    
    // Create admin user if not exists
    (async () => {
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
    })();
  };
  
  setupAuth();
  
  // Auth middleware
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  };
  
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === UserRole.ADMIN) {
      return next();
    }
    res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  };
  
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

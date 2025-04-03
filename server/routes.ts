import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServerSchema, 
  insertNoteSchema, 
  insertTransferSchema,
  insertLocationSchema,
  ServerStatus,
  ActivityType
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth sistemi kurulumu
  setupAuth(app);
  
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
  
  // GET /api/servers - Get all servers
  app.get("/api/servers", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const servers = await storage.getAllServers();
      res.json(servers);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id - Get server by ID
  app.get("/api/servers/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/servers/by-server-id/:serverId", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/servers", isAuthenticated, async (req: Request, res: Response) => {
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
  app.put("/api/servers/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  app.delete("/api/servers/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/servers/:id/notes", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/servers/:id/notes", isAuthenticated, async (req: Request, res: Response) => {
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
      
      // Aktivite ekle
      await storage.addActivity({
        type: ActivityType.NOTE,
        description: `Not eklendi: ${req.body.note.length > 30 ? req.body.note.substring(0, 30) + '...' : req.body.note}`,
        serverId: id
      });
      
      res.status(201).json(note);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // PUT /api/server-notes/:id - Update a note
  app.put("/api/server-notes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Geçersiz not ID" });
      }
      
      // Var olan notu kontrol et
      const notes = await storage.getServerNotes(0); // Tüm notları alır
      const existingNote = notes.find(note => note.id === noteId);
      
      if (!existingNote) {
        return res.status(404).json({ error: "Not bulunamadı" });
      }
      
      // Notu güncelle
      const updatedNote = await storage.updateNote(noteId, {
        note: req.body.note
      });
      
      // Not güncellemesi aktivitesi ekle
      await storage.addActivity({
        type: ActivityType.NOTE,
        description: `Not güncellendi: ${req.body.note.length > 30 ? req.body.note.substring(0, 30) + '...' : req.body.note}`,
        serverId: existingNote.serverId
      });
      
      res.status(200).json(updatedNote);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id/transfers - Get transfers for a server
  app.get("/api/servers/:id/transfers", isAuthenticated, async (req: Request, res: Response) => {
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
  
  // GET /api/transfers - Get all transfers
  app.get("/api/transfers", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const transfers = await storage.getAllTransfers();
      res.json(transfers);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // POST /api/servers/:id/transfers - Create a transfer for a server
  app.post("/api/servers/:id/transfers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const server = await storage.getServerById(id);
      if (!server) {
        return res.status(404).json({ error: "Sunucu bulunamadı" });
      }
      
      // String tarih formatını Date'e çevir
      const transferDate = new Date(req.body.transferDate);
      
      const transferData = insertTransferSchema.parse({
        ...req.body,
        serverId: id,
        fromLocation: server.location,
        transferDate: transferDate
      });
      
      const transfer = await storage.createTransfer(transferData);
      
      // Sadece lokasyonu değiştir, durumu değiştirme
      await storage.updateServer(id, {
        location: transferData.toLocation
      });
      
      res.status(201).json(transfer);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/servers/:id/activities - Get activities for a server
  app.get("/api/servers/:id/activities", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/activities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getAllActivities(limit);
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // GET /api/stats - Get dashboard statistics
  app.get("/api/stats", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getServerStats();
      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  });

  // LOCATIONS API

  // GET /api/locations - Get all locations
  app.get("/api/locations", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (err) {
      handleError(err, res);
    }
  });

  // GET /api/locations/:id - Get location by ID
  app.get("/api/locations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      const location = await storage.getLocationById(id);
      if (!location) {
        return res.status(404).json({ error: "Lokasyon bulunamadı" });
      }
      
      res.json(location);
    } catch (err) {
      handleError(err, res);
    }
  });

  // POST /api/locations - Create a new location
  app.post("/api/locations", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      
      // Check if location name already exists
      const locations = await storage.getAllLocations();
      const existingLocation = locations.find(loc => loc.name === locationData.name);
      
      if (existingLocation) {
        return res.status(400).json({ error: "Bu lokasyon adı zaten kullanımda" });
      }
      
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (err) {
      handleError(err, res);
    }
  });

  // PUT /api/locations/:id - Update a location
  app.put("/api/locations/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      // Partial validation
      const locationData = insertLocationSchema.partial().parse(req.body);
      
      // If name is changing, check for duplicates
      if (locationData.name) {
        const locations = await storage.getAllLocations();
        const existingLocation = locations.find(
          loc => loc.name === locationData.name && loc.id !== id
        );
        
        if (existingLocation) {
          return res.status(400).json({ error: "Bu lokasyon adı zaten kullanımda" });
        }
      }
      
      const updatedLocation = await storage.updateLocation(id, locationData);
      if (!updatedLocation) {
        return res.status(404).json({ error: "Lokasyon bulunamadı" });
      }
      
      res.json(updatedLocation);
    } catch (err) {
      handleError(err, res);
    }
  });

  // DELETE /api/locations/:id - Delete a location
  app.delete("/api/locations/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz ID" });
      }
      
      // Attempt to delete the location
      const deleted = await storage.deleteLocation(id);
      
      if (!deleted) {
        return res.status(400).json({ 
          error: "Lokasyon silinemedi. Lokasyon kullanımda olabilir veya bulunamadı." 
        });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServerSchema, 
  insertNoteSchema, 
  insertTransferSchema,
  ServerStatus,
  ActivityType
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      // String tarih formatını Date'e çevir
      const transferDate = new Date(req.body.transferDate);
      
      const transferData = insertTransferSchema.parse({
        ...req.body,
        serverId: id,
        fromLocation: server.location,
        transferDate: transferDate
      });
      
      const transfer = await storage.createTransfer(transferData);
      
      // Update server status and location
      await storage.updateServer(id, {
        status: ServerStatus.TRANSIT,
        location: transferData.toLocation
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

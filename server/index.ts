import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { fixDatabaseColumns } from "./fix-db-columns";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Always use database in production
  if (process.env.USE_DATABASE === 'true' || process.env.NODE_ENV === 'production') {
    log('Starting database initialization sequence...');
    
    let retryCount = 0;
    const maxRetries = 5;
    
    // Function to initialize and fix database with retries
    const setupDatabase = async (): Promise<boolean> => {
      try {
        // First initialize the database - this will create tables
        const dbInitResult = await initializeDatabase();
        
        if (!dbInitResult) {
          log('Database initialization returned false, will retry...', 'warn');
          return false;
        }
        
        log('Database initialized successfully, waiting for tables to be ready...');
        
        // Wait for tables to be fully created before fixing columns
        return new Promise((resolve) => {
          setTimeout(async () => {
            try {
              const fixResult = await fixDatabaseColumns();
              
              if (fixResult) {
                log('Database column check and fix completed successfully');
                resolve(true);
              } else {
                log('Database column fix failed, will retry...', 'warn');
                resolve(false);
              }
            } catch (columnErr) {
              log(`Error fixing database columns: ${columnErr}`, 'error');
              resolve(false);
            }
          }, 3000); // Increased delay for Docker environments
        });
      } catch (err) {
        log(`Database initialization error: ${err}`, 'error');
        return false;
      }
    };
    
    // Retry loop for database setup
    let success = false;
    while (!success && retryCount < maxRetries) {
      log(`Database setup attempt ${retryCount + 1}/${maxRetries}...`);
      success = await setupDatabase();
      
      if (!success) {
        retryCount++;
        if (retryCount < maxRetries) {
          const delay = 5000 * retryCount; // Incremental backoff
          log(`Will retry database setup in ${delay/1000} seconds...`, 'warn');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!success) {
      log('Failed to initialize database after multiple attempts. Continuing with limited functionality.', 'error');
    } else {
      log('Database setup completed successfully');
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Express } from 'express';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import connectPg from 'connect-pg-simple';

const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

// Hash password using scrypt
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Compare supplied password with stored password
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Auth middlewares that can be exported and used in routes
export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log("isAuthenticated middleware called");
  console.log("isAuthenticated:", req.isAuthenticated());
  console.log("User:", req.user);
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
};

export const isAdmin = (req: any, res: any, next: any) => {
  console.log("isAdmin middleware called");
  console.log("isAuthenticated:", req.isAuthenticated());
  console.log("User:", req.user);
  
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
};

export function setupAuth(app: Express) {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/server_inventory';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'depo-yonetim-app-secret',
    resave: false,
    saveUninitialized: true, // Changed to true to make sure session is properly saved
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    store: new PostgresSessionStore({
      conString: connectionString,
      createTableIfMissing: true,
      pruneSessionInterval: 60 // Prune expired sessions every 60 seconds
    })
  };

  app.set('trust proxy', 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        
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
    }),
  );

  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) {
        console.error("User not found during deserialization. ID:", id);
        return done(null, false);
      }
      console.log("Deserialized user:", user.id, user.username);
      done(null, user);
    } catch (err) {
      console.error("Error during deserialization:", err);
      done(err);
    }
  });

  // Auth endpoints
  app.post('/api/register', async (req, res, next) => {
    try {
      // Check if username already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, req.body.username));
      
      if (existingUser) {
        return res.status(400).send('Bu kullanıcı adı zaten kullanılıyor');
      }

      // Create the user
      const [user] = await db.insert(users).values({
        ...req.body,
        password: await hashPassword(req.body.password),
        createdAt: new Date()
      }).returning();

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    res.json(req.user);
  });
}
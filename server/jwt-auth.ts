import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from './db';
import { users, User, UserRole } from '@shared/schema';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || 'depo-yonetim-app-jwt-secret';
const JWT_EXPIRES_IN = '30d'; // JWT expires in 30 days

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

// Generate JWT token
export function generateToken(user: User) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify and decode JWT token
export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Extract token from authorization header
export function extractToken(req: Request) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}

// Middleware to authenticate requests
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("JWT isAuthenticated middleware called");
    
    // Extract token from authorization header
    const token = extractToken(req);
    
    if (!token) {
      console.log("No token found");
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    // Verify token
    const decoded = verifyToken(token) as any;
    
    if (!decoded) {
      console.log("Invalid token");
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    // Find user by ID
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    // Set user on request object
    console.log("User authenticated:", user.id, user.username);
    req.user = user;
    next();
    
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: 'Oturum doğrulama hatası' });
  }
};

// Middleware to check if user is admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("JWT isAdmin middleware called");
    
    // First authenticate the user
    const token = extractToken(req);
    
    if (!token) {
      console.log("No token found");
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    // Verify token
    const decoded = verifyToken(token) as any;
    
    if (!decoded) {
      console.log("Invalid token");
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    // Find user by ID
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      console.log("User is not admin:", user.id, user.username);
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    
    // Set user on request object
    console.log("Admin authenticated:", user.id, user.username);
    req.user = user;
    next();
    
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(401).json({ error: 'Oturum doğrulama hatası' });
  }
};

// Auth endpoints
export function setupJwtAuth(app: any) {
  // Login endpoint
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir' });
      }
      
      // Find user by username
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (!user) {
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
      }
      
      // Check password
      const isPasswordValid = await comparePasswords(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
      }
      
      // Generate token
      const token = generateToken(user);
      
      // Return user data and token
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        token
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  });
  
  // Register endpoint (admin only)
  app.post('/api/register', isAdmin, async (req: Request, res: Response) => {
    try {
      const { username, password, fullName, email, role } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir' });
      }
      
      // Check if username already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, username));
      
      if (existingUser) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      }
      
      // Create the user
      const [user] = await db.insert(users).values({
        username,
        password: await hashPassword(password),
        fullName,
        email,
        role: role || 'user',
        isActive: true,
        createdAt: new Date()
      }).returning();
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
      
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  });
  
  // Get current user
  app.get('/api/user', isAuthenticated, (req: Request, res: Response) => {
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    
    res.json(userWithoutPassword);
  });
}

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
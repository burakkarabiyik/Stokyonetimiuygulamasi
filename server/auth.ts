import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import MemoryStore from "memorystore";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";

declare global {
  namespace Express {
    // extend with our own User type
    interface User {
      id: number;
      username: string;
      password: string;
      name: string | null;
      role: string;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Kullanıcı işlemleri için yardımcı fonksiyonlar
export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function createUser(username: string, password: string, name?: string, role: string = "user"): Promise<User> {
  const hashedPassword = await hashPassword(password);
  const [user] = await db.insert(users).values({
    username,
    password: hashedPassword,
    name,
    role
  }).returning();
  return user;
}

export function setupAuth(app: Express) {
  const MemStore = MemoryStore(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gizli-anahtar-123",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 24 saat
    },
    store: new MemStore({
      checkPeriod: 86400000 // 24 saat
    })
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Kullanıcı kayıt endpoint'i - Sadece admin kullanıcılar yeni kullanıcı ekleyebilir
  app.post("/api/register", async (req, res, next) => {
    try {
      // Admin kontrolü
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Sadece admin kullanıcılar yeni kullanıcı ekleyebilir" });
      }

      const { username, password, name, role = "user" } = req.body;
      
      // Kullanıcı adı kontrolü
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Bu kullanıcı adı zaten kullanımda" });
      }

      // Sadece geçerli roller kabul edilir
      if (role !== "admin" && role !== "user") {
        return res.status(400).json({ error: "Geçersiz rol. Rol 'admin' veya 'user' olmalıdır" });
      }

      // Yeni kullanıcı oluştur
      const user = await createUser(username, password, name, role);

      return res.status(201).json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error("Kayıt hatası:", error);
      res.status(500).json({ error: "Kayıt işlemi sırasında bir hata oluştu" });
    }
  });

  // Giriş endpoint'i
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        });
      });
    })(req, res, next);
  });

  // Çıkış endpoint'i
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Çıkış yapılırken bir hata oluştu" });
      }
      res.status(200).json({ message: "Başarıyla çıkış yapıldı" });
    });
  });

  // Mevcut kullanıcı bilgisi endpoint'i
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    });
  });

  // Şifre değiştirme endpoint'i
  app.put("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as User;
      
      // Mevcut şifre doğrulama
      if (!(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ error: "Mevcut şifre hatalı" });
      }

      // Şifre güncelleme
      const hashedPassword = await hashPassword(newPassword);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      res.status(200).json({ message: "Şifre başarıyla güncellendi" });
    } catch (error) {
      console.error("Şifre değiştirme hatası:", error);
      res.status(500).json({ error: "Şifre güncellenirken bir hata oluştu" });
    }
  });

  // Profil güncelleme endpoint'i
  app.put("/api/update-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const { name } = req.body;
      const user = req.user as User;
      
      await db.update(users)
        .set({ name })
        .where(eq(users.id, user.id));

      const updatedUser = {
        ...user,
        name
      };
      
      // Session'ı güncelle
      req.login(updatedUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Oturum güncellenirken bir hata oluştu" });
        }
        res.status(200).json({
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          role: updatedUser.role
        });
      });
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      res.status(500).json({ error: "Profil güncellenirken bir hata oluştu" });
    }
  });
}

// Auth middleware
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
}

export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Bu işlem için yetkiniz bulunmuyor" });
}
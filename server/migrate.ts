import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./database";
import { servers, ServerStatus, InsertServer, activities, ActivityType, users, UserRole } from "@shared/schema";
import { hashPassword } from "./auth";

// Veritabanı tablolarını oluştur
export async function runMigrations() {
  console.log("Migrations başlatılıyor...");
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("Migrations başarıyla tamamlandı");
    return true;
  } catch (error) {
    console.error("Migration hatası:", error);
    return false;
  }
}

// Default admin kullanıcısını oluşturma
export async function createDefaultAdmin() {
  console.log("Default admin kullanıcısı kontrol ediliyor...");
  try {
    // Kullanıcı sayısını kontrol et
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log("Veritabanında zaten kullanıcılar mevcut, admin oluşturulmayacak");
      return;
    }
    
    // Default admin kullanıcısı oluştur
    const defaultAdminUsername = "admin";
    const defaultAdminPassword = "admin123"; // İlk girişte değiştirilmesi gerektiğini kullanıcıya hatırlat
    
    // Şifreyi hashle
    const hashedPassword = await hashPassword(defaultAdminPassword);
    
    // Admin kullanıcısını oluştur
    await db.insert(users).values({
      username: defaultAdminUsername,
      password: hashedPassword,
      name: "Sistem Yöneticisi",
      role: UserRole.ADMIN
    });
    
    console.log("Default admin kullanıcısı başarıyla oluşturuldu");
    console.log("Kullanıcı adı: admin, Şifre: admin123");
    console.log("Güvenlik için ilk girişte şifrenizi değiştirmeniz önerilir");
  } catch (error) {
    console.error("Admin oluşturma hatası:", error);
  }
}

// Örnek veri ekleme - sadece boş bir veritabanında çalıştırılmalı
export async function seedDatabase() {
  console.log("Veritabanına örnek veriler ekleniyor...");
  try {
    // Önce default admin kullanıcısını oluştur
    await createDefaultAdmin();
    
    // Sunucu sayısını kontrol et
    const existingServers = await db.select().from(servers);
    
    if (existingServers.length > 0) {
      console.log("Veritabanında zaten veriler mevcut, örnek veriler eklenmeyecek");
      return;
    }
    
    // Örnek sunucuları ekle
    const sampleServers: InsertServer[] = [
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

    for (const server of sampleServers) {
      const now = new Date();
      const result = await db.insert(servers).values(server).returning();
      const createdServer = result[0];
      
      // Her sunucu için bir aktivite ekle
      await db.insert(activities).values({
        serverId: createdServer.id,
        type: ActivityType.ADD,
        description: `Sunucu eklendi: ${server.serverId}`
      });
    }

    console.log("Örnek veriler başarıyla eklendi");
  } catch (error) {
    console.error("Örnek veri ekleme hatası:", error);
  }
}
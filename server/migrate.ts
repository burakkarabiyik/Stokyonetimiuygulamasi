import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./database";
import { servers, ServerStatus, InsertServer, activities, ActivityType } from "@shared/schema";

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

// Örnek veri ekleme - sadece boş bir veritabanında çalıştırılmalı
export async function seedDatabase() {
  console.log("Veritabanına örnek veriler ekleniyor...");
  try {
    // Önce sunucu sayısını kontrol et
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
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "sqlite:./data/chatapp.db";

// تحديد نوع قاعدة البيانات بناءً على URL
const isPostgreSQL = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
const isSQLite = databaseUrl.startsWith('sqlite:') || !databaseUrl.includes('://');

if (isSQLite) {
  // إعداد SQLite
  const dbPath = databaseUrl.startsWith('sqlite:') ? databaseUrl.replace('sqlite:', '') : databaseUrl;
  
  export default defineConfig({
    out: "./migrations",
    schema: "./shared/schema-sqlite.ts",
    dialect: "sqlite",
    dbCredentials: {
      url: dbPath,
    },
  });
} else {
  // إعداد PostgreSQL
  export default defineConfig({
    out: "./migrations",
    schema: "./shared/schema.ts", 
    dialect: "postgresql",
    dbCredentials: {
      url: databaseUrl,
    },
  });
}

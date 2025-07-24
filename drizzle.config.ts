import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

// التحقق من وجود DATABASE_URL
if (!databaseUrl) {
  throw new Error("❌ DATABASE_URL غير محدد! يجب إضافة رابط PostgreSQL من Supabase في ملف .env");
}

// التحقق من أن الرابط هو PostgreSQL
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  throw new Error("❌ DATABASE_URL يجب أن يكون رابط PostgreSQL من Supabase");
}

// إعداد PostgreSQL فقط
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", 
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

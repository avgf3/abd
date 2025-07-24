// إعداد Drizzle مبسط للـ SQLite
// لا حاجة لإعداد معقد مع خادمنا البسيط

export default {
  schema: "./shared/schema-sqlite.ts",
  out: "./migrations",
  dialect: "sqlite"
};

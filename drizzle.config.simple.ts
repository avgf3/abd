// إعداد Drizzle مبسط للـ SQLite
// لا حاجة لإعداد معقد مع خادمنا البسيط

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "sqlite"
};

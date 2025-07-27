import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  userType: text("user_type").notNull().default("guest"), // 'guest', 'member', 'owner'
  role: text("role").notNull().default("guest"), // نفس userType للتوافق مع ChatUser
  profileImage: text("profile_image"),
  profileBanner: text("profile_banner"),
  profileBackgroundColor: text("profile_background_color").default('#3c0d0d'), // لون خلفية البروفايل
  status: text("status"),
  gender: text("gender"),
  age: integer("age"),
  country: text("country"),
  relation: text("relation"),
  bio: text("bio"), // نبذة شخصية
  isOnline: boolean("is_online").default(false),
  isHidden: boolean("is_hidden").default(false), // خاصية الإخفاء للمراقبة
  lastSeen: timestamp("last_seen"),
  joinDate: timestamp("join_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(), // تاريخ الإنشاء للتوافق مع ChatUser
  isMuted: boolean("is_muted").default(false),
  muteExpiry: timestamp("mute_expiry"),
  isBanned: boolean("is_banned").default(false),
  banExpiry: timestamp("ban_expiry"),
  isBlocked: boolean("is_blocked").default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceId: varchar("device_id", { length: 100 }),
  ignoredUsers: text("ignored_users").default('[]'), // قائمة المستخدمين المتجاهلين - JSON string للتوافق مع SQLite
  usernameColor: text("username_color").default('#FFFFFF'), // لون اسم المستخدم
  userTheme: text("user_theme").default('default'), // ثيم المستخدم
  profileEffect: text("profile_effect").default('none'), // تأثير البروفايل
  points: integer("points").default(0), // نقاط المستخدم الحالية
  level: integer("level").default(1), // مستوى المستخدم
  totalPoints: integer("total_points").default(0), // إجمالي النقاط التي كسبها المستخدم
  levelProgress: integer("level_progress").default(0), // تقدم المستخدم في المستوى الحالي
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id), // null for public messages
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'image'
  isPrivate: boolean("is_private").default(false),
  roomId: text("room_id").default("general"), // معرف الغرفة
  timestamp: timestamp("timestamp").defaultNow(),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  friendId: integer("friend_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'blocked'
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'system', 'friend_request', 'message', 'promotion', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  data: jsonb("data"), // معلومات إضافية 
  createdAt: timestamp("created_at").defaultNow(),
});

// إضافة جدول blocked_devices المفقود
export const blockedDevices = pgTable("blocked_devices", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  deviceId: text("device_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  blockedAt: timestamp("blocked_at").notNull(),
  blockedBy: integer("blocked_by").notNull(),
});

// جدول تاريخ النقاط لتتبع كيفية كسب/فقدان النقاط
export const pointsHistory = pgTable("points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(), // النقاط المكتسبة/المفقودة (يمكن أن تكون سالبة)
  reason: text("reason").notNull(), // سبب الحصول على النقاط (رسالة، تسجيل دخول، إلخ)
  action: text("action").notNull(), // 'earn' أو 'lose'
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول إعدادات مستويات النقاط
export const levelSettings = pgTable("level_settings", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(),
  requiredPoints: integer("required_points").notNull(), // النقاط المطلوبة للوصول لهذا المستوى
  title: text("title").notNull(), // لقب المستوى (مبتدئ، متقدم، خبير، إلخ)
  color: text("color").default('#FFFFFF'), // لون خاص بالمستوى
  benefits: jsonb("benefits"), // مزايا المستوى (JSON)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  userType: z.string().optional(),
  role: z.string().optional(), // إضافة role
  profileImage: z.string().optional(),
  profileBanner: z.string().optional(),
  profileBackgroundColor: z.string().optional(), // إضافة profileBackgroundColor
  status: z.string().optional(),
  gender: z.string().optional(),
  age: z.number().optional(),
  country: z.string().optional(),
  relation: z.string().optional(),
  bio: z.string().optional(),
  // إضافة حقول الإدارة كاختيارية
  isMuted: z.boolean().optional(),
  muteExpiry: z.date().optional(),
  isBanned: z.boolean().optional(),
  banExpiry: z.date().optional(),
  isBlocked: z.boolean().optional(),
  ipAddress: z.string().optional(),
  deviceId: z.string().optional(),
  usernameColor: z.string().optional(),
  userTheme: z.string().optional(),
  profileEffect: z.string().optional(),
  points: z.number().optional(),
  level: z.number().optional(),
  totalPoints: z.number().optional(),
  levelProgress: z.number().optional(),
});

export const insertMessageSchema = z.object({
  senderId: z.number().optional(),
  receiverId: z.number().optional(),
  content: z.string(),
  messageType: z.string().optional(),
  isPrivate: z.boolean().optional(),
  roomId: z.string().optional(),
});

export const insertFriendSchema = z.object({
  userId: z.number().optional(),
  friendId: z.number().optional(),
  status: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

export const insertNotificationSchema = z.object({
  userId: z.number(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.any().optional(),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// إضافة أنواع البيانات لجدول blocked_devices
export const insertBlockedDeviceSchema = z.object({
  ipAddress: z.string(),
  deviceId: z.string(),
  userId: z.number(),
  reason: z.string(),
  blockedAt: z.date(),
  blockedBy: z.number(),
});

export type InsertBlockedDevice = z.infer<typeof insertBlockedDeviceSchema>;
export type BlockedDevice = typeof blockedDevices.$inferSelect;

// إضافة نماذج النقاط والمستويات
export const insertPointsHistorySchema = z.object({
  userId: z.number(),
  points: z.number(),
  reason: z.string(),
  action: z.string(),
});

export const insertLevelSettingsSchema = z.object({
  level: z.number(),
  requiredPoints: z.number(),
  title: z.string(),
  color: z.string().optional(),
  benefits: z.any().optional(),
});

export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertLevelSettings = z.infer<typeof insertLevelSettingsSchema>;
export type LevelSettings = typeof levelSettings.$inferSelect;

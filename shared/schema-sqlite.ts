import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  isOnline: integer("is_online").default(0), // SQLite uses integers for booleans
  isHidden: integer("is_hidden").default(0), // خاصية الإخفاء للمراقبة
  lastSeen: text("last_seen"), // SQLite uses text for timestamps
  joinDate: text("join_date"), // SQLite uses text for timestamps
  createdAt: text("created_at"), // SQLite uses text for timestamps
  isMuted: integer("is_muted").default(0),
  muteExpiry: text("mute_expiry"),
  isBanned: integer("is_banned").default(0),
  banExpiry: text("ban_expiry"),
  isBlocked: integer("is_blocked").default(0),
  ipAddress: text("ip_address"),
  deviceId: text("device_id"),
  ignoredUsers: text("ignored_users").default('[]'), // JSON string للتوافق مع SQLite
  usernameColor: text("username_color").default('#FFFFFF'), // لون اسم المستخدم
  userTheme: text("user_theme").default('default'), // ثيم المستخدم
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id), // null for public messages
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'image'
  isPrivate: integer("is_private").default(0),
  timestamp: text("timestamp"),
});

export const friends = sqliteTable("friends", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  friendId: integer("friend_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'blocked'
  createdAt: text("created_at"),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'system', 'friend_request', 'message', 'promotion', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read").default(0),
  data: text("data"), // JSON string معلومات إضافية 
  createdAt: text("created_at"),
});

export const blockedDevices = sqliteTable("blocked_devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipAddress: text("ip_address").notNull(),
  deviceId: text("device_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  blockedAt: text("blocked_at").notNull(),
  blockedBy: integer("blocked_by").notNull(),
});

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  userType: z.string(),
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Friend = typeof friends.$inferSelect;
export type InsertFriend = typeof friends.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
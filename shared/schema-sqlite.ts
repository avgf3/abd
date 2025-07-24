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
  profileEffect: text("profile_effect").default('none'), // تأثير البروفايل
  points: integer("points").default(0), // نقاط المستخدم الحالية
  level: integer("level").default(1), // مستوى المستخدم
  totalPoints: integer("total_points").default(0), // إجمالي النقاط التي كسبها المستخدم
  levelProgress: integer("level_progress").default(0), // تقدم المستخدم في المستوى الحالي
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id), // null for public messages
  roomId: text("room_id").default("general"), // ID of the room for public messages
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

// جدول تاريخ النقاط لتتبع كيفية كسب/فقدان النقاط
export const pointsHistory = sqliteTable("points_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(), // النقاط المكتسبة/المفقودة (يمكن أن تكون سالبة)
  reason: text("reason").notNull(), // سبب الحصول على النقاط (رسالة، تسجيل دخول، إلخ)
  action: text("action").notNull(), // 'earn' أو 'lose'
  createdAt: text("created_at"), // SQLite uses text for timestamps
});

// جدول إعدادات مستويات النقاط
export const levelSettings = sqliteTable("level_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: integer("level").notNull().unique(),
  requiredPoints: integer("required_points").notNull(), // النقاط المطلوبة للوصول لهذا المستوى
  title: text("title").notNull(), // لقب المستوى (مبتدئ، متقدم، خبير، إلخ)
  color: text("color").default('#FFFFFF'), // لون خاص بالمستوى
  benefits: text("benefits"), // مزايا المستوى (JSON string)
  createdAt: text("created_at"), // SQLite uses text for timestamps
});

// جدول طلبات الصداقة
export const friendRequests = sqliteTable("friend_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'ignored'
  createdAt: text("created_at"),
  respondedAt: text("responded_at"),
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
  profileEffect: z.string().optional(),
  points: z.number().optional(),
  level: z.number().optional(),
  totalPoints: z.number().optional(),
  levelProgress: z.number().optional(),
});

// تعريف نوع المستخدم مع التوافق الكامل
export type User = {
  id: number;
  username: string;
  password: string | null;
  userType: string;
  role: string;
  profileImage: string | null;
  profileBanner: string | null;
  profileBackgroundColor: string;
  status: string | null;
  gender: string | null;
  age: number | null;
  country: string | null;
  relation: string | null;
  bio: string | null;
  isOnline: boolean;
  isHidden: boolean;
  lastSeen: Date | null;
  joinDate: Date;
  createdAt: Date;
  isMuted: boolean;
  muteExpiry: Date | null;
  isBanned: boolean;
  banExpiry: Date | null;
  isBlocked: boolean;
  ipAddress: string | null;
  deviceId: string | null;
  ignoredUsers: number[];
  usernameColor: string;
  userTheme: string;
  profileEffect: string;
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
};

export type InsertUser = {
  username: string;
  password?: string | null;
  userType?: string;
  role?: string;
  profileImage?: string | null;
  profileBanner?: string | null;
  profileBackgroundColor?: string;
  status?: string | null;
  gender?: string | null;
  age?: number | null;
  country?: string | null;
  relation?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  isHidden?: boolean;
  lastSeen?: Date | null;
  joinDate?: Date;
  createdAt?: Date;
  isMuted?: boolean;
  muteExpiry?: Date | null;
  isBanned?: boolean;
  banExpiry?: Date | null;
  isBlocked?: boolean;
  ipAddress?: string | null;
  deviceId?: string | null;
  ignoredUsers?: number[];
  usernameColor?: string;
  userTheme?: string;
  profileEffect?: string;
  points?: number;
  level?: number;
  totalPoints?: number;
  levelProgress?: number;
};

export type Message = {
  id: number;
  senderId: number;
  receiverId: number | null;
  roomId: string;
  content: string;
  messageType: string;
  isPrivate: number;
  timestamp: string;
};

export type InsertMessage = {
  senderId: number;
  receiverId?: number | null;
  roomId?: string;
  content: string;
  messageType?: string;
  isPrivate?: boolean;
  timestamp?: string;
};

export type Friend = typeof friends.$inferSelect;
export type InsertFriend = typeof friends.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// إضافة أنواع النقاط والمستويات
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
  benefits: z.string().optional(), // JSON string للتوافق مع SQLite
});

export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertLevelSettings = z.infer<typeof insertLevelSettingsSchema>;
export type LevelSettings = typeof levelSettings.$inferSelect;
export type BlockedDevice = typeof blockedDevices.$inferSelect;
export type InsertBlockedDevice = typeof blockedDevices.$inferInsert;

// إضافة أنواع طلبات الصداقة
export const insertFriendRequestSchema = z.object({
  senderId: z.number(),
  receiverId: z.number(),
  status: z.string().optional(),
});

export type FriendRequest = typeof friendRequests.$inferSelect;

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  isDefault: integer("is_default").default(0),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const roomUsers = sqliteTable("room_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  roomId: text("room_id").notNull().references(() => rooms.id),
  joinedAt: text("joined_at"),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;
export type RoomUser = typeof roomUsers.$inferSelect;
export type InsertFriendRequest = typeof friendRequests.$inferInsert;
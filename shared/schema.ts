import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  userType: text("user_type").notNull().default("guest"), // 'guest', 'member', 'owner'
  profileImage: text("profile_image"),
  profileBanner: text("profile_banner"),
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
  isMuted: boolean("is_muted").default(false),
  muteExpiry: timestamp("mute_expiry"),
  isBanned: boolean("is_banned").default(false),
  banExpiry: timestamp("ban_expiry"),
  isBlocked: boolean("is_blocked").default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceId: varchar("device_id", { length: 100 }),
  ignoredUsers: text("ignored_users").array().default([]), // قائمة المستخدمين المتجاهلين
  usernameColor: text("username_color").default('#FFFFFF'), // لون اسم المستخدم
  userTheme: text("user_theme").default('default'), // ثيم المستخدم
  profileBackgroundColor: text("profile_background_color").default('#3c0d0d'), // لون خلفية البروفايل
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id), // null for public messages
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'image'
  isPrivate: boolean("is_private").default(false),
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

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  userType: z.string(),
  profileImage: z.string().optional(),
  profileBanner: z.string().optional(),
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
});

export const insertMessageSchema = z.object({
  senderId: z.number().optional(),
  receiverId: z.number().optional(),
  content: z.string(),
  messageType: z.string().optional(),
  isPrivate: z.boolean().optional(),
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

import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// جدول المستخدمين - محسن ومكتمل
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  userType: text("user_type").notNull().default("guest"), // 'guest', 'member', 'admin', 'owner'
  role: text("role").notNull().default("guest"), // نفس userType للتوافق مع ChatUser
  profileImage: text("profile_image"),
  profileBanner: text("profile_banner"),
  profileBackgroundColor: text("profile_background_color").default('#3c0d0d'),
  status: text("status"),
  gender: text("gender").default('male'),
  age: integer("age"),
  country: text("country"),
  relation: text("relation"),
  bio: text("bio"), // نبذة شخصية
  isOnline: boolean("is_online").default(false),
  isHidden: boolean("is_hidden").default(false), // خاصية الإخفاء للمراقبة
  lastSeen: timestamp("last_seen"),
  joinDate: timestamp("join_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  isMuted: boolean("is_muted").default(false),
  muteExpiry: timestamp("mute_expiry"),
  isBanned: boolean("is_banned").default(false),
  banExpiry: timestamp("ban_expiry"),
  isBlocked: boolean("is_blocked").default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceId: varchar("device_id", { length: 100 }),
  ignoredUsers: text("ignored_users").default('[]'), // قائمة المستخدمين المتجاهلين - JSON string
  usernameColor: text("username_color").default('#FFFFFF'), // لون اسم المستخدم
  userTheme: text("user_theme").default('default'), // ثيم المستخدم
  profileEffect: text("profile_effect").default('none'), // تأثير البروفايل
  points: integer("points").default(0), // نقاط المستخدم الحالية
  level: integer("level").default(1), // مستوى المستخدم
  totalPoints: integer("total_points").default(0), // إجمالي النقاط التي كسبها المستخدم
  levelProgress: integer("level_progress").default(0), // تقدم المستخدم في المستوى الحالي
});

// جدول الرسائل - محسن
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id), // null for public messages
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'image', 'file'
  isPrivate: boolean("is_private").default(false),
  roomId: text("room_id").default("general"), // معرف الغرفة
  timestamp: timestamp("timestamp").defaultNow(),
  isRead: boolean("is_read").default(false), // للرسائل الخاصة
});

// جدول الأصدقاء - محسن
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  friendId: integer("friend_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'blocked'
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول طلبات الصداقة - جديد
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'ignored'
  message: text("message"), // رسالة مع الطلب
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// جدول الإشعارات - محسن
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'system', 'friend_request', 'message', 'promotion', 'points', 'level_up'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  data: jsonb("data"), // معلومات إضافية 
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول الأجهزة المحجوبة - محسن
export const blockedDevices = pgTable("blocked_devices", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  deviceId: text("device_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  blockedAt: timestamp("blocked_at").notNull(),
  blockedBy: integer("blocked_by").notNull(),
});

// جدول تاريخ النقاط - محسن
export const pointsHistory = pgTable("points_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(), // النقاط المكتسبة/المفقودة (يمكن أن تكون سالبة)
  reason: text("reason").notNull(), // سبب الحصول على النقاط (رسالة، تسجيل دخول، إلخ)
  action: text("action").notNull(), // 'earn' أو 'lose'
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول إعدادات مستويات النقاط - محسن
export const levelSettings = pgTable("level_settings", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(),
  requiredPoints: integer("required_points").notNull(), // النقاط المطلوبة للوصول لهذا المستوى
  title: text("title").notNull(), // لقب المستوى (مبتدئ، متقدم، خبير، إلخ)
  color: text("color").default('#FFFFFF'), // لون خاص بالمستوى
  benefits: jsonb("benefits"), // مزايا المستوى (JSON)
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول الغرف - جديد
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  isBroadcast: boolean("is_broadcast").default(false),
  createdBy: integer("created_by").references(() => users.id),
  hostId: integer("host_id").references(() => users.id),
  speakers: text("speakers").default('[]'), // JSON array of speaker IDs
  micQueue: text("mic_queue").default('[]'), // JSON array of mic queue
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول منشورات الحوائط - جديد
export const wallPosts = pgTable("wall_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  type: text("type").notNull().default("public"), // 'public', 'friends', 'private'
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول تفاعلات الحوائط - جديد
export const wallReactions = pgTable("wall_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => wallPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reactionType: text("reaction_type").notNull(), // 'like', 'love', 'laugh', 'wow', 'sad', 'angry'
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول تعليقات الحوائط - جديد
export const wallComments = pgTable("wall_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => wallPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول سجل الإدارة - جديد
export const moderationLog = pgTable("moderation_log", {
  id: serial("id").primaryKey(),
  moderatorId: integer("moderator_id").notNull().references(() => users.id),
  targetUserId: integer("target_user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'mute', 'ban', 'kick', 'block', 'promote', 'demote'
  reason: text("reason").notNull(),
  duration: integer("duration"), // بالدقائق
  ipAddress: text("ip_address"),
  deviceId: text("device_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول التبليغات - جديد
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  reportedUserId: integer("reported_user_id").notNull().references(() => users.id),
  messageId: integer("message_id").references(() => messages.id),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'dismissed'
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertMessageSchema = createInsertSchema(messages);
export const insertFriendSchema = createInsertSchema(friends);
export const insertFriendRequestSchema = createInsertSchema(friendRequests);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertBlockedDeviceSchema = createInsertSchema(blockedDevices);
export const insertPointsHistorySchema = createInsertSchema(pointsHistory);
export const insertLevelSettingsSchema = createInsertSchema(levelSettings);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertWallPostSchema = createInsertSchema(wallPosts);
export const insertWallReactionSchema = createInsertSchema(wallReactions);
export const insertWallCommentSchema = createInsertSchema(wallComments);
export const insertModerationLogSchema = createInsertSchema(moderationLog);
export const insertReportSchema = createInsertSchema(reports);

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertBlockedDevice = z.infer<typeof insertBlockedDeviceSchema>;
export type BlockedDevice = typeof blockedDevices.$inferSelect;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertLevelSettings = z.infer<typeof insertLevelSettingsSchema>;
export type LevelSettings = typeof levelSettings.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertWallPost = z.infer<typeof insertWallPostSchema>;
export type WallPost = typeof wallPosts.$inferSelect;
export type InsertWallReaction = z.infer<typeof insertWallReactionSchema>;
export type WallReaction = typeof wallReactions.$inferSelect;
export type InsertWallComment = z.infer<typeof insertWallCommentSchema>;
export type WallComment = typeof wallComments.$inferSelect;
export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLog.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

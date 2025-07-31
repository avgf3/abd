import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
});

// جدول الغرف
export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("public"), // 'public', 'private', 'broadcast'
  ownerId: integer("owner_id").references(() => users.id),
  maxUsers: integer("max_users"),
  currentUsers: integer("current_users").default(0),
  isPasswordProtected: boolean("is_password_protected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  settings: jsonb("settings"), // إعدادات الغرفة كـ JSON
});

// جدول أعضاء الغرف
export const roomUsers = pgTable("room_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  roomId: text("room_id").notNull().references(() => rooms.id),
  permission: text("permission").notNull().default("view"), // 'view', 'speak', 'moderate', 'admin'
  joinedAt: timestamp("joined_at").defaultNow(),
  isMuted: boolean("is_muted").default(false),
});

// جدول الحوائط
export const wallPosts = pgTable("wall_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  type: text("type").notNull().default("public"), // 'friends', 'public'
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول تفاعلات الحوائط
export const wallReactions = pgTable("wall_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => wallPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'like', 'dislike', 'heart'
  createdAt: timestamp("created_at").defaultNow(),
});

// العلاقات
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
  friends: many(friends),
  notifications: many(notifications),
  pointsHistory: many(pointsHistory),
  roomUsers: many(roomUsers),
  wallPosts: many(wallPosts),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  owner: one(users, {
    fields: [rooms.ownerId],
    references: [users.id],
  }),
  roomUsers: many(roomUsers),
}));

export const roomUsersRelations = relations(roomUsers, ({ one }) => ({
  user: one(users, {
    fields: [roomUsers.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [roomUsers.roomId],
    references: [rooms.id],
  }),
}));

export const wallPostsRelations = relations(wallPosts, ({ one, many }) => ({
  user: one(users, {
    fields: [wallPosts.userId],
    references: [users.id],
  }),
  reactions: many(wallReactions),
}));

export const wallReactionsRelations = relations(wallReactions, ({ one }) => ({
  post: one(wallPosts, {
    fields: [wallReactions.postId],
    references: [wallPosts.id],
  }),
  user: one(users, {
    fields: [wallReactions.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertMessageSchema = createInsertSchema(messages);
export const insertFriendSchema = createInsertSchema(friends);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertBlockedDeviceSchema = createInsertSchema(blockedDevices);
export const insertPointsHistorySchema = createInsertSchema(pointsHistory);
export const insertLevelSettingsSchema = createInsertSchema(levelSettings);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertRoomUserSchema = createInsertSchema(roomUsers);
export const insertWallPostSchema = createInsertSchema(wallPosts);
export const insertWallReactionSchema = createInsertSchema(wallReactions);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;
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
export type InsertRoomUser = z.infer<typeof insertRoomUserSchema>;
export type RoomUser = typeof roomUsers.$inferSelect;
export type InsertWallPost = z.infer<typeof insertWallPostSchema>;
export type WallPost = typeof wallPosts.$inferSelect;
export type InsertWallReaction = z.infer<typeof insertWallReactionSchema>;
export type WallReaction = typeof wallReactions.$inferSelect;

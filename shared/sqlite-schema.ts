import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
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
  isOnline: integer("is_online", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false), // خاصية الإخفاء للمراقبة
  lastSeen: text("last_seen"), // ISO string في SQLite
  joinDate: text("join_date"), // ISO string في SQLite
  createdAt: text("created_at"), // تاريخ الإنشاء للتوافق مع ChatUser
  isMuted: integer("is_muted", { mode: "boolean" }).default(false),
  muteExpiry: text("mute_expiry"), // ISO string في SQLite
  isBanned: integer("is_banned", { mode: "boolean" }).default(false),
  banExpiry: text("ban_expiry"), // ISO string في SQLite
  isBlocked: integer("is_blocked", { mode: "boolean" }).default(false),
  ipAddress: text("ip_address"),
  deviceId: text("device_id"),
  ignoredUsers: text("ignored_users").default('[]'), // قائمة المستخدمين المتجاهلين - JSON string
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
  receiverId: integer("receiver_id").references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  isPrivate: integer("is_private", { mode: "boolean" }).default(false),
  roomId: text("room_id").default("general"),
  attachments: text("attachments").default("[]"), // JSON string
  editedAt: integer("edited_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Indexes for optimizing private message queries
  privateMessagesIndex: index("idx_private_messages").on(table.isPrivate, table.senderId, table.receiverId, table.timestamp),
  roomMessagesIndex: index("idx_room_messages").on(table.roomId, table.timestamp),
  senderReceiverIndex: index("idx_sender_receiver").on(table.senderId, table.receiverId),
  timestampIndex: index("idx_messages_timestamp").on(table.timestamp),
}));

export const friends = sqliteTable("friends", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  friendId: integer("friend_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'blocked'
  createdAt: text("created_at"), // ISO string في SQLite
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'system', 'friend_request', 'message', 'promotion', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  data: text("data"), // معلومات إضافية مخزنة كـ JSON string
  createdAt: text("created_at"), // ISO string في SQLite
});

// إضافة جدول blocked_devices المفقود
export const blockedDevices = sqliteTable("blocked_devices", {
  id: integer("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  deviceId: text("device_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  blockedAt: text("blocked_at").notNull(), // ISO string في SQLite
  blockedBy: integer("blocked_by").notNull(),
});

// جدول تاريخ النقاط لتتبع كيفية كسب/فقدان النقاط
export const pointsHistory = sqliteTable("points_history", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(), // النقاط المكتسبة/المفقودة (يمكن أن تكون سالبة)
  reason: text("reason").notNull(), // سبب الحصول على النقاط (رسالة، تسجيل دخول، إلخ)
  action: text("action").notNull(), // 'earn' أو 'lose'
  createdAt: text("created_at"), // ISO string في SQLite
});

// جدول إعدادات مستويات النقاط
export const levelSettings = sqliteTable("level_settings", {
  id: integer("id").primaryKey(),
  level: integer("level").notNull().unique(),
  requiredPoints: integer("required_points").notNull(), // النقاط المطلوبة للوصول لهذا المستوى
  title: text("title").notNull(), // لقب المستوى (مبتدئ، متقدم، خبير، إلخ)
  color: text("color").default('#FFFFFF'), // لون خاص بالمستوى
  badge: text("badge"), // رمز أو شارة المستوى
  createdAt: text("created_at"), // ISO string في SQLite
});

// جدول الغرف
export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: text("type").notNull().default("public"), // 'public', 'private', 'vip'
  ownerId: integer("owner_id").references(() => users.id),
  maxUsers: integer("max_users").default(50),
  isPrivate: integer("is_private", { mode: "boolean" }).default(false),
  password: text("password"),
  createdAt: text("created_at"), // ISO string في SQLite
  updatedAt: text("updated_at"), // ISO string في SQLite
});

// Relations للتوافق مع Drizzle ORM
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
  sentFriendRequests: many(friends, { relationName: "sentRequests" }),
  receivedFriendRequests: many(friends, { relationName: "receivedRequests" }),
  notifications: many(notifications),
  pointsHistory: many(pointsHistory),
  ownedRooms: many(rooms),
}));

// إضافة جدول عضويات الغرف لتتبع المستخدمين داخل الغرف
export const roomUsers = sqliteTable("room_users", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  roomId: text("room_id").notNull(),
  joinedAt: text("joined_at"), // ISO string في SQLite
});

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
    relationName: "sentRequests",
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: "receivedRequests",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const pointsHistoryRelations = relations(pointsHistory, ({ one }) => ({
  user: one(users, {
    fields: [pointsHistory.userId],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one }) => ({
  owner: one(users, {
    fields: [rooms.ownerId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertMessageSchema = createInsertSchema(messages);
export const insertFriendSchema = createInsertSchema(friends);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertRoomSchema = createInsertSchema(rooms);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Friend = typeof friends.$inferSelect;
export type NewFriend = typeof friends.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
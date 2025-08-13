import { pgTable, serial, integer, text, boolean, timestamp, jsonb, uniqueIndex, index, primaryKey, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

// جدول المحادثات الخاصة
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  // نوع المحادثة: direct (بين شخصين) أو group (مجموعة)
  type: text("type").notNull().default("direct"), 
  // اسم المحادثة (للمجموعات)
  name: text("name"),
  // صورة المحادثة (للمجموعات)
  avatar: text("avatar"),
  // معرف منشئ المحادثة (للمجموعات)
  createdBy: integer("created_by").references(() => users.id),
  // إعدادات المحادثة
  settings: jsonb("settings").default({}),
  // آخر رسالة
  lastMessageId: integer("last_message_id"),
  lastMessageAt: timestamp("last_message_at"),
  // التشفير
  isEncrypted: boolean("is_encrypted").default(false),
  encryptionKey: text("encryption_key"), // مفتاح التشفير المشترك
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("conversations_type_idx").on(table.type),
  lastMessageIdx: index("conversations_last_message_idx").on(table.lastMessageAt),
}));

// جدول المشاركين في المحادثات
export const conversationParticipants = pgTable("conversation_participants", {
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // دور المشارك في المحادثة
  role: text("role").notNull().default("member"), // member, admin, owner
  // حالة المشارك
  status: text("status").notNull().default("active"), // active, left, removed, blocked
  // آخر رسالة تم قراءتها
  lastReadMessageId: integer("last_read_message_id"),
  lastReadAt: timestamp("last_read_at"),
  // إعدادات خاصة بالمشارك
  notificationEnabled: boolean("notification_enabled").default(true),
  isMuted: boolean("is_muted").default(false),
  mutedUntil: timestamp("muted_until"),
  // تثبيت المحادثة
  isPinned: boolean("is_pinned").default(false),
  pinnedAt: timestamp("pinned_at"),
  // أرشفة المحادثة
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] }),
  userIdx: index("participants_user_idx").on(table.userId),
  statusIdx: index("participants_status_idx").on(table.status),
  lastReadIdx: index("participants_last_read_idx").on(table.lastReadAt),
}));

// جدول الرسائل الخاصة المحسّن
export const privateMessages = pgTable("private_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  // نوع الرسالة
  type: text("type").notNull().default("text"), // text, image, video, audio, file, location, sticker, gif
  // محتوى الرسالة
  content: text("content"),
  // البيانات الوصفية للرسالة (مثل حجم الملف، المدة، الإحداثيات)
  metadata: jsonb("metadata").default({}),
  // المرفقات
  attachments: jsonb("attachments").default([]),
  // الرد على رسالة
  replyToId: integer("reply_to_id").references(() => privateMessages.id),
  // التوجيه من محادثة أخرى
  forwardedFromId: integer("forwarded_from_id").references(() => privateMessages.id),
  // التعديل
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  editHistory: jsonb("edit_history").default([]),
  // الحذف
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedFor: jsonb("deleted_for").default([]), // قائمة معرفات المستخدمين الذين حذفوا الرسالة
  // التشفير
  isEncrypted: boolean("is_encrypted").default(false),
  encryptedContent: text("encrypted_content"), // المحتوى المشفر
  // حالة الرسالة
  status: text("status").notNull().default("sent"), // sending, sent, delivered, read, failed
  deliveredAt: timestamp("delivered_at"),
  // الطوابع الزمنية
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // للرسائل المؤقتة
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  createdIdx: index("messages_created_idx").on(table.createdAt),
  statusIdx: index("messages_status_idx").on(table.status),
  typeIdx: index("messages_type_idx").on(table.type),
}));

// جدول حالات القراءة للرسائل
export const messageReadReceipts = pgTable("message_read_receipts", {
  messageId: integer("message_id").notNull().references(() => privateMessages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.messageId, table.userId] }),
  userIdx: index("receipts_user_idx").on(table.userId),
}));

// جدول حالة الكتابة
export const typingIndicators = pgTable("typing_indicators", {
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // تنتهي بعد 10 ثواني
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] }),
  expiresIdx: index("typing_expires_idx").on(table.expiresAt),
}));

// جدول المسودات
export const messageDrafts = pgTable("message_drafts", {
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  replyToId: integer("reply_to_id").references(() => privateMessages.id),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] }),
}));

// جدول التفاعلات (reactions)
export const messageReactions = pgTable("message_reactions", {
  messageId: integer("message_id").notNull().references(() => privateMessages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reaction: varchar("reaction", { length: 10 }).notNull(), // emoji أو نص قصير
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.messageId, table.userId, table.reaction] }),
  messageIdx: index("reactions_message_idx").on(table.messageId),
}));

// جدول سجل المكالمات
export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  callerId: integer("caller_id").notNull().references(() => users.id),
  type: text("type").notNull(), // voice, video
  status: text("status").notNull(), // initiated, ringing, answered, declined, missed, ended
  startedAt: timestamp("started_at").defaultNow(),
  answeredAt: timestamp("answered_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // بالثواني
  participants: jsonb("participants").default([]), // قائمة المشاركين
}, (table) => ({
  conversationIdx: index("calls_conversation_idx").on(table.conversationId),
  callerIdx: index("calls_caller_idx").on(table.callerId),
  startedIdx: index("calls_started_idx").on(table.startedAt),
}));
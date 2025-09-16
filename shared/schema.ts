import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  varchar,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password'),
  userType: text('user_type').notNull().default('guest'), // 'guest', 'member', 'owner'
  role: text('role').notNull().default('guest'), // إضافة role للتوافق مع ChatUser
  profileImage: text('profile_image'),
  profileBanner: text('profile_banner'),
  profileBackgroundColor: text('profile_background_color').default('#2a2a2a'), // لون خلفية البروفايل (موحّد مع البوت)
  avatarHash: text('avatar_hash'),
  avatarVersion: integer('avatar_version').default(1),
  status: text('status'),
  gender: text('gender'),
  age: integer('age'),
  country: text('country'),
  relation: text('relation'),
  bio: text('bio'), // نبذة شخصية
  isOnline: boolean('is_online').default(false),
  isHidden: boolean('is_hidden').default(false), // خاصية الإخفاء للمراقبة
  lastSeen: timestamp('last_seen'),
  joinDate: timestamp('join_date').defaultNow(), // إضافة joinDate للتوافق مع ChatUser
  createdAt: timestamp('created_at').defaultNow(),
  isMuted: boolean('is_muted').default(false),
  muteExpiry: timestamp('mute_expiry'),
  isBanned: boolean('is_banned').default(false),
  banExpiry: timestamp('ban_expiry'),
  isBlocked: boolean('is_blocked').default(false),
  ipAddress: varchar('ip_address', { length: 45 }),
  deviceId: varchar('device_id', { length: 100 }),
  ignoredUsers: text('ignored_users').default('[]'), // قائمة المستخدمين المتجاهلين - JSON string للتوافق مع SQLite
  usernameColor: text('username_color').default('#FFFFFF'), // لون اسم المستخدم
  profileEffect: text('profile_effect').default('none'), // تأثير البروفايل
  points: integer('points').default(0), // نقاط المستخدم الحالية
  level: integer('level').default(1), // مستوى المستخدم
  totalPoints: integer('total_points').default(0), // إجمالي النقاط التي كسبها المستخدم
  levelProgress: integer('level_progress').default(0), // تقدم المستخدم في المستوى الحالي
  // موسيقى البروفايل
  profileMusicUrl: text('profile_music_url'),
  profileMusicTitle: text('profile_music_title'),
  profileMusicEnabled: boolean('profile_music_enabled').default(true),
  profileMusicVolume: integer('profile_music_volume').default(70),
  // إعداد خصوصية الرسائل الخاصة: all | friends | none
  dmPrivacy: text('dm_privacy').notNull().default('all'),
  // تفضيلات عامة
  showPointsToOthers: boolean('show_points_to_others').notNull().default(true),
  showSystemMessages: boolean('show_system_messages').notNull().default(true),
  globalSoundEnabled: boolean('global_sound_enabled').notNull().default(true),
  // الغرفة الحالية للمستخدم
  currentRoom: text('current_room').default('general'),
});

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    senderId: integer('sender_id').references(() => users.id),
    receiverId: integer('receiver_id').references(() => users.id), // null for public messages
    content: text('content').notNull(),
    messageType: text('message_type').notNull().default('text'), // 'text', 'image'
    isPrivate: boolean('is_private').default(false),
    roomId: text('room_id').default('general'), // معرف الغرفة
    attachments: jsonb('attachments').default([]),
    editedAt: timestamp('edited_at'),
    deletedAt: timestamp('deleted_at'),
    timestamp: timestamp('timestamp').defaultNow(),
  },
  (table) => ({
    // Indexes for optimizing private message queries
    privateMessagesIndex: index('idx_private_messages').on(
      table.isPrivate,
      table.senderId,
      table.receiverId,
      table.timestamp
    ),
    roomMessagesIndex: index('idx_room_messages').on(table.roomId, table.timestamp),
    senderReceiverIndex: index('idx_sender_receiver').on(table.senderId, table.receiverId),
    timestampIndex: index('idx_messages_timestamp').on(table.timestamp),
  })
);

// تفاعلات الرسائل (غرف/خاص)
export const messageReactions = pgTable(
  'message_reactions',
  {
    id: serial('id').primaryKey(),
    messageId: integer('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'like' | 'dislike' | 'heart'
    timestamp: timestamp('timestamp').defaultNow(),
  },
  (t) => ({
    // فهرس فريد لضمان تفاعل واحد لكل مستخدم لكل رسالة
    uniq: index('idx_message_reactions_unique').on(t.messageId, t.userId),
    byMessage: index('idx_message_reactions_message').on(t.messageId),
    byUser: index('idx_message_reactions_user').on(t.userId),
  })
);

export const friends = pgTable('friends', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  friendId: integer('friend_id').references(() => users.id),
  status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'blocked'
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(), // 'system', 'friend_request', 'message', 'promotion', etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  data: jsonb('data'), // معلومات إضافية
  createdAt: timestamp('created_at').defaultNow(),
});

// إضافة جدول blocked_devices المفقود
export const blockedDevices = pgTable('blocked_devices', {
  id: serial('id').primaryKey(),
  ipAddress: text('ip_address').notNull(),
  deviceId: text('device_id').notNull(),
  userId: integer('user_id').notNull(),
  reason: text('reason').notNull(),
  blockedAt: timestamp('blocked_at').notNull(),
  blockedBy: integer('blocked_by').notNull(),
});

// جدول المستخدمين VIP
export const vipUsers = pgTable('vip_users', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// جدول تاريخ النقاط لتتبع كيفية كسب/فقدان النقاط
export const pointsHistory = pgTable('points_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  points: integer('points').notNull(), // النقاط المكتسبة/المفقودة (يمكن أن تكون سالبة)
  reason: text('reason').notNull(), // سبب الحصول على النقاط (رسالة، تسجيل دخول، إلخ)
  action: text('action').notNull(), // 'earn' أو 'lose'
  createdAt: timestamp('created_at').defaultNow(),
});

// جدول إعدادات مستويات النقاط
export const levelSettings = pgTable('level_settings', {
  id: serial('id').primaryKey(),
  level: integer('level').notNull().unique(),
  requiredPoints: integer('required_points').notNull(), // النقاط المطلوبة للوصول لهذا المستوى
  title: text('title').notNull(), // لقب المستوى (مبتدئ، متقدم، خبير، إلخ)
  color: text('color').default('#FFFFFF'), // لون خاص بالمستوى
  benefits: jsonb('benefits'), // مزايا المستوى (JSON)
  createdAt: timestamp('created_at').defaultNow(),
});

// جداول الغرف الجديدة
export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  isLocked: boolean('is_locked').default(false),
  isBroadcast: boolean('is_broadcast').default(false),
  hostId: integer('host_id').references(() => users.id),
  // Chat lock settings
  chatLockAll: boolean('chat_lock_all').default(false),
  chatLockVisitors: boolean('chat_lock_visitors').default(false),
  speakers: text('speakers').default('[]'), // JSON string
  micQueue: text('mic_queue').default('[]'), // JSON string
  slug: text('slug'),
  deletedAt: timestamp('deleted_at'),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const roomUsers = pgTable('room_users', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// New: room_members pivot with per-room moderation
export const roomMembers = pgTable(
  'room_members',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    mutedUntil: timestamp('muted_until'),
    bannedUntil: timestamp('banned_until'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roomId, t.userId] }),
  })
);

// إضافة unique constraint لـ room_users
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

// جداول الحوائط
export const wallPosts = pgTable('wall_posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  username: text('username').notNull(),
  userRole: text('user_role').notNull(),
  userGender: text('user_gender'), // إضافة الجنس لعرض الشعار الصحيح
  userLevel: integer('user_level').default(1), // إضافة المستوى لعرض الشعار الصحيح
  content: text('content'),
  imageUrl: text('image_url'),
  type: text('type').notNull().default('public'), // 'public', 'friends'
  timestamp: timestamp('timestamp').defaultNow(),
  userProfileImage: text('user_profile_image'),
  usernameColor: text('username_color').default('#FFFFFF'),
  totalLikes: integer('total_likes').default(0),
  totalDislikes: integer('total_dislikes').default(0),
  totalHearts: integer('total_hearts').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wallReactions = pgTable('wall_reactions', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => wallPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  username: text('username').notNull(),
  type: text('type').notNull(), // 'like', 'dislike', 'heart'
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// جدول إعدادات الموقع العامة (لتخزين ثيم الموقع العام)
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  siteTheme: text('site_theme').default('default'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// علاقات VIP Users
export const vipUsersRelations = relations(vipUsers, ({ one }) => ({
  user: one(users, {
    fields: [vipUsers.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [vipUsers.createdBy],
    references: [users.id],
  }),
}));

// العلاقات للحوائط
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

// حالات (Stories) — صور/فيديو قصير <= 30 ثانية
export const stories = pgTable(
  'stories',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaUrl: text('media_url').notNull(),
    mediaType: text('media_type').notNull(), // 'image' | 'video'
    caption: text('caption'),
    durationSec: integer('duration_sec').notNull().default(0), // ثواني (للصور 5-7 مثلاً، للفيديو <= 30)
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    byUserCreated: index('idx_stories_user_created').on(t.userId, t.createdAt),
    expiresIdx: index('idx_stories_expires').on(t.expiresAt),
  })
);

export const storyViews = pgTable(
  'story_views',
  {
    id: serial('id').primaryKey(),
    storyId: integer('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    viewerId: integer('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at').defaultNow(),
  },
  (t) => ({
    uniqueView: index('idx_story_views_unique').on(t.storyId, t.viewerId),
    byViewer: index('idx_story_views_viewer').on(t.viewerId),
  })
);

// Reactions on stories: like / heart / dislike
export const storyReactions = pgTable(
  'story_reactions',
  {
    id: serial('id').primaryKey(),
    storyId: integer('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'like' | 'heart' | 'dislike'
    reactedAt: timestamp('reacted_at').defaultNow(),
  },
  (t) => ({
    byStory: index('idx_story_reactions_story').on(t.storyId),
    byUser: index('idx_story_reactions_user').on(t.userId),
  })
);

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
  joinDate: z.date().optional(), // إضافة joinDate
  // إضافة حقول الإدارة كاختيارية
  isMuted: z.boolean().optional(),
  muteExpiry: z.date().optional(),
  isBanned: z.boolean().optional(),
  banExpiry: z.date().optional(),
  isBlocked: z.boolean().optional(),
  ipAddress: z.string().optional(),
  deviceId: z.string().optional(),
  usernameColor: z.string().optional(),
  profileEffect: z.string().optional(),
  points: z.number().optional(),
  level: z.number().optional(),
  totalPoints: z.number().optional(),
  levelProgress: z.number().optional(),
  // خصوصية الرسائل الخاصة
  dmPrivacy: z.enum(['all', 'friends', 'none']).optional(),
});

export const insertMessageSchema = z.object({
  senderId: z.number().optional(),
  receiverId: z.number().optional(),
  content: z.string(),
  messageType: z.string().optional(),
  isPrivate: z.boolean().optional(),
  roomId: z.string().optional(),
});

export const insertMessageReactionSchema = z.object({
  messageId: z.number(),
  userId: z.number(),
  type: z.enum(['like', 'dislike', 'heart']),
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
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
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

// أنواع بيانات VIP Users
export const insertVipUserSchema = z.object({
  userId: z.number(),
  createdBy: z.number().optional(),
});

export type InsertVipUser = z.infer<typeof insertVipUserSchema>;
export type VipUser = typeof vipUsers.$inferSelect;

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

export const insertRoomSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  createdBy: z.number(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBroadcast: z.boolean().optional(),
  hostId: z.number().optional(),
  speakers: z.string().optional(),
  micQueue: z.string().optional(),
});

export const insertRoomUserSchema = z.object({
  userId: z.number(),
  roomId: z.string(),
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoomUser = z.infer<typeof insertRoomUserSchema>;
export type RoomUser = typeof roomUsers.$inferSelect;

// أنواع بيانات الحوائط
export const insertWallPostSchema = z.object({
  userId: z.number(),
  username: z.string(),
  userRole: z.string(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  type: z.string().default('public'),
  userProfileImage: z.string().optional(),
  usernameColor: z.string().optional(),
});

export const insertWallReactionSchema = z.object({
  postId: z.number(),
  userId: z.number(),
  username: z.string(),
  type: z.string(), // 'like', 'dislike', 'heart'
});

export type InsertWallPost = z.infer<typeof insertWallPostSchema>;
export type WallPost = typeof wallPosts.$inferSelect;
export type InsertWallReaction = z.infer<typeof insertWallReactionSchema>;
export type WallReaction = typeof wallReactions.$inferSelect;

// Schemas and types for Stories
export const insertStorySchema = z.object({
  userId: z.number(),
  mediaUrl: z.string(),
  mediaType: z.enum(['image', 'video']),
  caption: z.string().optional(),
  durationSec: z.number().min(0).max(30).optional(),
  expiresAt: z.date().optional(),
});

export const insertStoryViewSchema = z.object({
  storyId: z.number(),
  viewerId: z.number(),
  viewedAt: z.date().optional(),
});

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;
export type InsertStoryView = z.infer<typeof insertStoryViewSchema>;
export type StoryView = typeof storyViews.$inferSelect;

// Schemas and types for Story Reactions
export const insertStoryReactionSchema = z.object({
  storyId: z.number(),
  userId: z.number(),
  type: z.enum(['like', 'heart', 'dislike']),
  reactedAt: z.date().optional(),
});

export type InsertStoryReaction = z.infer<typeof insertStoryReactionSchema>;
export type StoryReaction = typeof storyReactions.$inferSelect;

// جدول البوتات
export const bots = pgTable('bots', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  userType: text('user_type').notNull().default('bot'),
  role: text('role').notNull().default('bot'),
  profileImage: text('profile_image'),
  profileBanner: text('profile_banner'),
  profileBackgroundColor: text('profile_background_color').default('#2a2a2a'),
  status: text('status'),
  gender: text('gender').default('غير محدد'),
  country: text('country').default('غير محدد'),
  relation: text('relation').default('غير محدد'),
  bio: text('bio').default('أنا بوت آلي'),
  isOnline: boolean('is_online').default(true),
  currentRoom: text('current_room').default('general'),
  usernameColor: text('username_color').default('#00FF00'), // لون أخضر للبوتات
  profileEffect: text('profile_effect').default('none'),
  points: integer('points').default(0),
  level: integer('level').default(1),
  totalPoints: integer('total_points').default(0),
  levelProgress: integer('level_progress').default(0),
  createdBy: integer('created_by').references(() => users.id), // من قام بإنشاء البوت
  createdAt: timestamp('created_at').defaultNow(),
  lastActivity: timestamp('last_activity').defaultNow(),
  isActive: boolean('is_active').default(true), // حالة التفعيل للبوت
  botType: text('bot_type').default('system'), // نوع البوت: system, chat, moderator
  settings: jsonb('settings').default({}), // إعدادات إضافية للبوت
});

// علاقات البوتات
export const botsRelations = relations(bots, ({ one }) => ({
  creator: one(users, {
    fields: [bots.createdBy],
    references: [users.id],
  }),
}));

// مخطط إدخال البوت
export const insertBotSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  userType: z.literal('bot').default('bot'),
  role: z.literal('bot').default('bot'),
  profileImage: z.string().optional(),
  profileBanner: z.string().optional(),
  profileBackgroundColor: z.string().optional(),
  status: z.string().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  relation: z.string().optional(),
  bio: z.string().optional(),
  currentRoom: z.string().default('general'),
  usernameColor: z.string().optional(),
  profileEffect: z.string().optional(),
  botType: z.enum(['system', 'chat', 'moderator']).default('system'),
  settings: z.record(z.any()).optional(),
});

export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof bots.$inferSelect;

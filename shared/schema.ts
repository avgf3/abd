import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  userType: text("user_type").notNull().default("guest"), // 'guest', 'member', 'owner'
  profileImage: text("profile_image"),
  status: text("status"),
  gender: text("gender"),
  age: integer("age"),
  country: text("country"),
  relation: text("relation"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  joinDate: timestamp("join_date").defaultNow(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  userType: true,
  profileImage: true,
  status: true,
  gender: true,
  age: true,
  country: true,
  relation: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  messageType: true,
  isPrivate: true,
});

export const insertFriendSchema = createInsertSchema(friends).pick({
  userId: true,
  friendId: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

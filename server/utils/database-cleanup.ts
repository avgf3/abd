import { db } from "../database-adapter";
import { users, messages } from "../../shared/schema";
import { eq, lt, and, sql } from "drizzle-orm";

export interface CleanupResults {
  orphanedMessages: number;
  invalidMessages: number;
  oldGuestUsers: number;
  totalUsers: number;
  totalMessages: number;
  onlineUsers: number;
  guestUsers: number;
  registeredUsers: number;
}

export async function cleanupOrphanedMessages(): Promise<number> {
  try {
    if (!db) return 0;
    
    const existingUsers = await db.select({ id: users.id }).from(users);
    const existingUserIds = existingUsers.map((u: any) => u.id);
    
    if (existingUserIds.length === 0) return 0;
    
    const deletedMessages = await db
      .delete(messages)
      .where(
        and(
          sql`${messages.senderId} IS NOT NULL`,
          sql`${messages.senderId} NOT IN (${existingUserIds.join(',')})`
        )
      );
    
    return deletedMessages.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up orphaned messages:', error);
    return 0;
  }
}

export async function cleanupInvalidMessages(): Promise<number> {
  try {
    if (!db) return 0;
    
    const existingUsers = await db.select({ id: users.id }).from(users);
    const existingUserIds = existingUsers.map((u: any) => u.id);
    
    if (existingUserIds.length === 0) return 0;
    
    const deletedMessages = await db
      .delete(messages)
      .where(
        and(
          sql`${messages.receiverId} IS NOT NULL`,
          sql`${messages.receiverId} NOT IN (${existingUserIds.join(',')})`
        )
      );
    
    return deletedMessages.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up invalid messages:', error);
    return 0;
  }
}

export async function cleanupOldGuestUsers(): Promise<number> {
  try {
    if (!db) return 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedUsers = await db
      .delete(users)
      .where(
        and(
          eq(users.userType, 'guest'),
          lt(users.createdAt, thirtyDaysAgo)
        )
      );
    
    return deletedUsers.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up old guest users:', error);
    return 0;
  }
}

export async function performDatabaseCleanup(): Promise<CleanupResults> {
  try {
    const orphanedMessages = await cleanupOrphanedMessages();
    const invalidMessages = await cleanupInvalidMessages();
    const oldGuestUsers = await cleanupOldGuestUsers();
    
    const results: CleanupResults = {
      orphanedMessages,
      invalidMessages,
      oldGuestUsers,
      totalUsers: 0,
      totalMessages: 0,
      onlineUsers: 0,
      guestUsers: 0,
      registeredUsers: 0
    };
    
    // Get database statistics
    if (db) {
      const [totalUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      const [totalMessagesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages);
      
      const [onlineUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isOnline, true));
      
      const [guestUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.userType, 'guest'));
      
      const [registeredUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.userType, 'member'));
      
      results.totalUsers = totalUsersResult?.count || 0;
      results.totalMessages = totalMessagesResult?.count || 0;
      results.onlineUsers = onlineUsersResult?.count || 0;
      results.guestUsers = guestUsersResult?.count || 0;
      results.registeredUsers = registeredUsersResult?.count || 0;
    }
    
    return results;
  } catch (error) {
    console.error('Error performing database cleanup:', error);
    return {
      orphanedMessages: 0,
      invalidMessages: 0,
      oldGuestUsers: 0,
      totalUsers: 0,
      totalMessages: 0,
      onlineUsers: 0,
      guestUsers: 0,
      registeredUsers: 0
    };
  }
}
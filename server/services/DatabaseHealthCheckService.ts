import { db } from '../database-adapter';
import { rooms, roomUsers, users, messages, notifications } from '../../shared/schema';
import { eq, and, sql, isNull, isNotNull, count, desc, asc } from 'drizzle-orm';
import { enhancedRoomService } from './EnhancedRoomService';
import { storage } from '../storage';

export interface HealthCheckResult {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  checks: {
    database: DatabaseHealthCheck;
    rooms: RoomHealthCheck;
    users: UserHealthCheck;
    messages: MessageHealthCheck;
    relationships: RelationshipHealthCheck;
    performance: PerformanceHealthCheck;
  };
  recommendations: string[];
  errors: string[];
}

export interface DatabaseHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  connection: boolean;
  tables: {
    rooms: boolean;
    users: boolean;
    messages: boolean;
    notifications: boolean;
    roomUsers: boolean;
  };
  errors: string[];
}

export interface RoomHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  totalRooms: number;
  activeRooms: number;
  inactiveRooms: number;
  orphanedRooms: number;
  roomsWithoutCreator: number;
  duplicateRoomIds: string[];
  errors: string[];
}

export interface UserHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  totalUsers: number;
  onlineUsers: number;
  offlineUsers: number;
  usersWithoutRooms: number;
  duplicateUsernames: string[];
  usersWithInvalidData: number;
  errors: string[];
}

export interface MessageHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  totalMessages: number;
  messagesWithoutSender: number;
  messagesWithoutRoom: number;
  orphanedMessages: number;
  recentMessages: number;
  errors: string[];
}

export interface RelationshipHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  totalRoomUsers: number;
  orphanedRoomUsers: number;
  duplicateRoomUsers: number;
  usersInNonExistentRooms: number;
  roomsWithoutUsers: number;
  errors: string[];
}

export interface PerformanceHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  slowQueries: number;
  largeTables: {
    messages: number;
    notifications: number;
    roomUsers: number;
  };
  indexIssues: string[];
  errors: string[];
}

export class DatabaseHealthCheckService {
  private readonly WARNING_THRESHOLDS = {
    orphanedRooms: 5,
    orphanedUsers: 10,
    orphanedMessages: 50,
    duplicateRecords: 3,
    largeTableSize: 10000,
  };

  private readonly CRITICAL_THRESHOLDS = {
    orphanedRooms: 20,
    orphanedUsers: 50,
    orphanedMessages: 200,
    duplicateRecords: 10,
    largeTableSize: 50000,
  };

  async performFullHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabaseHealth(),
        rooms: await this.checkRoomHealth(),
        users: await this.checkUserHealth(),
        messages: await this.checkMessageHealth(),
        relationships: await this.checkRelationshipHealth(),
        performance: await this.checkPerformanceHealth(),
      },
      recommendations: [],
      errors: [],
    };

    // Determine overall health status
    const checkStatuses = Object.values(result.checks).map(check => check.status);
    if (checkStatuses.includes('critical')) {
      result.overall = 'critical';
    } else if (checkStatuses.includes('warning')) {
      result.overall = 'warning';
    }

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result.checks);

    return result;
  }

  // ==================== DATABASE HEALTH CHECKS ====================

  private async checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
    const check: DatabaseHealthCheck = {
      status: 'healthy',
      connection: false,
      tables: {
        rooms: false,
        users: false,
        messages: false,
        notifications: false,
        roomUsers: false,
      },
      errors: [],
    };

    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);
      check.connection = true;

      // Check if tables exist
      const tableChecks = await Promise.allSettled([
        db.select({ count: count() }).from(rooms).limit(1),
        db.select({ count: count() }).from(users).limit(1),
        db.select({ count: count() }).from(messages).limit(1),
        db.select({ count: count() }).from(notifications).limit(1),
        db.select({ count: count() }).from(roomUsers).limit(1),
      ]);

      check.tables.rooms = tableChecks[0].status === 'fulfilled';
      check.tables.users = tableChecks[1].status === 'fulfilled';
      check.tables.messages = tableChecks[2].status === 'fulfilled';
      check.tables.notifications = tableChecks[3].status === 'fulfilled';
      check.tables.roomUsers = tableChecks[4].status === 'fulfilled';

      // Check for table issues
      const missingTables = Object.entries(check.tables)
        .filter(([_, exists]) => !exists)
        .map(([table]) => table);

      if (missingTables.length > 0) {
        check.status = 'critical';
        check.errors.push(`Missing tables: ${missingTables.join(', ')}`);
      }

    } catch (error) {
      check.status = 'critical';
      check.errors.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return check;
  }

  private async checkRoomHealth(): Promise<RoomHealthCheck> {
    const check: RoomHealthCheck = {
      status: 'healthy',
      totalRooms: 0,
      activeRooms: 0,
      inactiveRooms: 0,
      orphanedRooms: 0,
      roomsWithoutCreator: 0,
      duplicateRoomIds: [],
      errors: [],
    };

    try {
      // Get room statistics
      const [totalRooms, activeRooms, inactiveRooms] = await Promise.all([
        db.select({ count: count() }).from(rooms),
        db.select({ count: count() }).from(rooms).where(eq(rooms.isActive, true)),
        db.select({ count: count() }).from(rooms).where(eq(rooms.isActive, false)),
      ]);

      check.totalRooms = totalRooms[0]?.count || 0;
      check.activeRooms = activeRooms[0]?.count || 0;
      check.inactiveRooms = inactiveRooms[0]?.count || 0;

      // Check for rooms without creators
      const roomsWithoutCreator = await db.select()
        .from(rooms)
        .leftJoin(users, eq(rooms.createdBy, users.id))
        .where(isNull(users.id));

      check.roomsWithoutCreator = roomsWithoutCreator.length;

      // Check for duplicate room IDs
      const duplicateRoomIds = await db.select({ id: rooms.id })
        .from(rooms)
        .groupBy(rooms.id)
        .having(sql`count(*) > 1`);

      check.duplicateRoomIds = duplicateRoomIds.map(row => row.id);

      // Check for orphaned rooms (rooms with no users)
      const orphanedRooms = await db.select({ id: rooms.id })
        .from(rooms)
        .leftJoin(roomUsers, eq(rooms.id, roomUsers.roomId))
        .where(isNull(roomUsers.roomId));

      check.orphanedRooms = orphanedRooms.length;

      // Determine status
      if (check.roomsWithoutCreator > this.CRITICAL_THRESHOLDS.orphanedRooms ||
          check.duplicateRoomIds.length > this.CRITICAL_THRESHOLDS.duplicateRecords) {
        check.status = 'critical';
      } else if (check.roomsWithoutCreator > this.WARNING_THRESHOLDS.orphanedRooms ||
                 check.duplicateRoomIds.length > this.WARNING_THRESHOLDS.duplicateRecords) {
        check.status = 'warning';
      }

      // Add errors
      if (check.roomsWithoutCreator > 0) {
        check.errors.push(`${check.roomsWithoutCreator} rooms without valid creators`);
      }
      if (check.duplicateRoomIds.length > 0) {
        check.errors.push(`${check.duplicateRoomIds.length} duplicate room IDs found`);
      }
      if (check.orphanedRooms > 0) {
        check.errors.push(`${check.orphanedRooms} orphaned rooms (no users)`);
      }

    } catch (error) {
      check.status = 'critical';
      check.errors.push(`Room health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return check;
  }

  private async checkUserHealth(): Promise<UserHealthCheck> {
    const check: UserHealthCheck = {
      status: 'healthy',
      totalUsers: 0,
      onlineUsers: 0,
      offlineUsers: 0,
      usersWithoutRooms: 0,
      duplicateUsernames: [],
      usersWithInvalidData: 0,
      errors: [],
    };

    try {
      // Get user statistics
      const [totalUsers, onlineUsers, offlineUsers] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(eq(users.isOnline, true)),
        db.select({ count: count() }).from(users).where(eq(users.isOnline, false)),
      ]);

      check.totalUsers = totalUsers[0]?.count || 0;
      check.onlineUsers = onlineUsers[0]?.count || 0;
      check.offlineUsers = offlineUsers[0]?.count || 0;

      // Check for users without rooms
      const usersWithoutRooms = await db.select({ id: users.id })
        .from(users)
        .leftJoin(roomUsers, eq(users.id, roomUsers.userId))
        .where(isNull(roomUsers.roomId));

      check.usersWithoutRooms = usersWithoutRooms.length;

      // Check for duplicate usernames
      const duplicateUsernames = await db.select({ username: users.username })
        .from(users)
        .groupBy(users.username)
        .having(sql`count(*) > 1`);

      check.duplicateUsernames = duplicateUsernames.map(row => row.username);

      // Check for users with invalid data
      const usersWithInvalidData = await db.select({ id: users.id })
        .from(users)
        .where(
          and(
            isNull(users.username),
            sql`${users.username} = ''`,
            sql`length(${users.username}) < 3`
          )
        );

      check.usersWithInvalidData = usersWithInvalidData.length;

      // Determine status
      if (check.usersWithoutRooms > this.CRITICAL_THRESHOLDS.orphanedUsers ||
          check.duplicateUsernames.length > this.CRITICAL_THRESHOLDS.duplicateRecords ||
          check.usersWithInvalidData > this.CRITICAL_THRESHOLDS.orphanedUsers) {
        check.status = 'critical';
      } else if (check.usersWithoutRooms > this.WARNING_THRESHOLDS.orphanedUsers ||
                 check.duplicateUsernames.length > this.WARNING_THRESHOLDS.duplicateRecords ||
                 check.usersWithInvalidData > this.WARNING_THRESHOLDS.orphanedUsers) {
        check.status = 'warning';
      }

      // Add errors
      if (check.usersWithoutRooms > 0) {
        check.errors.push(`${check.usersWithoutRooms} users not in any rooms`);
      }
      if (check.duplicateUsernames.length > 0) {
        check.errors.push(`${check.duplicateUsernames.length} duplicate usernames found`);
      }
      if (check.usersWithInvalidData > 0) {
        check.errors.push(`${check.usersWithInvalidData} users with invalid data`);
      }

    } catch (error) {
      check.status = 'critical';
      check.errors.push(`User health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return check;
  }

  private async checkMessageHealth(): Promise<MessageHealthCheck> {
    const check: MessageHealthCheck = {
      status: 'healthy',
      totalMessages: 0,
      messagesWithoutSender: 0,
      messagesWithoutRoom: 0,
      orphanedMessages: 0,
      recentMessages: 0,
      errors: [],
    };

    try {
      // Get message statistics
      const [totalMessages, recentMessages] = await Promise.all([
        db.select({ count: count() }).from(messages),
        db.select({ count: count() }).from(messages)
          .where(sql`${messages.timestamp} > NOW() - INTERVAL '24 hours'`),
      ]);

      check.totalMessages = totalMessages[0]?.count || 0;
      check.recentMessages = recentMessages[0]?.count || 0;

      // Check for messages without senders
      const messagesWithoutSender = await db.select({ id: messages.id })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(isNull(users.id));

      check.messagesWithoutSender = messagesWithoutSender.length;

      // Check for messages without rooms
      const messagesWithoutRoom = await db.select({ id: messages.id })
        .from(messages)
        .leftJoin(rooms, eq(messages.roomId, rooms.id))
        .where(isNull(rooms.id));

      check.messagesWithoutRoom = messagesWithoutRoom.length;

      // Check for orphaned messages (no sender and no room)
      const orphanedMessages = await db.select({ id: messages.id })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(rooms, eq(messages.roomId, rooms.id))
        .where(and(isNull(users.id), isNull(rooms.id)));

      check.orphanedMessages = orphanedMessages.length;

      // Determine status
      if (check.messagesWithoutSender > this.CRITICAL_THRESHOLDS.orphanedMessages ||
          check.messagesWithoutRoom > this.CRITICAL_THRESHOLDS.orphanedMessages) {
        check.status = 'critical';
      } else if (check.messagesWithoutSender > this.WARNING_THRESHOLDS.orphanedMessages ||
                 check.messagesWithoutRoom > this.WARNING_THRESHOLDS.orphanedMessages) {
        check.status = 'warning';
      }

      // Add errors
      if (check.messagesWithoutSender > 0) {
        check.errors.push(`${check.messagesWithoutSender} messages without valid senders`);
      }
      if (check.messagesWithoutRoom > 0) {
        check.errors.push(`${check.messagesWithoutRoom} messages without valid rooms`);
      }
      if (check.orphanedMessages > 0) {
        check.errors.push(`${check.orphanedMessages} orphaned messages`);
      }

    } catch (error) {
      check.status = 'critical';
      check.errors.push(`Message health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return check;
  }

  private async checkRelationshipHealth(): Promise<RelationshipHealthCheck> {
    const check: RelationshipHealthCheck = {
      status: 'healthy',
      totalRoomUsers: 0,
      orphanedRoomUsers: 0,
      duplicateRoomUsers: 0,
      usersInNonExistentRooms: 0,
      roomsWithoutUsers: 0,
      errors: [],
    };

    try {
      // Get total room users
      const totalRoomUsers = await db.select({ count: count() }).from(roomUsers);
      check.totalRoomUsers = totalRoomUsers[0]?.count || 0;

      // Check for orphaned room users (no valid user or room)
      const orphanedRoomUsers = await db.select({ id: roomUsers.id })
        .from(roomUsers)
        .leftJoin(users, eq(roomUsers.userId, users.id))
        .leftJoin(rooms, eq(roomUsers.roomId, rooms.id))
        .where(and(isNull(users.id), isNull(rooms.id)));

      check.orphanedRoomUsers = orphanedRoomUsers.length;

      // Check for duplicate room users
      const duplicateRoomUsers = await db.select({ userId: roomUsers.userId, roomId: roomUsers.roomId })
        .from(roomUsers)
        .groupBy(roomUsers.userId, roomUsers.roomId)
        .having(sql`count(*) > 1`);

      check.duplicateRoomUsers = duplicateRoomUsers.length;

      // Check for users in non-existent rooms
      const usersInNonExistentRooms = await db.select({ id: roomUsers.id })
        .from(roomUsers)
        .leftJoin(rooms, eq(roomUsers.roomId, rooms.id))
        .where(isNull(rooms.id));

      check.usersInNonExistentRooms = usersInNonExistentRooms.length;

      // Check for rooms without users
      const roomsWithoutUsers = await db.select({ id: rooms.id })
        .from(rooms)
        .leftJoin(roomUsers, eq(rooms.id, roomUsers.roomId))
        .where(isNull(roomUsers.roomId));

      check.roomsWithoutUsers = roomsWithoutUsers.length;

      // Determine status
      if (check.orphanedRoomUsers > this.CRITICAL_THRESHOLDS.orphanedUsers ||
          check.duplicateRoomUsers > this.CRITICAL_THRESHOLDS.duplicateRecords) {
        check.status = 'critical';
      } else if (check.orphanedRoomUsers > this.WARNING_THRESHOLDS.orphanedUsers ||
                 check.duplicateRoomUsers > this.WARNING_THRESHOLDS.duplicateRecords) {
        check.status = 'warning';
      }

      // Add errors
      if (check.orphanedRoomUsers > 0) {
        check.errors.push(`${check.orphanedRoomUsers} orphaned room user relationships`);
      }
      if (check.duplicateRoomUsers > 0) {
        check.errors.push(`${check.duplicateRoomUsers} duplicate room user relationships`);
      }
      if (check.usersInNonExistentRooms > 0) {
        check.errors.push(`${check.usersInNonExistentRooms} users in non-existent rooms`);
      }
      if (check.roomsWithoutUsers > 0) {
        check.errors.push(`${check.roomsWithoutUsers} rooms without users`);
      }

    } catch (error) {
      check.status = 'critical';
      check.errors.push(`Relationship health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return check;
  }

  private async checkPerformanceHealth(): Promise<PerformanceHealthCheck> {
    const check: PerformanceHealthCheck = {
      status: 'healthy',
      slowQueries: 0,
      largeTables: {
        messages: 0,
        notifications: 0,
        roomUsers: 0,
      },
      indexIssues: [],
      errors: [],
    };

    try {
      // Check table sizes
      const [messageCount, notificationCount, roomUserCount] = await Promise.all([
        db.select({ count: count() }).from(messages),
        db.select({ count: count() }).from(notifications),
        db.select({ count: count() }).from(roomUsers),
      ]);

      check.largeTables.messages = messageCount[0]?.count || 0;
      check.largeTables.notifications = notificationCount[0]?.count || 0;
      check.largeTables.roomUsers = roomUserCount[0]?.count || 0;

      // Check for performance issues
      if (check.largeTables.messages > this.CRITICAL_THRESHOLDS.largeTableSize ||
          check.largeTables.notifications > this.CRITICAL_THRESHOLDS.largeTableSize) {
        check.status = 'critical';
      } else if (check.largeTables.messages > this.WARNING_THRESHOLDS.largeTableSize ||
                 check.largeTables.notifications > this.WARNING_THRESHOLDS.largeTableSize) {
        check.status = 'warning';
      }

      // Add warnings for large tables
      if (check.largeTables.messages > this.WARNING_THRESHOLDS.largeTableSize) {
        check.indexIssues.push(`Messages table is large (${check.largeTables.messages} records)`);
      }
      if (check.largeTables.notifications > this.WARNING_THRESHOLDS.largeTableSize) {
        check.indexIssues.push(`Notifications table is large (${check.largeTables.notifications} records)`);
      }

    } catch (error) {
      check.status = 'critical';
      check.errors.push(`Performance health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return check;
  }

  // ==================== UTILITY FUNCTIONS ====================

  private generateRecommendations(checks: HealthCheckResult['checks']): string[] {
    const recommendations: string[] = [];

    // Database recommendations
    if (checks.database.status === 'critical') {
      recommendations.push('Fix database connection issues immediately');
    }

    // Room recommendations
    if (checks.rooms.roomsWithoutCreator > 0) {
      recommendations.push('Assign valid creators to rooms without creators');
    }
    if (checks.rooms.duplicateRoomIds.length > 0) {
      recommendations.push('Remove duplicate room IDs');
    }
    if (checks.rooms.orphanedRooms > 0) {
      recommendations.push('Consider removing or repopulating orphaned rooms');
    }

    // User recommendations
    if (checks.users.duplicateUsernames.length > 0) {
      recommendations.push('Resolve duplicate usernames');
    }
    if (checks.users.usersWithInvalidData > 0) {
      recommendations.push('Fix users with invalid data');
    }
    if (checks.users.usersWithoutRooms > 0) {
      recommendations.push('Add users to appropriate rooms');
    }

    // Message recommendations
    if (checks.messages.messagesWithoutSender > 0) {
      recommendations.push('Clean up messages without valid senders');
    }
    if (checks.messages.messagesWithoutRoom > 0) {
      recommendations.push('Clean up messages without valid rooms');
    }

    // Relationship recommendations
    if (checks.relationships.orphanedRoomUsers > 0) {
      recommendations.push('Clean up orphaned room user relationships');
    }
    if (checks.relationships.duplicateRoomUsers > 0) {
      recommendations.push('Remove duplicate room user relationships');
    }

    // Performance recommendations
    if (checks.performance.largeTables.messages > this.WARNING_THRESHOLDS.largeTableSize) {
      recommendations.push('Consider archiving old messages or implementing pagination');
    }
    if (checks.performance.largeTables.notifications > this.WARNING_THRESHOLDS.largeTableSize) {
      recommendations.push('Consider cleaning up old notifications');
    }

    return recommendations;
  }

  // ==================== FIX FUNCTIONS ====================

  async fixOrphanedRoomUsers(): Promise<{ fixed: number; errors: string[] }> {
    const result = { fixed: 0, errors: [] as string[] };

    try {
      // Find orphaned room users
      const orphanedRoomUsers = await db.select({ id: roomUsers.id })
        .from(roomUsers)
        .leftJoin(users, eq(roomUsers.userId, users.id))
        .leftJoin(rooms, eq(roomUsers.roomId, rooms.id))
        .where(and(isNull(users.id), isNull(rooms.id)));

      // Delete orphaned relationships
      for (const orphaned of orphanedRoomUsers) {
        try {
          await db.delete(roomUsers).where(eq(roomUsers.id, orphaned.id));
          result.fixed++;
        } catch (error) {
          result.errors.push(`Failed to delete orphaned room user ${orphaned.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`✅ Fixed ${result.fixed} orphaned room user relationships`);
    } catch (error) {
      result.errors.push(`Failed to fix orphaned room users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  async fixOrphanedMessages(): Promise<{ fixed: number; errors: string[] }> {
    const result = { fixed: 0, errors: [] as string[] };

    try {
      // Find orphaned messages
      const orphanedMessages = await db.select({ id: messages.id })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .leftJoin(rooms, eq(messages.roomId, rooms.id))
        .where(and(isNull(users.id), isNull(rooms.id)));

      // Delete orphaned messages
      for (const orphaned of orphanedMessages) {
        try {
          await db.delete(messages).where(eq(messages.id, orphaned.id));
          result.fixed++;
        } catch (error) {
          result.errors.push(`Failed to delete orphaned message ${orphaned.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`✅ Fixed ${result.fixed} orphaned messages`);
    } catch (error) {
      result.errors.push(`Failed to fix orphaned messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  async cleanupOldData(options: {
    deleteOldMessages?: boolean;
    deleteOldNotifications?: boolean;
    messageAgeDays?: number;
    notificationAgeDays?: number;
  } = {}): Promise<{ deletedMessages: number; deletedNotifications: number; errors: string[] }> {
    const result = { deletedMessages: 0, deletedNotifications: 0, errors: [] as string[] };

    try {
      if (options.deleteOldMessages && options.messageAgeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.messageAgeDays);

        const deletedMessages = await db.delete(messages)
          .where(sql`${messages.timestamp} < ${cutoffDate}`);

        result.deletedMessages = deletedMessages.rowCount || 0;
        console.log(`🗑️ Deleted ${result.deletedMessages} old messages`);
      }

      if (options.deleteOldNotifications && options.notificationAgeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.notificationAgeDays);

        const deletedNotifications = await db.delete(notifications)
          .where(sql`${notifications.createdAt} < ${cutoffDate}`);

        result.deletedNotifications = deletedNotifications.rowCount || 0;
        console.log(`🗑️ Deleted ${result.deletedNotifications} old notifications`);
      }
    } catch (error) {
      result.errors.push(`Failed to cleanup old data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

// Create singleton instance
export const databaseHealthCheckService = new DatabaseHealthCheckService();
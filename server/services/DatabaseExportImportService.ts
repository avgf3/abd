import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { enhancedRoomService } from './EnhancedRoomService';
import { storage } from '../storage';
import { db } from '../database-adapter';
import { rooms, roomUsers, users, messages, notifications } from '../../shared/schema';
import type { User, Room, Message, Notification } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { readdir, unlink } from 'fs/promises';

export interface ExportData {
  version: string;
  timestamp: string;
  rooms: Room[];
  users: User[];
  messages: Message[];
  notifications: Notification[];
  roomUsers: any[];
  metadata: {
    totalRooms: number;
    totalUsers: number;
    totalMessages: number;
    totalNotifications: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    rooms: number;
    users: number;
    messages: number;
    notifications: number;
    roomUsers: number;
  };
  errors: string[];
  warnings: string[];
}

export interface BackupConfig {
  includeUsers: boolean;
  includeMessages: boolean;
  includeNotifications: boolean;
  includeRoomUsers: boolean;
  compressBackup: boolean;
  backupPath: string;
}

export class DatabaseExportImportService {
  private defaultBackupPath = './backups';
  private currentVersion = '1.0.0';

  constructor() {
    this.ensureBackupDirectory();
  }

  // ==================== EXPORT FUNCTIONS ====================

  async exportAllData(config: Partial<BackupConfig> = {}): Promise<ExportData> {
    try {
      console.log('🔄 Starting full database export...');

      const exportData: ExportData = {
        version: this.currentVersion,
        timestamp: new Date().toISOString(),
        rooms: [],
        users: [],
        messages: [],
        notifications: [],
        roomUsers: [],
        metadata: {
          totalRooms: 0,
          totalUsers: 0,
          totalMessages: 0,
          totalNotifications: 0,
        }
      };

      // Export rooms
      if (config.includeUsers !== false) {
        console.log('📦 Exporting rooms...');
        exportData.rooms = await this.exportRooms();
        exportData.metadata.totalRooms = exportData.rooms.length;
      }

      // Export users
      if (config.includeUsers !== false) {
        console.log('👥 Exporting users...');
        exportData.users = await this.exportUsers();
        exportData.metadata.totalUsers = exportData.users.length;
      }

      // Export messages
      if (config.includeMessages !== false) {
        console.log('💬 Exporting messages...');
        exportData.messages = await this.exportMessages();
        exportData.metadata.totalMessages = exportData.messages.length;
      }

      // Export notifications
      if (config.includeNotifications !== false) {
        console.log('🔔 Exporting notifications...');
        exportData.notifications = await this.exportNotifications();
        exportData.metadata.totalNotifications = exportData.notifications.length;
      }

      // Export room users
      if (config.includeRoomUsers !== false) {
        console.log('🏠 Exporting room users...');
        exportData.roomUsers = await this.exportRoomUsers();
      }

      console.log('✅ Database export completed successfully');
      return exportData;
    } catch (error) {
      console.error('❌ Database export failed:', error);
      throw error;
    }
  }

  async exportRooms(): Promise<Room[]> {
    try {
      const allRooms = await enhancedRoomService.getAllRooms({}, true);
      return allRooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        icon: room.icon,
        createdBy: room.createdBy,
        isDefault: room.isDefault,
        isActive: room.isActive,
        isBroadcast: room.isBroadcast,
        isPrivate: room.isPrivate,
        maxUsers: room.maxUsers,
        hostId: room.hostId,
        category: room.category,
        tags: room.tags,
        speakers: room.speakers,
        micQueue: room.micQueue,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      }));
    } catch (error) {
      console.error('Error exporting rooms:', error);
      throw error;
    }
  }

  async exportUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      return allUsers.map(user => ({
        ...user,
        ignoredUsers: user.ignoredUsers ? JSON.parse(user.ignoredUsers) : []
      }));
    } catch (error) {
      console.error('Error exporting users:', error);
      throw error;
    }
  }

  async exportMessages(): Promise<Message[]> {
    try {
      return await db.select().from(messages);
    } catch (error) {
      console.error('Error exporting messages:', error);
      throw error;
    }
  }

  async exportNotifications(): Promise<Notification[]> {
    try {
      return await db.select().from(notifications);
    } catch (error) {
      console.error('Error exporting notifications:', error);
      throw error;
    }
  }

  async exportRoomUsers(): Promise<any[]> {
    try {
      return await db.select().from(roomUsers);
    } catch (error) {
      console.error('Error exporting room users:', error);
      throw error;
    }
  }

  // ==================== IMPORT FUNCTIONS ====================

  async importData(exportData: ExportData, options: {
    overwriteExisting?: boolean;
    skipUsers?: boolean;
    skipMessages?: boolean;
    skipNotifications?: boolean;
    skipRoomUsers?: boolean;
  } = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: {
        rooms: 0,
        users: 0,
        messages: 0,
        notifications: 0,
        roomUsers: 0,
      },
      errors: [],
      warnings: []
    };

    try {
      console.log('🔄 Starting database import...');

      // Validate export data
      if (!this.validateExportData(exportData)) {
        result.success = false;
        result.errors.push('Invalid export data format');
        return result;
      }

      // Import rooms
      if (exportData.rooms && exportData.rooms.length > 0) {
        console.log('📦 Importing rooms...');
        const roomResult = await this.importRooms(exportData.rooms, options.overwriteExisting);
        result.imported.rooms = roomResult.imported;
        result.errors.push(...roomResult.errors);
        result.warnings.push(...roomResult.warnings);
      }

      // Import users
      if (!options.skipUsers && exportData.users && exportData.users.length > 0) {
        console.log('👥 Importing users...');
        const userResult = await this.importUsers(exportData.users, options.overwriteExisting);
        result.imported.users = userResult.imported;
        result.errors.push(...userResult.errors);
        result.warnings.push(...userResult.warnings);
      }

      // Import messages
      if (!options.skipMessages && exportData.messages && exportData.messages.length > 0) {
        console.log('💬 Importing messages...');
        const messageResult = await this.importMessages(exportData.messages, options.overwriteExisting);
        result.imported.messages = messageResult.imported;
        result.errors.push(...messageResult.errors);
        result.warnings.push(...messageResult.warnings);
      }

      // Import notifications
      if (!options.skipNotifications && exportData.notifications && exportData.notifications.length > 0) {
        console.log('🔔 Importing notifications...');
        const notificationResult = await this.importNotifications(exportData.notifications, options.overwriteExisting);
        result.imported.notifications = notificationResult.imported;
        result.errors.push(...notificationResult.errors);
        result.warnings.push(...notificationResult.warnings);
      }

      // Import room users
      if (!options.skipRoomUsers && exportData.roomUsers && exportData.roomUsers.length > 0) {
        console.log('🏠 Importing room users...');
        const roomUserResult = await this.importRoomUsers(exportData.roomUsers, options.overwriteExisting);
        result.imported.roomUsers = roomUserResult.imported;
        result.errors.push(...roomUserResult.errors);
        result.warnings.push(...roomUserResult.warnings);
      }

      console.log('✅ Database import completed');
      return result;
    } catch (error) {
      console.error('❌ Database import failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async importRooms(rooms: Room[], overwriteExisting: boolean = false): Promise<{ imported: number; errors: string[]; warnings: string[] }> {
    const result = { imported: 0, errors: [] as string[], warnings: [] as string[] };

    for (const room of rooms) {
      try {
        const existingRoom = await enhancedRoomService.getRoom(room.id);
        
        if (existingRoom && !overwriteExisting) {
          result.warnings.push(`Room ${room.id} already exists, skipping`);
          continue;
        }

        if (existingRoom && overwriteExisting) {
          await enhancedRoomService.updateRoom(room.id, room);
          result.warnings.push(`Room ${room.id} updated`);
        } else {
          await enhancedRoomService.createRoom({
            id: room.id,
            name: room.name,
            description: room.description,
            icon: room.icon,
            createdBy: room.createdBy,
            isDefault: room.isDefault,
            isBroadcast: room.isBroadcast,
            isPrivate: room.isPrivate,
            maxUsers: room.maxUsers,
            hostId: room.hostId,
            category: room.category,
            tags: room.tags,
          });
        }

        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import room ${room.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private async importUsers(users: User[], overwriteExisting: boolean = false): Promise<{ imported: number; errors: string[]; warnings: string[] }> {
    const result = { imported: 0, errors: [] as string[], warnings: [] as string[] };

    for (const user of users) {
      try {
        const existingUser = await storage.getUser(user.id);
        
        if (existingUser && !overwriteExisting) {
          result.warnings.push(`User ${user.username} already exists, skipping`);
          continue;
        }

        if (existingUser && overwriteExisting) {
          await storage.updateUser(user.id, user);
          result.warnings.push(`User ${user.username} updated`);
        } else {
          await storage.createUser(user);
        }

        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import user ${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private async importMessages(messages: Message[], overwriteExisting: boolean = false): Promise<{ imported: number; errors: string[]; warnings: string[] }> {
    const result = { imported: 0, errors: [] as string[], warnings: [] as string[] };

    for (const message of messages) {
      try {
        // Check if message already exists
        const existingMessage = await db.select().from(messages).where(eq(messages.id, message.id)).limit(1);
        
        if (existingMessage.length > 0 && !overwriteExisting) {
          result.warnings.push(`Message ${message.id} already exists, skipping`);
          continue;
        }

        if (existingMessage.length > 0 && overwriteExisting) {
          await db.update(messages).set(message).where(eq(messages.id, message.id));
          result.warnings.push(`Message ${message.id} updated`);
        } else {
          await db.insert(messages).values(message);
        }

        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private async importNotifications(notifications: Notification[], overwriteExisting: boolean = false): Promise<{ imported: number; errors: string[]; warnings: string[] }> {
    const result = { imported: 0, errors: [] as string[], warnings: [] as string[] };

    for (const notification of notifications) {
      try {
        // Check if notification already exists
        const existingNotification = await db.select().from(notifications).where(eq(notifications.id, notification.id)).limit(1);
        
        if (existingNotification.length > 0 && !overwriteExisting) {
          result.warnings.push(`Notification ${notification.id} already exists, skipping`);
          continue;
        }

        if (existingNotification.length > 0 && overwriteExisting) {
          await db.update(notifications).set(notification).where(eq(notifications.id, notification.id));
          result.warnings.push(`Notification ${notification.id} updated`);
        } else {
          await db.insert(notifications).values(notification);
        }

        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private async importRoomUsers(roomUsers: any[], overwriteExisting: boolean = false): Promise<{ imported: number; errors: string[]; warnings: string[] }> {
    const result = { imported: 0, errors: [] as string[], warnings: [] as string[] };

    for (const roomUser of roomUsers) {
      try {
        // Check if room user relationship already exists
        const existingRoomUser = await db.select()
          .from(roomUsers)
          .where(and(eq(roomUsers.userId, roomUser.userId), eq(roomUsers.roomId, roomUser.roomId)))
          .limit(1);
        
        if (existingRoomUser.length > 0 && !overwriteExisting) {
          result.warnings.push(`Room user relationship already exists, skipping`);
          continue;
        }

        if (existingRoomUser.length > 0 && overwriteExisting) {
          await db.update(roomUsers).set(roomUser).where(and(eq(roomUsers.userId, roomUser.userId), eq(roomUsers.roomId, roomUser.roomId)));
          result.warnings.push(`Room user relationship updated`);
        } else {
          await db.insert(roomUsers).values(roomUser);
        }

        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import room user relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  // ==================== BACKUP FUNCTIONS ====================

  async createBackup(config: Partial<BackupConfig> = {}): Promise<string> {
    try {
      const backupPath = config.backupPath || this.defaultBackupPath;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.json`;
      const filepath = join(backupPath, filename);

      console.log('🔄 Creating backup...');

      const exportData = await this.exportAllData(config);
      const jsonData = JSON.stringify(exportData, null, 2);

      await writeFile(filepath, jsonData, 'utf8');

      console.log(`✅ Backup created successfully: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath: string, options: {
    overwriteExisting?: boolean;
    skipUsers?: boolean;
    skipMessages?: boolean;
    skipNotifications?: boolean;
    skipRoomUsers?: boolean;
  } = {}): Promise<ImportResult> {
    try {
      console.log(`🔄 Restoring backup from: ${backupPath}`);

      const backupData = await readFile(backupPath, 'utf8');
      const exportData: ExportData = JSON.parse(backupData);

      const result = await this.importData(exportData, options);

      console.log('✅ Backup restoration completed');
      return result;
    } catch (error) {
      console.error('❌ Backup restoration failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const backupPath = this.defaultBackupPath;
      if (!existsSync(backupPath)) {
        return [];
      }

      const files = await readdir(backupPath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => join(backupPath, file))
        .sort()
        .reverse();
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async deleteBackup(backupPath: string): Promise<void> {
    try {
      await unlink(backupPath);
      console.log(`✅ Backup deleted: ${backupPath}`);
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  private validateExportData(data: any): data is ExportData {
    return (
      data &&
      typeof data.version === 'string' &&
      typeof data.timestamp === 'string' &&
      Array.isArray(data.rooms) &&
      Array.isArray(data.users) &&
      Array.isArray(data.messages) &&
      Array.isArray(data.notifications) &&
      Array.isArray(data.roomUsers) &&
      data.metadata &&
      typeof data.metadata.totalRooms === 'number' &&
      typeof data.metadata.totalUsers === 'number' &&
      typeof data.metadata.totalMessages === 'number' &&
      typeof data.metadata.totalNotifications === 'number'
    );
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      if (!existsSync(this.defaultBackupPath)) {
        await mkdir(this.defaultBackupPath, { recursive: true });
        console.log(`📁 Created backup directory: ${this.defaultBackupPath}`);
      }
    } catch (error) {
      console.error('Error creating backup directory:', error);
    }
  }

  // ==================== STATISTICS FUNCTIONS ====================

  async getDatabaseStats(): Promise<{
    totalRooms: number;
    totalUsers: number;
    totalMessages: number;
    totalNotifications: number;
    activeRooms: number;
    onlineUsers: number;
    totalRoomUsers: number;
  }> {
    try {
      const [
        totalRooms,
        totalUsers,
        totalMessages,
        totalNotifications,
        activeRooms,
        onlineUsers,
        totalRoomUsers
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(rooms),
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(messages),
        db.select({ count: sql<number>`count(*)` }).from(notifications),
        db.select({ count: sql<number>`count(*)` }).from(rooms).where(eq(rooms.isActive, true)),
        db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isOnline, true)),
        db.select({ count: sql<number>`count(*)` }).from(roomUsers),
      ]);

      return {
        totalRooms: totalRooms[0]?.count || 0,
        totalUsers: totalUsers[0]?.count || 0,
        totalMessages: totalMessages[0]?.count || 0,
        totalNotifications: totalNotifications[0]?.count || 0,
        activeRooms: activeRooms[0]?.count || 0,
        onlineUsers: onlineUsers[0]?.count || 0,
        totalRoomUsers: totalRoomUsers[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  async cleanupOldData(options: {
    deleteOldMessages?: boolean;
    deleteOldNotifications?: boolean;
    messageAgeDays?: number;
    notificationAgeDays?: number;
  } = {}): Promise<{
    deletedMessages: number;
    deletedNotifications: number;
  }> {
    const result = { deletedMessages: 0, deletedNotifications: 0 };

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

      return result;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const databaseExportImportService = new DatabaseExportImportService();
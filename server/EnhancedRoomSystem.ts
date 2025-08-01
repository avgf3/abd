import { Server as SocketIOServer } from 'socket.io';
import { enhancedRoomService } from './services/EnhancedRoomService';
import { EnhancedSocketService } from './services/EnhancedSocketService';
import { databaseExportImportService } from './services/DatabaseExportImportService';
import { databaseHealthCheckService } from './services/DatabaseHealthCheckService';
import { storage } from './storage';

export class EnhancedRoomSystem {
  private socketService: EnhancedSocketService;
  private isInitialized = false;

  constructor(private io: SocketIOServer) {
    this.socketService = new EnhancedSocketService(io);
  }

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Enhanced Room System already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Enhanced Room System...');

      // Ensure general room exists
      await enhancedRoomService.ensureGeneralRoom();

      // Initialize database health check
      await this.performInitialHealthCheck();

      // Setup periodic health checks
      this.setupPeriodicHealthChecks();

      // Setup periodic backups
      this.setupPeriodicBackups();

      // Setup cleanup tasks
      this.setupCleanupTasks();

      this.isInitialized = true;
      console.log('✅ Enhanced Room System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Room System:', error);
      throw error;
    }
  }

  private async performInitialHealthCheck(): Promise<void> {
    try {
      console.log('🔍 Performing initial health check...');
      const healthCheck = await databaseHealthCheckService.performFullHealthCheck();
      
      if (healthCheck.overall === 'critical') {
        console.error('🚨 Critical health issues detected:', healthCheck.errors);
        console.log('💡 Recommendations:', healthCheck.recommendations);
      } else if (healthCheck.overall === 'warning') {
        console.warn('⚠️ Health warnings detected:', healthCheck.errors);
        console.log('💡 Recommendations:', healthCheck.recommendations);
      } else {
        console.log('✅ System health check passed');
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  private setupPeriodicHealthChecks(): void {
    // Perform health check every 6 hours
    setInterval(async () => {
      try {
        const healthCheck = await databaseHealthCheckService.performFullHealthCheck();
        
        if (healthCheck.overall === 'critical') {
          console.error('🚨 Periodic health check - Critical issues:', healthCheck.errors);
          // You could send notifications here
        } else if (healthCheck.overall === 'warning') {
          console.warn('⚠️ Periodic health check - Warnings:', healthCheck.errors);
        }
      } catch (error) {
        console.error('❌ Periodic health check failed:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  private setupPeriodicBackups(): void {
    // Create backup every 24 hours
    setInterval(async () => {
      try {
        console.log('🔄 Creating scheduled backup...');
        const backupPath = await databaseExportImportService.createBackup({
          includeUsers: true,
          includeMessages: true,
          includeNotifications: true,
          includeRoomUsers: true,
          compressBackup: false,
        });
        console.log(`✅ Scheduled backup created: ${backupPath}`);
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  private setupCleanupTasks(): void {
    // Cleanup old data every 7 days
    setInterval(async () => {
      try {
        console.log('🧹 Performing scheduled cleanup...');
        const cleanupResult = await databaseHealthCheckService.cleanupOldData({
          deleteOldMessages: true,
          deleteOldNotifications: true,
          messageAgeDays: 30, // Delete messages older than 30 days
          notificationAgeDays: 7, // Delete notifications older than 7 days
        });
        
        console.log(`✅ Cleanup completed: ${cleanupResult.deletedMessages} messages, ${cleanupResult.deletedNotifications} notifications deleted`);
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  // ==================== ROOM MANAGEMENT ====================

  async createRoom(roomData: any): Promise<any> {
    return await enhancedRoomService.createRoom(roomData);
  }

  async getRoom(roomId: string): Promise<any> {
    return await enhancedRoomService.getRoom(roomId);
  }

  async getAllRooms(filters: any = {}): Promise<any[]> {
    return await enhancedRoomService.getAllRooms(filters);
  }

  async updateRoom(roomId: string, updates: any): Promise<any> {
    return await enhancedRoomService.updateRoom(roomId, updates);
  }

  async deleteRoom(roomId: string, deletedBy: number): Promise<void> {
    return await enhancedRoomService.deleteRoom(roomId, deletedBy);
  }

  async searchRooms(query: string, filters: any = {}): Promise<any[]> {
    return await enhancedRoomService.searchRooms(query, filters);
  }

  async getPopularRooms(limit: number = 10): Promise<any[]> {
    return await enhancedRoomService.getPopularRooms(limit);
  }

  async getRoomCategories(): Promise<string[]> {
    return await enhancedRoomService.getRoomCategories();
  }

  // ==================== USER-ROOM OPERATIONS ====================

  async joinRoom(userId: number, roomId: string, password?: string): Promise<void> {
    return await enhancedRoomService.joinRoom(userId, roomId, password);
  }

  async leaveRoom(userId: number, roomId: string): Promise<void> {
    return await enhancedRoomService.leaveRoom(userId, roomId);
  }

  async getUserRooms(userId: number): Promise<string[]> {
    return await enhancedRoomService.getUserRooms(userId);
  }

  async getRoomUsers(roomId: string): Promise<number[]> {
    return await enhancedRoomService.getRoomUsers(roomId);
  }

  async getOnlineUsersInRoom(roomId: string): Promise<any[]> {
    return await enhancedRoomService.getOnlineUsersInRoom(roomId);
  }

  // ==================== BROADCAST ROOM FEATURES ====================

  async requestMic(userId: number, roomId: string): Promise<boolean> {
    return await enhancedRoomService.requestMic(userId, roomId);
  }

  async approveMicRequest(roomId: string, userId: number, approvedBy: number): Promise<boolean> {
    return await enhancedRoomService.approveMicRequest(roomId, userId, approvedBy);
  }

  async rejectMicRequest(roomId: string, userId: number, rejectedBy: number): Promise<boolean> {
    return await enhancedRoomService.rejectMicRequest(roomId, userId, rejectedBy);
  }

  async removeSpeaker(roomId: string, userId: number, removedBy: number): Promise<boolean> {
    return await enhancedRoomService.removeSpeaker(roomId, userId, removedBy);
  }

  // ==================== STATISTICS ====================

  async getRoomStats(roomId: string): Promise<any> {
    return await enhancedRoomService.getRoomStats(roomId);
  }

  async getDatabaseStats(): Promise<any> {
    return await databaseExportImportService.getDatabaseStats();
  }

  // ==================== HEALTH CHECK ====================

  async performHealthCheck(): Promise<any> {
    return await databaseHealthCheckService.performFullHealthCheck();
  }

  async fixOrphanedRoomUsers(): Promise<any> {
    return await databaseHealthCheckService.fixOrphanedRoomUsers();
  }

  async fixOrphanedMessages(): Promise<any> {
    return await databaseHealthCheckService.fixOrphanedMessages();
  }

  async cleanupOldData(options: any = {}): Promise<any> {
    return await databaseHealthCheckService.cleanupOldData(options);
  }

  // ==================== BACKUP & RESTORE ====================

  async createBackup(config: any = {}): Promise<string> {
    return await databaseExportImportService.createBackup(config);
  }

  async restoreBackup(backupPath: string, options: any = {}): Promise<any> {
    return await databaseExportImportService.restoreBackup(backupPath, options);
  }

  async listBackups(): Promise<string[]> {
    return await databaseExportImportService.listBackups();
  }

  async deleteBackup(backupPath: string): Promise<void> {
    return await databaseExportImportService.deleteBackup(backupPath);
  }

  async exportAllData(config: any = {}): Promise<any> {
    return await databaseExportImportService.exportAllData(config);
  }

  async importData(exportData: any, options: any = {}): Promise<any> {
    return await databaseExportImportService.importData(exportData, options);
  }

  // ==================== SOCKET OPERATIONS ====================

  sendToUser(userId: number, event: string, data: any): void {
    this.socketService.sendToUser(userId, event, data);
  }

  sendToRoom(roomId: string, event: string, data: any): void {
    this.socketService.sendToRoom(roomId, event, data);
  }

  sendToAll(event: string, data: any): void {
    this.socketService.sendToAll(event, data);
  }

  getOnlineUsers(): any[] {
    return this.socketService.getOnlineUsers();
  }

  getRoomUsersList(roomId: string): any[] {
    return this.socketService.getRoomUsers(roomId);
  }

  // ==================== SYSTEM STATUS ====================

  getSystemStatus(): {
    isInitialized: boolean;
    totalRooms: number;
    totalUsers: number;
    onlineUsers: number;
    activeRooms: number;
  } {
    return {
      isInitialized: this.isInitialized,
      totalRooms: 0, // This would need to be calculated
      totalUsers: 0, // This would need to be calculated
      onlineUsers: this.socketService.getOnlineUsers().length,
      activeRooms: 0, // This would need to be calculated
    };
  }

  // ==================== UTILITY METHODS ====================

  async ensureGeneralRoom(): Promise<void> {
    return await enhancedRoomService.ensureGeneralRoom();
  }

  async validateRoomAccess(userId: number, roomId: string): Promise<boolean> {
    try {
      const room = await enhancedRoomService.getRoom(roomId);
      if (!room) return false;

      // Check if user is in room
      const userRooms = await enhancedRoomService.getUserRooms(userId);
      return userRooms.includes(roomId);
    } catch (error) {
      return false;
    }
  }

  async getRoomPermissions(userId: number, roomId: string): Promise<{
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManage: boolean;
    isOwner: boolean;
    isHost: boolean;
    isSpeaker: boolean;
  }> {
    try {
      const room = await enhancedRoomService.getRoom(roomId);
      if (!room) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          canManage: false,
          isOwner: false,
          isHost: false,
          isSpeaker: false,
        };
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          canManage: false,
          isOwner: false,
          isHost: false,
          isSpeaker: false,
        };
      }

      const isOwner = room.createdBy === userId;
      const isHost = room.hostId === userId;
      const isSpeaker = room.speakers.includes(userId);
      const isAdmin = user.userType === 'admin' || user.userType === 'owner';

      return {
        canView: room.isActive || isOwner || isAdmin,
        canEdit: isOwner || isHost || isAdmin,
        canDelete: isOwner || isAdmin,
        canManage: isOwner || isHost || isAdmin,
        isOwner,
        isHost,
        isSpeaker,
      };
    } catch (error) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManage: false,
        isOwner: false,
        isHost: false,
        isSpeaker: false,
      };
    }
  }

  // ==================== EVENT HANDLERS ====================

  on(event: string, handler: (...args: any[]) => void): void {
    enhancedRoomService.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    enhancedRoomService.off(event, handler);
  }

  // ==================== SHUTDOWN ====================

  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down Enhanced Room System...');
      
      // Perform final health check
      await this.performInitialHealthCheck();
      
      // Create final backup
      await this.createBackup();
      
      // Clean up resources
      this.isInitialized = false;
      
      console.log('✅ Enhanced Room System shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
export let enhancedRoomSystem: EnhancedRoomSystem;

export function initializeEnhancedRoomSystem(io: SocketIOServer): EnhancedRoomSystem {
  if (!enhancedRoomSystem) {
    enhancedRoomSystem = new EnhancedRoomSystem(io);
  }
  return enhancedRoomSystem;
}

export function getEnhancedRoomSystem(): EnhancedRoomSystem {
  if (!enhancedRoomSystem) {
    throw new Error('Enhanced Room System not initialized. Call initializeEnhancedRoomSystem() first.');
  }
  return enhancedRoomSystem;
}
import type { Server as IOServer, Socket } from "socket.io";
import type { InsertNotification, Notification } from '@shared/schema';

/**
 * خدمة الإشعارات الفورية
 */
export class NotificationService {
  private static instance: NotificationService;
  private io: IOServer | null = null;
  private clients: Map<number, Set<string>> = new Map(); // userId -> Set<socketId>
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * ربط خادم WebSocket
   */
  setSocketIOServer(io: IOServer) {
    this.io = io;
  }
  
  /**
   * تسجيل عميل جديد
   */
  registerClient(userId: number, socket: Socket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(socket.id);
    socket.on('disconnect', () => {
      this.removeClient(userId, socket.id);
    });
  }
  
  /**
   * إزالة عميل
   */
  removeClient(userId: number, socketId: string) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(socketId);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }
  
  /**
   * إرسال إشعار فوري لمستخدم معين
   */
  async sendNotification(userId: number, notification: Notification) {
    if (this.io && this.clients.has(userId)) {
      for (const socketId of this.clients.get(userId)!) {
        this.io.to(socketId).emit('notificationReceived', { notification });
      }
    }
  }
  
  /**
   * إرسال إشعار لجميع المستخدمين المتصلين
   */
  async broadcastNotification(notification: any) {
    if (this.io) {
      this.io.emit('broadcastNotification', { notification });
    }
  }
  
  /**
   * إرسال تحديث للأصدقاء
   */
  async notifyFriends(userIds: number[], update: any) {
    if (this.io) {
      userIds.forEach(userId => {
        if (this.clients.has(userId)) {
          for (const socketId of this.clients.get(userId)!) {
            this.io.to(socketId).emit('friendUpdate', { update });
          }
        }
      });
    }
  }
  
  /**
   * الحصول على عدد المستخدمين المتصلين
   */
  getOnlineUsersCount(): number {
    return this.clients.size;
  }
  
  /**
   * فحص إذا كان المستخدم متصل
   */
  isUserOnline(userId: number): boolean {
    return this.clients.has(userId) && this.clients.get(userId)!.size > 0;
  }
}
import { WebSocket } from 'ws';
import type { WebSocketServer } from 'ws';
import type { InsertNotification, Notification } from '@shared/schema';

/**
 * خدمة الإشعارات الفورية
 */
export class NotificationService {
  private static instance: NotificationService;
  private wss: WebSocketServer | null = null;
  private clients: Map<number, WebSocket[]> = new Map();
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * ربط خادم WebSocket
   */
  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }
  
  /**
   * تسجيل عميل جديد
   */
  registerClient(userId: number, ws: WebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push(ws);
    
    // إزالة العميل عند قطع الاتصال
    ws.on('close', () => {
      this.removeClient(userId, ws);
    });
  }
  
  /**
   * إزالة عميل
   */
  removeClient(userId: number, ws: WebSocket) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.indexOf(ws);
      if (index > -1) {
        userClients.splice(index, 1);
      }
      if (userClients.length === 0) {
        this.clients.delete(userId);
      }
    }
  }
  
  /**
   * إرسال إشعار فوري لمستخدم معين
   */
  async sendNotification(userId: number, notification: Notification) {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.length > 0) {
      const message = JSON.stringify({
        type: 'notificationReceived',
        notification: notification
      });
      
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
  
  /**
   * إرسال إشعار لجميع المستخدمين المتصلين
   */
  async broadcastNotification(notification: any) {
    if (!this.wss) return;
    
    const message = JSON.stringify({
      type: 'broadcastNotification',
      notification: notification
    });
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  /**
   * إرسال تحديث للأصدقاء
   */
  async notifyFriends(userIds: number[], update: any) {
    userIds.forEach(userId => {
      const userClients = this.clients.get(userId);
      if (userClients) {
        const message = JSON.stringify({
          type: 'friendUpdate',
          update: update
        });
        
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    });
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
    const userClients = this.clients.get(userId);
    return userClients !== undefined && userClients.length > 0;
  }
}
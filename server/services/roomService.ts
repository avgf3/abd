import { db } from "../database-adapter";
import { rooms, roomUsers, users, messages } from "../../shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import type { Socket } from "socket.io";

export interface RoomUser {
  id: number;
  username: string;
  userType: string;
  role: string;
  profileImage?: string;
  usernameColor?: string;
  isOnline: boolean;
  joinedAt: Date;
}

export interface RoomMessage {
  id: number;
  senderId: number;
  content: string;
  messageType: string;
  roomId: string;
  timestamp: Date;
  sender?: RoomUser;
}

/**
 * نظام إدارة الغرف المنظف والمحسن
 */
export class RoomService {
  private onlineUsers = new Map<string, Set<number>>(); // roomId -> Set of userIds
  private userRooms = new Map<number, string>(); // userId -> current roomId

  /**
   * انضمام المستخدم لغرفة محددة
   */
  async joinRoom(userId: number, roomId: string, socket: Socket): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🏠 المستخدم ${userId} ينضم للغرفة ${roomId}`);

      // التحقق من وجود المستخدم
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return { success: false, error: 'المستخدم غير موجود' };
      }

      // التحقق من وجود الغرفة أو إنشاؤها إذا كانت عامة
      const room = await this.ensureRoomExists(roomId, userId);
      if (!room) {
        return { success: false, error: 'الغرفة غير موجودة' };
      }

      // مغادرة الغرفة السابقة إن وجدت
      const currentRoom = this.userRooms.get(userId);
      if (currentRoom && currentRoom !== roomId) {
        await this.leaveRoom(userId, currentRoom, socket);
      }

      // إضافة المستخدم للغرفة في قاعدة البيانات
      await db.insert(roomUsers)
        .values({ userId, roomId })
        .onConflictDoNothing();

      // انضمام المستخدم لقناة Socket.IO
      await socket.join(`room_${roomId}`);
      
      // تحديث حالة المستخدم المحلية
      if (!this.onlineUsers.has(roomId)) {
        this.onlineUsers.set(roomId, new Set());
      }
      this.onlineUsers.get(roomId)!.add(userId);
      this.userRooms.set(userId, roomId);

      console.log(`✅ المستخدم ${userId} انضم للغرفة ${roomId} بنجاح`);
      return { success: true };

    } catch (error) {
      console.error('❌ خطأ في انضمام المستخدم للغرفة:', error);
      return { success: false, error: 'خطأ في الخادم' };
    }
  }

  /**
   * مغادرة المستخدم للغرفة
   */
  async leaveRoom(userId: number, roomId: string, socket: Socket): Promise<void> {
    try {
      console.log(`🚪 المستخدم ${userId} يغادر الغرفة ${roomId}`);

      // مغادرة قناة Socket.IO
      await socket.leave(`room_${roomId}`);

      // إزالة المستخدم من الحالة المحلية
      if (this.onlineUsers.has(roomId)) {
        this.onlineUsers.get(roomId)!.delete(userId);
      }
      this.userRooms.delete(userId);

      // ملاحظة: نحتفظ بالمستخدم في جدول room_users للتاريخ
      // ولكن نعتمد على حالة الاتصال الفعلي للمستخدمين النشطين

      console.log(`✅ المستخدم ${userId} غادر الغرفة ${roomId}`);
    } catch (error) {
      console.error('❌ خطأ في مغادرة الغرفة:', error);
    }
  }

  /**
   * الحصول على المستخدمين المتصلين في الغرفة
   */
  async getOnlineUsersInRoom(roomId: string): Promise<RoomUser[]> {
    try {
      const onlineUserIds = this.onlineUsers.get(roomId) || new Set();
      
      if (onlineUserIds.size === 0) {
        return [];
      }

      const userList = await db.select({
        id: users.id,
        username: users.username,
        userType: users.userType,
        role: users.role,
        profileImage: users.profileImage,
        usernameColor: users.usernameColor,
        isOnline: users.isOnline,
        joinedAt: roomUsers.joinedAt
      })
      .from(users)
      .leftJoin(roomUsers, and(
        eq(roomUsers.userId, users.id),
        eq(roomUsers.roomId, roomId)
      ))
      .where(sql`${users.id} = ANY(${Array.from(onlineUserIds)})`);

      return userList.map(user => ({
        ...user,
        joinedAt: user.joinedAt || new Date()
      }));

    } catch (error) {
      console.error('❌ خطأ في جلب المستخدمين:', error);
      return [];
    }
  }

  /**
   * الحصول على آخر 50 رسالة من الغرفة
   */
  async getRecentMessages(roomId: string, limit: number = 50): Promise<RoomMessage[]> {
    try {
      const messagesData = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        roomId: messages.roomId,
        timestamp: messages.timestamp,
        senderUsername: users.username,
        senderUserType: users.userType,
        senderRole: users.role,
        senderProfileImage: users.profileImage,
        senderUsernameColor: users.usernameColor,
        senderIsOnline: users.isOnline
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.roomId, roomId),
        eq(messages.isPrivate, false)
      ))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

      return messagesData.reverse().map(msg => ({
        id: msg.id,
        senderId: msg.senderId || -1,
        content: msg.content,
        messageType: msg.messageType || 'text',
        roomId: msg.roomId || roomId,
        timestamp: msg.timestamp || new Date(),
        sender: msg.senderId ? {
          id: msg.senderId,
          username: msg.senderUsername || 'مستخدم محذوف',
          userType: msg.senderUserType || 'guest',
          role: msg.senderRole || 'guest',
          profileImage: msg.senderProfileImage,
          usernameColor: msg.senderUsernameColor || '#FFFFFF',
          isOnline: msg.senderIsOnline || false,
          joinedAt: new Date()
        } : undefined
      }));

    } catch (error) {
      console.error('❌ خطأ في جلب الرسائل:', error);
      return [];
    }
  }

  /**
   * إرسال رسالة في الغرفة
   */
  async sendMessageToRoom(
    senderId: number, 
    roomId: string, 
    content: string, 
    messageType: string = 'text'
  ): Promise<{ success: boolean; message?: RoomMessage; error?: string }> {
    try {
      // التحقق من انتماء المستخدم للغرفة
      if (!this.isUserInRoom(senderId, roomId)) {
        return { success: false, error: 'المستخدم غير موجود في الغرفة' };
      }

      // حفظ الرسالة في قاعدة البيانات
      const [newMessage] = await db.insert(messages)
        .values({
          senderId,
          content,
          messageType,
          roomId,
          isPrivate: false
        })
        .returning();

      // جلب بيانات المرسل
      const [sender] = await db.select()
        .from(users)
        .where(eq(users.id, senderId))
        .limit(1);

      const messageWithSender: RoomMessage = {
        id: newMessage.id,
        senderId: newMessage.senderId || senderId,
        content: newMessage.content,
        messageType: newMessage.messageType || 'text',
        roomId: newMessage.roomId || roomId,
        timestamp: newMessage.timestamp || new Date(),
        sender: sender ? {
          id: sender.id,
          username: sender.username,
          userType: sender.userType || 'guest',
          role: sender.role || 'guest',
          profileImage: sender.profileImage,
          usernameColor: sender.usernameColor || '#FFFFFF',
          isOnline: sender.isOnline || false,
          joinedAt: new Date()
        } : undefined
      };

      return { success: true, message: messageWithSender };

    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      return { success: false, error: 'خطأ في إرسال الرسالة' };
    }
  }

  /**
   * التحقق من وجود المستخدم في الغرفة
   */
  isUserInRoom(userId: number, roomId: string): boolean {
    return this.userRooms.get(userId) === roomId;
  }

  /**
   * الحصول على الغرفة الحالية للمستخدم
   */
  getCurrentRoom(userId: number): string | undefined {
    return this.userRooms.get(userId);
  }

  /**
   * تنظيف المستخدمين غير المتصلين
   */
  cleanupDisconnectedUser(userId: number): void {
    const currentRoom = this.userRooms.get(userId);
    if (currentRoom) {
      const roomUsers = this.onlineUsers.get(currentRoom);
      if (roomUsers) {
        roomUsers.delete(userId);
      }
      this.userRooms.delete(userId);
    }
  }

  /**
   * التأكد من وجود الغرفة أو إنشاؤها
   */
  private async ensureRoomExists(roomId: string, userId: number): Promise<boolean> {
    try {
      const [existingRoom] = await db.select()
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);

      if (existingRoom) {
        return true;
      }

      // إنشاء الغرفة إذا كانت عامة
      if (roomId === 'general' || roomId === 'public') {
        await db.insert(rooms)
          .values({
            id: roomId,
            name: roomId === 'general' ? 'الغرفة العامة' : 'الغرفة العمومية',
            description: 'غرفة عامة للجميع',
            createdBy: userId,
            isDefault: true,
            isActive: true
          })
          .onConflictDoNothing();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ خطأ في التحقق من الغرفة:', error);
      return false;
    }
  }

  /**
   * الحصول على إحصائيات الغرفة
   */
  getRoomStats(roomId: string) {
    const onlineCount = this.onlineUsers.get(roomId)?.size || 0;
    return { onlineUsers: onlineCount };
  }
}

// تصدير instance واحد للاستخدام في التطبيق
export const roomService = new RoomService();
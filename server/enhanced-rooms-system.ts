import { Server as IOServer, Socket } from "socket.io";
import { storage } from "./storage";

// إدارة حالة المستخدمين والغرف في الذاكرة
class RoomManager {
  private connectedUsers = new Map<number, SocketUserInfo>();
  private roomUsers = new Map<string, Set<number>>();
  private userRooms = new Map<number, string>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private io: IOServer) {
    // تنظيف دوري كل 30 ثانية
    this.cleanupInterval = setInterval(() => {
      this.cleanupDisconnectedUsers();
    }, 30000);
  }

  // إضافة مستخدم متصل
  addUser(userId: number, socketId: string, username: string, roomId?: string) {
    this.connectedUsers.set(userId, {
      userId,
      socketId,
      username,
      lastSeen: Date.now(),
      isOnline: true,
      currentRoom: roomId
    });

    if (roomId) {
      this.addUserToRoom(userId, roomId);
    }

    console.log(`✅ المستخدم ${username} (${userId}) متصل - Socket: ${socketId}`);
  }

  // إزالة مستخدم
  removeUser(userId: number, socketId?: string) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      // إزالة من الغرفة الحالية
      if (user.currentRoom) {
        this.removeUserFromRoom(userId, user.currentRoom);
      }

      this.connectedUsers.delete(userId);
      this.userRooms.delete(userId);

      console.log(`🚪 المستخدم ${user.username} (${userId}) غادر النظام`);
      
      // تحديث قاعدة البيانات
      storage.setUserOnlineStatus(userId, false).catch(console.error);
    }
  }

  // إضافة مستخدم لغرفة
  addUserToRoom(userId: number, roomId: string) {
    // إزالة من الغرفة السابقة أولاً
    const currentRoom = this.userRooms.get(userId);
    if (currentRoom && currentRoom !== roomId) {
      this.removeUserFromRoom(userId, currentRoom);
    }

    // إضافة للغرفة الجديدة
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Set());
    }
    
    this.roomUsers.get(roomId)!.add(userId);
    this.userRooms.set(userId, roomId);

    // تحديث معلومات المستخدم
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.currentRoom = roomId;
    }

    console.log(`🏠 المستخدم ${userId} انضم للغرفة ${roomId}`);
  }

  // إزالة مستخدم من غرفة
  removeUserFromRoom(userId: number, roomId: string) {
    const roomUserSet = this.roomUsers.get(roomId);
    if (roomUserSet) {
      roomUserSet.delete(userId);
      
      // إزالة الغرفة إذا أصبحت فارغة
      if (roomUserSet.size === 0) {
        this.roomUsers.delete(roomId);
      }
    }

    this.userRooms.delete(userId);

    // تحديث معلومات المستخدم
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.currentRoom = undefined;
    }

    console.log(`🚪 المستخدم ${userId} غادر الغرفة ${roomId}`);
  }

  // الحصول على مستخدمي غرفة معينة
  getRoomUsers(roomId: string): SocketUserInfo[] {
    const userIds = this.roomUsers.get(roomId) || new Set();
    const users: SocketUserInfo[] = [];

    for (const userId of userIds) {
      const user = this.connectedUsers.get(userId);
      if (user && user.isOnline) {
        users.push(user);
      }
    }

    return users;
  }

  // الحصول على جميع المستخدمين المتصلين
  getOnlineUsers(): SocketUserInfo[] {
    return Array.from(this.connectedUsers.values()).filter(user => user.isOnline);
  }

  // تحديث حالة المستخدم
  updateUserActivity(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastSeen = Date.now();
      user.isOnline = true;
    }
  }

  // تنظيف المستخدمين المنقطعين
  private cleanupDisconnectedUsers() {
    const now = Date.now();
    const disconnectedThreshold = 60000; // دقيقة واحدة

    for (const [userId, user] of this.connectedUsers.entries()) {
      if (now - user.lastSeen > disconnectedThreshold) {
        console.log(`🧹 تنظيف المستخدم المنقطع: ${user.username} (${userId})`);
        this.removeUser(userId);
      }
    }
  }

  // الحصول على معلومات الغرفة
  getRoomInfo(roomId: string) {
    const users = this.getRoomUsers(roomId);
    return {
      id: roomId,
      userCount: users.length,
      users: users.map(u => ({
        id: u.userId,
        username: u.username,
        isOnline: u.isOnline
      }))
    };
  }

  // إرسال تحديث لغرفة معينة
  async broadcastToRoom(roomId: string, event: string, data: any) {
    const users = this.getRoomUsers(roomId);
    
    // إرسال للمستخدمين المتصلين
    this.io.to(`room_${roomId}`).emit(event, data);
    
    // تسجيل للمراقبة
    console.log(`📡 إرسال ${event} للغرفة ${roomId} - ${users.length} مستخدم`);
  }

  // إرسال تحديث للجميع
  async broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
    console.log(`📢 إرسال ${event} للجميع - ${this.connectedUsers.size} مستخدم`);
  }

  // إحصائيات النظام
  getSystemStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.roomUsers.size,
      totalRoomMemberships: Array.from(this.roomUsers.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  // تدمير المدير
  destroy() {
    clearInterval(this.cleanupInterval);
    this.connectedUsers.clear();
    this.roomUsers.clear();
    this.userRooms.clear();
  }
}

// واجهة معلومات المستخدم في Socket
interface SocketUserInfo {
  userId: number;
  socketId: string;
  username: string;
  lastSeen: number;
  isOnline: boolean;
  currentRoom?: string;
}

// واجهة Socket مخصصة
interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  currentRoom?: string;
}

// إعداد نظام الغرف المحسّن
export function setupEnhancedRoomsSystem(io: IOServer) {
  const roomManager = new RoomManager(io);

  // معالجة الاتصال
  io.on('connection', (socket: CustomSocket) => {
    console.log(`🔌 اتصال جديد: ${socket.id}`);

    // معالجة المصادقة
    socket.on('authenticate', async (data) => {
      try {
        const { userId, username } = data;
        
        if (!userId || !username) {
          socket.emit('error', { message: 'بيانات المصادقة غير مكتملة' });
          return;
        }

        // التحقق من المستخدم في قاعدة البيانات
        const user = await storage.getUser(userId);
        if (!user) {
          socket.emit('error', { message: 'المستخدم غير موجود' });
          return;
        }

        // تحديث معلومات Socket
        socket.userId = userId;
        socket.username = username;

        // إضافة للمدير
        roomManager.addUser(userId, socket.id, username);

        // تحديث حالة قاعدة البيانات
        await storage.setUserOnlineStatus(userId, true);

        // إرسال تأكيد المصادقة
        socket.emit('authenticated', {
          userId: userId,
          username: username,
          socketId: socket.id
        });

        // إرسال قائمة المستخدمين المتصلين
        const onlineUsers = roomManager.getOnlineUsers();
        socket.emit('onlineUsers', { users: onlineUsers });

        console.log(`✅ مصادقة ناجحة: ${username} (${userId})`);

      } catch (error) {
        console.error('خطأ في المصادقة:', error);
        socket.emit('error', { message: 'خطأ في المصادقة' });
      }
    });

    // معالجة انضمام للغرفة
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.userId;
        const username = socket.username;

        if (!userId || !username) {
          socket.emit('error', { message: 'يجب المصادقة أولاً' });
          return;
        }

        console.log(`🏠 ${username} ينضم للغرفة ${roomId}`);

        // الانضمام في Socket.IO
        socket.join(`room_${roomId}`);
        socket.currentRoom = roomId;

        // إضافة للمدير
        roomManager.addUserToRoom(userId, roomId);

        // تحديث قاعدة البيانات
        await storage.joinRoom(userId, roomId);

        // الحصول على معلومات الغرفة المحدثة
        const roomInfo = roomManager.getRoomInfo(roomId);

        // إرسال تأكيد للمستخدم
        socket.emit('roomJoined', {
          roomId: roomId,
          userCount: roomInfo.userCount,
          users: roomInfo.users
        });

        // إشعار باقي مستخدمي الغرفة
        socket.to(`room_${roomId}`).emit('userJoinedRoom', {
          userId: userId,
          username: username,
          roomId: roomId
        });

        // إرسال قائمة محدثة للغرفة
        await roomManager.broadcastToRoom(roomId, 'roomUsersUpdated', {
          roomId: roomId,
          users: roomInfo.users,
          userCount: roomInfo.userCount
        });

        console.log(`✅ ${username} انضم للغرفة ${roomId} - المجموع: ${roomInfo.userCount}`);

      } catch (error) {
        console.error('خطأ في انضمام للغرفة:', error);
        socket.emit('error', { message: 'خطأ في الانضمام للغرفة' });
      }
    });

    // معالجة مغادرة الغرفة
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.userId;
        const username = socket.username;

        if (!userId || !username) {
          socket.emit('error', { message: 'يجب المصادقة أولاً' });
          return;
        }

        console.log(`🚪 ${username} يغادر الغرفة ${roomId}`);

        // المغادرة من Socket.IO
        socket.leave(`room_${roomId}`);
        socket.currentRoom = undefined;

        // إزالة من المدير
        roomManager.removeUserFromRoom(userId, roomId);

        // تحديث قاعدة البيانات
        await storage.leaveRoom(userId, roomId);

        // الحصول على معلومات الغرفة المحدثة
        const roomInfo = roomManager.getRoomInfo(roomId);

        // إرسال تأكيد للمستخدم
        socket.emit('roomLeft', { roomId: roomId });

        // إشعار باقي مستخدمي الغرفة
        socket.to(`room_${roomId}`).emit('userLeftRoom', {
          userId: userId,
          username: username,
          roomId: roomId
        });

        // إرسال قائمة محدثة للغرفة
        await roomManager.broadcastToRoom(roomId, 'roomUsersUpdated', {
          roomId: roomId,
          users: roomInfo.users,
          userCount: roomInfo.userCount
        });

        console.log(`✅ ${username} غادر الغرفة ${roomId} - المتبقي: ${roomInfo.userCount}`);

      } catch (error) {
        console.error('خطأ في مغادرة الغرفة:', error);
        socket.emit('error', { message: 'خطأ في مغادرة الغرفة' });
      }
    });

    // معالجة إرسال رسالة
    socket.on('message', async (data) => {
      try {
        const userId = socket.userId;
        const username = socket.username;

        if (!userId || !username) {
          socket.emit('error', { message: 'يجب المصادقة أولاً' });
          return;
        }

        // تحديث نشاط المستخدم
        roomManager.updateUserActivity(userId);

        // معالجة أنواع الرسائل المختلفة
        switch (data.type) {
          case 'chat':
            await handleChatMessage(socket, data, roomManager);
            break;
          case 'typing':
            await handleTypingIndicator(socket, data, roomManager);
            break;
          case 'private':
            await handlePrivateMessage(socket, data, roomManager);
            break;
          default:
            console.log(`نوع رسالة غير معروف: ${data.type}`);
        }

      } catch (error) {
        console.error('خطأ في معالجة الرسالة:', error);
        socket.emit('error', { message: 'خطأ في معالجة الرسالة' });
      }
    });

    // معالجة انقطاع الاتصال
    socket.on('disconnect', () => {
      console.log(`🔌 انقطاع الاتصال: ${socket.id}`);
      
      if (socket.userId) {
        roomManager.removeUser(socket.userId, socket.id);
        
        // إرسال تحديث للجميع
        setTimeout(async () => {
          const onlineUsers = roomManager.getOnlineUsers();
          await roomManager.broadcastToAll('onlineUsersUpdated', { users: onlineUsers });
        }, 1000);
      }
    });

    // معالجة الـ ping للحفاظ على الاتصال
    socket.on('ping', () => {
      if (socket.userId) {
        roomManager.updateUserActivity(socket.userId);
      }
      socket.emit('pong', { timestamp: Date.now() });
    });

    // إرسال ping دوري
    const pingInterval = setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() });
    }, 30000);

    socket.on('disconnect', () => {
      clearInterval(pingInterval);
    });
  });

  // إرسال إحصائيات دورية
  setInterval(() => {
    const stats = roomManager.getSystemStats();
    console.log(`📊 إحصائيات النظام:`, stats);
  }, 60000);

  return roomManager;
}

// معالجة رسائل الدردشة
async function handleChatMessage(socket: CustomSocket, data: any, roomManager: RoomManager) {
  const { content, roomId } = data;
  const userId = socket.userId!;
  const username = socket.username!;

  if (!content || !roomId) {
    socket.emit('error', { message: 'بيانات الرسالة غير مكتملة' });
    return;
  }

  // حفظ الرسالة في قاعدة البيانات
  const message = await storage.createMessage({
    content: content,
    senderId: userId,
    roomId: roomId,
    type: 'text'
  });

  if (message) {
    // إرسال للغرفة
    await roomManager.broadcastToRoom(roomId, 'newMessage', {
      id: message.id,
      content: message.content,
      senderId: userId,
      sender: { username: username },
      roomId: roomId,
      createdAt: message.createdAt,
      type: 'text'
    });

    console.log(`💬 رسالة جديدة من ${username} في الغرفة ${roomId}`);
  }
}

// معالجة مؤشر الكتابة
async function handleTypingIndicator(socket: CustomSocket, data: any, roomManager: RoomManager) {
  const { isTyping, roomId } = data;
  const userId = socket.userId!;
  const username = socket.username!;

  if (roomId) {
    // إرسال للغرفة فقط
    socket.to(`room_${roomId}`).emit('userTyping', {
      userId: userId,
      username: username,
      isTyping: isTyping,
      roomId: roomId
    });
  } else {
    // إرسال للجميع (للدردشة العامة)
    socket.broadcast.emit('userTyping', {
      userId: userId,
      username: username,
      isTyping: isTyping
    });
  }
}

// معالجة الرسائل الخاصة
async function handlePrivateMessage(socket: CustomSocket, data: any, roomManager: RoomManager) {
  const { content, recipientId } = data;
  const userId = socket.userId!;
  const username = socket.username!;

  if (!content || !recipientId) {
    socket.emit('error', { message: 'بيانات الرسالة الخاصة غير مكتملة' });
    return;
  }

  // التحقق من وجود المستقبل
  const recipient = await storage.getUser(recipientId);
  if (!recipient) {
    socket.emit('error', { message: 'المستقبل غير موجود' });
    return;
  }

  // حفظ الرسالة
  const message = await storage.createPrivateMessage({
    content: content,
    senderId: userId,
    recipientId: recipientId
  });

  if (message) {
    // إرسال للمستقبل
    socket.to(`user_${recipientId}`).emit('privateMessage', {
      id: message.id,
      content: message.content,
      senderId: userId,
      sender: { username: username },
      recipientId: recipientId,
      createdAt: message.createdAt
    });

    console.log(`📮 رسالة خاصة من ${username} إلى ${recipient.username}`);
  }
}
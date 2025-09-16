import { EventEmitter } from 'events';
import { Server as SocketIOServer } from 'socket.io';
import { db, dbType } from '../database-adapter';
import { storage } from '../storage';

export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  
  // إعدادات الغرفة
  maxUsers: number;
  isLocked: boolean;
  isPrivate: boolean;
  requireMicPermission: boolean;
  
  // إعدادات الصوت
  audioCodec: 'opus' | 'pcm';
  bitrate: number; // kbps
  sampleRate: 48000 | 44100 | 16000;
  channels: 1 | 2; // mono or stereo
  
  // إعدادات البث
  isBroadcastRoom: boolean;
  hostId?: number;
  speakers: number[];
  micQueue: number[];
  
  // المستخدمون
  connectedUsers: VoiceUser[];
  userCount: number;
  
  // إحصائيات
  createdAt: Date;
  lastActivity: Date;
}

export interface VoiceUser {
  id: number;
  username: string;
  displayName?: string;
  profileImage?: string;
  role: 'guest' | 'member' | 'owner' | 'admin' | 'moderator';
  
  // خصائص الصوت
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number; // 0-100
  micQuality: 'low' | 'medium' | 'high';
  
  // حالة الاتصال
  isConnected: boolean;
  connectionQuality: 'poor' | 'good' | 'excellent';
  latency: number; // milliseconds
  
  // معرف الاتصال
  socketId: string;
  roomId: string;
  joinedAt: Date;
}

export interface VoiceSession {
  userId: number;
  roomId: string;
  socketId: string;
  peerConnection?: any;
  joinedAt: Date;
  lastActivity: Date;
  
  // إحصائيات الجلسة
  totalSpeakingTime: number;
  packetsReceived: number;
  packetsLost: number;
  averageLatency: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 
        'mute' | 'unmute' | 'speaking' | 'not-speaking';
  roomId: string;
  userId: number;
  targetUserId?: number;
  data?: any;
  timestamp: Date;
}

/**
 * خدمة إدارة الغرف الصوتية المتقدمة
 */
class VoiceService extends EventEmitter {
  private io: SocketIOServer | null = null;
  private voiceRooms: Map<string, VoiceRoom> = new Map();
  private voiceSessions: Map<string, VoiceSession> = new Map(); // socketId -> session
  private userSessions: Map<number, string> = new Map(); // userId -> socketId
  
  // إعدادات الخدمة
  private readonly MAX_USERS_PER_ROOM = 50;
  private readonly MAX_SPEAKERS_PER_BROADCAST = 10;
  private readonly SESSION_TIMEOUT = 30000; // 30 seconds
  
  // إحصائيات
  private stats = {
    totalConnections: 0,
    activeRooms: 0,
    totalMessages: 0,
    startTime: new Date()
  };

  constructor() {
    super();
    this.setupCleanupInterval();
  }

  /**
   * تهيئة الخدمة مع Socket.IO
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupSocketHandlers();
    console.log('✅ تم تهيئة خدمة الصوت');
  }

  /**
   * إعداد معالجات Socket.IO
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 اتصال صوتي جديد: ${socket.id}`);
      
      // انضمام لغرفة صوتية
      socket.on('voice:join-room', async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      // مغادرة غرفة صوتية
      socket.on('voice:leave-room', async () => {
        await this.handleLeaveRoom(socket);
      });

      // رسائل WebRTC Signaling
      socket.on('voice:signal', (message: SignalingMessage) => {
        this.handleSignalingMessage(socket, message);
      });

      // تغيير حالة الكتم
      socket.on('voice:toggle-mute', (data) => {
        this.handleToggleMute(socket, data);
      });

      // تحديث حالة الكلام
      socket.on('voice:speaking', (data) => {
        this.handleSpeakingUpdate(socket, data);
      });

      // طلب الميكروفون في غرفة البث
      socket.on('voice:request-mic', async (data) => {
        await this.handleMicRequest(socket, data);
      });

      // إدارة المتحدثين
      socket.on('voice:manage-speaker', async (data) => {
        await this.handleSpeakerManagement(socket, data);
      });

      // قطع الاتصال
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
    });
  }

  /**
   * معالجة الانضمام لغرفة صوتية
   */
  private async handleJoinRoom(socket: any, data: { roomId: string; userId: number }): Promise<void> {
    try {
      const { roomId, userId } = data;
      
      // التحقق من صحة البيانات
      if (!roomId || !userId) {
        socket.emit('voice:error', { message: 'بيانات غير صالحة' });
        return;
      }

      // جلب معلومات المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        socket.emit('voice:error', { message: 'المستخدم غير موجود' });
        return;
      }

      // التحقق من وجود الغرفة
      let room = this.voiceRooms.get(roomId);
      if (!room) {
        room = await this.createVoiceRoom(roomId);
      }

      // التحقق من القيود
      if (room.connectedUsers.length >= this.MAX_USERS_PER_ROOM) {
        socket.emit('voice:error', { message: 'الغرفة مكتملة' });
        return;
      }

      if (room.isLocked && !['admin', 'owner', 'moderator'].includes(user.userType)) {
        socket.emit('voice:error', { message: 'الغرفة مقفلة' });
        return;
      }

      // مغادرة الغرفة السابقة إن وجدت
      await this.handleLeaveRoom(socket);

      // إنشاء جلسة صوتية جديدة
      const session: VoiceSession = {
        userId,
        roomId,
        socketId: socket.id,
        joinedAt: new Date(),
        lastActivity: new Date(),
        totalSpeakingTime: 0,
        packetsReceived: 0,
        packetsLost: 0,
        averageLatency: 0
      };

      // حفظ الجلسة
      this.voiceSessions.set(socket.id, session);
      this.userSessions.set(userId, socket.id);

      // إضافة المستخدم للغرفة
      const voiceUser: VoiceUser = {
        id: userId,
        username: user.username,
        displayName: user.username,
        profileImage: user.profileImage,
        role: user.userType as any,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        volume: 80,
        micQuality: 'medium',
        isConnected: true,
        connectionQuality: 'good',
        latency: 0,
        socketId: socket.id,
        roomId,
        joinedAt: new Date()
      };

      room.connectedUsers.push(voiceUser);
      room.userCount = room.connectedUsers.length;
      room.lastActivity = new Date();

      // انضمام للغرفة في Socket.IO
      socket.join(`voice_${roomId}`);

      // إرسال معلومات الغرفة للمستخدم الجديد
      socket.emit('voice:room-joined', {
        room: this.sanitizeRoom(room),
        user: voiceUser
      });

      // إشعار باقي المستخدمين
      socket.to(`voice_${roomId}`).emit('voice:user-joined', {
        user: voiceUser,
        roomId
      });

      // تحديث إحصائيات الغرفة
      this.updateRoomStats(room);

      console.log(`✅ ${user.username} انضم للغرفة الصوتية: ${roomId}`);

    } catch (error) {
      console.error('❌ خطأ في الانضمام للغرفة الصوتية:', error);
      socket.emit('voice:error', { message: 'خطأ في الانضمام للغرفة' });
    }
  }

  /**
   * معالجة مغادرة الغرفة الصوتية
   */
  private async handleLeaveRoom(socket: any): Promise<void> {
    try {
      const session = this.voiceSessions.get(socket.id);
      if (!session) return;

      const { userId, roomId } = session;
      const room = this.voiceRooms.get(roomId);
      
      if (room) {
        // إزالة المستخدم من الغرفة
        room.connectedUsers = room.connectedUsers.filter(u => u.id !== userId);
        room.userCount = room.connectedUsers.length;
        room.lastActivity = new Date();

        // إزالة من قائمة المتحدثين إن كان موجوداً
        if (room.isBroadcastRoom) {
          room.speakers = room.speakers.filter(id => id !== userId);
          room.micQueue = room.micQueue.filter(id => id !== userId);
        }

        // مغادرة الغرفة في Socket.IO
        socket.leave(`voice_${roomId}`);

        // إشعار باقي المستخدمين
        socket.to(`voice_${roomId}`).emit('voice:user-left', {
          userId,
          roomId
        });

        // حذف الغرفة إذا أصبحت فارغة
        if (room.connectedUsers.length === 0) {
          this.voiceRooms.delete(roomId);
        }

        console.log(`👋 مستخدم ${userId} غادر الغرفة الصوتية: ${roomId}`);
      }

      // تنظيف الجلسة
      this.voiceSessions.delete(socket.id);
      this.userSessions.delete(userId);

    } catch (error) {
      console.error('❌ خطأ في مغادرة الغرفة الصوتية:', error);
    }
  }

  /**
   * معالجة رسائل WebRTC Signaling
   */
  private handleSignalingMessage(socket: any, message: SignalingMessage): void {
    try {
      const session = this.voiceSessions.get(socket.id);
      if (!session || session.roomId !== message.roomId) {
        socket.emit('voice:error', { message: 'جلسة غير صالحة' });
        return;
      }

      // تحديث النشاط
      session.lastActivity = new Date();

      // توجيه الرسالة
      if (message.targetUserId) {
        // رسالة لمستخدم محدد
        const targetSocketId = this.userSessions.get(message.targetUserId);
        if (targetSocketId) {
          this.io?.to(targetSocketId).emit('voice:signal', {
            ...message,
            userId: session.userId
          });
        }
      } else {
        // رسالة لجميع المستخدمين في الغرفة
        socket.to(`voice_${message.roomId}`).emit('voice:signal', {
          ...message,
          userId: session.userId
        });
      }

      this.stats.totalMessages++;

    } catch (error) {
      console.error('❌ خطأ في معالجة رسالة الإشارة:', error);
    }
  }

  /**
   * معالجة تغيير حالة الكتم
   */
  private handleToggleMute(socket: any, data: { muted: boolean }): void {
    try {
      const session = this.voiceSessions.get(socket.id);
      if (!session) return;

      const room = this.voiceRooms.get(session.roomId);
      if (!room) return;

      // تحديث حالة المستخدم
      const user = room.connectedUsers.find(u => u.id === session.userId);
      if (user) {
        user.isMuted = data.muted;

        // إشعار باقي المستخدمين
        socket.to(`voice_${session.roomId}`).emit('voice:user-mute-changed', {
          userId: session.userId,
          muted: data.muted
        });
      }

    } catch (error) {
      console.error('❌ خطأ في تغيير حالة الكتم:', error);
    }
  }

  /**
   * معالجة تحديث حالة الكلام
   */
  private handleSpeakingUpdate(socket: any, data: { speaking: boolean; volume?: number }): void {
    try {
      const session = this.voiceSessions.get(socket.id);
      if (!session) return;

      const room = this.voiceRooms.get(session.roomId);
      if (!room) return;

      // تحديث حالة المستخدم
      const user = room.connectedUsers.find(u => u.id === session.userId);
      if (user) {
        user.isSpeaking = data.speaking;
        if (data.volume !== undefined) {
          user.volume = data.volume;
        }

        // تحديث إحصائيات الكلام
        if (data.speaking) {
          session.lastActivity = new Date();
        }

        // إشعار باقي المستخدمين
        socket.to(`voice_${session.roomId}`).emit('voice:user-speaking-changed', {
          userId: session.userId,
          speaking: data.speaking,
          volume: user.volume
        });
      }

    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الكلام:', error);
    }
  }

  /**
   * معالجة طلب الميكروفون
   */
  private async handleMicRequest(socket: any, data: { roomId: string }): Promise<void> {
    try {
      const session = this.voiceSessions.get(socket.id);
      if (!session || session.roomId !== data.roomId) {
        socket.emit('voice:error', { message: 'جلسة غير صالحة' });
        return;
      }

      const room = this.voiceRooms.get(data.roomId);
      if (!room || !room.isBroadcastRoom) {
        socket.emit('voice:error', { message: 'الغرفة ليست غرفة بث' });
        return;
      }

      // التحقق من عدم وجود المستخدم في القائمة مسبقاً
      if (room.micQueue.includes(session.userId)) {
        socket.emit('voice:error', { message: 'طلبك موجود في القائمة بالفعل' });
        return;
      }

      // إضافة للقائمة
      room.micQueue.push(session.userId);

      // إشعار المشرفين والمضيف
      const moderatorSockets = room.connectedUsers
        .filter(u => ['admin', 'owner', 'moderator'].includes(u.role) || u.id === room.hostId)
        .map(u => u.socketId);

      moderatorSockets.forEach(socketId => {
        this.io?.to(socketId).emit('voice:mic-requested', {
          userId: session.userId,
          roomId: data.roomId,
          queuePosition: room.micQueue.length
        });
      });

      socket.emit('voice:mic-request-sent', {
        queuePosition: room.micQueue.length
      });

    } catch (error) {
      console.error('❌ خطأ في طلب الميكروفون:', error);
      socket.emit('voice:error', { message: 'خطأ في طلب الميكروفون' });
    }
  }

  /**
   * معالجة إدارة المتحدثين
   */
  private async handleSpeakerManagement(socket: any, data: {
    action: 'approve' | 'deny' | 'remove';
    targetUserId: number;
    roomId: string;
  }): Promise<void> {
    try {
      const session = this.voiceSessions.get(socket.id);
      if (!session || session.roomId !== data.roomId) {
        socket.emit('voice:error', { message: 'جلسة غير صالحة' });
        return;
      }

      const room = this.voiceRooms.get(data.roomId);
      if (!room || !room.isBroadcastRoom) {
        socket.emit('voice:error', { message: 'الغرفة ليست غرفة بث' });
        return;
      }

      // التحقق من الصلاحيات
      const requester = room.connectedUsers.find(u => u.id === session.userId);
      if (!requester || (!['admin', 'owner', 'moderator'].includes(requester.role) && requester.id !== room.hostId)) {
        socket.emit('voice:error', { message: 'ليس لديك صلاحية لإدارة المتحدثين' });
        return;
      }

      const targetSocketId = this.userSessions.get(data.targetUserId);

      switch (data.action) {
        case 'approve':
          // إزالة من قائمة الانتظار
          room.micQueue = room.micQueue.filter(id => id !== data.targetUserId);
          
          // إضافة للمتحدثين
          if (!room.speakers.includes(data.targetUserId) && 
              room.speakers.length < this.MAX_SPEAKERS_PER_BROADCAST) {
            room.speakers.push(data.targetUserId);
            
            // إشعار المستخدم
            if (targetSocketId) {
              this.io?.to(targetSocketId).emit('voice:mic-approved', {
                roomId: data.roomId
              });
            }
            
            // إشعار الغرفة
            this.io?.to(`voice_${data.roomId}`).emit('voice:speaker-added', {
              userId: data.targetUserId,
              roomId: data.roomId
            });
          }
          break;

        case 'deny':
          // إزالة من قائمة الانتظار
          room.micQueue = room.micQueue.filter(id => id !== data.targetUserId);
          
          // إشعار المستخدم
          if (targetSocketId) {
            this.io?.to(targetSocketId).emit('voice:mic-denied', {
              roomId: data.roomId
            });
          }
          break;

        case 'remove':
          // إزالة من المتحدثين
          room.speakers = room.speakers.filter(id => id !== data.targetUserId);
          
          // إشعار المستخدم
          if (targetSocketId) {
            this.io?.to(targetSocketId).emit('voice:speaker-removed', {
              roomId: data.roomId
            });
          }
          
          // إشعار الغرفة
          this.io?.to(`voice_${data.roomId}`).emit('voice:speaker-removed', {
            userId: data.targetUserId,
            roomId: data.roomId
          });
          break;
      }

    } catch (error) {
      console.error('❌ خطأ في إدارة المتحدثين:', error);
      socket.emit('voice:error', { message: 'خطأ في إدارة المتحدثين' });
    }
  }

  /**
   * معالجة قطع الاتصال
   */
  private async handleDisconnect(socket: any): Promise<void> {
    try {
      await this.handleLeaveRoom(socket);
      this.stats.totalConnections = Math.max(0, this.stats.totalConnections - 1);
      console.log(`🔌 انقطع الاتصال الصوتي: ${socket.id}`);
    } catch (error) {
      console.error('❌ خطأ في معالجة قطع الاتصال:', error);
    }
  }

  /**
   * إنشاء غرفة صوتية جديدة
   */
  private async createVoiceRoom(roomId: string): Promise<VoiceRoom> {
    try {
      // جلب معلومات الغرفة من قاعدة البيانات
      const dbRoom = await storage.getRoom(roomId);
      
      const voiceRoom: VoiceRoom = {
        id: roomId,
        name: dbRoom?.name || `غرفة ${roomId}`,
        description: dbRoom?.description,
        icon: dbRoom?.icon,
        
        // إعدادات افتراضية
        maxUsers: this.MAX_USERS_PER_ROOM,
        isLocked: dbRoom?.isLocked || false,
        isPrivate: false,
        requireMicPermission: false,
        
        // إعدادات صوت عالية الجودة
        audioCodec: 'opus',
        bitrate: 128, // kbps
        sampleRate: 48000,
        channels: 2,
        
        // إعدادات البث
        isBroadcastRoom: dbRoom?.isBroadcast || false,
        hostId: dbRoom?.hostId || undefined,
        speakers: [],
        micQueue: [],
        
        // المستخدمون
        connectedUsers: [],
        userCount: 0,
        
        // إحصائيات
        createdAt: new Date(),
        lastActivity: new Date()
      };

      this.voiceRooms.set(roomId, voiceRoom);
      this.stats.activeRooms++;
      
      console.log(`✅ تم إنشاء غرفة صوتية: ${roomId}`);
      return voiceRoom;

    } catch (error) {
      console.error('❌ خطأ في إنشاء الغرفة الصوتية:', error);
      throw error;
    }
  }

  /**
   * تنظيف البيانات الحساسة من الغرفة
   */
  private sanitizeRoom(room: VoiceRoom): Partial<VoiceRoom> {
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      icon: room.icon,
      maxUsers: room.maxUsers,
      isLocked: room.isLocked,
      audioCodec: room.audioCodec,
      bitrate: room.bitrate,
      sampleRate: room.sampleRate,
      channels: room.channels,
      isBroadcastRoom: room.isBroadcastRoom,
      hostId: room.hostId,
      speakers: room.speakers,
      connectedUsers: room.connectedUsers.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        profileImage: u.profileImage,
        role: u.role,
        isMuted: u.isMuted,
        isDeafened: u.isDeafened,
        isSpeaking: u.isSpeaking,
        volume: u.volume,
        micQuality: u.micQuality,
        connectionQuality: u.connectionQuality,
        isConnected: true,
        lastActivity: new Date(),
        latency: 0,
        socketId: '',
        roomId: room.id,
        joinedAt: new Date()
      })),
      userCount: room.userCount
    };
  }

  /**
   * تحديث إحصائيات الغرفة
   */
  private updateRoomStats(room: VoiceRoom): void {
    // حفظ الإحصائيات في قاعدة البيانات إذا لزم الأمر
    this.emit('room-stats-updated', {
      roomId: room.id,
      userCount: room.userCount,
      lastActivity: room.lastActivity
    });
  }

  /**
   * إعداد تنظيف دوري للجلسات المنتهية الصلاحية
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // كل دقيقة
  }

  /**
   * تنظيف الجلسات المنتهية الصلاحية
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [socketId, session] of this.voiceSessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        expiredSessions.push(socketId);
      }
    }

    // إزالة الجلسات المنتهية الصلاحية
    expiredSessions.forEach(socketId => {
      const session = this.voiceSessions.get(socketId);
      if (session) {
        console.log(`🧹 تنظيف جلسة منتهية الصلاحية: ${socketId}`);
        this.cleanupSession(socketId, session);
      }
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 تم تنظيف ${expiredSessions.length} جلسة منتهية الصلاحية`);
    }
  }

  /**
   * تنظيف جلسة محددة
   */
  private cleanupSession(socketId: string, session: VoiceSession): void {
    const room = this.voiceRooms.get(session.roomId);
    if (room) {
      // إزالة المستخدم من الغرفة
      room.connectedUsers = room.connectedUsers.filter(u => u.id !== session.userId);
      room.userCount = room.connectedUsers.length;

      // إزالة من المتحدثين
      if (room.isBroadcastRoom) {
        room.speakers = room.speakers.filter(id => id !== session.userId);
        room.micQueue = room.micQueue.filter(id => id !== session.userId);
      }

      // إشعار باقي المستخدمين
      this.io?.to(`voice_${session.roomId}`).emit('voice:user-left', {
        userId: session.userId,
        roomId: session.roomId
      });

      // حذف الغرفة إذا أصبحت فارغة
      if (room.connectedUsers.length === 0) {
        this.voiceRooms.delete(session.roomId);
        this.stats.activeRooms--;
      }
    }

    // إزالة الجلسة
    this.voiceSessions.delete(socketId);
    this.userSessions.delete(session.userId);
  }

  // Public Methods للاستعلام

  /**
   * الحصول على معلومات غرفة صوتية
   */
  getVoiceRoom(roomId: string): VoiceRoom | null {
    return this.voiceRooms.get(roomId) || null;
  }

  /**
   * الحصول على جميع الغرف الصوتية
   */
  getAllVoiceRooms(): VoiceRoom[] {
    return Array.from(this.voiceRooms.values());
  }

  /**
   * الحصول على إحصائيات الخدمة
   */
  getStats() {
    return {
      ...this.stats,
      activeRooms: this.voiceRooms.size,
      totalConnections: this.voiceSessions.size,
      uptime: new Date().getTime() - this.stats.startTime.getTime()
    };
  }

  /**
   * الحصول على المستخدمين المتصلين في غرفة
   */
  getRoomUsers(roomId: string): VoiceUser[] {
    const room = this.voiceRooms.get(roomId);
    return room ? room.connectedUsers : [];
  }

  /**
   * التحقق من اتصال المستخدم
   */
  isUserConnected(userId: number): boolean {
    return this.userSessions.has(userId);
  }

  /**
   * الحصول على غرفة المستخدم الحالية
   */
  getUserRoom(userId: number): string | null {
    const socketId = this.userSessions.get(userId);
    if (socketId) {
      const session = this.voiceSessions.get(socketId);
      return session ? session.roomId : null;
    }
    return null;
  }
}

// تصدير instance واحد
export const voiceService = new VoiceService();
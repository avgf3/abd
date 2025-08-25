import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';
import type { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let emitter: Emitter | null = null;

/**
 * إعداد Redis Adapter لـ Socket.IO للعمل مع Clustering
 */
export async function setupSocketRedisAdapter(io: SocketIOServer): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log('⚠️ REDIS_URL غير محدد، Socket.IO سيعمل في وضع الذاكرة المحلية');
    return;
  }

  try {
    // إنشاء Redis clients للنشر والاشتراك
    const redisOptions = {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      }
    };

    pubClient = new Redis(process.env.REDIS_URL, {
      ...redisOptions,
      connectionName: 'socket-pub'
    });

    subClient = new Redis(process.env.REDIS_URL, {
      ...redisOptions,
      connectionName: 'socket-sub'
    });

    // معالجة الأحداث للـ pub client
    pubClient.on('connect', () => {
      console.log('🔄 Socket.IO Publisher connecting to Redis...');
    });

    pubClient.on('ready', () => {
      console.log('✅ Socket.IO Publisher connected to Redis');
    });

    pubClient.on('error', (err) => {
      console.error('❌ Socket.IO Publisher Redis error:', err);
    });

    // معالجة الأحداث للـ sub client
    subClient.on('connect', () => {
      console.log('🔄 Socket.IO Subscriber connecting to Redis...');
    });

    subClient.on('ready', () => {
      console.log('✅ Socket.IO Subscriber connected to Redis');
    });

    subClient.on('error', (err) => {
      console.error('❌ Socket.IO Subscriber Redis error:', err);
    });

    // انتظار اتصال كلا العميلين
    await Promise.all([
      new Promise((resolve) => pubClient!.once('ready', resolve)),
      new Promise((resolve) => subClient!.once('ready', resolve))
    ]);

    // إنشاء وتطبيق Redis adapter
    const adapter = createAdapter(pubClient, subClient);
    io.adapter(adapter);

    // إنشاء emitter للإرسال من خارج Socket.IO context
    emitter = new Emitter(pubClient);

    console.log('✅ تم إعداد Socket.IO Redis Adapter بنجاح');

    // إضافة معلومات تشخيصية
    io.on('connection', (socket) => {
      socket.on('ping', () => {
        socket.emit('pong', {
          serverId: process.pid,
          timestamp: Date.now()
        });
      });
    });

  } catch (error) {
    console.error('❌ فشل إعداد Socket.IO Redis Adapter:', error);
    
    // التنظيف في حالة الفشل
    if (pubClient) pubClient.disconnect();
    if (subClient) subClient.disconnect();
    
    pubClient = null;
    subClient = null;
    emitter = null;
  }
}

/**
 * إغلاق اتصالات Redis Adapter بشكل آمن
 */
export async function closeSocketRedisAdapter(): Promise<void> {
  const promises: Promise<any>[] = [];

  if (pubClient) {
    promises.push(pubClient.quit());
  }

  if (subClient) {
    promises.push(subClient.quit());
  }

  try {
    await Promise.all(promises);
    console.log('✅ تم إغلاق Socket.IO Redis Adapter بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إغلاق Socket.IO Redis Adapter:', error);
  } finally {
    pubClient = null;
    subClient = null;
    emitter = null;
  }
}

/**
 * الحصول على Socket.IO Emitter للإرسال من خارج Socket context
 */
export function getSocketEmitter(): Emitter | null {
  return emitter;
}

/**
 * إرسال حدث عبر جميع الخوادم
 */
export function emitToAll(event: string, data: any): void {
  if (emitter) {
    emitter.emit(event, data);
  }
}

/**
 * إرسال حدث لغرفة معينة عبر جميع الخوادم
 */
export function emitToRoom(room: string, event: string, data: any): void {
  if (emitter) {
    emitter.to(room).emit(event, data);
  }
}

/**
 * إرسال حدث لمستخدم معين عبر جميع الخوادم
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (emitter) {
    emitter.to(`user:${userId}`).emit(event, data);
  }
}
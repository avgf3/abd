import Redis from 'ioredis';
import RedisStore from 'connect-redis';

let redisClient: Redis | null = null;
let sessionStore: any = null;

// إعداد Redis Client
export function initializeRedis(): { client: Redis | null; store: any } {
  if (process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        // إعدادات الاتصال
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: false,
        
        // إعدادات إعادة الاتصال
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('❌ فشل الاتصال بـ Redis بعد 3 محاولات');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        
        // إعدادات الأمان
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        
        // إعدادات الأداء
        lazyConnect: false,
        keepAlive: 10000,
        connectTimeout: 30000,
      });

      // معالجة الأحداث
      redisClient.on('connect', () => {
        console.log('🔄 جاري الاتصال بـ Redis...');
      });

      redisClient.on('ready', () => {
        console.log('✅ تم الاتصال بـ Redis بنجاح');
      });

      redisClient.on('error', (err) => {
        console.error('❌ خطأ في Redis:', err);
      });

      redisClient.on('close', () => {
        console.log('🔌 تم إغلاق اتصال Redis');
      });

      redisClient.on('reconnecting', (delay) => {
        console.log(`🔄 إعادة الاتصال بـ Redis بعد ${delay}ms`);
      });

      // إنشاء Session Store
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400, // 24 ساعة
        disableTouch: false,
        logErrors: true,
      });

      return { client: redisClient, store: sessionStore };
    } catch (error) {
      console.error('❌ فشل تهيئة Redis:', error);
      return { client: null, store: null };
    }
  }

  console.log('⚠️ REDIS_URL غير محدد، سيتم استخدام تخزين الذاكرة للجلسات');
  return { client: null, store: null };
}

// دالة لإغلاق اتصال Redis بشكل آمن
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ تم إغلاق اتصال Redis بنجاح');
    } catch (error) {
      console.error('❌ خطأ في إغلاق Redis:', error);
    }
  }
}

// دالة للتحقق من حالة Redis
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}

// دالة لحفظ البيانات في Redis مع TTL
export async function setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
  if (!redisClient || !isRedisConnected()) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setex(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (error) {
    console.error('خطأ في حفظ البيانات في Redis:', error);
  }
}

// دالة لجلب البيانات من Redis
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient || !isRedisConnected()) {
    return null;
  }

  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('خطأ في جلب البيانات من Redis:', error);
    return null;
  }
}

// دالة لحذف مفتاح من Redis
export async function deleteCache(key: string): Promise<void> {
  if (!redisClient || !isRedisConnected()) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('خطأ في حذف البيانات من Redis:', error);
  }
}

// دالة لحذف مفاتيح متعددة بنمط معين
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisClient || !isRedisConnected()) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error('خطأ في حذف البيانات بالنمط من Redis:', error);
  }
}

export { redisClient, sessionStore };
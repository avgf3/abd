import type { Request, Response, NextFunction } from 'express';
import { getCache, setCache, deleteCache, deleteCachePattern } from '../utils/redis';
import crypto from 'crypto';

// Cache configurations for different types of data
const cacheConfigs = {
  // بيانات تتغير ببطء
  userProfile: { ttl: 300 }, // 5 دقائق
  roomList: { ttl: 60 }, // دقيقة واحدة
  roomMembers: { ttl: 120 }, // دقيقتان
  friendsList: { ttl: 180 }, // 3 دقائق
  
  // بيانات شبه ثابتة
  gameSettings: { ttl: 600 }, // 10 دقائق
  leaderboard: { ttl: 300 }, // 5 دقائق
  statistics: { ttl: 900 }, // 15 دقيقة
  
  // بيانات سريعة التغير (لا يُنصح بتخزينها)
  messages: { ttl: 0 }, // لا تخزين
  onlineStatus: { ttl: 0 }, // لا تخزين
};

/**
 * توليد مفتاح cache فريد بناءً على الطلب
 */
function generateCacheKey(req: Request, prefix: string): string {
  const userId = (req.user as any)?.id || 'anonymous';
  const path = req.path;
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  
  const hash = crypto
    .createHash('md5')
    .update(`${path}:${query}:${params}`)
    .digest('hex');
  
  return `cache:${prefix}:${userId}:${hash}`;
}

/**
 * Middleware للتخزين المؤقت
 */
export function cacheMiddleware(
  cacheType: keyof typeof cacheConfigs,
  keyGenerator?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // تخطي Cache في بعض الحالات
    if (
      req.method !== 'GET' || 
      req.headers['cache-control'] === 'no-cache' ||
      req.headers['x-no-cache'] === 'true' ||
      !cacheConfigs[cacheType].ttl
    ) {
      return next();
    }

    const cacheKey = keyGenerator ? 
      keyGenerator(req) : 
      generateCacheKey(req, cacheType);

    try {
      // محاولة جلب البيانات من Cache
      const cachedData = await getCache<any>(cacheKey);
      
      if (cachedData) {
        // إضافة headers للإشارة أن البيانات من cache
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        return res.json(cachedData);
      }
    } catch (error) {
      console.error('خطأ في قراءة Cache:', error);
    }

    // إذا لم توجد بيانات في cache، نواصل ونخزن النتيجة
    res.setHeader('X-Cache', 'MISS');
    
    // حفظ الدالة الأصلية لـ res.json
    const originalJson = res.json.bind(res);
    
    // استبدال res.json لحفظ البيانات في cache
    res.json = function(data: any) {
      // حفظ في cache إذا كانت الاستجابة ناجحة
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, data, cacheConfigs[cacheType].ttl)
          .catch(err => console.error('خطأ في حفظ Cache:', err));
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * إبطال cache لمستخدم معين
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const patterns = [
    `cache:*:${userId}:*`,
    `cache:userProfile:${userId}:*`,
    `cache:friendsList:${userId}:*`,
  ];
  
  for (const pattern of patterns) {
    await deleteCachePattern(pattern);
  }
}

/**
 * إبطال cache لغرفة معينة
 */
export async function invalidateRoomCache(roomId: string): Promise<void> {
  const patterns = [
    `cache:roomMembers:*:*${roomId}*`,
    `cache:roomList:*`,
  ];
  
  for (const pattern of patterns) {
    await deleteCachePattern(pattern);
  }
}

/**
 * إبطال cache حسب النوع
 */
export async function invalidateCacheByType(cacheType: keyof typeof cacheConfigs): Promise<void> {
  await deleteCachePattern(`cache:${cacheType}:*`);
}

/**
 * Middleware لتنظيف cache بعد عمليات التعديل
 */
export function cacheInvalidator(patterns: string[]) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    // تنظيف Cache بعد اكتمال الطلب
    _res.on('finish', async () => {
      if (_res.statusCode >= 200 && _res.statusCode < 300) {
        for (const pattern of patterns) {
          await deleteCachePattern(pattern);
        }
      }
    });
    
    next();
  };
}

// تصدير middlewares جاهزة للاستخدام
export const cacheUserProfile = cacheMiddleware('userProfile');
export const cacheRoomList = cacheMiddleware('roomList');
export const cacheRoomMembers = cacheMiddleware('roomMembers');
export const cacheFriendsList = cacheMiddleware('friendsList');
export const cacheGameSettings = cacheMiddleware('gameSettings');
export const cacheLeaderboard = cacheMiddleware('leaderboard');
export const cacheStatistics = cacheMiddleware('statistics');
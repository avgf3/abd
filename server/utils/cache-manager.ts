/**
 * مدير الذاكرة المؤقتة المحسن للدردشة
 * يحسن الأداء بتخزين البيانات المتكررة في الذاكرة
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // تنظيف دوري للكاش
    setInterval(() => this.cleanup(), 60000); // كل دقيقة
  }

  /**
   * تخزين قيمة في الكاش
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // إذا وصلنا للحد الأقصى، احذف الأقل استخداماً
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now() + (ttl || this.defaultTTL),
      hits: 0,
    });
  }

  /**
   * جلب قيمة من الكاش
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // التحقق من انتهاء الصلاحية
    if (entry.timestamp < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // زيادة عدد الاستخدامات
    entry.hits++;
    
    return entry.data as T;
  }

  /**
   * حذف قيمة من الكاش
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * مسح الكاش بالكامل
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * حذف الأقل استخداماً (LRU)
   */
  private evictLRU(): void {
    let leastUsedKey: string | null = null;
    let minHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * تنظيف القيم المنتهية الصلاحية
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * إحصائيات الكاش
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }
    
    return totalHits / this.cache.size;
  }
}

// إنشاء instances مختلفة للكاش
export const messageCache = new CacheManager(500, 30000); // 30 ثانية للرسائل
export const userCache = new CacheManager(200, 300000); // 5 دقائق للمستخدمين
export const roomCache = new CacheManager(50, 600000); // 10 دقائق للغرف

/**
 * دالة مساعدة للحصول على البيانات مع الكاش
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: CacheManager = messageCache,
  ttl?: number
): Promise<T> {
  // محاولة الحصول من الكاش أولاً
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // جلب البيانات
  try {
    const data = await fetcher();
    
    // حفظ في الكاش
    cache.set(key, data, ttl);
    
    return data;
  } catch (error) {
    // في حالة الخطأ، حاول إرجاع آخر قيمة مخزنة حتى لو انتهت صلاحيتها
    const staleData = cache.get<T>(key);
    if (staleData !== null) {
      console.warn(`استخدام بيانات قديمة للمفتاح ${key} بسبب خطأ:`, error);
      return staleData;
    }
    
    throw error;
  }
}

/**
 * مسح الكاش عند تحديث البيانات
 */
export function invalidateCache(pattern: string, cache: CacheManager = messageCache): void {
  const keysToDelete: string[] = [];
  
  // جمع المفاتيح المطابقة
  for (const key of cache['cache'].keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  // حذف المفاتيح
  keysToDelete.forEach(key => cache.delete(key));
}

// تصدير الكلاس للاستخدام المخصص
export default CacheManager;
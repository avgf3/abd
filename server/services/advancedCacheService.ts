/**
 * 🚀 نظام Cache متقدم للصور
 * حل ذكي لمشاكل Cache مع تحسينات متقدمة
 */

import crypto from 'crypto';
import { storage } from '../storage';

interface CacheEntry {
  key: string;
  value: string;
  hash: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  expiresAt: number;
  metadata: {
    userId: number;
    type: 'avatar' | 'banner' | 'wall';
    size: number;
    mimeType: string;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  averageAccessTime: number;
  hitRatio: number;
}

class AdvancedCacheService {
  private static instance: AdvancedCacheService;
  private cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 100 * 1024 * 1024; // 100MB
  private readonly maxEntries = 1000;
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    averageAccessTime: 0,
    hitRatio: 0
  };

  private constructor() {
    // تشغيل عملية تنظيف دورية كل 30 دقيقة
    setInterval(() => this.cleanup(), 30 * 60 * 1000);
    
    // تشغيل عملية تحسين Cache كل ساعة
    setInterval(() => this.optimize(), 60 * 60 * 1000);
  }

  public static getInstance(): AdvancedCacheService {
    if (!AdvancedCacheService.instance) {
      AdvancedCacheService.instance = new AdvancedCacheService();
    }
    return AdvancedCacheService.instance;
  }

  /**
   * 🔍 الحصول على صورة من Cache مع ذكاء متقدم
   */
  async getImage(userId: number, type: 'avatar' | 'banner' | 'wall'): Promise<string | null> {
    const startTime = Date.now();
    const key = this.generateCacheKey(userId, type);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    
    // فحص انتهاء الصلاحية
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    
    // تحديث إحصائيات الوصول
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.stats.averageAccessTime = (this.stats.averageAccessTime + (Date.now() - startTime)) / 2;
    this.updateStats();
    
    return entry.value;
  }

  /**
   * 💾 حفظ صورة في Cache مع تحسينات ذكية
   */
  async setImage(
    userId: number, 
    type: 'avatar' | 'banner' | 'wall', 
    imageData: string,
    options?: {
      ttl?: number;
      priority?: 'high' | 'normal' | 'low';
      metadata?: any;
    }
  ): Promise<void> {
    const { ttl = this.defaultTTL, priority = 'normal', metadata = {} } = options || {};
    
    const key = this.generateCacheKey(userId, type);
    const hash = this.generateImageHash(imageData);
    const size = this.calculateSize(imageData);
    
    // فحص الحد الأقصى للحجم
    if (size > 10 * 1024 * 1024) { // 10MB للصورة الواحدة
      console.warn(`⚠️ صورة كبيرة جداً للـ Cache: ${size} bytes`);
      return;
    }
    
    // تحرير مساحة إذا لزم الأمر
    await this.ensureSpace(size);
    
    const entry: CacheEntry = {
      key,
      value: imageData,
      hash,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl,
      metadata: {
        userId,
        type,
        size,
        mimeType: this.extractMimeType(imageData),
        ...metadata
      }
    };
    
    // تطبيق أولوية الحفظ
    if (priority === 'high') {
      entry.expiresAt = Date.now() + (ttl * 2); // مدة أطول للأولوية العالية
    } else if (priority === 'low') {
      entry.expiresAt = Date.now() + (ttl / 2); // مدة أقصر للأولوية المنخفضة
    }
    
    this.cache.set(key, entry);
    this.stats.totalSize += size;
    
    }

  /**
   * 🔄 تحديث hash الصورة لحل مشكلة Cache المتصفح
   */
  async updateImageHash(userId: number, type: 'avatar' | 'banner' | 'wall'): Promise<string> {
    const newHash = crypto.randomBytes(8).toString('hex');
    
    // تحديث في قاعدة البيانات
    const updateField = type === 'avatar' ? 'avatarHash' : `${type}Hash`;
    await storage.updateUser(userId, { [updateField]: newHash } as any);
    
    // إزالة من Cache لإجبار التحديث
    const key = this.generateCacheKey(userId, type);
    this.cache.delete(key);
    
    return newHash;
  }

  /**
   * 🧹 تنظيف Cache الذكي
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    let removedCount = 0;
    let freedSpace = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // إزالة المنتهية الصلاحية
      if (now > entry.expiresAt) {
        freedSpace += entry.metadata.size;
        this.cache.delete(key);
        removedCount++;
        continue;
      }
      
      // إزالة غير المستخدمة لفترة طويلة (أسبوع)
      if (now - entry.lastAccessed > 7 * 24 * 60 * 60 * 1000 && entry.accessCount < 5) {
        freedSpace += entry.metadata.size;
        this.cache.delete(key);
        removedCount++;
        continue;
      }
    }
    
    this.stats.totalSize -= freedSpace;
    this.stats.evictions += removedCount;
    
    if (removedCount > 0) {
      }
  }

  /**
   * ⚡ تحسين Cache للأداء الأمثل
   */
  private async optimize(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // ترتيب حسب درجة الأهمية (الوصول الأخير × عدد مرات الوصول)
    entries.sort(([, a], [, b]) => {
      const scoreA = a.accessCount * (Date.now() - a.lastAccessed);
      const scoreB = b.accessCount * (Date.now() - b.lastAccessed);
      return scoreB - scoreA;
    });
    
    // إزالة أقل العناصر أهمية إذا تجاوزنا الحد الأقصى
    while (this.cache.size > this.maxEntries) {
      const [key, entry] = entries.pop()!;
      this.cache.delete(key);
      this.stats.totalSize -= entry.metadata.size;
      this.stats.evictions++;
    }
    
    }

  /**
   * 🔧 ضمان توفر مساحة كافية
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    // فحص الحد الأقصى للحجم
    while (this.stats.totalSize + requiredSize > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      
      if (entries.length === 0) break;
      
      // إزالة أقل العناصر استخداماً
      entries.sort(([, a], [, b]) => {
        const scoreA = a.accessCount / (Date.now() - a.lastAccessed + 1);
        const scoreB = b.accessCount / (Date.now() - b.lastAccessed + 1);
        return scoreA - scoreB;
      });
      
      const [key, entry] = entries[0];
      this.cache.delete(key);
      this.stats.totalSize -= entry.metadata.size;
      this.stats.evictions++;
    }
    
    // فحص الحد الأقصى لعدد العناصر
    while (this.cache.size >= this.maxEntries) {
      const entries = Array.from(this.cache.entries());
      const [key, entry] = entries[0];
      this.cache.delete(key);
      this.stats.totalSize -= entry.metadata.size;
      this.stats.evictions++;
    }
  }

  /**
   * 🔑 إنتاج مفتاح Cache فريد
   */
  private generateCacheKey(userId: number, type: string): string {
    return `image_${type}_${userId}`;
  }

  /**
   * 🔐 إنتاج hash للصورة
   */
  private generateImageHash(imageData: string): string {
    return crypto.createHash('md5').update(imageData).digest('hex').substring(0, 12);
  }

  /**
   * 📏 حساب حجم البيانات
   */
  private calculateSize(data: string): number {
    if (data.startsWith('data:')) {
      // تقدير حجم Base64 (3/4 من الطول تقريباً)
      const base64Data = data.split(',')[1] || data;
      return Math.ceil(base64Data.length * 0.75);
    }
    return data.length * 2; // UTF-16
  }

  /**
   * 🏷️ استخراج نوع MIME
   */
  private extractMimeType(imageData: string): string {
    if (imageData.startsWith('data:')) {
      const match = imageData.match(/data:([^;]+);/);
      return match ? match[1] : 'image/webp';
    }
    return 'image/webp';
  }

  /**
   * 📊 تحديث الإحصائيات
   */
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * 📋 تنسيق حجم الملف
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 🗑️ مسح Cache بالكامل
   */
  clearAll(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    }

  /**
   * 🗑️ مسح cache مستخدم معين
   */
  clearUserImages(userId: number): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.includes(`_${userId}`));
    let freedSpace = 0;
    
    keys.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        freedSpace += entry.metadata.size;
        this.cache.delete(key);
      }
    });
    
    this.stats.totalSize -= freedSpace;
    }

  /**
   * 📊 الحصول على إحصائيات Cache
   */
  getStats(): CacheStats & { entries: number; totalSizeFormatted: string } {
    return {
      ...this.stats,
      entries: this.cache.size,
      totalSizeFormatted: this.formatSize(this.stats.totalSize)
    };
  }

  /**
   * 🔍 تشخيص وإصلاح مشاكل Cache
   */
  async diagnoseAndFix(): Promise<{
    issues: string[];
    fixes: string[];
    recommendations: string[];
  }> {
    const result = {
      issues: [] as string[],
      fixes: [] as string[],
      recommendations: [] as string[]
    };
    
    // فحص نسبة النجاح
    if (this.stats.hitRatio < 50) {
      result.issues.push(`نسبة نجاح Cache منخفضة: ${this.stats.hitRatio.toFixed(1)}%`);
      result.recommendations.push('زيادة مدة انتهاء الصلاحية للصور الشائعة');
    }
    
    // فحص استخدام الذاكرة
    if (this.stats.totalSize > this.maxCacheSize * 0.9) {
      result.issues.push(`استخدام ذاكرة عالي: ${this.formatSize(this.stats.totalSize)}`);
      await this.cleanup();
      result.fixes.push('تم تنظيف Cache تلقائياً');
    }
    
    // فحص عدد العناصر
    if (this.cache.size > this.maxEntries * 0.9) {
      result.issues.push(`عدد عناصر Cache عالي: ${this.cache.size}`);
      await this.optimize();
      result.fixes.push('تم تحسين Cache تلقائياً');
    }
    
    // توصيات التحسين
    if (this.stats.averageAccessTime > 50) {
      result.recommendations.push('تحسين خوارزمية البحث في Cache');
    }
    
    if (this.stats.evictions > this.stats.hits * 0.1) {
      result.recommendations.push('زيادة حجم Cache أو تحسين استراتيجية الإزالة');
    }
    
    return result;
  }
}

export const advancedCacheService = AdvancedCacheService.getInstance();
export default advancedCacheService;
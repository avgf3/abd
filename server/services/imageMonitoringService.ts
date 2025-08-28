/**
 * 📊 نظام مراقبة ومتابعة الصور المتقدم
 * مراقبة شاملة للأداء والأخطاء مع تنبيهات ذكية
 */

import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { advancedCacheService } from './advancedCacheService';
import { smartImageService } from './smartImageService';

interface PerformanceMetric {
  timestamp: number;
  metric: string;
  value: number;
  unit: string;
  metadata?: any;
}

interface ErrorLog {
  timestamp: number;
  type: 'upload_error' | 'cache_miss' | 'file_not_found' | 'processing_error' | 'storage_error';
  message: string;
  userId?: number;
  imageType?: 'avatar' | 'banner' | 'wall';
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number; // 0-100
  components: {
    upload: { status: string; score: number; issues: string[] };
    cache: { status: string; score: number; issues: string[] };
    storage: { status: string; score: number; issues: string[] };
    performance: { status: string; score: number; issues: string[] };
  };
  recommendations: string[];
  alerts: string[];
}

interface UsageStats {
  totalUploads: number;
  totalSize: number;
  averageUploadTime: number;
  cacheHitRatio: number;
  errorRate: number;
  popularImageTypes: { type: string; count: number }[];
  peakUsageHours: { hour: number; uploads: number }[];
}

class ImageMonitoringService {
  private static instance: ImageMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorLog[] = [];
  private readonly maxMetrics = 10000;
  private readonly maxErrors = 5000;
  private readonly metricsFile: string;
  private readonly errorsFile: string;
  
  // إعدادات التنبيهات
  private readonly thresholds = {
    uploadTime: 5000, // 5 ثواني
    errorRate: 5, // 5%
    cacheHitRatio: 70, // 70%
    diskUsage: 80, // 80%
    memoryUsage: 85 // 85%
  };

  private constructor() {
    const logsDir = path.join(process.cwd(), 'logs', 'images');
    this.metricsFile = path.join(logsDir, 'metrics.json');
    this.errorsFile = path.join(logsDir, 'errors.json');
    
    // إنشاء مجلد السجلات
    this.ensureLogsDirectory();
    
    // تحميل البيانات المحفوظة
    this.loadPersistedData();
    
    // تشغيل المراقبة التلقائية
    this.startAutomaticMonitoring();
  }

  public static getInstance(): ImageMonitoringService {
    if (!ImageMonitoringService.instance) {
      ImageMonitoringService.instance = new ImageMonitoringService();
    }
    return ImageMonitoringService.instance;
  }

  /**
   * 📈 تسجيل metric أداء
   */
  recordMetric(
    metric: string,
    value: number,
    unit: string = 'count',
    metadata?: any
  ): void {
    const entry: PerformanceMetric = {
      timestamp: Date.now(),
      metric,
      value,
      unit,
      metadata
    };

    this.metrics.push(entry);
    
    // تنظيف البيانات القديمة
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics + 1000);
    }

    // فحص العتبات والتنبيهات
    this.checkThresholds(metric, value);
  }

  /**
   * 🚨 تسجيل خطأ
   */
  logError(
    type: ErrorLog['type'],
    message: string,
    severity: ErrorLog['severity'] = 'medium',
    options?: {
      userId?: number;
      imageType?: 'avatar' | 'banner' | 'wall';
      details?: any;
    }
  ): void {
    const error: ErrorLog = {
      timestamp: Date.now(),
      type,
      message,
      severity,
      ...options
    };

    this.errors.push(error);
    
    // تنظيف الأخطاء القديمة
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors + 1000);
    }

    // طباعة الأخطاء الحرجة
    if (severity === 'critical' || severity === 'high') {
      console.error(`🚨 خطأ ${severity}: ${message}`, options?.details);
    }
  }

  /**
   * 🏥 فحص صحة النظام الشامل
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      overall: 'good',
      score: 100,
      components: {
        upload: { status: 'good', score: 100, issues: [] },
        cache: { status: 'good', score: 100, issues: [] },
        storage: { status: 'good', score: 100, issues: [] },
        performance: { status: 'good', score: 100, issues: [] }
      },
      recommendations: [],
      alerts: []
    };

    try {
      // فحص نظام الرفع
      await this.checkUploadSystem(health);
      
      // فحص نظام Cache
      await this.checkCacheSystem(health);
      
      // فحص نظام التخزين
      await this.checkStorageSystem(health);
      
      // فحص الأداء
      await this.checkPerformance(health);
      
      // حساب النتيجة الإجمالية
      const scores = Object.values(health.components).map(c => c.score);
      health.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      // تحديد الحالة الإجمالية
      if (health.score >= 90) health.overall = 'excellent';
      else if (health.score >= 80) health.overall = 'good';
      else if (health.score >= 60) health.overall = 'fair';
      else if (health.score >= 40) health.overall = 'poor';
      else health.overall = 'critical';

      return health;
      
    } catch (error) {
      health.overall = 'critical';
      health.score = 0;
      health.alerts.push(`خطأ في فحص صحة النظام: ${(error as Error).message}`);
      return health;
    }
  }

  /**
   * 📊 الحصول على إحصائيات الاستخدام
   */
  getUsageStats(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): UsageStats {
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeframes[timeframe];
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    const recentErrors = this.errors.filter(e => e.timestamp >= cutoff);

    // حساب الإحصائيات
    const uploads = recentMetrics.filter(m => m.metric === 'upload_success');
    const uploadTimes = recentMetrics.filter(m => m.metric === 'upload_time');
    const cacheHits = recentMetrics.filter(m => m.metric === 'cache_hit');
    const cacheMisses = recentMetrics.filter(m => m.metric === 'cache_miss');

    const totalUploads = uploads.length;
    const totalSize = uploads.reduce((sum, m) => sum + (m.metadata?.size || 0), 0);
    const averageUploadTime = uploadTimes.length > 0 
      ? uploadTimes.reduce((sum, m) => sum + m.value, 0) / uploadTimes.length 
      : 0;
    
    const totalCacheRequests = cacheHits.length + cacheMisses.length;
    const cacheHitRatio = totalCacheRequests > 0 
      ? (cacheHits.length / totalCacheRequests) * 100 
      : 0;

    const totalRequests = totalUploads + totalCacheRequests;
    const errorRate = totalRequests > 0 
      ? (recentErrors.length / totalRequests) * 100 
      : 0;

    // أنواع الصور الشائعة
    const imageTypes = uploads.reduce((acc, m) => {
      const type = m.metadata?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularImageTypes = Object.entries(imageTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // ساعات الذروة
    const hourlyUploads = uploads.reduce((acc, m) => {
      const hour = new Date(m.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakUsageHours = Object.entries(hourlyUploads)
      .map(([hour, uploads]) => ({ hour: parseInt(hour), uploads }))
      .sort((a, b) => b.uploads - a.uploads)
      .slice(0, 5);

    return {
      totalUploads,
      totalSize,
      averageUploadTime,
      cacheHitRatio,
      errorRate,
      popularImageTypes,
      peakUsageHours
    };
  }

  /**
   * 📈 الحصول على metrics بتصفية
   */
  getMetrics(options?: {
    metric?: string;
    timeframe?: '1h' | '24h' | '7d' | '30d';
    limit?: number;
  }): PerformanceMetric[] {
    let filtered = [...this.metrics];

    // تصفية حسب النوع
    if (options?.metric) {
      filtered = filtered.filter(m => m.metric === options.metric);
    }

    // تصفية حسب الوقت
    if (options?.timeframe) {
      const timeframes = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      const cutoff = Date.now() - timeframes[options.timeframe];
      filtered = filtered.filter(m => m.timestamp >= cutoff);
    }

    // تحديد العدد
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 🚨 الحصول على الأخطاء بتصفية
   */
  getErrors(options?: {
    type?: ErrorLog['type'];
    severity?: ErrorLog['severity'];
    timeframe?: '1h' | '24h' | '7d' | '30d';
    limit?: number;
  }): ErrorLog[] {
    let filtered = [...this.errors];

    // تصفية حسب النوع
    if (options?.type) {
      filtered = filtered.filter(e => e.type === options.type);
    }

    // تصفية حسب الشدة
    if (options?.severity) {
      filtered = filtered.filter(e => e.severity === options.severity);
    }

    // تصفية حسب الوقت
    if (options?.timeframe) {
      const timeframes = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      const cutoff = Date.now() - timeframes[options.timeframe];
      filtered = filtered.filter(e => e.timestamp >= cutoff);
    }

    // تحديد العدد
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 🔍 فحص نظام الرفع
   */
  private async checkUploadSystem(health: SystemHealth): Promise<void> {
    const recentUploads = this.getMetrics({ metric: 'upload_success', timeframe: '1h' });
    const recentErrors = this.getErrors({ type: 'upload_error', timeframe: '1h' });
    const uploadTimes = this.getMetrics({ metric: 'upload_time', timeframe: '1h' });

    // فحص معدل النجاح
    const totalAttempts = recentUploads.length + recentErrors.length;
    if (totalAttempts > 0) {
      const successRate = (recentUploads.length / totalAttempts) * 100;
      if (successRate < 90) {
        health.components.upload.score -= 20;
        health.components.upload.issues.push(`معدل نجاح منخفض: ${successRate.toFixed(1)}%`);
      }
    }

    // فحص أوقات الرفع
    if (uploadTimes.length > 0) {
      const avgTime = uploadTimes.reduce((sum, m) => sum + m.value, 0) / uploadTimes.length;
      if (avgTime > this.thresholds.uploadTime) {
        health.components.upload.score -= 15;
        health.components.upload.issues.push(`وقت الرفع بطيء: ${avgTime.toFixed(0)}ms`);
      }
    }

    // تحديد حالة المكون
    if (health.components.upload.score >= 80) health.components.upload.status = 'good';
    else if (health.components.upload.score >= 60) health.components.upload.status = 'fair';
    else health.components.upload.status = 'poor';
  }

  /**
   * 💾 فحص نظام Cache
   */
  private async checkCacheSystem(health: SystemHealth): Promise<void> {
    const cacheStats = advancedCacheService.getStats();
    
    // فحص نسبة النجاح
    if (cacheStats.hitRatio < this.thresholds.cacheHitRatio) {
      health.components.cache.score -= 25;
      health.components.cache.issues.push(`نسبة نجاح Cache منخفضة: ${cacheStats.hitRatio.toFixed(1)}%`);
    }

    // فحص استخدام الذاكرة
    const memoryUsage = (cacheStats.totalSize / (100 * 1024 * 1024)) * 100; // نسبة من 100MB
    if (memoryUsage > this.thresholds.memoryUsage) {
      health.components.cache.score -= 15;
      health.components.cache.issues.push(`استخدام ذاكرة عالي: ${memoryUsage.toFixed(1)}%`);
    }

    // تحديد حالة المكون
    if (health.components.cache.score >= 80) health.components.cache.status = 'good';
    else if (health.components.cache.score >= 60) health.components.cache.status = 'fair';
    else health.components.cache.status = 'poor';
  }

  /**
   * 💿 فحص نظام التخزين
   */
  private async checkStorageSystem(health: SystemHealth): Promise<void> {
    try {
      // فحص مساحة القرص
      const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
      const stats = await this.calculateDirectorySize(uploadsDir);
      
      // فحص الملفات التالفة
      const brokenFiles = this.getErrors({ type: 'file_not_found', timeframe: '24h' });
      if (brokenFiles.length > 10) {
        health.components.storage.score -= 20;
        health.components.storage.issues.push(`ملفات تالفة كثيرة: ${brokenFiles.length}`);
      }

      // فحص أخطاء التخزين
      const storageErrors = this.getErrors({ type: 'storage_error', timeframe: '24h' });
      if (storageErrors.length > 5) {
        health.components.storage.score -= 15;
        health.components.storage.issues.push(`أخطاء تخزين: ${storageErrors.length}`);
      }

      // تحديد حالة المكون
      if (health.components.storage.score >= 80) health.components.storage.status = 'good';
      else if (health.components.storage.score >= 60) health.components.storage.status = 'fair';
      else health.components.storage.status = 'poor';
      
    } catch (error) {
      health.components.storage.score = 0;
      health.components.storage.status = 'poor';
      health.components.storage.issues.push(`خطأ في فحص التخزين: ${(error as Error).message}`);
    }
  }

  /**
   * ⚡ فحص الأداء
   */
  private async checkPerformance(health: SystemHealth): Promise<void> {
    const processingTimes = this.getMetrics({ metric: 'processing_time', timeframe: '1h' });
    const errorRate = this.getUsageStats('1h').errorRate;

    // فحص أوقات المعالجة
    if (processingTimes.length > 0) {
      const avgProcessingTime = processingTimes.reduce((sum, m) => sum + m.value, 0) / processingTimes.length;
      if (avgProcessingTime > 2000) { // أكثر من ثانيتين
        health.components.performance.score -= 20;
        health.components.performance.issues.push(`معالجة بطيئة: ${avgProcessingTime.toFixed(0)}ms`);
      }
    }

    // فحص معدل الأخطاء
    if (errorRate > this.thresholds.errorRate) {
      health.components.performance.score -= 25;
      health.components.performance.issues.push(`معدل أخطاء عالي: ${errorRate.toFixed(1)}%`);
    }

    // تحديد حالة المكون
    if (health.components.performance.score >= 80) health.components.performance.status = 'good';
    else if (health.components.performance.score >= 60) health.components.performance.status = 'fair';
    else health.components.performance.status = 'poor';
  }

  /**
   * ⚠️ فحص العتبات والتنبيهات
   */
  private checkThresholds(metric: string, value: number): void {
    switch (metric) {
      case 'upload_time':
        if (value > this.thresholds.uploadTime) {
          this.logError('processing_error', `وقت رفع بطيء: ${value}ms`, 'medium');
        }
        break;
        
      case 'cache_miss':
        const recentCacheMetrics = this.getMetrics({ metric: 'cache_hit', timeframe: '1h' });
        const recentMisses = this.getMetrics({ metric: 'cache_miss', timeframe: '1h' });
        const totalCache = recentCacheMetrics.length + recentMisses.length;
        if (totalCache > 0) {
          const hitRatio = (recentCacheMetrics.length / totalCache) * 100;
          if (hitRatio < this.thresholds.cacheHitRatio) {
            this.logError('cache_miss', `نسبة نجاح Cache منخفضة: ${hitRatio.toFixed(1)}%`, 'low');
          }
        }
        break;
    }
  }

  /**
   * 🤖 بدء المراقبة التلقائية
   */
  private startAutomaticMonitoring(): void {
    // حفظ البيانات كل 5 دقائق
    setInterval(() => {
      this.persistData();
    }, 5 * 60 * 1000);

    // فحص صحة النظام كل 15 دقيقة
    setInterval(async () => {
      try {
        const health = await this.checkSystemHealth();
        if (health.overall === 'poor' || health.overall === 'critical') {
          console.warn('⚠️ تحذير: صحة نظام الصور في حالة سيئة', health);
        }
      } catch (error) {
        console.error('❌ خطأ في فحص صحة النظام:', error);
      }
    }, 15 * 60 * 1000);

    // تنظيف البيانات القديمة كل ساعة
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * 💾 حفظ البيانات
   */
  private async persistData(): Promise<void> {
    try {
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics.slice(-5000), null, 2));
      await fs.writeFile(this.errorsFile, JSON.stringify(this.errors.slice(-2500), null, 2));
    } catch (error) {
      console.error('❌ خطأ في حفظ بيانات المراقبة:', error);
    }
  }

  /**
   * 📂 تحميل البيانات المحفوظة
   */
  private async loadPersistedData(): Promise<void> {
    try {
      try {
        const metricsData = await fs.readFile(this.metricsFile, 'utf-8');
        this.metrics = JSON.parse(metricsData);
      } catch {
        // ملف غير موجود أو تالف
      }

      try {
        const errorsData = await fs.readFile(this.errorsFile, 'utf-8');
        this.errors = JSON.parse(errorsData);
      } catch {
        // ملف غير موجود أو تالف
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات المراقبة:', error);
    }
  }

  /**
   * 📂 إنشاء مجلد السجلات
   */
  private async ensureLogsDirectory(): Promise<void> {
    try {
      const logsDir = path.dirname(this.metricsFile);
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.error('❌ خطأ في إنشاء مجلد السجلات:', error);
    }
  }

  /**
   * 🧹 تنظيف البيانات القديمة
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 يوم
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
    
    console.log(`🧹 تنظيف بيانات المراقبة: ${this.metrics.length} metrics, ${this.errors.length} errors`);
  }

  /**
   * 📊 حساب حجم المجلد
   */
  private async calculateDirectorySize(dirPath: string): Promise<{ size: number; files: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          const subDir = await this.calculateDirectorySize(itemPath);
          totalSize += subDir.size;
          fileCount += subDir.files;
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      // مجلد غير موجود أو لا يمكن الوصول إليه
    }

    return { size: totalSize, files: fileCount };
  }
}

export const imageMonitoringService = ImageMonitoringService.getInstance();
export default imageMonitoringService;
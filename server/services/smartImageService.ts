/**
 * 🧠 نظام الصور الذكي المتقدم
 * حل شامل ومتقدم لجميع مشاكل الصور مع ذكاء اصطناعي للتحسين
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { storage } from '../storage';

// تعدادات أنواع التخزين
export enum StorageType {
  FILESYSTEM = 'filesystem',
  BASE64 = 'base64',
  HYBRID = 'hybrid',
  EXTERNAL = 'external'
}

// تعدادات أولوية التخزين
export enum StoragePriority {
  PERFORMANCE = 'performance', // أداء عالي
  RELIABILITY = 'reliability', // موثوقية عالية
  BALANCED = 'balanced' // متوازن
}

// واجهة البيانات الوصفية للصور
interface ImageMetadata {
  id: string;
  userId: number;
  type: 'avatar' | 'banner' | 'wall';
  originalName: string;
  mimeType: string;
  size: number;
  dimensions: { width: number; height: number };
  hash: string;
  storageType: StorageType;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  compressionRatio: number;
  qualityScore: number;
}

// واجهة نتيجة معالجة الصورة
interface ProcessedImage {
  url: string;
  metadata: ImageMetadata;
  storageType: StorageType;
  fallbackUrl?: string;
  cacheHeaders: Record<string, string>;
}

class SmartImageService {
  private static instance: SmartImageService;
  private readonly uploadsDir: string;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly compressionThreshold = 2 * 1024 * 1024; // 2MB
  private readonly base64Threshold = 500 * 1024; // 500KB
  
  // إحصائيات الذكاء الاصطناعي
  private performanceMetrics = {
    filesystemSuccess: 0,
    filesystemFailures: 0,
    base64Success: 0,
    base64Failures: 0,
    averageLoadTime: 0,
    cacheHitRatio: 0
  };

  private constructor() {
    this.uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
  }

  public static getInstance(): SmartImageService {
    if (!SmartImageService.instance) {
      SmartImageService.instance = new SmartImageService();
    }
    return SmartImageService.instance;
  }

  /**
   * 🧠 الذكاء الاصطناعي لاختيار نوع التخزين الأمثل
   */
  private intelligentStorageSelection(
    fileSize: number,
    imageType: 'avatar' | 'banner' | 'wall',
    priority: StoragePriority = StoragePriority.BALANCED
  ): StorageType {
    const { filesystemSuccess, filesystemFailures, base64Success } = this.performanceMetrics;
    const filesystemReliability = filesystemSuccess / (filesystemSuccess + filesystemFailures || 1);
    
    // قواعد الذكاء الاصطناعي
    const rules = {
      // إذا كان النظام يعمل على Render أو البيئة غير موثوقة
      isRenderEnvironment: process.env.RENDER || process.env.NODE_ENV === 'production',
      
      // إذا كان الملف صغير جداً
      isSmallFile: fileSize < this.base64Threshold,
      
      // إذا كان نظام الملفات غير موثوق
      isFilesystemUnreliable: filesystemReliability < 0.8,
      
      // إذا كان نوع الصورة يتطلب سرعة عالية
      requiresHighSpeed: imageType === 'avatar',
      
      // إذا كان حجم الملف كبير
      isLargeFile: fileSize > this.compressionThreshold
    };

    // خوارزمية اتخاذ القرار الذكي
    switch (priority) {
      case StoragePriority.PERFORMANCE:
        if (rules.isSmallFile) return StorageType.BASE64;
        if (rules.isFilesystemUnreliable) return StorageType.BASE64;
        return StorageType.FILESYSTEM;

      case StoragePriority.RELIABILITY:
        if (rules.isRenderEnvironment) return StorageType.BASE64;
        if (rules.isFilesystemUnreliable) return StorageType.BASE64;
        return StorageType.HYBRID; // نظام هجين

      case StoragePriority.BALANCED:
      default:
        // الخوارزمية المتوازنة الذكية
        let score = 0;
        
        if (rules.isSmallFile) score += 30;
        if (rules.isRenderEnvironment) score += 40;
        if (rules.isFilesystemUnreliable) score += 35;
        if (rules.requiresHighSpeed) score += 20;
        if (rules.isLargeFile) score -= 25;
        
        if (score >= 50) return StorageType.BASE64;
        if (score >= 25) return StorageType.HYBRID;
        return StorageType.FILESYSTEM;
    }
  }

  /**
   * 🎯 معالج الصور الذكي المتقدم
   */
  async processImage(
    buffer: Buffer,
    options: {
      userId: number;
      type: 'avatar' | 'banner' | 'wall';
      originalName: string;
      mimeType: string;
      priority?: StoragePriority;
    }
  ): Promise<ProcessedImage> {
    const { userId, type, originalName, mimeType, priority = StoragePriority.BALANCED } = options;
    
    try {
      // 1. تحليل الصورة والحصول على البيانات الوصفية
      const imageInfo = await sharp(buffer).metadata();
      const originalSize = buffer.length;
      
      // 2. تحسين وضغط الصورة بذكاء
      const optimizedBuffer = await this.intelligentCompression(buffer, type, imageInfo);
      const compressionRatio = originalSize / optimizedBuffer.length;
      
      // 3. حساب hash فريد للصورة
      const hash = this.generateImageHash(optimizedBuffer);
      
      // 4. اختيار نوع التخزين بالذكاء الاصطناعي
      const storageType = this.intelligentStorageSelection(optimizedBuffer.length, type, priority);
      
      // 5. إنشاء البيانات الوصفية
      const metadata: ImageMetadata = {
        id: `${type}_${userId}_${hash}`,
        userId,
        type,
        originalName,
        mimeType: 'image/webp',
        size: optimizedBuffer.length,
        dimensions: { width: imageInfo.width || 0, height: imageInfo.height || 0 },
        hash,
        storageType,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        compressionRatio,
        qualityScore: this.calculateQualityScore(compressionRatio, optimizedBuffer.length)
      };
      
      // 6. تنفيذ التخزين حسب النوع المختار
      const result = await this.executeStorage(optimizedBuffer, metadata, storageType);
      
      // 7. تحديث الإحصائيات
      this.updatePerformanceMetrics(storageType, true);
      
      return result;
      
    } catch (error) {
      console.error('❌ خطأ في معالجة الصورة:', error);
      
      // نظام fallback ذكي
      return this.handleProcessingError(buffer, options, error as Error);
    }
  }

  /**
   * 🎨 ضغط ذكي للصور حسب النوع والحجم
   */
  private async intelligentCompression(
    buffer: Buffer,
    type: 'avatar' | 'banner' | 'wall',
    metadata: sharp.Metadata
  ): Promise<Buffer> {
    let sharpInstance = sharp(buffer);
    
    // قواعد الضغط الذكي حسب النوع
    switch (type) {
      case 'avatar':
        sharpInstance = sharpInstance
          .resize(400, 400, { fit: 'cover', position: 'center' })
          .webp({ 
            quality: buffer.length > 1024 * 1024 ? 75 : 85,
            effort: 6,
            smartSubsample: true
          });
        break;
        
      case 'banner':
        sharpInstance = sharpInstance
          .resize(1200, 400, { fit: 'cover', position: 'center' })
          .webp({ 
            quality: buffer.length > 2 * 1024 * 1024 ? 70 : 80,
            effort: 6,
            smartSubsample: true
          });
        break;
        
      case 'wall':
        // ضغط ديناميكي حسب الحجم
        const maxWidth = buffer.length > 5 * 1024 * 1024 ? 1024 : 1920;
        sharpInstance = sharpInstance
          .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: true })
          .webp({ 
            quality: this.calculateDynamicQuality(buffer.length),
            effort: 6,
            smartSubsample: true
          });
        break;
    }
    
    return sharpInstance.toBuffer();
  }

  /**
   * 📊 حساب جودة ديناميكية حسب حجم الملف
   */
  private calculateDynamicQuality(fileSize: number): number {
    if (fileSize > 5 * 1024 * 1024) return 60; // ملفات كبيرة جداً
    if (fileSize > 2 * 1024 * 1024) return 70; // ملفات كبيرة
    if (fileSize > 1024 * 1024) return 80; // ملفات متوسطة
    return 85; // ملفات صغيرة
  }

  /**
   * 🏆 حساب نقاط الجودة للصورة
   */
  private calculateQualityScore(compressionRatio: number, finalSize: number): number {
    let score = 100;
    
    // خصم نقاط للضغط الزائد
    if (compressionRatio > 10) score -= 30;
    else if (compressionRatio > 5) score -= 15;
    else if (compressionRatio > 3) score -= 5;
    
    // خصم نقاط للحجم الكبير
    if (finalSize > 2 * 1024 * 1024) score -= 20;
    else if (finalSize > 1024 * 1024) score -= 10;
    
    // مكافأة للحجم المثالي
    if (finalSize < 500 * 1024 && compressionRatio < 5) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 💾 تنفيذ التخزين حسب النوع المختار
   */
  private async executeStorage(
    buffer: Buffer,
    metadata: ImageMetadata,
    storageType: StorageType
  ): Promise<ProcessedImage> {
    switch (storageType) {
      case StorageType.FILESYSTEM:
        return this.saveToFilesystem(buffer, metadata);
        
      case StorageType.BASE64:
        return this.saveAsBase64(buffer, metadata);
        
      case StorageType.HYBRID:
        return this.saveAsHybrid(buffer, metadata);
        
      default:
        throw new Error(`نوع التخزين غير مدعوم: ${storageType}`);
    }
  }

  /**
   * 📁 حفظ في نظام الملفات مع fallback
   */
  private async saveToFilesystem(buffer: Buffer, metadata: ImageMetadata): Promise<ProcessedImage> {
    try {
      // توحيد أسماء المجلدات: avatar -> avatars, banner -> banners, wall -> wall
      const subDir = metadata.type === 'wall' ? 'wall' : `${metadata.type}s`;
      const dir = path.join(this.uploadsDir, subDir);
      await fs.mkdir(dir, { recursive: true });
      
      const filename = `${metadata.userId}.webp`;
      const filepath = path.join(dir, filename);
      
      await fs.writeFile(filepath, buffer);
      
      const url = `/uploads/${subDir}/${filename}?v=${metadata.hash}`;
      const base64Fallback = `data:${metadata.mimeType};base64,${buffer.toString('base64')}`;
      
      return {
        url,
        metadata,
        storageType: StorageType.FILESYSTEM,
        fallbackUrl: base64Fallback,
        cacheHeaders: this.generateCacheHeaders(metadata)
      };
      
    } catch (error) {
      console.warn('⚠️ فشل حفظ نظام الملفات، التبديل إلى Base64:', error);
      return this.saveAsBase64(buffer, metadata);
    }
  }

  /**
   * 🔢 حفظ كـ Base64
   */
  private async saveAsBase64(buffer: Buffer, metadata: ImageMetadata): Promise<ProcessedImage> {
    const base64 = `data:${metadata.mimeType};base64,${buffer.toString('base64')}`;
    
    return {
      url: base64,
      metadata: { ...metadata, storageType: StorageType.BASE64 },
      storageType: StorageType.BASE64,
      cacheHeaders: this.generateCacheHeaders(metadata)
    };
  }

  /**
   * 🔄 نظام هجين - الأفضل من العالمين
   */
  private async saveAsHybrid(buffer: Buffer, metadata: ImageMetadata): Promise<ProcessedImage> {
    try {
      // محاولة حفظ في نظام الملفات أولاً
      const filesystemResult = await this.saveToFilesystem(buffer, metadata);
      
      // إنشاء Base64 كـ fallback
      const base64 = `data:${metadata.mimeType};base64,${buffer.toString('base64')}`;
      
      return {
        ...filesystemResult,
        storageType: StorageType.HYBRID,
        fallbackUrl: base64
      };
      
    } catch (error) {
      // إذا فشل نظام الملفات، استخدم Base64 فقط
      return this.saveAsBase64(buffer, metadata);
    }
  }

  /**
   * 🔐 إنتاج hash فريد للصورة
   */
  private generateImageHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  /**
   * 🏷️ إنتاج headers للـ cache
   */
  private generateCacheHeaders(metadata: ImageMetadata): Record<string, string> {
    const maxAge = 365 * 24 * 60 * 60; // سنة واحدة
    
    return {
      'Cache-Control': `public, max-age=${maxAge}, immutable`,
      'ETag': `"${metadata.hash}"`,
      'Last-Modified': metadata.createdAt.toUTCString(),
      'Content-Type': metadata.mimeType,
      'X-Image-Quality': metadata.qualityScore.toString(),
      'X-Storage-Type': metadata.storageType,
      'X-Compression-Ratio': metadata.compressionRatio.toFixed(2)
    };
  }

  /**
   * 🚨 معالج الأخطاء الذكي
   */
  private async handleProcessingError(
    buffer: Buffer,
    options: any,
    error: Error
  ): Promise<ProcessedImage> {
    console.error('🚨 خطأ في معالجة الصورة، استخدام نظام الطوارئ:', error);
    
    // نظام الطوارئ - حفظ مباشر كـ Base64 بدون معالجة
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 12);
    const base64 = `data:${options.mimeType};base64,${buffer.toString('base64')}`;
    
    const emergencyMetadata: ImageMetadata = {
      id: `emergency_${options.type}_${options.userId}_${hash}`,
      userId: options.userId,
      type: options.type,
      originalName: options.originalName,
      mimeType: options.mimeType,
      size: buffer.length,
      dimensions: { width: 0, height: 0 },
      hash,
      storageType: StorageType.BASE64,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      compressionRatio: 1,
      qualityScore: 50
    };

    this.updatePerformanceMetrics(StorageType.BASE64, false);
    
    return {
      url: base64,
      metadata: emergencyMetadata,
      storageType: StorageType.BASE64,
      cacheHeaders: {}
    };
  }

  /**
   * 📊 تحديث إحصائيات الأداء
   */
  private updatePerformanceMetrics(storageType: StorageType, success: boolean): void {
    if (storageType === StorageType.FILESYSTEM || storageType === StorageType.HYBRID) {
      if (success) {
        this.performanceMetrics.filesystemSuccess++;
      } else {
        this.performanceMetrics.filesystemFailures++;
      }
    }
    
    if (storageType === StorageType.BASE64) {
      if (success) {
        this.performanceMetrics.base64Success++;
      } else {
        this.performanceMetrics.base64Failures++;
      }
    }
  }

  /**
   * 🔄 نظام تنظيف الملفات القديمة
   */
  async cleanupOldImages(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const directories = ['avatars', 'banners', 'wall'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.uploadsDir, dir);
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              }
          }
        } catch (dirError) {
          console.warn(`⚠️ لا يمكن الوصول للمجلد ${dir}:`, dirError);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تنظيف الملفات:', error);
    }
  }

  /**
   * 📊 الحصول على إحصائيات النظام
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      filesystemReliability: this.performanceMetrics.filesystemSuccess / 
        (this.performanceMetrics.filesystemSuccess + this.performanceMetrics.filesystemFailures || 1),
      totalOperations: this.performanceMetrics.filesystemSuccess + 
        this.performanceMetrics.filesystemFailures + 
        this.performanceMetrics.base64Success + 
        this.performanceMetrics.base64Failures
    };
  }

  /**
   * 🔍 تشخيص وإصلاح الصور التالفة
   */
  async diagnoseAndFixImages(): Promise<{
    diagnosed: number;
    fixed: number;
    errors: string[];
  }> {
    const results = { diagnosed: 0, fixed: 0, errors: [] as string[] };
    
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        if (user.profileImage || user.profileBanner) {
          results.diagnosed++;
          
          try {
            // فحص صورة البروفايل
            if (user.profileImage && !user.profileImage.startsWith('data:') && !user.profileImage.startsWith('http')) {
              const imagePath = path.join(process.cwd(), 'client', 'public', user.profileImage);
              try {
                await fs.access(imagePath);
              } catch {
                // الملف غير موجود، تحويل إلى default
                await storage.updateUser(user.id, { profileImage: '/default_avatar.svg' });
                results.fixed++;
              }
            }
            
            // فحص صورة البانر
            if (user.profileBanner && !user.profileBanner.startsWith('data:') && !user.profileBanner.startsWith('http')) {
              const bannerPath = path.join(process.cwd(), 'client', 'public', user.profileBanner);
              try {
                await fs.access(bannerPath);
              } catch {
                // الملف غير موجود، حذف المرجع
                await storage.updateUser(user.id, { profileBanner: null });
                results.fixed++;
              }
            }
          } catch (error) {
            results.errors.push(`خطأ في فحص المستخدم ${user.id}: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      results.errors.push(`خطأ عام: ${(error as Error).message}`);
    }
    
    return results;
  }
}

export const smartImageService = SmartImageService.getInstance();
export default smartImageService;
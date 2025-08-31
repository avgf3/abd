/**
 * 🔄 خدمة Migration متقدمة للصور
 * حل ذكي لتوحيد البيانات الموجودة والقضاء على التضارب
 */

import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { smartImageService, StorageType } from './smartImageService';
import { advancedCacheService } from './advancedCacheService';

interface MigrationStats {
  totalUsers: number;
  processedUsers: number;
  fixedImages: number;
  convertedToBase64: number;
  restoredFromBackup: number;
  errors: string[];
  warnings: string[];
  performance: {
    startTime: number;
    endTime?: number;
    duration?: number;
    averageTimePerUser?: number;
  };
}

interface ImageAnalysis {
  userId: number;
  username: string;
  profileImage: {
    current: string | null;
    type: 'missing' | 'broken' | 'base64' | 'filesystem' | 'external' | 'default';
    needsMigration: boolean;
    fileExists?: boolean;
    size?: number;
  };
  profileBanner: {
    current: string | null;
    type: 'missing' | 'broken' | 'base64' | 'filesystem' | 'external' | 'default';
    needsMigration: boolean;
    fileExists?: boolean;
    size?: number;
  };
}

class ImageMigrationService {
  private static instance: ImageMigrationService;
  private readonly uploadsDir: string;
  private stats: MigrationStats = {
    totalUsers: 0,
    processedUsers: 0,
    fixedImages: 0,
    convertedToBase64: 0,
    restoredFromBackup: 0,
    errors: [],
    warnings: [],
    performance: {
      startTime: 0
    }
  };

  private constructor() {
    this.uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
  }

  public static getInstance(): ImageMigrationService {
    if (!ImageMigrationService.instance) {
      ImageMigrationService.instance = new ImageMigrationService();
    }
    return ImageMigrationService.instance;
  }

  /**
   * 🔍 تحليل شامل لحالة الصور في النظام
   */
  async analyzeImageState(): Promise<{
    analysis: ImageAnalysis[];
    summary: {
      totalUsers: number;
      brokenImages: number;
      missingFiles: number;
      base64Images: number;
      filesystemImages: number;
      needsMigration: number;
    };
  }> {
    try {
      const users = await storage.getAllUsers();
      const analysis: ImageAnalysis[] = [];
      
      let brokenImages = 0;
      let missingFiles = 0;
      let base64Images = 0;
      let filesystemImages = 0;
      let needsMigration = 0;

      for (const user of users) {
        const userAnalysis: ImageAnalysis = {
          userId: user.id,
          username: user.username,
          profileImage: await this.analyzeImage(user.profileImage, 'avatar'),
          profileBanner: await this.analyzeImage(user.profileBanner, 'banner')
        };

        // تحديث الإحصائيات
        [userAnalysis.profileImage, userAnalysis.profileBanner].forEach(img => {
          if (img.type === 'broken') brokenImages++;
          if (img.type === 'missing') missingFiles++;
          if (img.type === 'base64') base64Images++;
          if (img.type === 'filesystem') filesystemImages++;
          if (img.needsMigration) needsMigration++;
        });

        analysis.push(userAnalysis);
      }

      const summary = {
        totalUsers: users.length,
        brokenImages,
        missingFiles,
        base64Images,
        filesystemImages,
        needsMigration
      };

      return { analysis, summary };
      
    } catch (error) {
      console.error('❌ خطأ في تحليل الصور:', error);
      throw error;
    }
  }

  /**
   * 🔍 تحليل صورة واحدة
   */
  private async analyzeImage(
    imagePath: string | null, 
    type: 'avatar' | 'banner'
  ): Promise<ImageAnalysis['profileImage']> {
    if (!imagePath) {
      return {
        current: null,
        type: 'missing',
        needsMigration: false
      };
    }

    // صورة افتراضية
    if (imagePath === '/default_avatar.svg' || imagePath.includes('default')) {
      return {
        current: imagePath,
        type: 'default',
        needsMigration: false
      };
    }

    // صورة Base64
    if (imagePath.startsWith('data:')) {
      return {
        current: imagePath,
        type: 'base64',
        needsMigration: false,
        size: this.calculateBase64Size(imagePath)
      };
    }

    // رابط خارجي
    if (imagePath.startsWith('http')) {
      return {
        current: imagePath,
        type: 'external',
        needsMigration: false
      };
    }

    // ملف في نظام الملفات
    if (imagePath.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'client', 'public', imagePath.split('?')[0]);
      
      try {
        const stats = await fs.stat(fullPath);
        return {
          current: imagePath,
          type: 'filesystem',
          needsMigration: false,
          fileExists: true,
          size: stats.size
        };
      } catch {
        return {
          current: imagePath,
          type: 'broken',
          needsMigration: true,
          fileExists: false
        };
      }
    }

    // مسار غير معروف أو مكسور
    return {
      current: imagePath,
      type: 'broken',
      needsMigration: true
    };
  }

  /**
   * 🚀 تنفيذ Migration شامل وذكي
   */
  async runFullMigration(options?: {
    dryRun?: boolean;
    batchSize?: number;
    forceBase64?: boolean;
    backupFirst?: boolean;
  }): Promise<MigrationStats> {
    const {
      dryRun = false,
      batchSize = 50,
      forceBase64 = false,
      backupFirst = true
    } = options || {};

    this.stats = {
      totalUsers: 0,
      processedUsers: 0,
      fixedImages: 0,
      convertedToBase64: 0,
      restoredFromBackup: 0,
      errors: [],
      warnings: [],
      performance: {
        startTime: Date.now()
      }
    };

    try {
      // 1. إنشاء backup إذا طُلب
      if (backupFirst && !dryRun) {
        await this.createBackup();
      }

      // 2. تحليل الوضع الحالي
      const { analysis } = await this.analyzeImageState();
      this.stats.totalUsers = analysis.length;

      // 3. معالجة المستخدمين على دفعات
      for (let i = 0; i < analysis.length; i += batchSize) {
        const batch = analysis.slice(i, i + batchSize);
        await this.processBatch(batch, { dryRun, forceBase64 });
        
        }

      // 4. تنظيف وإحصائيات نهائية
      this.stats.performance.endTime = Date.now();
      this.stats.performance.duration = this.stats.performance.endTime - this.stats.performance.startTime;
      this.stats.performance.averageTimePerUser = this.stats.performance.duration / this.stats.totalUsers;

      return this.stats;

    } catch (error) {
      this.stats.errors.push(`خطأ عام في Migration: ${(error as Error).message}`);
      console.error('❌ فشل Migration:', error);
      throw error;
    }
  }

  /**
   * 📦 معالجة دفعة من المستخدمين
   */
  private async processBatch(
    batch: ImageAnalysis[], 
    options: { dryRun: boolean; forceBase64: boolean }
  ): Promise<void> {
    const promises = batch.map(userAnalysis => 
      this.processUser(userAnalysis, options)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 👤 معالجة مستخدم واحد
   */
  private async processUser(
    userAnalysis: ImageAnalysis,
    options: { dryRun: boolean; forceBase64: boolean }
  ): Promise<void> {
    try {
      let hasChanges = false;
      const updates: any = {};

      // معالجة صورة البروفايل
      if (userAnalysis.profileImage.needsMigration) {
        const newImage = await this.fixImage(
          userAnalysis.userId,
          'avatar',
          userAnalysis.profileImage.current,
          options
        );
        
        if (newImage && !options.dryRun) {
          updates.profileImage = newImage.url;
          updates.avatarHash = newImage.hash;
          hasChanges = true;
          this.stats.fixedImages++;
        }
      }

      // معالجة صورة البانر
      if (userAnalysis.profileBanner.needsMigration) {
        const newBanner = await this.fixImage(
          userAnalysis.userId,
          'banner',
          userAnalysis.profileBanner.current,
          options
        );
        
        if (newBanner && !options.dryRun) {
          updates.profileBanner = newBanner.url;
          updates.bannerHash = newBanner.hash;
          hasChanges = true;
          this.stats.fixedImages++;
        }
      }

      // تحديث قاعدة البيانات
      if (hasChanges && !options.dryRun) {
        await storage.updateUser(userAnalysis.userId, updates);
        
        // تحديث Cache
        if (updates.profileImage) {
          await advancedCacheService.setImage(userAnalysis.userId, 'avatar', updates.profileImage);
        }
        if (updates.profileBanner) {
          await advancedCacheService.setImage(userAnalysis.userId, 'banner', updates.profileBanner);
        }
      }

      this.stats.processedUsers++;
      
    } catch (error) {
      const errorMsg = `فشل معالجة المستخدم ${userAnalysis.userId}: ${(error as Error).message}`;
      this.stats.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  /**
   * 🔧 إصلاح صورة واحدة
   */
  private async fixImage(
    userId: number,
    type: 'avatar' | 'banner',
    currentPath: string | null,
    options: { dryRun: boolean; forceBase64: boolean }
  ): Promise<{ url: string; hash: string } | null> {
    if (!currentPath) return null;

    try {
      // محاولة استعادة من backup
      const backupImage = await this.tryRestoreFromBackup(userId, type);
      if (backupImage) {
        this.stats.restoredFromBackup++;
        return backupImage;
      }

      // إنشاء صورة افتراضية محسنة
      const defaultImage = await this.createEnhancedDefaultImage(userId, type, options.forceBase64);
      if (defaultImage) {
        this.stats.convertedToBase64++;
        return defaultImage;
      }

      return null;
      
    } catch (error) {
      this.stats.warnings.push(`لا يمكن إصلاح ${type} للمستخدم ${userId}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * 💾 محاولة استعادة من backup
   */
  private async tryRestoreFromBackup(
    userId: number, 
    type: 'avatar' | 'banner'
  ): Promise<{ url: string; hash: string } | null> {
    const backupDir = path.join(this.uploadsDir, 'backup', `${type}s`);
    const backupFile = path.join(backupDir, `${userId}.webp`);
    
    try {
      const buffer = await fs.readFile(backupFile);
      
      // معالجة الصورة المستعادة
      const processedImage = await smartImageService.processImage(buffer, {
        userId,
        type,
        originalName: `restored_${type}.webp`,
        mimeType: 'image/webp',
        priority: 'reliability'
      });

      return {
        url: processedImage.url,
        hash: processedImage.metadata.hash
      };
      
    } catch {
      return null; // لا يوجد backup
    }
  }

  /**
   * 🎨 إنشاء صورة افتراضية محسنة
   */
  private async createEnhancedDefaultImage(
    userId: number,
    type: 'avatar' | 'banner',
    forceBase64: boolean
  ): Promise<{ url: string; hash: string } | null> {
    try {
      if (type === 'avatar') {
        // إرجاع الصورة الافتراضية مع hash
        const hash = `default_${userId}_${Date.now().toString(36)}`;
        return {
          url: '/default_avatar.svg',
          hash
        };
      } else if (type === 'banner') {
        // إزالة البانر (null)
        return null;
      }
      
      return null;
      
    } catch (error) {
      console.warn(`⚠️ فشل إنشاء صورة افتراضية للمستخدم ${userId}:`, error);
      return null;
    }
  }

  /**
   * 📋 إنشاء backup للبيانات الحالية
   */
  private async createBackup(): Promise<void> {
    try {
      const backupDir = path.join(this.uploadsDir, 'backup');
      await fs.mkdir(backupDir, { recursive: true });
      
      const users = await storage.getAllUsers();
      const backupData = users
        .filter(user => user.profileImage || user.profileBanner)
        .map(user => ({
          id: user.id,
          username: user.username,
          profileImage: user.profileImage,
          profileBanner: user.profileBanner,
          avatarHash: (user as any).avatarHash
        }));

      const backupFile = path.join(backupDir, `images_backup_${Date.now()}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      } catch (error) {
      console.error('❌ فشل إنشاء backup:', error);
      throw error;
    }
  }

  /**
   * 🧹 تنظيف الملفات القديمة والتالفة
   */
  async cleanupBrokenFiles(): Promise<{
    deletedFiles: number;
    freedSpace: number;
    errors: string[];
  }> {
    const result = {
      deletedFiles: 0,
      freedSpace: 0,
      errors: [] as string[]
    };

    try {
      const directories = ['avatars', 'banners', 'profiles', 'wall'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.uploadsDir, dir);
        
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const filePath = path.join(dirPath, file);
            
            try {
              const stats = await fs.stat(filePath);
              
              // حذف الملفات الفارغة أو الصغيرة جداً (أقل من 100 بايت)
              if (stats.size < 100) {
                await fs.unlink(filePath);
                result.deletedFiles++;
                result.freedSpace += stats.size;
                }
              
            } catch (fileError) {
              result.errors.push(`خطأ في فحص الملف ${file}: ${(fileError as Error).message}`);
            }
          }
          
        } catch (dirError) {
          result.errors.push(`لا يمكن الوصول للمجلد ${dir}: ${(dirError as Error).message}`);
        }
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`خطأ عام في التنظيف: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * 📊 تنسيق الإحصائيات
   */
  private formatStats(): string {
    const duration = this.stats.performance.duration || 0;
    const avgTime = this.stats.performance.averageTimePerUser || 0;
    
    return `
📊 إحصائيات Migration:
├── إجمالي المستخدمين: ${this.stats.totalUsers}
├── تم معالجتهم: ${this.stats.processedUsers}
├── صور تم إصلاحها: ${this.stats.fixedImages}
├── تحويل إلى Base64: ${this.stats.convertedToBase64}
├── استعادة من Backup: ${this.stats.restoredFromBackup}
├── أخطاء: ${this.stats.errors.length}
├── تحذيرات: ${this.stats.warnings.length}
├── المدة الإجمالية: ${(duration / 1000).toFixed(2)} ثانية
└── متوسط الوقت/مستخدم: ${avgTime.toFixed(2)} مللي ثانية
    `.trim();
  }

  /**
   * 📏 حساب حجم Base64
   */
  private calculateBase64Size(base64: string): number {
    const data = base64.split(',')[1] || base64;
    return Math.ceil(data.length * 0.75);
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
   * 📊 الحصول على إحصائيات Migration
   */
  getStats(): MigrationStats {
    return { ...this.stats };
  }
}

export const imageMigrationService = ImageMigrationService.getInstance();
export default imageMigrationService;
// ===== نظام مزامنة التخزين الموحد للثيمات =====
// يدير التزامن بين localStorage وقاعدة البيانات ويحل مشاكل التكرار

import { apiRequest } from '@/lib/queryClient';
import { 
  normalizeThemeId, 
  saveThemeToStorage, 
  loadThemeFromStorage, 
  applyUnifiedTheme 
} from './unifiedThemeSystem';

export interface ThemePreferences {
  userTheme: string;
  profileEffect: string;
  usernameColor: string;
}

export interface SyncOptions {
  immediate?: boolean;
  retries?: number;
  timeout?: number;
}

/**
 * كلاس لإدارة مزامنة الثيمات
 */
export class ThemeStorageSync {
  private syncInProgress = false;
  private retryQueue: Array<() => Promise<void>> = [];
  private lastSyncTime = 0;
  private readonly MIN_SYNC_INTERVAL = 1000; // ثانية واحدة على الأقل بين المزامنات

  /**
   * مزامنة الثيم من localStorage إلى قاعدة البيانات
   */
  async syncThemeToDatabase(
    userId: number, 
    themeId: string, 
    options: SyncOptions = {}
  ): Promise<boolean> {
    const { immediate = false, retries = 3, timeout = 5000 } = options;

    if (!immediate && this.shouldSkipSync()) {
      return this.queueSync(() => this.syncThemeToDatabase(userId, themeId, { immediate: true }));
    }

    this.syncInProgress = true;
    this.lastSyncTime = Date.now();

    try {
      const normalizedTheme = normalizeThemeId(themeId);

      // محاولة التحديث مع إعادة المحاولة
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const result = await apiRequest(`/api/users/${userId}`, {
            method: 'PUT',
            body: { userTheme: normalizedTheme },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (result && (result as any).id) {
            // حفظ محلياً للتأكد من التطابق
            saveThemeToStorage(normalizedTheme);
            console.log(`✅ تم مزامنة الثيم بنجاح: ${normalizedTheme}`);
            return true;
          }
        } catch (error) {
          console.warn(`❌ فشل في المحاولة ${attempt}/${retries} لمزامنة الثيم:`, error);
          
          if (attempt === retries) {
            throw error;
          }
          
          // انتظار متزايد بين المحاولات
          await this.delay(attempt * 1000);
        }
      }

      return false;
    } catch (error) {
      console.error('❌ خطأ نهائي في مزامنة الثيم:', error);
      return false;
    } finally {
      this.syncInProgress = false;
      this.processQueue();
    }
  }

  /**
   * مزامنة التأثير من localStorage إلى قاعدة البيانات
   */
  async syncEffectToDatabase(
    userId: number, 
    effectId: string, 
    options: SyncOptions = {}
  ): Promise<boolean> {
    const { immediate = false, retries = 3, timeout = 5000 } = options;

    if (!immediate && this.shouldSkipSync()) {
      return this.queueSync(() => this.syncEffectToDatabase(userId, effectId, { immediate: true }));
    }

    this.syncInProgress = true;
    this.lastSyncTime = Date.now();

    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const result = await apiRequest(`/api/users/${userId}`, {
            method: 'PUT',
            body: { profileEffect: effectId },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (result && (result as any).id) {
            console.log(`✅ تم مزامنة التأثير بنجاح: ${effectId}`);
            return true;
          }
        } catch (error) {
          console.warn(`❌ فشل في المحاولة ${attempt}/${retries} لمزامنة التأثير:`, error);
          
          if (attempt === retries) {
            throw error;
          }
          
          await this.delay(attempt * 1000);
        }
      }

      return false;
    } catch (error) {
      console.error('❌ خطأ نهائي في مزامنة التأثير:', error);
      return false;
    } finally {
      this.syncInProgress = false;
      this.processQueue();
    }
  }

  /**
   * مزامنة تفضيلات الثيم الكاملة
   */
  async syncThemePreferencesToDatabase(
    userId: number,
    preferences: Partial<ThemePreferences>,
    options: SyncOptions = {}
  ): Promise<boolean> {
    const { immediate = false, retries = 3, timeout = 5000 } = options;

    if (!immediate && this.shouldSkipSync()) {
      return this.queueSync(() => this.syncThemePreferencesToDatabase(userId, preferences, { immediate: true }));
    }

    this.syncInProgress = true;
    this.lastSyncTime = Date.now();

    try {
      // تطبيع البيانات
      const normalizedPreferences: Partial<ThemePreferences> = {};
      
      if (preferences.userTheme) {
        normalizedPreferences.userTheme = normalizeThemeId(preferences.userTheme);
      }
      
      if (preferences.profileEffect !== undefined) {
        normalizedPreferences.profileEffect = preferences.profileEffect;
      }
      
      if (preferences.usernameColor !== undefined) {
        normalizedPreferences.usernameColor = preferences.usernameColor;
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const result = await apiRequest(`/api/users/${userId}`, {
            method: 'PUT',
            body: normalizedPreferences,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (result && (result as any).id) {
            // حفظ الثيم محلياً إذا تم تحديثه
            if (normalizedPreferences.userTheme) {
              saveThemeToStorage(normalizedPreferences.userTheme);
              applyUnifiedTheme(normalizedPreferences.userTheme);
            }
            
            console.log(`✅ تم مزامنة تفضيلات الثيم بنجاح`);
            return true;
          }
        } catch (error) {
          console.warn(`❌ فشل في المحاولة ${attempt}/${retries} لمزامنة التفضيلات:`, error);
          
          if (attempt === retries) {
            throw error;
          }
          
          await this.delay(attempt * 1000);
        }
      }

      return false;
    } catch (error) {
      console.error('❌ خطأ نهائي في مزامنة تفضيلات الثيم:', error);
      return false;
    } finally {
      this.syncInProgress = false;
      this.processQueue();
    }
  }

  /**
   * جلب تفضيلات الثيم من قاعدة البيانات وتطبيقها محلياً
   */
  async loadThemePreferencesFromDatabase(userId: number): Promise<ThemePreferences | null> {
    try {
      const userData = await apiRequest(`/api/users/${userId}?t=${Date.now()}`);
      
      if (userData && userData.id) {
        const preferences: ThemePreferences = {
          userTheme: normalizeThemeId(userData.userTheme || 'default'),
          profileEffect: userData.profileEffect || 'none',
          usernameColor: userData.usernameColor || '#000000'
        };

        // حفظ وتطبيق الثيم محلياً
        saveThemeToStorage(preferences.userTheme);
        applyUnifiedTheme(preferences.userTheme);

        console.log('✅ تم تحميل تفضيلات الثيم من قاعدة البيانات');
        return preferences;
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل تفضيلات الثيم من قاعدة البيانات:', error);
    }

    return null;
  }

  /**
   * مزامنة ثنائية الاتجاه - من وإلى قاعدة البيانات
   */
  async bidirectionalSync(userId: number, localTheme?: string): Promise<void> {
    try {
      // 1. جلب التفضيلات من قاعدة البيانات
      const remotePreferences = await this.loadThemePreferencesFromDatabase(userId);
      
      // 2. مقارنة مع المحفوظات المحلية
      const localSavedTheme = localTheme || loadThemeFromStorage();
      
      if (remotePreferences) {
        // 3. تحديد أي التفضيلات أحدث
        const shouldUseRemote = !localTheme || 
          remotePreferences.userTheme !== localSavedTheme;

        if (shouldUseRemote) {
          // استخدام التفضيلات البعيدة
          saveThemeToStorage(remotePreferences.userTheme);
          applyUnifiedTheme(remotePreferences.userTheme);
          console.log('🔄 تم استخدام الثيم من قاعدة البيانات');
        } else if (localSavedTheme !== remotePreferences.userTheme) {
          // رفع التفضيلات المحلية
          await this.syncThemeToDatabase(userId, localSavedTheme, { immediate: true });
          console.log('🔄 تم رفع الثيم المحلي إلى قاعدة البيانات');
        }
      } else if (localSavedTheme && localSavedTheme !== 'default') {
        // رفع الثيم المحلي إذا لم توجد تفضيلات بعيدة
        await this.syncThemeToDatabase(userId, localSavedTheme, { immediate: true });
        console.log('🔄 تم رفع الثيم المحلي (لا توجد تفضيلات بعيدة)');
      }
    } catch (error) {
      console.error('❌ خطأ في المزامنة ثنائية الاتجاه:', error);
    }
  }

  /**
   * تنظيف البيانات المحلية القديمة
   */
  cleanupOldLocalData(): void {
    try {
      // إزالة مفاتيح الثيمات القديمة
      const keysToRemove = [
        'oldTheme',
        'userThemeTemp',
        'themeBackup',
        'legacyTheme'
      ];

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`تعذر إزالة المفتاح القديم: ${key}`);
        }
      });

      console.log('🧹 تم تنظيف البيانات المحلية القديمة');
    } catch (error) {
      console.error('❌ خطأ في تنظيف البيانات القديمة:', error);
    }
  }

  // ===== دوال مساعدة خاصة =====

  private shouldSkipSync(): boolean {
    const now = Date.now();
    return this.syncInProgress || (now - this.lastSyncTime) < this.MIN_SYNC_INTERVAL;
  }

  private async queueSync(syncFunction: () => Promise<void>): Promise<boolean> {
    return new Promise((resolve) => {
      this.retryQueue.push(async () => {
        try {
          await syncFunction();
          resolve(true);
        } catch (error) {
          console.error('❌ خطأ في تنفيذ المزامنة المجدولة:', error);
          resolve(false);
        }
      });
    });
  }

  private async processQueue(): Promise<void> {
    if (this.retryQueue.length === 0 || this.syncInProgress) {
      return;
    }

    const nextSync = this.retryQueue.shift();
    if (nextSync) {
      await nextSync();
      
      // معالجة باقي العناصر بعد انتظار قصير
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// إنشاء instance مشترك
export const themeStorageSync = new ThemeStorageSync();

// ===== دوال سهلة الاستخدام =====

/**
 * مزامنة الثيم إلى قاعدة البيانات
 */
export async function syncTheme(userId: number, themeId: string): Promise<boolean> {
  return themeStorageSync.syncThemeToDatabase(userId, themeId);
}

/**
 * مزامنة التأثير إلى قاعدة البيانات
 */
export async function syncEffect(userId: number, effectId: string): Promise<boolean> {
  return themeStorageSync.syncEffectToDatabase(userId, effectId);
}

/**
 * تحميل وتطبيق الثيم من قاعدة البيانات
 */
export async function loadAndApplyTheme(userId: number): Promise<void> {
  const preferences = await themeStorageSync.loadThemePreferencesFromDatabase(userId);
  if (preferences?.userTheme) {
    applyUnifiedTheme(preferences.userTheme);
  }
}

/**
 * مزامنة شاملة عند تسجيل الدخول
 */
export async function initializeUserThemes(userId: number): Promise<void> {
  // تنظيف البيانات القديمة
  themeStorageSync.cleanupOldLocalData();
  
  // مزامنة ثنائية الاتجاه
  await themeStorageSync.bidirectionalSync(userId);
}

/**
 * حفظ ومزامنة الثيم فوراً
 */
export async function saveAndSyncTheme(userId: number, themeId: string): Promise<boolean> {
  // حفظ محلياً أولاً
  const normalizedTheme = normalizeThemeId(themeId);
  saveThemeToStorage(normalizedTheme);
  applyUnifiedTheme(normalizedTheme);
  
  // ثم مزامنة مع قاعدة البيانات
  return themeStorageSync.syncThemeToDatabase(userId, normalizedTheme, { immediate: true });
}
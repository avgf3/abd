/**
 * إدارة مركزية لجميع الإعدادات والتفضيلات
 * يحل مشكلة التضارب في localStorage وإدارة الثيم
 */

// أنواع البيانات
export interface UserSettings {
  theme: string;
  language: string;
  deviceId: string;
  notifications: boolean;
  autoSave: boolean;
}

export interface ThemeConfig {
  id: string;
  name: string;
  preview: string;
  description: string;
  cssVars: Record<string, string>;
}

// مفاتيح localStorage المركزية
export const STORAGE_KEYS = {
  THEME: 'app-theme',
  LANGUAGE: 'app-language', 
  DEVICE_ID: 'app-device-id',
  USER_SETTINGS: 'app-user-settings',
  TEMP_SETTINGS: 'app-temp-settings'
} as const;

// تكوين الثيمات المركزي
export const THEMES: Record<string, ThemeConfig> = {
  default: {
    id: 'default',
    name: 'الافتراضي',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'الثيم الافتراضي الأنيق',
    cssVars: {
      '--primary': '#667eea',
      '--primary-foreground': '#ffffff',
      '--background': '#ffffff',
      '--foreground': '#1a202c',
      '--card': '#ffffff',
      '--card-foreground': '#1a202c',
      '--popover': '#ffffff',
      '--popover-foreground': '#1a202c',
      '--muted': '#f1f5f9',
      '--muted-foreground': '#64748b',
      '--border': '#e2e8f0',
      '--input': '#e2e8f0',
      '--accent': '#f1f5f9',
      '--accent-foreground': '#0f172a',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#667eea',
    },
  },
  dark: {
    id: 'dark',
    name: 'الداكن',
    preview: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    description: 'ثيم داكن مريح للعيون',
    cssVars: {
      '--primary': '#2c3e50',
      '--primary-foreground': '#ffffff',
      '--background': '#0f172a',
      '--foreground': '#f8fafc',
      '--card': '#1e293b',
      '--card-foreground': '#f8fafc',
      '--popover': '#1e293b',
      '--popover-foreground': '#f8fafc',
      '--muted': '#334155',
      '--muted-foreground': '#94a3b8',
      '--border': '#334155',
      '--input': '#334155',
      '--accent': '#475569',
      '--accent-foreground': '#f8fafc',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#2c3e50',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'المحيط',
    preview: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    description: 'ثيم أزرق هادئ',
    cssVars: {
      '--primary': '#4facfe',
      '--primary-foreground': '#ffffff',
      '--background': '#f0f9ff',
      '--foreground': '#0c4a6e',
      '--card': '#ffffff',
      '--card-foreground': '#0c4a6e',
      '--popover': '#ffffff',
      '--popover-foreground': '#0c4a6e',
      '--muted': '#e0f2fe',
      '--muted-foreground': '#0369a1',
      '--border': '#bae6fd',
      '--input': '#bae6fd',
      '--accent': '#e0f2fe',
      '--accent-foreground': '#0c4a6e',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#4facfe',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'الغروب',
    preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'ثيم دافئ بألوان الغروب',
    cssVars: {
      '--primary': '#f093fb',
      '--primary-foreground': '#ffffff',
      '--background': '#fef7ff',
      '--foreground': '#831843',
      '--card': '#ffffff',
      '--card-foreground': '#831843',
      '--popover': '#ffffff',
      '--popover-foreground': '#831843',
      '--muted': '#fce7f3',
      '--muted-foreground': '#be185d',
      '--border': '#f9a8d4',
      '--input': '#f9a8d4',
      '--accent': '#fce7f3',
      '--accent-foreground': '#831843',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#f093fb',
    },
  },
  forest: {
    id: 'forest',
    name: 'الغابة',
    preview: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'ثيم أخضر طبيعي',
    cssVars: {
      '--primary': '#11998e',
      '--primary-foreground': '#ffffff',
      '--background': '#f0fdf4',
      '--foreground': '#14532d',
      '--card': '#ffffff',
      '--card-foreground': '#14532d',
      '--popover': '#ffffff',
      '--popover-foreground': '#14532d',
      '--muted': '#dcfce7',
      '--muted-foreground': '#166534',
      '--border': '#bbf7d0',
      '--input': '#bbf7d0',
      '--accent': '#dcfce7',
      '--accent-foreground': '#14532d',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#11998e',
    },
  },
  royal: {
    id: 'royal',
    name: 'الملكي',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    description: 'ثيم أرجواني فاخر',
    cssVars: {
      '--primary': '#8b5cf6',
      '--primary-foreground': '#ffffff',
      '--background': '#faf5ff',
      '--foreground': '#581c87',
      '--card': '#ffffff',
      '--card-foreground': '#581c87',
      '--popover': '#ffffff',
      '--popover-foreground': '#581c87',
      '--muted': '#f3e8ff',
      '--muted-foreground': '#7c3aed',
      '--border': '#c4b5fd',
      '--input': '#c4b5fd',
      '--accent': '#f3e8ff',
      '--accent-foreground': '#581c87',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#8b5cf6',
    },
  },
  fire: {
    id: 'fire',
    name: 'النار',
    preview: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    description: 'ثيم ناري حماسي',
    cssVars: {
      '--primary': '#ff9a9e',
      '--primary-foreground': '#ffffff',
      '--background': '#fef2f2',
      '--foreground': '#991b1b',
      '--card': '#ffffff',
      '--card-foreground': '#991b1b',
      '--popover': '#ffffff',
      '--popover-foreground': '#991b1b',
      '--muted': '#fee2e2',
      '--muted-foreground': '#dc2626',
      '--border': '#fecaca',
      '--input': '#fecaca',
      '--accent': '#fee2e2',
      '--accent-foreground': '#991b1b',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#ff9a9e',
    },
  },
  ice: {
    id: 'ice',
    name: 'الثلج',
    preview: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    description: 'ثيم بارد منعش',
    cssVars: {
      '--primary': '#a8edea',
      '--primary-foreground': '#0f172a',
      '--background': '#f0fdfa',
      '--foreground': '#134e4a',
      '--card': '#ffffff',
      '--card-foreground': '#134e4a',
      '--popover': '#ffffff',
      '--popover-foreground': '#134e4a',
      '--muted': '#ccfbf1',
      '--muted-foreground': '#0f766e',
      '--border': '#99f6e4',
      '--input': '#99f6e4',
      '--accent': '#ccfbf1',
      '--accent-foreground': '#134e4a',
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--ring': '#a8edea',
    },
  },
};

/**
 * فئة إدارة الإعدادات المركزية
 */
class SettingsManager {
  private static instance: SettingsManager;
  private deviceId: string;
  private settings: UserSettings;

  private constructor() {
    this.deviceId = this.initializeDeviceId();
    this.settings = this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * تهيئة معرف الجهاز الفريد
   */
  private initializeDeviceId(): string {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (existing && existing.length > 10) {
        return existing;
      }
      
      const newId = 'web-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, newId);
      return newId;
    } catch (error) {
      console.warn('فشل في إنشاء معرف الجهاز:', error);
      return 'web-fallback-' + Date.now();
    }
  }

  /**
   * تحميل الإعدادات من localStorage
   */
  private loadSettings(): UserSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          theme: parsed.theme || 'default',
          language: parsed.language || 'ar',
          deviceId: this.deviceId,
          notifications: parsed.notifications ?? true,
          autoSave: parsed.autoSave ?? true,
        };
      }
    } catch (error) {
      console.warn('فشل في تحميل الإعدادات:', error);
    }

    // الإعدادات الافتراضية
    return {
      theme: 'default',
      language: 'ar',
      deviceId: this.deviceId,
      notifications: true,
      autoSave: true,
    };
  }

  /**
   * حفظ الإعدادات في localStorage
   */
  private saveSettings(): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('فشل في حفظ الإعدادات:', error);
      return false;
    }
  }

  /**
   * الحصول على معرف الجهاز
   */
  public getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * الحصول على الإعدادات الحالية
   */
  public getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * تحديث إعداد محدد
   */
  public updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): boolean {
    try {
      this.settings[key] = value;
      return this.saveSettings();
    } catch (error) {
      console.error('فشل في تحديث الإعداد:', error);
      return false;
    }
  }

  /**
   * تطبيق الثيم
   */
  public applyTheme(themeId: string, persist: boolean = true): boolean {
    try {
      const theme = THEMES[themeId] || THEMES.default;
      const root = document.documentElement;
      
      // تطبيق متغيرات CSS
      Object.entries(theme.cssVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // حفظ الثيم إذا كان مطلوباً
      if (persist) {
        this.updateSetting('theme', themeId);
        localStorage.setItem(STORAGE_KEYS.THEME, themeId);
      }

      return true;
    } catch (error) {
      console.error('فشل في تطبيق الثيم:', error);
      return false;
    }
  }

  /**
   * تحميل الثيم المحفوظ
   */
  public loadSavedTheme(): void {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || this.settings.theme;
      this.applyTheme(savedTheme, false);
    } catch (error) {
      console.warn('فشل في تحميل الثيم المحفوظ:', error);
      this.applyTheme('default', false);
    }
  }

  /**
   * تطبيق اللغة
   */
  public applyLanguage(languageCode: string, persist: boolean = true): boolean {
    try {
      // تطبيق اتجاه النص
      const isRTL = ['ar', 'fa', 'he', 'ur'].includes(languageCode);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = languageCode;
      
      // تحديث فئة الجسم
      document.body.classList.remove('rtl', 'ltr');
      document.body.classList.add(isRTL ? 'rtl' : 'ltr');

      // حفظ اللغة إذا كان مطلوباً
      if (persist) {
        this.updateSetting('language', languageCode);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, languageCode);
      }

      return true;
    } catch (error) {
      console.error('فشل في تطبيق اللغة:', error);
      return false;
    }
  }

  /**
   * تحميل اللغة المحفوظة
   */
  public loadSavedLanguage(): void {
    try {
      const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || this.settings.language;
      this.applyLanguage(savedLanguage, false);
    } catch (error) {
      console.warn('فشل في تحميل اللغة المحفوظة:', error);
      this.applyLanguage('ar', false);
    }
  }

  /**
   * إعادة تعيين الإعدادات للقيم الافتراضية
   */
  public resetSettings(): boolean {
    try {
      this.settings = {
        theme: 'default',
        language: 'ar',
        deviceId: this.deviceId,
        notifications: true,
        autoSave: true,
      };
      
      this.saveSettings();
      this.applyTheme('default');
      this.applyLanguage('ar');
      
      return true;
    } catch (error) {
      console.error('فشل في إعادة تعيين الإعدادات:', error);
      return false;
    }
  }

  /**
   * تنظيف البيانات القديمة
   */
  public cleanup(): void {
    try {
      // إزالة المفاتيح القديمة
      const oldKeys = ['selectedTheme', 'preferred-language', 'deviceId'];
      oldKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('فشل في تنظيف البيانات القديمة:', error);
    }
  }

  /**
   * تصدير الإعدادات
   */
  public exportSettings(): string {
    try {
      return JSON.stringify(this.settings, null, 2);
    } catch (error) {
      console.error('فشل في تصدير الإعدادات:', error);
      return '{}';
    }
  }

  /**
   * استيراد الإعدادات
   */
  public importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson);
      this.settings = {
        ...this.settings,
        ...imported,
        deviceId: this.deviceId, // الحفاظ على معرف الجهاز الحالي
      };
      
      this.saveSettings();
      this.applyTheme(this.settings.theme);
      this.applyLanguage(this.settings.language);
      
      return true;
    } catch (error) {
      console.error('فشل في استيراد الإعدادات:', error);
      return false;
    }
  }
}

// تصدير المثيل الوحيد
export const settingsManager = SettingsManager.getInstance();

// دوال مساعدة للوصول السريع
export const getDeviceId = () => settingsManager.getDeviceId();
export const getSettings = () => settingsManager.getSettings();
export const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
  settingsManager.updateSetting(key, value);
export const applyTheme = (themeId: string, persist?: boolean) =>
  settingsManager.applyTheme(themeId, persist);
export const applyLanguage = (languageCode: string, persist?: boolean) =>
  settingsManager.applyLanguage(languageCode, persist);

// تهيئة تلقائية عند التحميل
if (typeof window !== 'undefined') {
  // تحميل الإعدادات المحفوظة
  settingsManager.loadSavedTheme();
  settingsManager.loadSavedLanguage();
  
  // تنظيف البيانات القديمة
  settingsManager.cleanup();
}
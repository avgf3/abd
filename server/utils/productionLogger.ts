import { logDevelopmentEndpoint, isProduction } from '../middleware/development';

// Logger إنتاج محسّن
class ProductionLogger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // تسجيل فقط في بيئة التطوير
  dev(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`🔧 [DEV] ${message}`, ...args);
    }
  }

  // تسجيل المعلومات المهمة (الإنتاج والتطوير)
  info(message: string, ...args: any[]): void {
    console.log(`ℹ️ [INFO] ${message}`, ...args);
  }

  // تسجيل التحذيرات (الإنتاج والتطوير)
  warn(message: string, ...args: any[]): void {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
  }

  // تسجيل الأخطاء (الإنتاج والتطوير)
  error(message: string, ...args: any[]): void {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }

  // تسجيل الأحداث الأمنية (الإنتاج والتطوير)
  security(message: string, ...args: any[]): void {
    console.warn(`🚨 [SECURITY] ${message}`, ...args);
  }

  // تسجيل العمليات الناجحة (فقط في التطوير)
  success(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  // تسجيل بداية العمليات (فقط في التطوير)
  start(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`🔄 [START] ${message}`, ...args);
    }
  }

  // تسجيل إنهاء العمليات (فقط في التطوير)
  end(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`🏁 [END] ${message}`, ...args);
    }
  }

  // تسجيل العمليات الحساسة (فقط الضروري في الإنتاج)
  debug(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  // تسجيل الشبكة (فقط في التطوير)
  network(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`🌐 [NETWORK] ${message}`, ...args);
    }
  }

  // تسجيل قاعدة البيانات (فقط في التطوير)
  database(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`🗄️ [DB] ${message}`, ...args);
    }
  }

  // تسجيل الملفات (فقط في التطوير)
  file(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`📁 [FILE] ${message}`, ...args);
    }
  }

  // تسجيل المستخدمين (فقط في التطوير)
  user(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`👤 [USER] ${message}`, ...args);
    }
  }

  // تسجيل الرسائل (فقط في التطوير)
  chat(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(`💬 [CHAT] ${message}`, ...args);
    }
  }
}

// إنشاء مثيل Logger عام
export const logger = new ProductionLogger();

// دوال مساعدة للاستخدام السريع
export const log = {
  dev: logger.dev.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  security: logger.security.bind(logger),
  success: logger.success.bind(logger),
  start: logger.start.bind(logger),
  end: logger.end.bind(logger),
  debug: logger.debug.bind(logger),
  network: logger.network.bind(logger),
  database: logger.database.bind(logger),
  file: logger.file.bind(logger),
  user: logger.user.bind(logger),
  chat: logger.chat.bind(logger)
};
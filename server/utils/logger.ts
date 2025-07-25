/**
 * نظام الـ Logging المحترف
 */

interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  private logLevel: number;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
  }

  private shouldLog(level: number): boolean {
    return level >= this.logLevel;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const errorStr = error instanceof Error ? error.stack : String(error);
      console.error(this.formatMessage('ERROR', message, errorStr, ...args));
    }
  }

  // للأخطاء الحرجة التي يجب أن تظهر دائماً
  critical(message: string, error?: any, ...args: any[]): void {
    const errorStr = error instanceof Error ? error.stack : String(error);
    console.error(this.formatMessage('CRITICAL', message, errorStr, ...args));
  }

  // للمعلومات المهمة في الإنتاج
  production(message: string, ...args: any[]): void {
    if (this.isProduction) {
      console.log(this.formatMessage('PROD', message, ...args));
    }
  }
}

// إنشاء instance واحد
export const logger = new Logger();

// دوال مساعدة سريعة
export const log = {
  debug: (msg: string, ...args: any[]) => logger.debug(msg, ...args),
  info: (msg: string, ...args: any[]) => logger.info(msg, ...args),
  warn: (msg: string, ...args: any[]) => logger.warn(msg, ...args),
  error: (msg: string, error?: any, ...args: any[]) => logger.error(msg, error, ...args),
  critical: (msg: string, error?: any, ...args: any[]) => logger.critical(msg, error, ...args),
  production: (msg: string, ...args: any[]) => logger.production(msg, ...args)
};
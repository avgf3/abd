import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Log colors for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file: boolean;
  json: boolean;
  maxFileSize: number; // in MB
  maxFiles: number;
  logDir: string;
}

class Logger {
  private config: LoggerConfig;
  private currentLogFile: string;
  private logStream: any = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      console: true,
      file: process.env.NODE_ENV === 'production',
      json: process.env.NODE_ENV === 'production',
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      // استخدم LOG_DIR من البيئة إن وُجد، وإلا أنشئ داخل مجلد التشغيل الحالي
      logDir: process.env.LOG_DIR && process.env.LOG_DIR.trim().length > 0
        ? process.env.LOG_DIR
        : path.join(process.cwd(), 'logs'),
      ...config
    };

    this.currentLogFile = this.getLogFileName();
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDir, `app-${date}.log`);
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    
    if (this.config.json) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown'
      }) + '\n';
    }
    
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [PID:${process.pid}] ${message}${metaStr}\n`;
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return colors.red;
      case LogLevel.WARN: return colors.yellow;
      case LogLevel.INFO: return colors.green;
      case LogLevel.DEBUG: return colors.blue;
      case LogLevel.TRACE: return colors.magenta;
      default: return colors.reset;
    }
  }

  private async writeToFile(message: string) {
    if (!this.config.file) return;

    try {
      // Check if we need to rotate logs
      await this.checkLogRotation();
      
      // Write to file
      await fs.appendFile(this.currentLogFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async checkLogRotation() {
    try {
      const stats = await fs.stat(this.currentLogFile);
      const sizeInMB = stats.size / (1024 * 1024);
      
      if (sizeInMB >= this.config.maxFileSize) {
        await this.rotateLog();
      }
    } catch (error) {
      // File doesn't exist yet, no need to rotate
    }
  }

  private async rotateLog() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = path.join(
      this.config.logDir, 
      `app-${timestamp}.log`
    );
    
    try {
      await fs.rename(this.currentLogFile, rotatedFile);
      await this.cleanOldLogs();
    } catch (error) {
      console.error('Failed to rotate log:', error);
    }
  }

  private async cleanOldLogs() {
    try {
      const files = await fs.readdir(this.config.logDir);
      const logFiles = files
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
        .reverse();
      
      if (logFiles.length > this.config.maxFiles) {
        const filesToDelete = logFiles.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(this.config.logDir, file));
        }
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any) {
    if (level > this.config.level) return;

    const formattedMessage = this.formatMessage(levelName, message, meta);
    
    // Console output
    if (this.config.console) {
      const color = this.getLevelColor(level);
      const coloredLevel = `${color}[${levelName}]${colors.reset}`;
      const timestamp = new Date().toISOString();
      
      if (this.config.json) {
        console.log(formattedMessage.trim());
      } else {
        console.log(
          `${colors.cyan}[${timestamp}]${colors.reset} ${coloredLevel} ${message}`,
          meta || ''
        );
      }
    }
    
    // File output
    this.writeToFile(formattedMessage);
  }

  error(message: string, error?: Error | any, meta?: any) {
    const errorMeta = error ? {
      error: {
        message: error.message || error,
        stack: error.stack,
        ...error
      },
      ...meta
    } : meta;
    
    this.log(LogLevel.ERROR, 'ERROR', message, errorMeta);
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  trace(message: string, meta?: any) {
    this.log(LogLevel.TRACE, 'TRACE', message, meta);
  }

  // Express middleware for request logging
  requestLogger() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const requestId = crypto.randomUUID();
      
      // Attach request ID
      req.requestId = requestId;
      
      // Log request
      this.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      
      // Log response
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        
        this[level]('Request completed', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('content-length'),
          userId: req.user?.id
        });
      });
      
      next();
    };
  }

  // Error logging middleware
  errorLogger() {
    return (err: any, req: any, res: any, next: any) => {
      this.error('Request error', err, {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id
      });
      
      next(err);
    };
  }

  // Performance monitoring
  startTimer(label: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.debug(`Performance: ${label}`, { duration: `${duration}ms` });
    };
  }

  // Set log level dynamically
  setLevel(level: LogLevel) {
    this.config.level = level;
  }
}

// Create singleton instance
export const logger = new Logger({
  level: process.env.LOG_LEVEL ? 
    parseInt(process.env.LOG_LEVEL) : 
    (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG)
});

// Helper functions
export function log(message: string, meta?: any) {
  logger.info(message, meta);
}

export function logError(message: string, error?: Error | any, meta?: any) {
  logger.error(message, error, meta);
}

export function logWarn(message: string, meta?: any) {
  logger.warn(message, meta);
}

export function logDebug(message: string, meta?: any) {
  logger.debug(message, meta);
}

// Add missing import
import crypto from 'crypto';
import winston from 'winston';
import path from 'path';

// تحديد مستوى السجل بناءً على البيئة
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// تنسيق مخصص للسجلات
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // إضافة metadata إذا كانت موجودة
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    // إضافة stack trace للأخطاء
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// إعداد transports
const transports: winston.transport[] = [];

// Console transport - دائماً مفعل
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    )
  })
);

// File transport للإنتاج
if (process.env.NODE_ENV === 'production') {
  // سجل الأخطاء
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: customFormat
    })
  );
  
  // سجل جميع المستويات
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: customFormat
    })
  );
}

// إنشاء Logger
const logger = winston.createLogger({
  level: logLevel,
  transports,
  // منع الخروج من العملية عند حدوث أخطاء
  exitOnError: false
});

// دالة مساعدة لإخفاء المعلومات الحساسة
function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

// واجهة Logger محسنة
export default {
  debug: (message: string, metadata?: any) => {
    logger.debug(message, sanitizeData(metadata));
  },
  
  info: (message: string, metadata?: any) => {
    logger.info(message, sanitizeData(metadata));
  },
  
  warn: (message: string, metadata?: any) => {
    logger.warn(message, sanitizeData(metadata));
  },
  
  error: (message: string, error?: Error | any, metadata?: any) => {
    if (error instanceof Error) {
      logger.error(message, { ...sanitizeData(metadata), error: error.message, stack: error.stack });
    } else {
      logger.error(message, sanitizeData({ error, ...metadata }));
    }
  },
  
  // دالة خاصة للإنتاج - تستبدل console.log
  log: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'production') {
      logger.info(message, { args: sanitizeData(args) });
    } else {
      console.log(message, ...args);
    }
  }
};

// استبدال console methods في الإنتاج
if (process.env.NODE_ENV === 'production') {
  console.log = (message: any, ...args: any[]) => {
    logger.info(typeof message === 'string' ? message : JSON.stringify(message), { args: sanitizeData(args) });
  };
  
  console.warn = (message: any, ...args: any[]) => {
    logger.warn(typeof message === 'string' ? message : JSON.stringify(message), { args: sanitizeData(args) });
  };
  
  console.error = (message: any, ...args: any[]) => {
    logger.error(typeof message === 'string' ? message : JSON.stringify(message), { args: sanitizeData(args) });
  };
}
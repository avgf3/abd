import * as fs from 'fs';
import * as path from 'path';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class BotLogger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logFile: string;
  private writeStream: fs.WriteStream | null = null;

  constructor() {
    const logsDir = path.join(__dirname, '../../../logs/bot-system');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFile = path.join(logsDir, `bot-system-${new Date().toISOString().split('T')[0]}.log`);
    this.writeStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      data
    };

    // Console output (للتطوير فقط)
    if (process.env.NODE_ENV !== 'production') {
      const color = this.getColor(level);
      console.log(`${color}[${timestamp}] [${levelName}] ${message}${this.resetColor()}`);
      if (data) {
        console.log(data);
      }
    }

    // File output
    if (this.writeStream) {
      this.writeStream.write(JSON.stringify(logEntry) + '\n');
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
      case LogLevel.INFO: return '\x1b[32m';  // Green
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      default: return '\x1b[0m';
    }
  }

  private resetColor(): string {
    return '\x1b[0m';
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

export const logger = new BotLogger();
import { BotState } from './types';
import crypto from 'crypto';

export class BotSecurityFeatures {
  // إخفاء هوية البوتات في الاستجابات
  static sanitizeBotData(bot: BotState, isOwner: boolean = false): any {
    const sanitized: any = {
      id: bot.id,
      username: bot.profile.username,
      displayName: bot.profile.displayName,
      avatar: bot.profile.avatar,
      bio: bot.profile.bio,
      location: bot.profile.location,
      joinDate: bot.profile.joinDate,
      lastSeen: bot.profile.lastSeen
    };

    // إخفاء المعلومات الحساسة
    if (!isOwner) {
      // لا نظهر أن هذا بوت
      delete sanitized.isBot;
      delete sanitized.botType;
    }

    return sanitized;
  }

  // توليد بيانات اتصال واقعية
  static generateRealisticConnectionData(): any {
    const browsers = [
      { name: 'Chrome', versions: ['120', '121', '122'] },
      { name: 'Firefox', versions: ['120', '121', '122'] },
      { name: 'Safari', versions: ['17.0', '17.1', '17.2'] },
      { name: 'Edge', versions: ['120', '121', '122'] }
    ];

    const os = [
      { name: 'Windows', versions: ['10', '11'] },
      { name: 'Mac OS X', versions: ['10_15_7', '14_1_2'] },
      { name: 'Linux', versions: ['x86_64'] },
      { name: 'Android', versions: ['13', '14'] },
      { name: 'iOS', versions: ['17_1', '17_2'] }
    ];

    const selectedBrowser = browsers[Math.floor(Math.random() * browsers.length)];
    const selectedOS = os[Math.floor(Math.random() * os.length)];
    const browserVersion = selectedBrowser.versions[Math.floor(Math.random() * selectedBrowser.versions.length)];
    const osVersion = selectedOS.versions[Math.floor(Math.random() * selectedOS.versions.length)];

    return {
      browser: selectedBrowser.name,
      browserVersion,
      os: selectedOS.name,
      osVersion,
      screen: {
        width: [1920, 1366, 1440, 2560][Math.floor(Math.random() * 4)],
        height: [1080, 768, 900, 1440][Math.floor(Math.random() * 4)]
      },
      timezone: this.getRandomTimezone(),
      language: this.getRandomLanguage(),
      plugins: this.getRandomPlugins()
    };
  }

  private static getRandomTimezone(): string {
    const timezones = [
      'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar',
      'Asia/Bahrain', 'Asia/Muscat', 'Asia/Baghdad', 'Asia/Amman',
      'Africa/Cairo', 'Asia/Beirut', 'Asia/Damascus'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  private static getRandomLanguage(): string {
    const languages = ['ar-SA', 'ar-AE', 'ar-EG', 'ar-KW', 'ar-QA', 'ar-BH'];
    return languages[Math.floor(Math.random() * languages.length)];
  }

  private static getRandomPlugins(): string[] {
    const allPlugins = [
      'Chrome PDF Plugin',
      'Chrome PDF Viewer',
      'Native Client',
      'Shockwave Flash',
      'Widevine Content Decryption Module'
    ];
    
    const numPlugins = Math.floor(Math.random() * 3) + 1;
    const plugins: string[] = [];
    
    for (let i = 0; i < numPlugins; i++) {
      const plugin = allPlugins[Math.floor(Math.random() * allPlugins.length)];
      if (!plugins.includes(plugin)) {
        plugins.push(plugin);
      }
    }
    
    return plugins;
  }

  // تشفير البيانات الحساسة
  static encryptSensitiveData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.BOT_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  // فك تشفير البيانات
  static decryptSensitiveData(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.BOT_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // التحقق من الطلبات المشبوهة
  static detectSuspiciousActivity(requests: any[]): boolean {
    // معدل الطلبات المشبوه (أكثر من 100 طلب في الدقيقة)
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = requests.filter(r => r.timestamp > oneMinuteAgo);
    
    if (recentRequests.length > 100) {
      return true;
    }
    
    // نمط الطلبات المشبوه (نفس الطلب متكرر)
    const requestPatterns = new Map();
    for (const req of recentRequests) {
      const pattern = `${req.method}:${req.path}`;
      requestPatterns.set(pattern, (requestPatterns.get(pattern) || 0) + 1);
    }
    
    for (const count of requestPatterns.values()) {
      if (count > 50) {
        return true;
      }
    }
    
    return false;
  }

  // إنشاء بصمة فريدة للجهاز
  static generateDeviceFingerprint(connectionData: any): string {
    const fingerprintData = {
      userAgent: connectionData.userAgent,
      screen: connectionData.screen,
      timezone: connectionData.timezone,
      language: connectionData.language,
      plugins: connectionData.plugins,
      canvas: crypto.randomBytes(16).toString('hex'),
      webgl: crypto.randomBytes(16).toString('hex'),
      audio: crypto.randomBytes(8).toString('hex')
    };
    
    const fingerprintString = JSON.stringify(fingerprintData);
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  // محاكاة تأخير الشبكة الواقعي
  static getRealisticNetworkDelay(location: string): number {
    const delays: Record<string, { min: number; max: number }> = {
      'الرياض': { min: 10, max: 30 },
      'جدة': { min: 15, max: 35 },
      'دبي': { min: 20, max: 40 },
      'القاهرة': { min: 30, max: 60 },
      'الكويت': { min: 15, max: 35 },
      'عمان': { min: 25, max: 45 },
      'default': { min: 20, max: 50 }
    };
    
    const delay = delays[location] || delays.default;
    return Math.floor(Math.random() * (delay.max - delay.min) + delay.min);
  }
}
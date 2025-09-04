import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { BotBehavior } from './bot-behavior';
import { BotProfile, BotConfig, BotState } from './types';
import { generateBotProfile } from './bot-profiles';
import { logger } from './logger';

export class BotManager extends EventEmitter {
  private bots: Map<string, BotState> = new Map();
  private config: BotConfig;
  private behavior: BotBehavior;
  private isRunning: boolean = false;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private connectionQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;

  constructor(config: BotConfig) {
    super();
    this.config = config;
    this.behavior = new BotBehavior();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('نظام البوتات يعمل بالفعل');
      return;
    }

    logger.info('بدء تشغيل نظام البوتات...');
    this.isRunning = true;

    // إنشاء البوتات بشكل تدريجي مع استخدام قائمة انتظار
    await this.createBotsGradually();

    // بدء دورة الصيانة
    this.startMaintenanceCycle();

    logger.info(`تم تشغيل ${this.bots.size} بوت بنجاح`);
  }

  private async createBotsGradually(): Promise<void> {
    const totalBots = this.config.totalBots;
    const batchSize = process.env.NODE_ENV === 'development' ? 2 : 5;
    const delayBetweenBatches = 3000; // 3 ثواني بين الدفعات

    for (let i = 0; i < totalBots; i++) {
      const isOwner = i < this.config.ownerBots;
      this.connectionQueue.push(() => this.createBot(isOwner));
    }

    // معالج قائمة الانتظار
    this.processConnectionQueue();
  }

  private async processConnectionQueue(): Promise<void> {
    if (this.isProcessingQueue || this.connectionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.connectionQueue.length > 0 && this.isRunning) {
      const batch = this.connectionQueue.splice(0, 5); // معالجة 5 بوتات في كل دفعة
      
      try {
        await Promise.all(batch.map(fn => fn()));
        await this.delay(2000); // تأخير 2 ثانية بين الدفعات
      } catch (error) {
        logger.error('خطأ في معالجة دفعة البوتات:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async createBot(isOwner: boolean): Promise<void> {
    try {
      const profile = await generateBotProfile(isOwner);
      const socket = await this.connectBot(profile);

      const botState: BotState = {
        id: profile.id,
        profile,
        socket,
        currentRoom: 'general',
        lastActivity: new Date(),
        isActive: true,
        messageCount: 0,
        roomHistory: ['general'],
        typingState: false,
        connectionAttempts: 0
      };

      this.bots.set(profile.id, botState);
      
      // تطبيق السلوك الأولي
      await this.behavior.initializeBotBehavior(botState);
      
      logger.info(`✅ البوت ${profile.username} تم إنشاؤه بنجاح`);

    } catch (error) {
      logger.error(`فشل إنشاء البوت: ${error}`);
    }
  }

  private async connectBot(profile: BotProfile): Promise<Socket> {
    // الحصول على توكن مصادقة أولاً
    const token = await this.obtainServerToken(profile);
    
    const socket = io(this.config.serverUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token,
        deviceId: profile.deviceId
      },
      query: {
        username: profile.username,
        userAgent: profile.userAgent
      },
      reconnection: true,
      reconnectionDelay: 3000 + Math.random() * 2000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket connection timeout'));
      }, 30000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        logger.debug(`البوت ${profile.username} اتصل بنجاح`);
        
        // إرسال حدث المصادقة بالتوكن فور الاتصال
        try {
          const bearerToken = (this as any).lastToken || undefined;
        } catch {}
        try {
          socket.emit('auth', { token });
        } catch {}

        // تطبيق معالجات الأحداث
        this.setupBotEventHandlers(socket, profile);
        
        resolve(socket);
      });

      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        logger.error(`فشل اتصال البوت ${profile.username}: ${error.message}`);
        reject(error);
      });
    });
  }

  private setupBotEventHandlers(socket: Socket, profile: BotProfile): void {
    const botId = profile.id;

    // معالج الرسائل
    socket.on('message', (data) => {
      const bot = this.bots.get(botId);
      if (!bot) return;

      // استخراج محتوى الرسالة من أي تنسيق
      let messageContent = '';
      let username = '';
      
      if (data?.envelope?.type === 'newMessage') {
        messageContent = data.envelope.message?.content || '';
        username = data.envelope.message?.username || '';
      } else if (data?.message) {
        messageContent = data.message.content || '';
        username = data.message.username || '';
      } else if (typeof data === 'object' && data?.type === 'newMessage') {
        // تنسيق Socket.IO المباشر
        messageContent = data.message?.content || '';
        username = data.message?.sender?.username || data.username || '';
      } else if (typeof data === 'object') {
        messageContent = data.content || '';
        username = data.username || '';
      }

      // تجاهل رسائل البوت نفسه
      if (username === profile.username) return;

      if (messageContent && this.behavior.shouldReactToMessage(bot, { content: messageContent, username })) {
        this.scheduleBotReaction(bot, { content: messageContent, username });
      }

      // الترحيب عند انضمام مستخدم جديد (تنسيق socket الحالي)
      try {
        if (typeof data === 'object' && data?.type === 'userJoinedRoom' && data?.username && data.username !== profile.username) {
          if (this.behavior.shouldWelcomeUser(bot, { username: data.username })) {
            this.scheduleWelcomeMessage(bot, data.username);
          }
        }
      } catch {}
    });

    // لم يعد الحدث userJoined مستخدماً في الخادم الحالي

    // معالج قطع الاتصال
    socket.on('disconnect', (reason) => {
      logger.warn(`البوت ${profile.username} انقطع: ${reason}`);
      this.handleBotDisconnection(botId);
    });

    // معالج إعادة الاتصال
    socket.on('reconnect', () => {
      logger.info(`البوت ${profile.username} أعاد الاتصال`);
      const bot = this.bots.get(botId);
      if (bot) {
        bot.isActive = true;
        bot.connectionAttempts = 0;
      }
    });

    // معالج الأخطاء
    socket.on('error', (error) => {
      logger.error(`خطأ في البوت ${profile.username}:`, error);
    });
  }

  private async obtainServerToken(profile: BotProfile): Promise<string> {
    const endpoint = `${this.config.serverUrl.replace(/\/$/, '')}/api/auth/guest`;
    const payload = { 
      username: profile.username, 
      gender: profile.gender || 'male'
    };

    const maxAttempts = 5;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': profile.deviceId,
            'User-Agent': profile.userAgent,
            // اطلب ترقية البوتات إلى عضو كي تظهر كأعضاء وليس زوار
            'X-Bot-Member': 'true',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const token = data.token || data.data?.token;
          
          if (!token) {
            throw new Error('لم يتم الحصول على توكن من الخادم');
          }
          
          logger.debug(`حصل البوت ${profile.username} على توكن بنجاح`);
          return token;
        }

        // معالجة الأخطاء المؤقتة
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = response.headers.get('Retry-After');
          const delayMs = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.min(1000 * Math.pow(2, attempt), 10000);
          
          logger.warn(`محاولة ${attempt}/${maxAttempts} فشلت (${response.status}). إعادة المحاولة بعد ${delayMs}ms`);
          await this.delay(delayMs);
          continue;
        }

        // خطأ دائم
        const errorText = await response.text();
        throw new Error(`فشل تسجيل الضيف: ${response.status} - ${errorText}`);

      } catch (error: any) {
        lastError = error;
        logger.error(`خطأ في المحاولة ${attempt}/${maxAttempts}:`, error.message);
        
        if (attempt < maxAttempts) {
          await this.delay(2000 * attempt);
        }
      }
    }

    throw new Error(`فشل الحصول على توكن بعد ${maxAttempts} محاولات: ${lastError?.message}`);
  }

  private scheduleBotReaction(bot: BotState, messageData: any): void {
    const readingTime = this.behavior.calculateReadingTime(messageData.content);
    const typingTime = this.behavior.calculateTypingTime();
    const response = this.behavior.generateResponse(bot, messageData);

    if (!response) return;

    // محاكاة القراءة
    setTimeout(() => {
      // محاكاة الكتابة
      bot.typingState = true;
      bot.socket.emit('typing', { isTyping: true });

      setTimeout(() => {
        bot.typingState = false;
        bot.socket.emit('typing', { isTyping: false });
        
        // إرسال الرسالة إلى الغرفة العامة عبر الحدث الصحيح
        bot.socket.emit('publicMessage', {
          content: response,
          roomId: bot.currentRoom
        });

        bot.messageCount++;
        bot.lastActivity = new Date();

      }, typingTime);
    }, readingTime);
  }

  private scheduleWelcomeMessage(bot: BotState, username: string): void {
    const delay = 2000 + Math.random() * 3000;
    
    setTimeout(() => {
      const welcomeMessage = this.behavior.generateWelcomeMessage(bot, username);
      
      bot.socket.emit('publicMessage', {
        content: welcomeMessage,
        roomId: bot.currentRoom
      });

      bot.messageCount++;
      bot.lastActivity = new Date();
    }, delay);
  }

  private startMaintenanceCycle(): void {
    // دورة صيانة كل 30 ثانية
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance();
    }, 30000);
  }

  private async performMaintenance(): Promise<void> {
    const now = Date.now();
    
    for (const [botId, bot] of this.bots) {
      // إعادة الاتصال للبوتات المنقطعة
      if (!bot.isActive && bot.connectionAttempts < 3) {
        logger.info(`محاولة إعادة اتصال البوت ${bot.profile.username}`);
        bot.connectionAttempts++;
        
        try {
          const newSocket = await this.connectBot(bot.profile);
          bot.socket = newSocket;
          bot.isActive = true;
          bot.connectionAttempts = 0;
        } catch (error) {
          logger.error(`فشلت إعادة اتصال البوت ${bot.profile.username}:`, error);
        }
      }

      // حركة عشوائية للبوتات النشطة
      if (bot.isActive && Math.random() < 0.1) { // 10% احتمالية
        this.moveToRandomRoom(bot);
      }
    }

    // معالجة قائمة الانتظار إن وجدت
    if (this.connectionQueue.length > 0) {
      this.processConnectionQueue();
    }
  }

  private async moveToRandomRoom(bot: BotState): Promise<void> {
    const rooms = await this.getAvailableRooms();
    const currentRoom = bot.currentRoom;
    const availableRooms = rooms.filter(r => r !== currentRoom);
    
    if (availableRooms.length === 0) return;

    const newRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    
    bot.socket.emit('leaveRoom', { roomId: currentRoom });
    bot.socket.emit('joinRoom', { roomId: newRoom });
    
    bot.currentRoom = newRoom;
    bot.roomHistory.push(newRoom);
    
    logger.debug(`البوت ${bot.profile.username} انتقل من ${currentRoom} إلى ${newRoom}`);
  }

  private async getAvailableRooms(): Promise<string[]> {
    // يمكن جلب هذه من الخادم
    return ['general', 'games', 'tech', 'music', 'sports', 'movies', 'food', 'travel'];
  }

  private handleBotDisconnection(botId: string): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.isActive = false;
      bot.lastActivity = new Date();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    logger.info('إيقاف نظام البوتات...');
    
    this.isRunning = false;

    // إيقاف دورة الصيانة
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    // قطع اتصال جميع البوتات
    const disconnectPromises: Promise<void>[] = [];
    
    for (const [botId, bot] of this.bots) {
      disconnectPromises.push(new Promise<void>((resolve) => {
        bot.socket.once('disconnect', () => resolve());
        bot.socket.disconnect();
      }));
    }

    await Promise.all(disconnectPromises);
    this.bots.clear();
    this.connectionQueue = [];
    
    logger.info('تم إيقاف نظام البوتات');
  }

  // واجهة للتحكم الخارجي
  getActiveBots(): BotState[] {
    return Array.from(this.bots.values());
  }

  getBotById(botId: string): BotState | null {
    return this.bots.get(botId) || null;
  }

  async sendBotMessage(botId: string, content: string, room?: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot || !bot.isActive) {
      throw new Error('البوت غير موجود أو غير نشط');
    }

    bot.socket.emit('publicMessage', {
      content,
      roomId: room || bot.currentRoom
    });

    bot.messageCount++;
    bot.lastActivity = new Date();
  }

  async moveBotToRoom(botId: string, room: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot || !bot.isActive) {
      throw new Error('البوت غير موجود أو غير نشط');
    }

    if (bot.currentRoom === room) {
      return;
    }

    bot.socket.emit('leaveRoom', { roomId: bot.currentRoom });
    bot.socket.emit('joinRoom', { roomId: room });
    
    bot.currentRoom = room;
    bot.roomHistory.push(room);
  }

  executeCommand(command: string, params?: any): void {
    switch (command) {
      case 'START_ALL':
        this.start();
        break;
      case 'STOP_ALL':
        this.stop();
        break;
      case 'RANDOM_MOVEMENT':
        this.randomMovement();
        break;
      case 'INCREASE_ACTIVITY':
        this.adjustActivity(0.1);
        break;
      case 'DECREASE_ACTIVITY':
        this.adjustActivity(-0.1);
        break;
      default:
        logger.warn(`أمر غير معروف: ${command}`);
    }
  }

  private randomMovement(): void {
    const activeBots = Array.from(this.bots.values()).filter(b => b.isActive);
    const numToMove = Math.floor(activeBots.length * 0.3); // 30% من البوتات

    for (let i = 0; i < numToMove; i++) {
      const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
      this.moveToRandomRoom(bot);
    }
  }

  private adjustActivity(change: number): void {
    for (const bot of this.bots.values()) {
      bot.profile.activityLevel = Math.max(0.1, Math.min(0.9, bot.profile.activityLevel + change));
    }
  }
}
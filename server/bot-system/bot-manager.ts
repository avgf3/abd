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

    // إنشاء البوتات بشكل تدريجي
    await this.createBotsGradually();

    // بدء دورة الصيانة
    this.startMaintenanceCycle();

    logger.info(`تم تشغيل ${this.bots.size} بوت بنجاح`);
  }

  private async createBotsGradually(): Promise<void> {
    const totalBots = this.config.totalBots;
    const batchSize = 10; // إنشاء 10 بوتات في كل دفعة
    const delayBetweenBatches = 5000; // 5 ثواني بين كل دفعة

    for (let i = 0; i < totalBots; i += batchSize) {
      const currentBatch = Math.min(batchSize, totalBots - i);
      const promises = [];

      for (let j = 0; j < currentBatch; j++) {
        const botIndex = i + j;
        const isOwner = botIndex < this.config.ownerBots;
        promises.push(this.createBot(isOwner));
      }

      await Promise.all(promises);

      // تأخير بين الدفعات لتجنب الضغط على الخادم
      if (i + batchSize < totalBots) {
        await this.delay(delayBetweenBatches);
      }
    }
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

    } catch (error) {
      logger.error(`فشل إنشاء البوت: ${error}`);
    }
  }

  private async connectBot(profile: BotProfile): Promise<Socket> {
    const socket = io(this.config.serverUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: await this.generateBotToken(profile)
      },
      query: {
        username: profile.username,
        deviceId: profile.deviceId,
        userAgent: profile.userAgent
      },
      reconnection: true,
      reconnectionDelay: 3000 + Math.random() * 2000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        logger.debug(`البوت ${profile.username} اتصل بنجاح`);
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        logger.error(`فشل اتصال البوت ${profile.username}: ${error}`);
        reject(error);
      });

      // تطبيق معالجات الأحداث
      this.setupBotEventHandlers(socket, profile);
    });
  }

  private setupBotEventHandlers(socket: Socket, profile: BotProfile): void {
    const botId = profile.id;

    socket.on('message', (data) => {
      const bot = this.bots.get(botId);
      if (bot && this.behavior.shouldReactToMessage(bot, data)) {
        this.scheduleBotReaction(bot, data);
      }
    });

    socket.on('userJoined', (data) => {
      const bot = this.bots.get(botId);
      if (bot && this.behavior.shouldWelcomeUser(bot, data)) {
        this.scheduleWelcomeMessage(bot, data.username);
      }
    });

    socket.on('disconnect', () => {
      logger.warn(`البوت ${profile.username} انقطع الاتصال`);
      this.handleBotDisconnection(botId);
    });
  }

  private async scheduleBotReaction(bot: BotState, messageData: any): Promise<void> {
    // تأخير عشوائي لمحاكاة وقت القراءة والكتابة
    const readingTime = this.behavior.calculateReadingTime(messageData.content);
    await this.delay(readingTime);

    // محاكاة الكتابة
    if (Math.random() < 0.7) { // 70% احتمال إظهار حالة الكتابة
      await this.simulateTyping(bot);
    }

    // إرسال رد
    const response = await this.behavior.generateResponse(bot, messageData);
    if (response) {
      this.sendMessage(bot, response);
    }
  }

  private async simulateTyping(bot: BotState): Promise<void> {
    bot.socket.emit('typing', { room: bot.currentRoom, isTyping: true });
    bot.typingState = true;

    // مدة الكتابة العشوائية
    const typingDuration = 2000 + Math.random() * 3000;
    await this.delay(typingDuration);

    bot.socket.emit('typing', { room: bot.currentRoom, isTyping: false });
    bot.typingState = false;
  }

  private sendMessage(bot: BotState, content: string): void {
    bot.socket.emit('message', {
      room: bot.currentRoom,
      content,
      timestamp: new Date()
    });

    bot.messageCount++;
    bot.lastActivity = new Date();
  }

  private async scheduleWelcomeMessage(bot: BotState, newUsername: string): Promise<void> {
    // تأخير عشوائي قبل الترحيب
    const delay = 3000 + Math.random() * 5000;
    await this.delay(delay);

    const welcomeMessage = this.behavior.generateWelcomeMessage(newUsername);
    if (welcomeMessage) {
      this.sendMessage(bot, welcomeMessage);
    }
  }

  private startMaintenanceCycle(): void {
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance();
    }, 60000); // كل دقيقة
  }

  private async performMaintenance(): Promise<void> {
    const now = new Date();

    for (const [botId, bot] of this.bots) {
      // إعادة الاتصال للبوتات المنقطعة
      if (!bot.socket.connected) {
        await this.reconnectBot(bot);
        continue;
      }

      // تحريك البوتات غير النشطة
      const inactiveTime = now.getTime() - bot.lastActivity.getTime();
      if (inactiveTime > 300000) { // 5 دقائق
        await this.behavior.performIdleAction(bot);
      }

      // تغيير الغرف بشكل عشوائي
      if (Math.random() < 0.05) { // 5% احتمال
        await this.moveToRandomRoom(bot);
      }
    }
  }

  private async reconnectBot(bot: BotState): Promise<void> {
    bot.connectionAttempts++;
    
    if (bot.connectionAttempts > 5) {
      logger.error(`تجاوز البوت ${bot.profile.username} محاولات إعادة الاتصال`);
      this.bots.delete(bot.id);
      return;
    }

    try {
      const newSocket = await this.connectBot(bot.profile);
      bot.socket = newSocket;
      bot.connectionAttempts = 0;
      logger.info(`تمت إعادة اتصال البوت ${bot.profile.username}`);
    } catch (error) {
      logger.error(`فشلت إعادة اتصال البوت ${bot.profile.username}`);
    }
  }

  private async moveToRandomRoom(bot: BotState): Promise<void> {
    const availableRooms = await this.getAvailableRooms();
    const otherRooms = availableRooms.filter(room => room !== bot.currentRoom);
    
    if (otherRooms.length === 0) return;

    const newRoom = otherRooms[Math.floor(Math.random() * otherRooms.length)];
    
    // مغادرة الغرفة الحالية
    bot.socket.emit('leaveRoom', { room: bot.currentRoom });
    
    // الانضمام للغرفة الجديدة
    bot.socket.emit('joinRoom', { room: newRoom });
    
    bot.currentRoom = newRoom;
    bot.roomHistory.push(newRoom);
    
    logger.debug(`البوت ${bot.profile.username} انتقل إلى ${newRoom}`);
  }

  private async getAvailableRooms(): Promise<string[]> {
    // يمكن استبدال هذا بطلب حقيقي للخادم
    return ['general', 'games', 'tech', 'music', 'sports', 'movies', 'food', 'travel'];
  }

  private async generateBotToken(profile: BotProfile): Promise<string> {
    // توليد رمز مصادقة للبوت
    const payload = {
      id: profile.id,
      username: profile.username,
      type: profile.isOwner ? 'owner' : 'member',
      isBot: true, // سيتم إخفاء هذا في الإنتاج
      timestamp: Date.now()
    };

    // في الإنتاج، استخدم JWT حقيقي
    return Buffer.from(JSON.stringify(payload)).toString('base64');
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

  async stop(): void {
    logger.info('إيقاف نظام البوتات...');
    
    this.isRunning = false;
    
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }

    // قطع اتصال جميع البوتات
    for (const bot of this.bots.values()) {
      bot.socket.disconnect();
    }

    this.bots.clear();
    logger.info('تم إيقاف نظام البوتات');
  }

  // واجهة التحكم للأونرز
  getActiveBots(): BotState[] {
    return Array.from(this.bots.values()).filter(bot => bot.isActive);
  }

  getBotById(id: string): BotState | undefined {
    return this.bots.get(id);
  }

  async sendBotMessage(botId: string, message: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (bot && bot.isActive) {
      this.sendMessage(bot, message);
    }
  }

  async moveBotToRoom(botId: string, room: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (bot && bot.isActive) {
      bot.socket.emit('leaveRoom', { room: bot.currentRoom });
      bot.socket.emit('joinRoom', { room });
      bot.currentRoom = room;
    }
  }
}
import { Request, Response, Router } from 'express';
import { BotManager } from './bot-manager';
import { BotCommand } from './types';
import { logger } from './logger';
import crypto from 'crypto';

// مفتاح سري للتحكم بالبوتات (يجب تغييره في الإنتاج)
const OWNER_SECRET_KEY = process.env.BOT_OWNER_KEY || crypto.randomBytes(32).toString('hex');

export class OwnerControlPanel {
  private botManager: BotManager;
  private router: Router;
  private accessTokens: Map<string, { userId: string; expires: Date }> = new Map();

  constructor(botManager: BotManager) {
    this.botManager = botManager;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Middleware للتحقق من الصلاحيات
    this.router.use(this.authenticateOwner.bind(this));

    // عرض حالة البوتات
    this.router.get('/status', this.getBotStatus.bind(this));

    // عرض قائمة البوتات
    this.router.get('/bots', this.listBots.bind(this));

    // التحكم في بوت محدد
    this.router.get('/bots/:botId', this.getBotDetails.bind(this));
    
    // إرسال رسالة من بوت
    this.router.post('/bots/:botId/message', this.sendBotMessage.bind(this));
    
    // نقل بوت لغرفة
    this.router.post('/bots/:botId/move', this.moveBotToRoom.bind(this));
    
    // تنفيذ أمر عام
    this.router.post('/command', this.executeCommand.bind(this));
    
    // إحصائيات
    this.router.get('/analytics', this.getAnalytics.bind(this));
  }

  private authenticateOwner(req: Request, res: Response, next: Function): void {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'رمز المصادقة مطلوب' });
    }

    const tokenData = this.accessTokens.get(token);
    
    if (!tokenData || tokenData.expires < new Date()) {
      return res.status(401).json({ error: 'رمز مصادقة غير صالح أو منتهي' });
    }

    // تحقق إضافي من أن المستخدم أونر
    req['userId'] = tokenData.userId;
    next();
  }

  private async getBotStatus(req: Request, res: Response): Promise<void> {
    try {
      const bots = this.botManager.getActiveBots();
      const status = {
        totalBots: bots.length,
        activeBots: bots.filter(b => b.isActive).length,
        ownerBots: bots.filter(b => b.profile.isOwner).length,
        roomDistribution: this.getRoomDistribution(bots),
        serverTime: new Date()
      };

      res.json(status);
    } catch (error) {
      logger.error('خطأ في جلب حالة البوتات', error);
      res.status(500).json({ error: 'فشل جلب حالة البوتات' });
    }
  }

  private async listBots(req: Request, res: Response): Promise<void> {
    try {
      const bots = this.botManager.getActiveBots();
      const simplifiedBots = bots.map(bot => ({
        id: bot.id,
        username: bot.profile.username,
        displayName: bot.profile.displayName,
        currentRoom: bot.currentRoom,
        isActive: bot.isActive,
        isOwner: bot.profile.isOwner,
        messageCount: bot.messageCount,
        lastActivity: bot.lastActivity
      }));

      res.json(simplifiedBots);
    } catch (error) {
      logger.error('خطأ في جلب قائمة البوتات', error);
      res.status(500).json({ error: 'فشل جلب قائمة البوتات' });
    }
  }

  private async getBotDetails(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const bot = this.botManager.getBotById(botId);

      if (!bot) {
        return res.status(404).json({ error: 'البوت غير موجود' });
      }

      // إخفاء بعض المعلومات الحساسة
      const safeBot = {
        id: bot.id,
        profile: {
          username: bot.profile.username,
          displayName: bot.profile.displayName,
          bio: bot.profile.bio,
          location: bot.profile.location,
          interests: bot.profile.interests,
          personality: bot.profile.personality
        },
        currentRoom: bot.currentRoom,
        isActive: bot.isActive,
        messageCount: bot.messageCount,
        lastActivity: bot.lastActivity,
        roomHistory: bot.roomHistory.slice(-10), // آخر 10 غرف
        statistics: bot.statistics
      };

      res.json({ success: true, data: safeBot });
    } catch (error) {
      logger.error('خطأ في جلب تفاصيل البوت', error);
      res.status(500).json({ error: 'فشل جلب تفاصيل البوت' });
    }
  }

  private async sendBotMessage(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'الرسالة مطلوبة' });
      }

      await this.botManager.sendBotMessage(botId, message);
      
      res.json({ success: true, message: 'تم إرسال الرسالة' });
    } catch (error) {
      logger.error('خطأ في إرسال رسالة البوت', error);
      res.status(500).json({ error: 'فشل إرسال الرسالة' });
    }
  }

  private async moveBotToRoom(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const { room } = req.body;

      if (!room || typeof room !== 'string') {
        return res.status(400).json({ error: 'اسم الغرفة مطلوب' });
      }

      await this.botManager.moveBotToRoom(botId, room);
      
      res.json({ success: true, message: 'تم نقل البوت للغرفة' });
    } catch (error) {
      logger.error('خطأ في نقل البوت', error);
      res.status(500).json({ error: 'فشل نقل البوت' });
    }
  }

  private async executeCommand(req: Request, res: Response): Promise<void> {
    try {
      const command: BotCommand = req.body;

      // قائمة الأوامر المتاحة
      switch (command.command) {
        case 'start_all':
          await this.botManager.start();
          break;
          
        case 'stop_all':
          await this.botManager.stop();
          break;
          
        case 'restart':
          await this.botManager.stop();
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.botManager.start();
          break;
          
        case 'move_random':
          // نقل عدد من البوتات لغرف عشوائية
          const count = command.params?.count || 10;
          await this.moveRandomBots(count);
          break;
          
        default:
          return res.status(400).json({ error: 'أمر غير معروف' });
      }

      res.json({ success: true, message: 'تم تنفيذ الأمر' });
    } catch (error) {
      logger.error('خطأ في تنفيذ الأمر', error);
      res.status(500).json({ error: 'فشل تنفيذ الأمر' });
    }
  }

  private async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const bots = this.botManager.getActiveBots();
      
      const analytics = {
        totalBots: bots.length,
        activeBots: bots.filter(b => b.isActive).length,
        totalMessages: bots.reduce((sum, bot) => sum + bot.messageCount, 0),
        averageMessagesPerBot: bots.length > 0 ? 
          bots.reduce((sum, bot) => sum + bot.messageCount, 0) / bots.length : 0,
        roomDistribution: this.getRoomDistribution(bots),
        activityByHour: this.getActivityByHour(bots),
        topActiveBots: this.getTopActiveBots(bots, 10)
      };

      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error('خطأ في جلب الإحصائيات', error);
      res.status(500).json({ error: 'فشل جلب الإحصائيات' });
    }
  }

  private getRoomDistribution(bots: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    bots.forEach(bot => {
      const room = bot.currentRoom || 'none';
      distribution[room] = (distribution[room] || 0) + 1;
    });
    
    return distribution;
  }

  private getActivityByHour(bots: any[]): number[] {
    const hourlyActivity = new Array(24).fill(0);
    const now = new Date();
    
    bots.forEach(bot => {
      if (bot.lastActivity) {
        const hour = new Date(bot.lastActivity).getHours();
        hourlyActivity[hour]++;
      }
    });
    
    return hourlyActivity;
  }

  private getTopActiveBots(bots: any[], limit: number): any[] {
    return bots
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit)
      .map(bot => ({
        username: bot.profile.username,
        messageCount: bot.messageCount,
        currentRoom: bot.currentRoom
      }));
  }

  private async moveRandomBots(count: number): Promise<void> {
    const bots = this.botManager.getActiveBots();
    const rooms = ['general', 'games', 'tech', 'music', 'sports'];
    
    for (let i = 0; i < Math.min(count, bots.length); i++) {
      const bot = bots[Math.floor(Math.random() * bots.length)];
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      
      await this.botManager.moveBotToRoom(bot.id, room);
      
      // تأخير صغير بين الحركات
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // توليد رمز وصول للأونر
  generateAccessToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // صالح لمدة 24 ساعة
    
    this.accessTokens.set(token, { userId, expires });
    
    // تنظيف الرموز المنتهية
    this.cleanExpiredTokens();
    
    return token;
  }

  private cleanExpiredTokens(): void {
    const now = new Date();
    
    for (const [token, data] of this.accessTokens.entries()) {
      if (data.expires < now) {
        this.accessTokens.delete(token);
      }
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
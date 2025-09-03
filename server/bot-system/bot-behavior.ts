import { BotState } from './types';
import { conversationPatterns, arabicPhrases, reactionEmojis } from './conversation-data';
import { logger } from './logger';

export class BotBehavior {
  private personalityTraits = {
    friendly: ['مرح', 'ودود', 'متعاون', 'إيجابي'],
    neutral: ['هادئ', 'متوازن', 'عادي', 'بسيط'],
    active: ['نشيط', 'متحمس', 'كثير الكلام', 'فضولي'],
    quiet: ['خجول', 'قليل الكلام', 'مستمع', 'متحفظ']
  };

  async initializeBotBehavior(bot: BotState): Promise<void> {
    // تحديد شخصية البوت
    const personalities = Object.keys(this.personalityTraits);
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    bot.profile.personality = personality;

    // تحديد مستوى النشاط
    bot.profile.activityLevel = Math.random();
    
    // تحديد الاهتمامات
    bot.profile.interests = this.generateInterests();

    logger.debug(`تم تهيئة شخصية البوت ${bot.profile.username}: ${personality}`);
  }

  private generateInterests(): string[] {
    const allInterests = [
      'الرياضة', 'الألعاب', 'الأفلام', 'الموسيقى', 'التقنية',
      'السفر', 'الطبخ', 'القراءة', 'الفن', 'التصوير',
      'البرمجة', 'الأنمي', 'كرة القدم', 'الأخبار', 'السيارات'
    ];

    const numInterests = 2 + Math.floor(Math.random() * 4); // 2-5 اهتمامات
    const interests: string[] = [];

    while (interests.length < numInterests) {
      const interest = allInterests[Math.floor(Math.random() * allInterests.length)];
      if (!interests.includes(interest)) {
        interests.push(interest);
      }
    }

    return interests;
  }

  shouldReactToMessage(bot: BotState, messageData: any): boolean {
    // التحقق من وجود البيانات المطلوبة
    if (!messageData || !messageData.content) {
      return false;
    }
    
    // لا يرد البوت على رسائله
    if (messageData.username === bot.profile.username) {
      return false;
    }

    // احتمالية الرد بناءً على الشخصية
    const reactionChance = this.getReactionChance(bot);
    
    // زيادة الاحتمالية إذا تم ذكر اسم البوت
    const mentionedBot = messageData.content.includes(bot.profile.username);
    const finalChance = mentionedBot ? Math.min(reactionChance + 0.5, 0.9) : reactionChance;

    return Math.random() < finalChance;
  }

  private getReactionChance(bot: BotState): number {
    switch (bot.profile.personality) {
      case 'active': return 0.4;
      case 'friendly': return 0.3;
      case 'neutral': return 0.2;
      case 'quiet': return 0.1;
      default: return 0.2;
    }
  }

  calculateReadingTime(content: string): number {
    // حساب وقت القراءة بناءً على طول الرسالة
    const wordsPerMinute = 200;
    const words = content.split(' ').length;
    const readingTime = (words / wordsPerMinute) * 60 * 1000; // بالميلي ثانية
    
    // إضافة عشوائية
    const variance = 0.3;
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    
    return Math.max(500, Math.min(readingTime * randomFactor, 5000));
  }

  async generateResponse(bot: BotState, messageData: any): Promise<string | null> {
    const messageContent = messageData.content.toLowerCase();
    
    // البحث عن نمط محادثة مناسب
    for (const pattern of conversationPatterns) {
      for (const trigger of pattern.triggers) {
        if (messageContent.includes(trigger)) {
          return this.selectResponse(pattern.responses, bot);
        }
      }
    }

    // رد عام إذا لم يجد نمط محدد
    if (Math.random() < 0.3) {
      return this.generateGenericResponse(bot);
    }

    // أحياناً يرد بإيموجي فقط
    if (Math.random() < 0.15) {
      return this.selectRandomEmoji();
    }

    return null;
  }

  private selectResponse(responses: string[], bot: BotState): string {
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // إضافة إيموجي أحياناً
    if (Math.random() < 0.3) {
      return response + ' ' + this.selectRandomEmoji();
    }
    
    return response;
  }

  private generateGenericResponse(bot: BotState): string {
    const genericResponses = [
      'ممتاز',
      'صح كلامك',
      'الله يعطيك العافية',
      'تمام',
      'معك حق',
      'إن شاء الله',
      'ماشي',
      'أوكي'
    ];

    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  }

  private selectRandomEmoji(): string {
    const allEmojis = Object.values(reactionEmojis).flat();
    return allEmojis[Math.floor(Math.random() * allEmojis.length)];
  }

  generateWelcomeMessage(newUsername: string): string | null {
    // احتمالية الترحيب بناءً على الشخصية
    const welcomeChance = this.getWelcomeChance();
    
    if (Math.random() > welcomeChance) {
      return null;
    }

    const welcomeMessages = [
      `أهلاً وسهلاً ${newUsername} 👋`,
      `مرحباً ${newUsername}، نورت`,
      `هلا ${newUsername} 😊`,
      `حياك الله ${newUsername}`,
      `تشرفنا ${newUsername}`,
      `منور يا ${newUsername}`,
      `الله يحييك ${newUsername} ❤️`
    ];

    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  }

  private getWelcomeChance(): number {
    // البوتات الودودة والنشطة أكثر احتمالاً للترحيب
    return Math.random() * 0.4; // 0-40% احتمالية
  }

  shouldWelcomeUser(bot: BotState, userData: any): boolean {
    // لا يرحب بنفسه
    if (userData.username === bot.profile.username) {
      return false;
    }

    // البوتات الودودة أكثر احتمالاً للترحيب
    const personality = bot.profile.personality;
    const baseChance = personality === 'friendly' ? 0.5 : 0.2;

    return Math.random() < baseChance;
  }

  async performIdleAction(bot: BotState): Promise<void> {
    const actions = [
      () => this.sendIdleMessage(bot),
      () => this.changeStatus(bot),
      () => this.reactToRecentMessage(bot),
      () => {} // لا يفعل شيء
    ];

    const action = actions[Math.floor(Math.random() * actions.length)];
    await action();
  }

  private async sendIdleMessage(bot: BotState): Promise<void> {
    const idleMessages = [
      'كيف الحال؟',
      'وين الشباب؟',
      'هدوء مشبوه 🤔',
      'أحد هنا؟',
      'السلام عليكم',
      'كيفكم يا جماعة',
      'ايش الأخبار؟',
      'في أحد فاضي للدردشة؟'
    ];

    const message = idleMessages[Math.floor(Math.random() * idleMessages.length)];
    
    bot.socket.emit('message', {
      room: bot.currentRoom,
      content: message,
      timestamp: new Date()
    });

    bot.lastActivity = new Date();
    bot.messageCount++;
  }

  private async changeStatus(bot: BotState): Promise<void> {
    const statuses = [
      'متصل',
      'مشغول',
      'بعيد',
      'في اجتماع',
      'استراحة قهوة ☕',
      'أشاهد نتفليكس 📺',
      'ألعب 🎮',
      'أدرس 📚'
    ];

    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    bot.socket.emit('updateStatus', {
      status: newStatus
    });
  }

  private async reactToRecentMessage(bot: BotState): Promise<void> {
    // يمكن تطوير هذا لإضافة ردود فعل على آخر رسالة
    const reactions = ['👍', '❤️', '😂', '😮', '🤔', '👏'];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    
    // إرسال رد فعل (يحتاج تطبيق في النظام الأساسي)
    bot.socket.emit('reaction', {
      emoji: reaction,
      timestamp: new Date()
    });
  }

  // توليد محتوى ديناميكي
  generateDynamicContent(bot: BotState, context: string): string {
    const templates = {
      gaming: [
        'أحد يلعب {game}؟',
        'مين جرب {game} الجديدة؟',
        'أبحث عن فريق لـ {game}',
        '{game} أفضل لعبة هالسنة!'
      ],
      sports: [
        'شفتوا مباراة {team} أمس؟',
        '{team} راح يفوز إن شاء الله',
        'متى مباراة {team} القادمة؟',
        'أتوقع {team} بطل هالموسم'
      ],
      general: [
        'الجو {weather} اليوم',
        'بكرة {day}، وش المخططات؟',
        'أحد جرب {food}؟ طعمه رهيب',
        'أفضل {thing} عندي هو {item}'
      ]
    };

    const games = ['FIFA', 'Call of Duty', 'Fortnite', 'PUBG', 'Valorant'];
    const teams = ['الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'برشلونة', 'ريال مدريد'];
    const weather = ['حار', 'بارد', 'ممطر', 'جميل', 'معتدل'];
    const days = ['الجمعة', 'السبت', 'الأحد', 'الاثنين'];
    const foods = ['الكبسة', 'البرجر', 'البيتزا', 'الشاورما', 'المندي'];
    const things = ['قهوة', 'وقت', 'مكان', 'فيلم', 'مسلسل'];
    const items = ['الصباح', 'المساء', 'النوم', 'القراءة', 'السفر'];

    // اختيار قالب بناءً على السياق واهتمامات البوت
    let templateCategory = 'general';
    if (bot.profile.interests.includes('الألعاب')) templateCategory = 'gaming';
    else if (bot.profile.interests.includes('الرياضة')) templateCategory = 'sports';

    const categoryTemplates = templates[templateCategory] || templates.general;
    let template = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];

    // استبدال المتغيرات
    template = template.replace('{game}', games[Math.floor(Math.random() * games.length)]);
    template = template.replace('{team}', teams[Math.floor(Math.random() * teams.length)]);
    template = template.replace('{weather}', weather[Math.floor(Math.random() * weather.length)]);
    template = template.replace('{day}', days[Math.floor(Math.random() * days.length)]);
    template = template.replace('{food}', foods[Math.floor(Math.random() * foods.length)]);
    template = template.replace('{thing}', things[Math.floor(Math.random() * things.length)]);
    template = template.replace('{item}', items[Math.floor(Math.random() * items.length)]);

    return template;
  }
}
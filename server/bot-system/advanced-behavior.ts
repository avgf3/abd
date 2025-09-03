import { BotState } from './types';
import { logger } from './logger';

export class AdvancedBehavior {
  // نماذج اللغة الطبيعية
  private typoPatterns = [
    { correct: 'السلام عليكم', typos: ['السلام عليكم', 'السلا معليكم', 'السلام عليكمم'] },
    { correct: 'كيف حالك', typos: ['كيف حالك', 'كيفحالك', 'كيف حاللك'] },
    { correct: 'ان شاء الله', typos: ['انشاء الله', 'ان شاءالله', 'انشالله'] },
    { correct: 'ما شاء الله', typos: ['ماشاء الله', 'ماشاءالله', 'ماشالله'] }
  ];

  // أوقات الذروة للنشاط
  private peakHours = {
    morning: { start: 9, end: 12 },
    afternoon: { start: 14, end: 17 },
    evening: { start: 19, end: 23 }
  };

  // محاكاة الأخطاء البشرية
  introduceTypos(message: string, errorRate: number = 0.05): string {
    if (Math.random() > errorRate) return message;

    const words = message.split(' ');
    const wordIndex = Math.floor(Math.random() * words.length);
    const word = words[wordIndex];

    // نوع الخطأ
    const errorType = Math.random();
    
    if (errorType < 0.4) {
      // تكرار حرف
      const charIndex = Math.floor(Math.random() * word.length);
      words[wordIndex] = word.slice(0, charIndex) + word[charIndex] + word.slice(charIndex);
    } else if (errorType < 0.7) {
      // حذف حرف
      if (word.length > 2) {
        const charIndex = Math.floor(Math.random() * word.length);
        words[wordIndex] = word.slice(0, charIndex) + word.slice(charIndex + 1);
      }
    } else {
      // تبديل حرفين متجاورين
      if (word.length > 2) {
        const charIndex = Math.floor(Math.random() * (word.length - 1));
        const chars = word.split('');
        [chars[charIndex], chars[charIndex + 1]] = [chars[charIndex + 1], chars[charIndex]];
        words[wordIndex] = chars.join('');
      }
    }

    return words.join(' ');
  }

  // محاكاة سرعة الكتابة البشرية
  calculateTypingDuration(message: string, wordsPerMinute: number = 40): number {
    const arabicCharsPerWord = 5;
    const charCount = message.length;
    const baseTime = (charCount / arabicCharsPerWord / wordsPerMinute) * 60 * 1000;
    
    // إضافة تباين طبيعي (±30%)
    const variance = 0.3;
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    
    // محاكاة التوقفات للتفكير
    const thinkingPauses = Math.floor(Math.random() * 3) * 1000;
    
    return Math.max(1000, baseTime * randomFactor + thinkingPauses);
  }

  // تحديد مستوى النشاط بناءً على الوقت
  getActivityLevel(bot: BotState): number {
    const hour = new Date().getHours();
    const baseLevel = bot.profile.activityLevel || 0.5;
    
    // زيادة النشاط في أوقات الذروة
    if (this.isInPeakHour(hour)) {
      return Math.min(1, baseLevel * 1.5);
    }
    
    // تقليل النشاط في الأوقات الهادئة
    if (hour < 6 || hour > 23) {
      return baseLevel * 0.3;
    }
    
    return baseLevel;
  }

  private isInPeakHour(hour: number): boolean {
    return Object.values(this.peakHours).some(
      period => hour >= period.start && hour <= period.end
    );
  }

  // محاكاة أنماط المحادثة الطبيعية
  generateConversationFlow(bot: BotState, context: any): string[] {
    const messages: string[] = [];
    
    // بداية المحادثة
    if (!context.lastMessages || context.lastMessages.length === 0) {
      messages.push(this.generateConversationStarter(bot));
    }
    
    // متابعة المحادثة
    if (Math.random() < 0.3) {
      messages.push(this.generateFollowUp(context));
    }
    
    // إضافة رأي شخصي
    if (Math.random() < 0.2) {
      messages.push(this.generatePersonalOpinion(bot));
    }
    
    return messages;
  }

  private generateConversationStarter(bot: BotState): string {
    const starters = [
      'السلام عليكم جميعاً',
      'كيف الحال يا شباب؟',
      'مساء الخير على الجميع',
      'أهلاً وسهلاً',
      'تحية طيبة للجميع'
    ];
    
    return starters[Math.floor(Math.random() * starters.length)];
  }

  private generateFollowUp(context: any): string {
    const followUps = [
      'وانت كيف رأيك؟',
      'صح كلامك',
      'معك حق في هذا',
      'نقطة مهمة',
      'ممكن توضح أكثر؟'
    ];
    
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  private generatePersonalOpinion(bot: BotState): string {
    const opinions = [
      'من وجهة نظري...',
      'أعتقد أن...',
      'في رأيي الشخصي...',
      'حسب تجربتي...',
      'الذي أراه...'
    ];
    
    const opinion = opinions[Math.floor(Math.random() * opinions.length)];
    return opinion + ' ' + this.generateOpinionContent(bot);
  }

  private generateOpinionContent(bot: BotState): string {
    const interests = bot.profile.interests || [];
    const contents = [
      'الموضوع يحتاج دراسة أعمق',
      'هناك جوانب إيجابية وسلبية',
      'المهم هو التوازن في كل شيء',
      'التجربة خير برهان',
      'لكل شخص ظروفه الخاصة'
    ];
    
    return contents[Math.floor(Math.random() * contents.length)];
  }

  // محاكاة التفاعل العاطفي
  generateEmotionalResponse(sentiment: string): string {
    const responses = {
      positive: [
        'ما شاء الله، خبر سعيد! 😊',
        'الله يبارك فيك ويسعدك',
        'فرحت لك والله ❤️',
        'يستاهل كل خير 🌟'
      ],
      negative: [
        'الله يصبرك ويفرج همك',
        'لا تحزن، الفرج قريب إن شاء الله',
        'ربنا يعوضك خير',
        'كلها أمور وتعدي بإذن الله'
      ],
      neutral: [
        'الله يوفقك',
        'إن شاء الله خير',
        'الأمور تتحسن بإذن الله',
        'خذ وقتك في التفكير'
      ]
    };
    
    const sentimentResponses = responses[sentiment] || responses.neutral;
    return sentimentResponses[Math.floor(Math.random() * sentimentResponses.length)];
  }

  // محاكاة الذاكرة قصيرة المدى
  updateConversationMemory(bot: BotState, message: any): void {
    if (!bot.conversationContext) {
      bot.conversationContext = {
        lastMessages: [],
        currentTopic: undefined,
        engagedWith: []
      };
    }
    
    // حفظ آخر 10 رسائل
    bot.conversationContext.lastMessages.push({
      username: message.username,
      content: message.content,
      timestamp: new Date()
    });
    
    if (bot.conversationContext.lastMessages.length > 10) {
      bot.conversationContext.lastMessages.shift();
    }
    
    // تحديث قائمة المتفاعلين
    if (!bot.conversationContext.engagedWith.includes(message.username)) {
      bot.conversationContext.engagedWith.push(message.username);
    }
  }

  // محاكاة أنماط النوم والاستيقاظ
  shouldBeActive(bot: BotState): boolean {
    const hour = new Date().getHours();
    const personality = bot.profile.personality;
    
    // البوتات النشطة تنام أقل
    if (personality === 'active') {
      return hour >= 6 && hour <= 2; // نشط معظم اليوم
    }
    
    // البوتات الهادئة تنام مبكراً
    if (personality === 'quiet') {
      return hour >= 8 && hour <= 22;
    }
    
    // البقية لديهم نمط نوم عادي
    return hour >= 7 && hour <= 24;
  }

  // توليد اهتمامات ديناميكية بناءً على المحادثات
  updateInterests(bot: BotState, topic: string): void {
    if (!bot.profile.interests) {
      bot.profile.interests = [];
    }
    
    // إضافة اهتمام جديد إذا تكرر الموضوع
    if (!bot.profile.interests.includes(topic)) {
      if (Math.random() < 0.3) { // 30% احتمالية تطوير اهتمام جديد
        bot.profile.interests.push(topic);
        logger.debug(`البوت ${bot.profile.username} طور اهتماماً بـ ${topic}`);
      }
    }
  }

  // محاكاة التعب والإرهاق
  calculateFatigue(bot: BotState): number {
    const messageRate = bot.messageCount / ((Date.now() - bot.profile.joinDate.getTime()) / 3600000);
    const fatigue = Math.min(1, messageRate / 50); // التعب يزيد مع معدل الرسائل
    
    return fatigue;
  }

  // تحديد نوع الرد بناءً على السياق
  determineResponseType(bot: BotState, message: any): 'text' | 'emoji' | 'mixed' | 'none' {
    const fatigue = this.calculateFatigue(bot);
    
    // البوتات المتعبة ترد بإيموجي أكثر
    if (fatigue > 0.7 && Math.random() < 0.5) {
      return 'emoji';
    }
    
    // الردود المختلطة للبوتات النشطة
    if (bot.profile.personality === 'active' && Math.random() < 0.3) {
      return 'mixed';
    }
    
    // البوتات الهادئة قد لا ترد
    if (bot.profile.personality === 'quiet' && Math.random() < 0.4) {
      return 'none';
    }
    
    return 'text';
  }
}
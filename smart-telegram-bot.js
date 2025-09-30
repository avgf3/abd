const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.telegram' });

// إعدادات البوت
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;

if (!BOT_TOKEN || !OWNER_ID) {
  console.error('❌ يجب تعيين TELEGRAM_BOT_TOKEN و OWNER_TELEGRAM_ID في ملف .env.telegram');
  process.exit(1);
}

// ملفات البيانات
const SESSIONS_FILE = path.join(__dirname, 'data', 'telegram-sessions.json');
const STATS_FILE = path.join(__dirname, 'data', 'telegram-stats.json');
const DATA_DIR = path.join(__dirname, 'data');

class SmartTelegramBot {
  constructor() {
    this.bot = new TelegramBot(BOT_TOKEN, { polling: true });
    this.sessions = this.loadSessions();
    this.stats = this.loadStats();
    this.currentConversation = null; // للمحادثة النشطة مع المالك
    
    // إنشاء مجلد البيانات
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    this.setupEventHandlers();
    this.initializeBot();
  }

  // تهيئة البوت
  async initializeBot() {
    try {
      const botInfo = await this.bot.getMe();
      console.log(`🤖 البوت يعمل الآن: @${botInfo.username}`);
      console.log(`👑 معرف المالك: ${OWNER_ID}`);
      console.log('🚀 جاهز لاستقبال الرسائل!');
      
      // إرسال إشعار للمالك ببدء البوت
      await this.bot.sendMessage(OWNER_ID, `
🚀 **البوت يعمل الآن!**

🤖 **اسم البوت:** @${botInfo.username}
⏰ **وقت البدء:** ${new Date().toLocaleString('ar-EG')}
📊 **الإحصائيات:**
• المستخدمين المسجلين: ${Object.keys(this.sessions).length}
• إجمالي الرسائل: ${this.stats.totalMessages || 0}

البوت جاهز لاستقبال الرسائل! ✨
      `, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('خطأ في تهيئة البوت:', error);
    }
  }

  // تحميل الجلسات
  loadSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      }
    } catch (error) {
      console.error('خطأ في تحميل الجلسات:', error);
    }
    return {};
  }

  // تحميل الإحصائيات
  loadStats() {
    try {
      if (fs.existsSync(STATS_FILE)) {
        return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
      }
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
    return {
      totalMessages: 0,
      totalUsers: 0,
      messagesPerDay: {},
      startDate: new Date().toISOString()
    };
  }

  // حفظ البيانات
  saveData() {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(this.sessions, null, 2));
      fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
    }
  }

  // تحديث الإحصائيات
  updateStats(type, userId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.stats.messagesPerDay[today]) {
      this.stats.messagesPerDay[today] = 0;
    }
    
    switch (type) {
      case 'message':
        this.stats.totalMessages++;
        this.stats.messagesPerDay[today]++;
        break;
      case 'new_user':
        this.stats.totalUsers++;
        break;
    }
    
    this.saveData();
  }

  // إعداد معالجات الأحداث
  setupEventHandlers() {
    // الرسائل النصية
    this.bot.on('message', (msg) => this.handleMessage(msg));
    
    // الأخطاء
    this.bot.on('error', (error) => console.error('خطأ في البوت:', error));
    
    // الأوامر
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/stats/, (msg) => this.handleStats(msg));
    this.bot.onText(/\/sessions/, (msg) => this.handleShowSessions(msg));
    this.bot.onText(/\/switch (\d+)/, (msg, match) => this.handleSwitchConversation(msg, match[1]));
    this.bot.onText(/\/end (\d+)/, (msg, match) => this.handleEndSession(msg, match[1]));
    this.bot.onText(/\/broadcast (.+)/, (msg, match) => this.handleBroadcast(msg, match[1]));
    this.bot.onText(/\/export/, (msg) => this.handleExportData(msg));
  }

  // بدء المحادثة
  async handleStart(msg) {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const userName = this.getUserName(msg.from);

    if (userId === OWNER_ID) {
      await this.sendOwnerWelcome(chatId);
    } else {
      await this.handleNewUser(msg);
    }
  }

  // الحصول على اسم المستخدم
  getUserName(user) {
    return user.first_name || user.username || user.last_name || 'مجهول';
  }

  // ترحيب المالك
  async sendOwnerWelcome(chatId) {
    const keyboard = {
      reply_markup: {
        keyboard: [
          ['📊 الإحصائيات', '👥 المحادثات النشطة'],
          ['📢 رسالة جماعية', '📤 تصدير البيانات'],
          ['❌ إيقاف البوت']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };

    await this.bot.sendMessage(chatId, `
🔧 **لوحة تحكم المالك**

مرحباً بك في لوحة التحكم! 
يمكنك إدارة جميع المحادثات من هنا.

**الإحصائيات السريعة:**
• المستخدمين: ${Object.keys(this.sessions).length}
• الرسائل اليوم: ${this.getTodayMessages()}
• إجمالي الرسائل: ${this.stats.totalMessages}

**الأوامر المتاحة:**
• /stats - إحصائيات مفصلة
• /sessions - المحادثات النشطة  
• /switch [ID] - تبديل المحادثة
• /end [ID] - إنهاء محادثة
• /broadcast [رسالة] - رسالة جماعية

البوت جاهز! 🚀
    `, { ...keyboard, parse_mode: 'Markdown' });
  }

  // معالج المستخدم الجديد
  async handleNewUser(msg) {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const userName = this.getUserName(msg.from);

    // إنشاء جلسة جديدة
    if (!this.sessions[userId]) {
      this.sessions[userId] = {
        user_id: userId,
        user_name: userName,
        chat_id: chatId,
        username: msg.from.username || null,
        started_at: new Date().toISOString(),
        last_message: new Date().toISOString(),
        message_count: 0,
        is_blocked: false
      };
      
      this.updateStats('new_user', userId);
      this.saveData();

      // إشعار المالك
      await this.notifyOwnerNewUser(userName, userId);
    }

    // رسالة ترحيب للمستخدم
    const welcomeKeyboard = {
      reply_markup: {
        keyboard: [
          ['💬 إرسال رسالة', '❓ المساعدة'],
          ['📞 التواصل المباشر']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };

    await this.bot.sendMessage(chatId, `
🤖 **أهلاً وسهلاً ${userName}!**

مرحباً بك في خدمة الرسائل الذكية! 

**ماذا يمكنني فعله لك؟**
• إرسال رسائلك للدعم الفني
• الإجابة على استفساراتك
• تقديم المساعدة السريعة

**كيفية الاستخدام:**
اكتب رسالتك مباشرة وسأقوم بتوصيلها فوراً!

جرب الآن... ✍️
    `, { ...welcomeKeyboard, parse_mode: 'Markdown' });
  }

  // إشعار المالك بمستخدم جديد
  async notifyOwnerNewUser(userName, userId) {
    await this.bot.sendMessage(OWNER_ID, `
🔔 **مستخدم جديد انضم!**

👤 **الاسم:** ${userName}
🆔 **المعرف:** ${userId}
⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}
📊 **إجمالي المستخدمين:** ${Object.keys(this.sessions).length}

انتظر رسالته الأولى... 📨
    `, { parse_mode: 'Markdown' });
  }

  // معالج الرسائل الرئيسي
  async handleMessage(msg) {
    // تجاهل الأوامر
    if (msg.text && msg.text.startsWith('/')) return;

    const userId = msg.from.id.toString();
    this.updateStats('message', userId);

    if (userId === OWNER_ID) {
      await this.handleOwnerMessage(msg);
    } else {
      await this.handleUserMessage(msg);
    }
  }

  // معالج رسائل المستخدمين
  async handleUserMessage(msg) {
    const userId = msg.from.id.toString();
    const userName = this.getUserName(msg.from);

    // التحقق من الحظر
    if (this.sessions[userId]?.is_blocked) {
      await this.bot.sendMessage(msg.chat.id, '🚫 عذراً، تم حظرك من استخدام الخدمة.');
      return;
    }

    // تحديث الجلسة
    if (this.sessions[userId]) {
      this.sessions[userId].last_message = new Date().toISOString();
      this.sessions[userId].message_count++;
      this.saveData();
    }

    // تحضير الرسالة للمالك
    const messageInfo = this.formatUserMessage(msg, userName, userId);
    
    // إرسال للمالك
    try {
      await this.sendToOwner(msg, messageInfo);
      
      // تأكيد للمستخدم
      await this.bot.sendMessage(msg.chat.id, '✅ تم إرسال رسالتك بنجاح! سيتم الرد عليك قريباً.');
      
      // تعيين المحادثة النشطة
      this.currentConversation = userId;
      
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ عذراً، حدث خطأ. حاول مرة أخرى.');
    }
  }

  // تنسيق رسالة المستخدم
  formatUserMessage(msg, userName, userId) {
    const session = this.sessions[userId];
    const messageTime = new Date().toLocaleString('ar-EG');
    
    return `
📨 **رسالة جديدة من ${userName}**
🆔 **المعرف:** ${userId}
👤 **المعرف:** @${msg.from.username || 'غير متوفر'}
⏰ **الوقت:** ${messageTime}
📊 **عدد الرسائل:** ${session?.message_count || 1}
🕒 **مدة العضوية:** ${this.getTimeDiff(session?.started_at)}

💬 **المحتوى:**
${msg.text || '[محتوى غير نصي]'}

---
💡 **للرد:** اكتب رسالتك مباشرة
🔄 **للتبديل:** /switch ${userId}
    `;
  }

  // إرسال للمالك
  async sendToOwner(msg, messageInfo) {
    // إرسال النص
    await this.bot.sendMessage(OWNER_ID, messageInfo, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 رد سريع', callback_data: `reply_${msg.from.id}` },
            { text: '🚫 حظر', callback_data: `block_${msg.from.id}` }
          ],
          [
            { text: '📋 معلومات المستخدم', callback_data: `info_${msg.from.id}` },
            { text: '❌ إنهاء المحادثة', callback_data: `end_${msg.from.id}` }
          ]
        ]
      }
    });

    // إرسال الوسائط إن وجدت
    await this.forwardMediaToOwner(msg);
  }

  // إرسال الوسائط للمالك
  async forwardMediaToOwner(msg) {
    const userId = msg.from.id.toString();
    const userName = this.getUserName(msg.from);
    const caption = `من ${userName} (${userId})`;

    try {
      if (msg.photo) {
        await this.bot.sendPhoto(OWNER_ID, msg.photo[msg.photo.length - 1].file_id, { caption });
      } else if (msg.document) {
        await this.bot.sendDocument(OWNER_ID, msg.document.file_id, { caption });
      } else if (msg.voice) {
        await this.bot.sendVoice(OWNER_ID, msg.voice.file_id, { caption });
      } else if (msg.video) {
        await this.bot.sendVideo(OWNER_ID, msg.video.file_id, { caption });
      } else if (msg.sticker) {
        await this.bot.sendSticker(OWNER_ID, msg.sticker.file_id);
        await this.bot.sendMessage(OWNER_ID, caption);
      }
    } catch (error) {
      console.error('خطأ في إرسال الوسائط:', error);
    }
  }

  // معالج رسائل المالك
  async handleOwnerMessage(msg) {
    if (!this.currentConversation) {
      const lastUser = this.getLastActiveUser();
      if (lastUser) {
        this.currentConversation = lastUser.user_id;
      } else {
        await this.bot.sendMessage(msg.chat.id, '❌ لا توجد محادثات نشطة. استخدم /sessions لعرض المحادثات.');
        return;
      }
    }

    const targetUser = this.sessions[this.currentConversation];
    if (!targetUser) {
      await this.bot.sendMessage(msg.chat.id, '❌ المستخدم المحدد غير موجود.');
      this.currentConversation = null;
      return;
    }

    try {
      // إرسال الرسالة للمستخدم
      await this.sendReplyToUser(msg, targetUser);
      
      // تأكيد للمالك
      await this.bot.sendMessage(msg.chat.id, 
        `✅ تم إرسال ردك إلى ${targetUser.user_name}`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '📋 عرض المحادثات', callback_data: 'show_sessions' },
              { text: '🔄 تبديل محادثة', callback_data: 'switch_conversation' }
            ]]
          }
        }
      );

    } catch (error) {
      console.error('خطأ في الرد:', error);
      await this.bot.sendMessage(msg.chat.id, `❌ فشل في إرسال الرد. المستخدم قد يكون حظر البوت.`);
    }
  }

  // إرسال الرد للمستخدم
  async sendReplyToUser(msg, targetUser) {
    const replyMessage = `🤖 **رد من الدعم:**\n\n${msg.text}`;
    
    // إرسال النص
    await this.bot.sendMessage(targetUser.chat_id, replyMessage, { parse_mode: 'Markdown' });
    
    // إرسال الوسائط
    if (msg.photo) {
      await this.bot.sendPhoto(targetUser.chat_id, msg.photo[msg.photo.length - 1].file_id);
    } else if (msg.document) {
      await this.bot.sendDocument(targetUser.chat_id, msg.document.file_id);
    } else if (msg.voice) {
      await this.bot.sendVoice(targetUser.chat_id, msg.voice.file_id);
    } else if (msg.video) {
      await this.bot.sendVideo(targetUser.chat_id, msg.video.file_id);
    }
  }

  // الإحصائيات
  async handleStats(msg) {
    if (msg.from.id.toString() !== OWNER_ID) return;

    const todayMessages = this.getTodayMessages();
    const activeUsers = this.getActiveUsersCount();
    
    const statsMessage = `
📊 **إحصائيات البوت**

📈 **الإحصائيات العامة:**
• إجمالي المستخدمين: ${Object.keys(this.sessions).length}
• المستخدمين النشطين: ${activeUsers}
• إجمالي الرسائل: ${this.stats.totalMessages}
• رسائل اليوم: ${todayMessages}

📅 **إحصائيات الأسبوع:**
${this.getWeeklyStats()}

⏰ **تاريخ البدء:** ${new Date(this.stats.startDate).toLocaleString('ar-EG')}
🔄 **آخر تحديث:** ${new Date().toLocaleString('ar-EG')}
    `;

    await this.bot.sendMessage(msg.chat.id, statsMessage, { parse_mode: 'Markdown' });
  }

  // عرض المحادثات النشطة
  async handleShowSessions(msg) {
    if (msg.from.id.toString() !== OWNER_ID) return;

    const users = Object.values(this.sessions);
    
    if (users.length === 0) {
      await this.bot.sendMessage(msg.chat.id, '📭 لا توجد محادثات مسجلة.');
      return;
    }

    // ترتيب حسب آخر رسالة
    users.sort((a, b) => new Date(b.last_message) - new Date(a.last_message));
    
    let sessionsList = '👥 **المحادثات المسجلة:**\n\n';
    
    users.slice(0, 10).forEach((user, index) => {
      const isActive = this.isUserActive(user);
      const activeIcon = isActive ? '🟢' : '⚪';
      const currentIcon = this.currentConversation === user.user_id ? '👈' : '';
      
      sessionsList += `${activeIcon} **${index + 1}. ${user.user_name}** ${currentIcon}\n`;
      sessionsList += `   🆔 \`${user.user_id}\`\n`;
      sessionsList += `   📊 ${user.message_count} رسالة\n`;
      sessionsList += `   ⏰ ${this.getTimeDiff(user.last_message)}\n\n`;
    });

    if (users.length > 10) {
      sessionsList += `\n... و ${users.length - 10} محادثة أخرى\n`;
    }

    sessionsList += '\n💡 **للتبديل:** /switch [ID]\n🔄 **المحادثة النشطة:** ' + 
                   (this.currentConversation ? this.sessions[this.currentConversation]?.user_name : 'لا توجد');

    await this.bot.sendMessage(msg.chat.id, sessionsList, { parse_mode: 'Markdown' });
  }

  // تبديل المحادثة
  async handleSwitchConversation(msg, userId) {
    if (msg.from.id.toString() !== OWNER_ID) return;

    if (this.sessions[userId]) {
      this.currentConversation = userId;
      const userName = this.sessions[userId].user_name;
      
      await this.bot.sendMessage(msg.chat.id, 
        `🔄 تم تبديل المحادثة إلى: **${userName}**\n\nاكتب رسالتك الآن...`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await this.bot.sendMessage(msg.chat.id, `❌ لم يتم العثور على مستخدم بالمعرف: ${userId}`);
    }
  }

  // إنهاء المحادثة
  async handleEndSession(msg, userId) {
    if (msg.from.id.toString() !== OWNER_ID) return;

    if (this.sessions[userId]) {
      const userName = this.sessions[userId].user_name;
      const chatId = this.sessions[userId].chat_id;
      
      // إشعار المستخدم
      try {
        await this.bot.sendMessage(chatId, 
          '📝 تم إنهاء المحادثة من قبل الدعم. شكراً لك!\n\nيمكنك بدء محادثة جديدة في أي وقت.'
        );
      } catch (error) {
        // تجاهل إذا لم يتمكن من الإرسال
      }
      
      // حذف الجلسة
      delete this.sessions[userId];
      this.saveData();
      
      // إعادة تعيين المحادثة النشطة
      if (this.currentConversation === userId) {
        this.currentConversation = null;
      }
      
      await this.bot.sendMessage(msg.chat.id, `✅ تم إنهاء المحادثة مع ${userName}`);
    } else {
      await this.bot.sendMessage(msg.chat.id, `❌ لم يتم العثور على محادثة للمستخدم ${userId}`);
    }
  }

  // رسالة جماعية
  async handleBroadcast(msg, message) {
    if (msg.from.id.toString() !== OWNER_ID) return;

    const users = Object.values(this.sessions);
    let successCount = 0;
    let failCount = 0;

    await this.bot.sendMessage(msg.chat.id, `📢 بدء إرسال الرسالة إلى ${users.length} مستخدم...`);

    for (const user of users) {
      try {
        await this.bot.sendMessage(user.chat_id, `📢 **رسالة من الإدارة:**\n\n${message}`, 
          { parse_mode: 'Markdown' });
        successCount++;
      } catch (error) {
        failCount++;
      }
      
      // تأخير صغير لتجنب حدود التليجرام
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.bot.sendMessage(msg.chat.id, 
      `✅ تم إرسال الرسالة!\n\n📊 **النتائج:**\n• نجح: ${successCount}\n• فشل: ${failCount}`
    );
  }

  // تصدير البيانات
  async handleExportData(msg) {
    if (msg.from.id.toString() !== OWNER_ID) return;

    try {
      const exportData = {
        export_date: new Date().toISOString(),
        sessions: this.sessions,
        stats: this.stats,
        summary: {
          total_users: Object.keys(this.sessions).length,
          total_messages: this.stats.totalMessages,
          active_users: this.getActiveUsersCount()
        }
      };

      const filename = `telegram-bot-export-${Date.now()}.json`;
      const filepath = path.join(DATA_DIR, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      
      await this.bot.sendDocument(msg.chat.id, filepath, {
        caption: '📤 تم تصدير بيانات البوت بنجاح!'
      });
      
      // حذف الملف بعد الإرسال
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 60000);
      
    } catch (error) {
      console.error('خطأ في التصدير:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ فشل في تصدير البيانات');
    }
  }

  // المساعدة
  async handleHelp(msg) {
    const userId = msg.from.id.toString();

    if (userId === OWNER_ID) {
      await this.bot.sendMessage(msg.chat.id, `
🔧 **مساعدة المالك**

**الأوامر الأساسية:**
• /start - بدء البوت
• /help - هذه المساعدة
• /stats - الإحصائيات
• /sessions - المحادثات النشطة

**إدارة المحادثات:**
• /switch [ID] - تبديل المحادثة
• /end [ID] - إنهاء محادثة

**الأوامر المتقدمة:**
• /broadcast [رسالة] - رسالة جماعية
• /export - تصدير البيانات

**كيفية الاستخدام:**
1. اكتب رسالتك مباشرة للرد على آخر مستخدم
2. استخدم /switch للتبديل بين المحادثات
3. استخدم الأزرار التفاعلية للتحكم السريع

**ميزات ذكية:**
• حفظ تلقائي للبيانات
• إحصائيات مفصلة
• تنبيهات فورية
• دعم جميع أنواع الملفات
      `);
    } else {
      await this.bot.sendMessage(msg.chat.id, `
🤖 **كيفية الاستخدام**

**مرحباً! إليك ما يمكنني فعله:**

📝 **إرسال الرسائل:**
• اكتب أي رسالة نصية
• أرسل الصور والملفات
• أرسل الرسائل الصوتية

⚡ **الرد السريع:**
• رسائلك تصل فوراً للدعم
• ستحصل على رد سريع
• جميع المحادثات محفوظة

🔒 **الأمان:**
• معلوماتك آمنة ومحمية
• لا نشارك بياناتك
• يمكنك حذف محادثتك في أي وقت

**ابدأ الآن بكتابة رسالتك!** ✍️
      `);
    }
  }

  // دوال مساعدة
  getTodayMessages() {
    const today = new Date().toISOString().split('T')[0];
    return this.stats.messagesPerDay[today] || 0;
  }

  getActiveUsersCount() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return Object.values(this.sessions).filter(user => 
      new Date(user.last_message) > oneDayAgo
    ).length;
  }

  isUserActive(user) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(user.last_message) > oneHourAgo;
  }

  getLastActiveUser() {
    const users = Object.values(this.sessions);
    if (users.length === 0) return null;
    
    users.sort((a, b) => new Date(b.last_message) - new Date(a.last_message));
    return users[0];
  }

  getTimeDiff(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  }

  getWeeklyStats() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = this.stats.messagesPerDay[dateStr] || 0;
      days.push(`• ${date.toLocaleDateString('ar-EG')}: ${count} رسالة`);
    }
    return days.join('\n');
  }

  // تنظيف البيانات القديمة
  cleanOldData() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // تنظيف الجلسات القديمة
    Object.keys(this.sessions).forEach(userId => {
      const lastMessage = new Date(this.sessions[userId].last_message);
      if (lastMessage < thirtyDaysAgo) {
        delete this.sessions[userId];
      }
    });

    // تنظيف إحصائيات الرسائل القديمة
    Object.keys(this.stats.messagesPerDay).forEach(date => {
      if (new Date(date) < thirtyDaysAgo) {
        delete this.stats.messagesPerDay[date];
      }
    });

    this.saveData();
  }
}

// بدء البوت
const smartBot = new SmartTelegramBot();

// تنظيف البيانات كل 24 ساعة
setInterval(() => {
  smartBot.cleanOldData();
}, 24 * 60 * 60 * 1000);

// حفظ البيانات كل 5 دقائق
setInterval(() => {
  smartBot.saveData();
}, 5 * 60 * 1000);

// معالج إغلاق التطبيق
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف البوت...');
  smartBot.saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 إيقاف البوت...');
  smartBot.saveData();
  process.exit(0);
});

module.exports = SmartTelegramBot;
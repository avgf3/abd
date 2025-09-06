const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// إعدادات البوت
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const OWNER_ID = process.env.OWNER_TELEGRAM_ID || 'YOUR_OWNER_ID_HERE'; // معرف المالك في تليجرام

// ملف لحفظ جلسات المحادثات
const SESSIONS_FILE = path.join(__dirname, 'telegram-sessions.json');

class TelegramMessageBot {
  constructor() {
    this.bot = new TelegramBot(BOT_TOKEN, { polling: true });
    this.sessions = this.loadSessions();
    this.setupEventHandlers();
    console.log('🤖 بوت تليجرام للرسائل يعمل الآن...');
  }

  // تحميل جلسات المحادثات من الملف
  loadSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('خطأ في تحميل الجلسات:', error);
    }
    return {};
  }

  // حفظ جلسات المحادثات إلى الملف
  saveSessions() {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(this.sessions, null, 2));
    } catch (error) {
      console.error('خطأ في حفظ الجلسات:', error);
    }
  }

  // إعداد معالجات الأحداث
  setupEventHandlers() {
    // معالج الرسائل النصية
    this.bot.on('message', (msg) => {
      this.handleMessage(msg);
    });

    // معالج الأخطاء
    this.bot.on('error', (error) => {
      console.error('خطأ في البوت:', error);
    });

    // معالج بدء المحادثة
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // معالج المساعدة
    this.bot.onText(/\/help/, (msg) => {
      this.handleHelp(msg);
    });

    // معالج إنهاء المحادثة (للمالك فقط)
    this.bot.onText(/\/end (.+)/, (msg, match) => {
      if (msg.from.id.toString() === OWNER_ID) {
        this.handleEndSession(msg, match[1]);
      }
    });

    // معالج عرض المحادثات النشطة (للمالك فقط)
    this.bot.onText(/\/sessions/, (msg) => {
      if (msg.from.id.toString() === OWNER_ID) {
        this.handleShowSessions(msg);
      }
    });
  }

  // معالج بدء المحادثة
  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const userName = msg.from.first_name || msg.from.username || 'مجهول';

    if (userId === OWNER_ID) {
      await this.bot.sendMessage(chatId, `
🔧 **لوحة تحكم المالك**

أهلاً بك! أنت المالك ويمكنك:
• استقبال جميع الرسائل من المستخدمين
• الرد على أي مستخدم بكتابة رسالتك مباشرة
• استخدام /sessions لعرض المحادثات النشطة
• استخدام /end [user_id] لإنهاء محادثة معينة

البوت جاهز لاستقبال الرسائل! 🚀
      `, { parse_mode: 'Markdown' });
    } else {
      // إنشاء جلسة جديدة للمستخدم
      this.sessions[userId] = {
        user_id: userId,
        user_name: userName,
        chat_id: chatId,
        started_at: new Date().toISOString(),
        last_message: new Date().toISOString(),
        message_count: 0
      };
      this.saveSessions();

      // إرسال رسالة ترحيب للمستخدم
      await this.bot.sendMessage(chatId, `
🤖 **أهلاً وسهلاً ${userName}!**

مرحباً بك! يمكنك الآن إرسال رسائلك وسأقوم بتوصيلها للمالك.
سيتم الرد عليك من خلالي بأسرع وقت ممكن.

اكتب رسالتك الآن... ✍️
      `);

      // إشعار المالك بمستخدم جديد
      await this.bot.sendMessage(OWNER_ID, `
🔔 **مستخدم جديد بدأ محادثة**

👤 **المستخدم:** ${userName}
🆔 **المعرف:** ${userId}
⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}

انتظر رسالته الأولى...
      `, { parse_mode: 'Markdown' });
    }
  }

  // معالج المساعدة
  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    if (userId === OWNER_ID) {
      await this.bot.sendMessage(chatId, `
🔧 **مساعدة المالك**

**الأوامر المتاحة:**
• /start - بدء البوت
• /help - عرض هذه المساعدة
• /sessions - عرض المحادثات النشطة
• /end [user_id] - إنهاء محادثة معينة

**كيفية الاستخدام:**
1. استقبل الرسائل من المستخدمين
2. اكتب ردك مباشرة (سيصل للمستخدم الأخير)
3. أو رد على رسالة معينة لإرسالها لصاحبها

**ملاحظات:**
• جميع الرسائل محفوظة في جلسات
• يمكنك متابعة عدة محادثات في نفس الوقت
      `);
    } else {
      await this.bot.sendMessage(chatId, `
🤖 **كيفية الاستخدام**

**مرحباً! يمكنك:**
• إرسال أي رسالة نصية
• إرسال الصور والملفات
• طرح الأسئلة والاستفسارات

**ملاحظات:**
• جميع رسائلك ستصل للمالك
• سيتم الرد عليك بأسرع وقت
• المحادثة آمنة ومشفرة

اكتب رسالتك الآن... ✍️
      `);
    }
  }

  // معالج الرسائل الرئيسي
  async handleMessage(msg) {
    // تجاهل الأوامر
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || msg.from.username || 'مجهول';

    if (userId === OWNER_ID) {
      // رسالة من المالك - إرسالها للمستخدم المناسب
      await this.handleOwnerMessage(msg);
    } else {
      // رسالة من مستخدم عادي - إرسالها للمالك
      await this.handleUserMessage(msg);
    }
  }

  // معالج رسائل المستخدمين العاديين
  async handleUserMessage(msg) {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || msg.from.username || 'مجهول';

    // إنشاء أو تحديث الجلسة
    if (!this.sessions[userId]) {
      this.sessions[userId] = {
        user_id: userId,
        user_name: userName,
        chat_id: chatId,
        started_at: new Date().toISOString(),
        last_message: new Date().toISOString(),
        message_count: 0
      };
    }

    // تحديث الجلسة
    this.sessions[userId].last_message = new Date().toISOString();
    this.sessions[userId].message_count++;
    this.saveSessions();

    // تحضير الرسالة للمالك
    let forwardMessage = `
📨 **رسالة من ${userName}**
🆔 **المعرف:** ${userId}
⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}
📊 **عدد الرسائل:** ${this.sessions[userId].message_count}

💬 **المحتوى:**
${msg.text || '[محتوى غير نصي]'}
    `;

    // إرسال الرسالة للمالك
    try {
      await this.bot.sendMessage(OWNER_ID, forwardMessage, { parse_mode: 'Markdown' });

      // إذا كانت الرسالة تحتوي على وسائط، أرسلها أيضاً
      if (msg.photo) {
        await this.bot.sendPhoto(OWNER_ID, msg.photo[msg.photo.length - 1].file_id, {
          caption: `صورة من ${userName} (${userId})`
        });
      } else if (msg.document) {
        await this.bot.sendDocument(OWNER_ID, msg.document.file_id, {
          caption: `ملف من ${userName} (${userId})`
        });
      } else if (msg.voice) {
        await this.bot.sendVoice(OWNER_ID, msg.voice.file_id, {
          caption: `رسالة صوتية من ${userName} (${userId})`
        });
      }

      // تأكيد الاستلام للمستخدم
      await this.bot.sendMessage(msg.chat.id, '✅ تم إرسال رسالتك بنجاح! سيتم الرد عليك قريباً.');

    } catch (error) {
      console.error('خطأ في إرسال الرسالة للمالك:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ عذراً، حدث خطأ في إرسال رسالتك. حاول مرة أخرى.');
    }
  }

  // معالج رسائل المالك
  async handleOwnerMessage(msg) {
    // البحث عن آخر مستخدم تفاعل معه المالك
    const lastUser = this.getLastActiveUser();

    if (!lastUser) {
      await this.bot.sendMessage(msg.chat.id, '❌ لا توجد محادثات نشطة حالياً.');
      return;
    }

    // إرسال رسالة المالك للمستخدم
    try {
      let replyMessage = `🤖 **رد من الدعم:**\n\n${msg.text}`;

      await this.bot.sendMessage(lastUser.chat_id, replyMessage, { parse_mode: 'Markdown' });

      // إذا كانت الرسالة تحتوي على وسائط، أرسلها أيضاً
      if (msg.photo) {
        await this.bot.sendPhoto(lastUser.chat_id, msg.photo[msg.photo.length - 1].file_id);
      } else if (msg.document) {
        await this.bot.sendDocument(lastUser.chat_id, msg.document.file_id);
      } else if (msg.voice) {
        await this.bot.sendVoice(lastUser.chat_id, msg.voice.file_id);
      }

      // تأكيد الإرسال للمالك
      await this.bot.sendMessage(msg.chat.id, `✅ تم إرسال ردك إلى ${lastUser.user_name} (${lastUser.user_id})`);

    } catch (error) {
      console.error('خطأ في إرسال الرد للمستخدم:', error);
      await this.bot.sendMessage(msg.chat.id, `❌ فشل في إرسال الرد إلى ${lastUser.user_name}. قد يكون قام بحظر البوت.`);
    }
  }

  // الحصول على آخر مستخدم نشط
  getLastActiveUser() {
    const users = Object.values(this.sessions);
    if (users.length === 0) return null;

    // ترتيب المستخدمين حسب آخر رسالة
    users.sort((a, b) => new Date(b.last_message) - new Date(a.last_message));
    return users[0];
  }

  // عرض المحادثات النشطة
  async handleShowSessions(msg) {
    const users = Object.values(this.sessions);
    
    if (users.length === 0) {
      await this.bot.sendMessage(msg.chat.id, '📭 لا توجد محادثات نشطة حالياً.');
      return;
    }

    let sessionsList = '📋 **المحادثات النشطة:**\n\n';
    
    users.forEach((user, index) => {
      const lastMessageTime = new Date(user.last_message).toLocaleString('ar-EG');
      sessionsList += `${index + 1}. **${user.user_name}**\n`;
      sessionsList += `   🆔 ${user.user_id}\n`;
      sessionsList += `   📊 ${user.message_count} رسالة\n`;
      sessionsList += `   ⏰ آخر رسالة: ${lastMessageTime}\n\n`;
    });

    sessionsList += '\n💡 **للرد على مستخدم معين:** اكتب رسالتك مباشرة (سيتم إرسالها للمستخدم الأخير)';

    await this.bot.sendMessage(msg.chat.id, sessionsList, { parse_mode: 'Markdown' });
  }

  // إنهاء جلسة محددة
  async handleEndSession(msg, userId) {
    if (this.sessions[userId]) {
      const userName = this.sessions[userId].user_name;
      delete this.sessions[userId];
      this.saveSessions();
      
      await this.bot.sendMessage(msg.chat.id, `✅ تم إنهاء المحادثة مع ${userName} (${userId})`);
      
      // إشعار المستخدم بإنهاء المحادثة
      try {
        await this.bot.sendMessage(this.sessions[userId].chat_id, 
          '📝 تم إنهاء المحادثة. شكراً لك! يمكنك بدء محادثة جديدة بإرسال /start'
        );
      } catch (error) {
        // تجاهل الخطأ إذا لم يتمكن من إرسال الرسالة للمستخدم
      }
    } else {
      await this.bot.sendMessage(msg.chat.id, `❌ لم يتم العثور على محادثة للمستخدم ${userId}`);
    }
  }

  // تنظيف الجلسات القديمة (يمكن تشغيلها دورياً)
  cleanOldSessions() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    Object.keys(this.sessions).forEach(userId => {
      const lastMessage = new Date(this.sessions[userId].last_message);
      if (lastMessage < oneDayAgo) {
        delete this.sessions[userId];
      }
    });

    this.saveSessions();
  }
}

// بدء البوت
const messageBot = new TelegramMessageBot();

// تنظيف الجلسات القديمة كل 6 ساعات
setInterval(() => {
  messageBot.cleanOldSessions();
}, 6 * 60 * 60 * 1000);

// معالج إغلاق التطبيق
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف البوت...');
  messageBot.saveSessions();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 إيقاف البوت...');
  messageBot.saveSessions();
  process.exit(0);
});

module.exports = TelegramMessageBot;
const Bot = require('../models/Bot');
const BotBehavior = require('./BotBehavior');
const io = require('socket.io-client');

class BotManager {
    constructor() {
        this.bots = new Map();
        this.behaviors = new Map();
        this.socket = null;
        this.isRunning = false;
    }

    // تهيئة مدير البوتات
    async initialize() {
        console.log('🚀 تهيئة مدير البوتات...');
        
        // الاتصال بالخادم
        this.connectToServer();
        
        // تحميل البوتات من قاعدة البيانات
        await this.loadBots();
        
        console.log(`✅ تم تحميل ${this.bots.size} بوت`);
    }

    // الاتصال بالخادم
    connectToServer() {
        const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
        
        this.socket = io(serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('✅ تم الاتصال بالخادم');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ انقطع الاتصال بالخادم');
        });

        // استقبال الأوامر من لوحة التحكم
        this.socket.on('bot:command', async (data) => {
            await this.handleCommand(data);
        });
    }

    // تحميل البوتات من قاعدة البيانات
    async loadBots() {
        const bots = await Bot.getAll();
        
        for (const bot of bots) {
            this.bots.set(bot.bot_id, bot);
            
            // إنشاء سلوك لكل بوت
            const behavior = new BotBehavior(bot);
            
            // تعيين معالجات الأحداث
            behavior.setEventHandlers({
                onTyping: (botId, isTyping) => this.handleTyping(botId, isTyping),
                onMessage: (botId, message) => this.handleMessage(botId, message),
                onRoomChange: (botId, newRoom) => this.handleRoomChange(botId, newRoom),
                onReaction: (botId, reaction) => this.handleReaction(botId, reaction)
            });
            
            this.behaviors.set(bot.bot_id, behavior);
        }
    }

    // معالجة الأوامر من لوحة التحكم
    async handleCommand(data) {
        const { command, botId, params } = data;
        
        console.log(`📝 أمر جديد: ${command} للبوت ${botId || 'الكل'}`);
        
        switch (command) {
            case 'start_all':
                await this.startAllBots();
                break;
            
            case 'stop_all':
                await this.stopAllBots();
                break;
            
            case 'start_bot':
                await this.startBot(botId);
                break;
            
            case 'stop_bot':
                await this.stopBot(botId);
                break;
            
            case 'move_bot':
                await this.moveBotToRoom(botId, params.room);
                break;
            
            case 'send_message':
                await this.sendBotMessage(botId, params.message);
                break;
            
            case 'update_activity':
                await this.updateBotActivity(botId, params.level);
                break;
            
            case 'batch_action':
                await this.performBatchAction(params.botIds, params.action);
                break;
        }
    }

    // بدء جميع البوتات
    async startAllBots() {
        console.log('🚀 بدء تشغيل جميع البوتات...');
        
        let started = 0;
        for (const [botId, behavior] of this.behaviors) {
            // تشغيل البوتات تدريجياً
            setTimeout(() => {
                behavior.start();
                this.updateBotStatus(botId, 'online');
            }, started * 100); // تأخير 100ms بين كل بوت
            
            started++;
            
            // تشغيل 50 بوت في البداية فقط
            if (started >= 50) break;
        }
        
        this.isRunning = true;
        this.emitStatus({ running: true, activeBots: started });
    }

    // إيقاف جميع البوتات
    async stopAllBots() {
        console.log('🛑 إيقاف جميع البوتات...');
        
        for (const [botId, behavior] of this.behaviors) {
            behavior.stop();
            await this.updateBotStatus(botId, 'offline');
        }
        
        this.isRunning = false;
        this.emitStatus({ running: false, activeBots: 0 });
    }

    // بدء بوت واحد
    async startBot(botId) {
        const behavior = this.behaviors.get(botId);
        if (behavior) {
            behavior.start();
            await this.updateBotStatus(botId, 'online');
            console.log(`✅ تم تشغيل البوت: ${botId}`);
        }
    }

    // إيقاف بوت واحد
    async stopBot(botId) {
        const behavior = this.behaviors.get(botId);
        if (behavior) {
            behavior.stop();
            await this.updateBotStatus(botId, 'offline');
            console.log(`🛑 تم إيقاف البوت: ${botId}`);
        }
    }

    // نقل بوت إلى غرفة
    async moveBotToRoom(botId, room) {
        const bot = this.bots.get(botId);
        if (bot) {
            await bot.moveToRoom(room);
            this.emitBotUpdate(botId, { current_room: room });
        }
    }

    // إرسال رسالة من بوت
    async sendBotMessage(botId, message) {
        const bot = this.bots.get(botId);
        if (bot) {
            this.handleMessage(botId, message);
            await bot.logActivity('manual_message', bot.current_room, { message });
        }
    }

    // تحديث مستوى نشاط البوت
    async updateBotActivity(botId, level) {
        const bot = this.bots.get(botId);
        if (bot) {
            bot.activity_level = level;
            // تحديث في قاعدة البيانات
            await bot.pool.execute(
                'UPDATE bots SET activity_level = ? WHERE bot_id = ?',
                [level, botId]
            );
        }
    }

    // تنفيذ إجراء جماعي
    async performBatchAction(botIds, action) {
        for (const botId of botIds) {
            switch (action.type) {
                case 'start':
                    await this.startBot(botId);
                    break;
                case 'stop':
                    await this.stopBot(botId);
                    break;
                case 'move':
                    await this.moveBotToRoom(botId, action.room);
                    break;
            }
            
            // تأخير بسيط بين الإجراءات
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // معالجات الأحداث
    handleTyping(botId, isTyping) {
        this.socket.emit('bot:typing', {
            botId,
            room: this.bots.get(botId).current_room,
            isTyping
        });
    }

    handleMessage(botId, message) {
        const bot = this.bots.get(botId);
        this.socket.emit('bot:message', {
            botId,
            botName: bot.name,
            avatar: bot.avatar,
            room: bot.current_room,
            message,
            timestamp: new Date()
        });
    }

    handleRoomChange(botId, newRoom) {
        this.socket.emit('bot:room_change', {
            botId,
            oldRoom: this.bots.get(botId).current_room,
            newRoom
        });
    }

    handleReaction(botId, reaction) {
        this.socket.emit('bot:reaction', {
            botId,
            room: this.bots.get(botId).current_room,
            reaction
        });
    }

    // تحديث حالة البوت
    async updateBotStatus(botId, status) {
        const bot = this.bots.get(botId);
        if (bot) {
            await bot.updateStatus(status);
            this.emitBotUpdate(botId, { status });
        }
    }

    // إرسال تحديثات للوحة التحكم
    emitStatus(data) {
        this.socket.emit('manager:status', data);
    }

    emitBotUpdate(botId, updates) {
        this.socket.emit('bot:update', { botId, updates });
    }

    // الحصول على إحصائيات
    getStats() {
        const stats = {
            totalBots: this.bots.size,
            onlineBots: 0,
            offlineBots: 0,
            busyBots: 0,
            roomDistribution: {}
        };

        for (const bot of this.bots.values()) {
            stats[`${bot.status}Bots`]++;
            
            if (!stats.roomDistribution[bot.current_room]) {
                stats.roomDistribution[bot.current_room] = 0;
            }
            stats.roomDistribution[bot.current_room]++;
        }

        return stats;
    }
}

// تشغيل مدير البوتات
if (require.main === module) {
    const manager = new BotManager();
    
    manager.initialize().catch(error => {
        console.error('خطأ في تهيئة مدير البوتات:', error);
        process.exit(1);
    });
    
    // معالجة إيقاف البرنامج
    process.on('SIGINT', async () => {
        console.log('\n🛑 إيقاف مدير البوتات...');
        await manager.stopAllBots();
        process.exit(0);
    });
}

module.exports = BotManager;
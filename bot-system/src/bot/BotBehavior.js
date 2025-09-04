const Bot = require('../models/Bot');

class BotBehavior {
    constructor(bot) {
        this.bot = bot;
        this.isActive = false;
        this.lastActionTime = Date.now();
        this.actionInterval = null;
        this.typingTimeout = null;
    }

    // بدء سلوك البوت
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.scheduleNextAction();
        console.log(`🤖 بدء نشاط البوت: ${this.bot.name}`);
    }

    // إيقاف سلوك البوت
    stop() {
        this.isActive = false;
        
        if (this.actionInterval) {
            clearTimeout(this.actionInterval);
            this.actionInterval = null;
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        
        console.log(`🛑 إيقاف نشاط البوت: ${this.bot.name}`);
    }

    // جدولة الإجراء التالي
    scheduleNextAction() {
        if (!this.isActive) return;

        // حساب التأخير بناءً على مستوى النشاط
        const baseDelay = 60000; // دقيقة واحدة
        const activityMultiplier = (11 - this.bot.activity_level) / 10;
        const delay = baseDelay * activityMultiplier * (0.5 + Math.random());

        this.actionInterval = setTimeout(() => {
            this.performAction();
        }, delay);
    }

    // تنفيذ إجراء
    async performAction() {
        if (!this.isActive) return;

        const actions = [
            { type: 'message', weight: 40 },
            { type: 'room_change', weight: 20 },
            { type: 'reaction', weight: 25 },
            { type: 'idle', weight: 15 }
        ];

        const action = this.weightedRandomChoice(actions);

        switch (action) {
            case 'message':
                await this.sendMessage();
                break;
            case 'room_change':
                await this.changeRoom();
                break;
            case 'reaction':
                await this.sendReaction();
                break;
            case 'idle':
                // لا تفعل شيء، فقط انتظر
                break;
        }

        this.lastActionTime = Date.now();
        this.scheduleNextAction();
    }

    // اختيار عشوائي مرجح
    weightedRandomChoice(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of items) {
            random -= item.weight;
            if (random <= 0) {
                return item.type;
            }
        }

        return items[0].type;
    }

    // إرسال رسالة
    async sendMessage() {
        // محاكاة الكتابة
        const typingDuration = this.bot.settings.typing_speed * 1000 * (0.8 + Math.random() * 0.4);
        
        // بدء الكتابة
        this.emitTyping(true);

        this.typingTimeout = setTimeout(async () => {
            // إيقاف الكتابة
            this.emitTyping(false);

            // توليد رسالة
            const message = await this.bot.generateSmartMessage({
                roomType: 'public',
                timeOfDay: new Date().getHours()
            });

            if (message) {
                this.emitMessage(message);
                await this.bot.logActivity('message', this.bot.current_room, { message });
            }
        }, typingDuration);
    }

    // تغيير الغرفة
    async changeRoom() {
        const rooms = ['lobby', 'general', 'gaming', 'music', 'sports'];
        const currentIndex = rooms.indexOf(this.bot.current_room);
        
        // اختر غرفة مختلفة
        let newRoom;
        do {
            newRoom = rooms[Math.floor(Math.random() * rooms.length)];
        } while (newRoom === this.bot.current_room && rooms.length > 1);

        // محاكاة التنقل التدريجي
        setTimeout(async () => {
            await this.bot.moveToRoom(newRoom);
            this.emitRoomChange(newRoom);
        }, 1000 + Math.random() * 2000);
    }

    // إرسال تفاعل
    async sendReaction() {
        const reactions = ['👍', '❤️', '😂', '👏', '🔥', '💯', '😊', '🎉'];
        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        
        this.emitReaction(reaction);
        await this.bot.logActivity('reaction', this.bot.current_room, { reaction });
    }

    // طرق الإرسال (سيتم تنفيذها في BotManager)
    emitTyping(isTyping) {
        if (this.onTyping) {
            this.onTyping(this.bot.bot_id, isTyping);
        }
    }

    emitMessage(message) {
        if (this.onMessage) {
            this.onMessage(this.bot.bot_id, message);
        }
    }

    emitRoomChange(newRoom) {
        if (this.onRoomChange) {
            this.onRoomChange(this.bot.bot_id, newRoom);
        }
    }

    emitReaction(reaction) {
        if (this.onReaction) {
            this.onReaction(this.bot.bot_id, reaction);
        }
    }

    // تعيين معالجات الأحداث
    setEventHandlers(handlers) {
        this.onTyping = handlers.onTyping;
        this.onMessage = handlers.onMessage;
        this.onRoomChange = handlers.onRoomChange;
        this.onReaction = handlers.onReaction;
    }
}

module.exports = BotBehavior;
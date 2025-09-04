const { pool } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const faker = require('faker');
faker.locale = 'ar';

class Bot {
    constructor(data) {
        this.id = data.id;
        this.bot_id = data.bot_id;
        this.name = data.name;
        this.avatar = data.avatar;
        this.status = data.status || 'offline';
        this.current_room = data.current_room || 'lobby';
        this.behavior_type = data.behavior_type || 'normal';
        this.activity_level = data.activity_level || 5;
        this.settings = data.settings || {};
    }

    // إنشاء بوت جديد
    static async create(botData = {}) {
        const bot_id = botData.bot_id || `BOT_${uuidv4().substring(0, 8)}`;
        const name = botData.name || faker.name.findName();
        const avatar = botData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bot_id}`;
        
        const defaultSettings = {
            typing_speed: Math.floor(Math.random() * 3) + 2, // 2-4 ثانية
            response_delay: Math.floor(Math.random() * 5) + 3, // 3-7 ثانية
            personality: ['friendly', 'talkative', 'quiet', 'funny'][Math.floor(Math.random() * 4)],
            interests: this.generateInterests()
        };

        const settings = { ...defaultSettings, ...botData.settings };

        const [result] = await pool.execute(
            `INSERT INTO bots (bot_id, name, avatar, behavior_type, activity_level, settings) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [bot_id, name, avatar, botData.behavior_type || 'normal', 
             botData.activity_level || 5, JSON.stringify(settings)]
        );

        return new Bot({
            id: result.insertId,
            bot_id,
            name,
            avatar,
            ...botData,
            settings
        });
    }

    // توليد اهتمامات عشوائية للبوت
    static generateInterests() {
        const allInterests = [
            'كرة القدم', 'الموسيقى', 'الأفلام', 'الطبخ', 'السفر',
            'التقنية', 'الألعاب', 'القراءة', 'الرياضة', 'الفن'
        ];
        const count = Math.floor(Math.random() * 3) + 2; // 2-4 اهتمامات
        const interests = [];
        
        while (interests.length < count) {
            const interest = allInterests[Math.floor(Math.random() * allInterests.length)];
            if (!interests.includes(interest)) {
                interests.push(interest);
            }
        }
        
        return interests;
    }

    // إنشاء 300 بوت
    static async createMultipleBots(count = 300) {
        const bots = [];
        const arabicNames = [
            'أحمد', 'محمد', 'علي', 'حسن', 'خالد', 'عمر', 'سارة', 'فاطمة', 'مريم', 'نور',
            'يوسف', 'إبراهيم', 'عبدالله', 'عبدالرحمن', 'سلمان', 'فيصل', 'تركي', 'نواف',
            'ريم', 'دانة', 'لينا', 'هند', 'أمل', 'سلمى', 'زينب', 'عائشة', 'خديجة', 'آلاء'
        ];

        for (let i = 1; i <= count; i++) {
            const randomName = arabicNames[Math.floor(Math.random() * arabicNames.length)];
            const botNumber = String(i).padStart(3, '0');
            
            const botData = {
                bot_id: `BOT_${botNumber}`,
                name: `${randomName}_${botNumber}`,
                behavior_type: ['active', 'normal', 'quiet'][Math.floor(Math.random() * 3)],
                activity_level: Math.floor(Math.random() * 10) + 1
            };

            try {
                const bot = await this.create(botData);
                bots.push(bot);
                
                if (i % 50 === 0) {
                    console.log(`✅ تم إنشاء ${i} بوت`);
                }
            } catch (error) {
                console.error(`خطأ في إنشاء البوت رقم ${i}:`, error.message);
            }
        }

        console.log(`✅ تم إنشاء ${bots.length} بوت بنجاح`);
        return bots;
    }

    // الحصول على جميع البوتات
    static async getAll() {
        const [rows] = await pool.execute('SELECT * FROM bots ORDER BY id');
        return rows.map(row => new Bot({
            ...row,
            settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings
        }));
    }

    // الحصول على بوت بواسطة ID
    static async getById(bot_id) {
        const [rows] = await pool.execute('SELECT * FROM bots WHERE bot_id = ?', [bot_id]);
        if (rows.length === 0) return null;
        
        return new Bot({
            ...rows[0],
            settings: typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings
        });
    }

    // تحديث حالة البوت
    async updateStatus(status) {
        await pool.execute(
            'UPDATE bots SET status = ?, last_activity = NOW() WHERE bot_id = ?',
            [status, this.bot_id]
        );
        this.status = status;
    }

    // نقل البوت إلى غرفة أخرى
    async moveToRoom(roomName) {
        // تحديث عدد المستخدمين في الغرف
        await pool.execute(
            'UPDATE rooms SET current_users = current_users - 1 WHERE room_name = ?',
            [this.current_room]
        );
        
        await pool.execute(
            'UPDATE rooms SET current_users = current_users + 1 WHERE room_name = ?',
            [roomName]
        );

        // تحديث موقع البوت
        await pool.execute(
            'UPDATE bots SET current_room = ?, last_activity = NOW() WHERE bot_id = ?',
            [roomName, this.bot_id]
        );

        // تسجيل النشاط
        await this.logActivity('room_change', roomName, {
            from: this.current_room,
            to: roomName
        });

        this.current_room = roomName;
    }

    // تسجيل نشاط البوت
    async logActivity(actionType, roomName, details = {}) {
        await pool.execute(
            'INSERT INTO bot_activities (bot_id, action_type, room_name, details) VALUES (?, ?, ?, ?)',
            [this.bot_id, actionType, roomName, JSON.stringify(details)]
        );
    }

    // الحصول على رسالة عشوائية
    static async getRandomMessage(category = 'chat') {
        const [rows] = await pool.execute(
            'SELECT message FROM bot_messages WHERE category = ? ORDER BY RAND() LIMIT 1',
            [category]
        );
        
        if (rows.length > 0) {
            // تحديث عداد الاستخدام
            await pool.execute(
                'UPDATE bot_messages SET usage_count = usage_count + 1 WHERE message = ?',
                [rows[0].message]
            );
            return rows[0].message;
        }
        
        return null;
    }

    // توليد رسالة ذكية بناءً على السياق
    async generateSmartMessage(context = {}) {
        const { roomType, timeOfDay, recentMessages } = context;
        
        // اختيار فئة الرسالة بناءً على السياق
        let category = 'chat';
        
        if (Math.random() < 0.1) category = 'greeting';
        if (Math.random() < 0.15) category = 'reaction';
        
        const message = await Bot.getRandomMessage(category);
        
        // إضافة بعض التنوع
        if (message && this.settings.personality === 'funny' && Math.random() < 0.3) {
            return message + ' 😄';
        }
        
        return message;
    }

    // حذف بوت
    async delete() {
        await pool.execute('DELETE FROM bots WHERE bot_id = ?', [this.bot_id]);
    }
}

module.exports = Bot;
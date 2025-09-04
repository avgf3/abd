const db = require('./config/database-sqlite');
const bcrypt = require('bcryptjs');

async function setup() {
    console.log('🚀 بدء إعداد نظام البوتات (SQLite)...\n');
    
    try {
        // إنشاء الجداول
        console.log('📊 إنشاء الجداول...');
        
        // جدول المستخدمين
        await db.asyncRun(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'owner',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);
        
        // جدول البوتات
        await db.asyncRun(`
            CREATE TABLE IF NOT EXISTS bots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                avatar TEXT,
                status TEXT DEFAULT 'offline',
                current_room TEXT DEFAULT 'lobby',
                behavior_type TEXT DEFAULT 'normal',
                activity_level INTEGER DEFAULT 5,
                last_activity DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                settings TEXT
            )
        `);
        
        // جدول الغرف
        await db.asyncRun(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_name TEXT UNIQUE NOT NULL,
                room_type TEXT DEFAULT 'public',
                max_users INTEGER DEFAULT 100,
                current_users INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // جدول سجل النشاطات
        await db.asyncRun(`
            CREATE TABLE IF NOT EXISTS bot_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id TEXT,
                action_type TEXT,
                room_name TEXT,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
            )
        `);
        
        // جدول الرسائل
        await db.asyncRun(`
            CREATE TABLE IF NOT EXISTS bot_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                message TEXT,
                language TEXT DEFAULT 'ar',
                usage_count INTEGER DEFAULT 0
            )
        `);
        
        // جدول الإعدادات
        await db.asyncRun(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ تم إنشاء الجداول بنجاح\n');
        
        // إدراج البيانات الافتراضية
        console.log('📝 إدراج البيانات الافتراضية...');
        
        // المستخدم الافتراضي
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.asyncRun(
            'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'owner']
        );
        
        // الغرف الافتراضية
        const rooms = ['lobby', 'general', 'gaming', 'music', 'sports'];
        for (const room of rooms) {
            await db.asyncRun(
                'INSERT OR IGNORE INTO rooms (room_name) VALUES (?)',
                [room]
            );
        }
        
        // الرسائل الافتراضية
        const messages = [
            { category: 'greeting', message: 'مرحبا بالجميع! 👋' },
            { category: 'greeting', message: 'السلام عليكم ورحمة الله' },
            { category: 'greeting', message: 'أهلاً وسهلاً' },
            { category: 'chat', message: 'كيف حالكم اليوم؟' },
            { category: 'chat', message: 'الجو جميل اليوم' },
            { category: 'chat', message: 'هل شاهد أحد المباراة أمس؟' },
            { category: 'chat', message: 'أنا أحب هذه الغرفة' },
            { category: 'reaction', message: 'هههههه 😂' },
            { category: 'reaction', message: 'صحيح!' },
            { category: 'reaction', message: 'ممتاز' },
            { category: 'farewell', message: 'إلى اللقاء' },
            { category: 'farewell', message: 'سأعود قريباً' }
        ];
        
        for (const msg of messages) {
            await db.asyncRun(
                'INSERT OR IGNORE INTO bot_messages (category, message) VALUES (?, ?)',
                [msg.category, msg.message]
            );
        }
        
        console.log('✅ تم إدراج البيانات الافتراضية\n');
        
        // إنشاء البوتات
        console.log('🤖 هل تريد إنشاء 300 بوت الآن؟ (نعم/لا)');
        
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('اختيارك: ', async (answer) => {
            if (answer.toLowerCase() === 'نعم' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                console.log('\n🤖 جاري إنشاء 300 بوت...');
                
                const arabicNames = [
                    'أحمد', 'محمد', 'علي', 'حسن', 'خالد', 'عمر', 'سارة', 'فاطمة', 'مريم', 'نور',
                    'يوسف', 'إبراهيم', 'عبدالله', 'عبدالرحمن', 'سلمان', 'فيصل', 'تركي', 'نواف',
                    'ريم', 'دانة', 'لينا', 'هند', 'أمل', 'سلمى', 'زينب', 'عائشة', 'خديجة', 'آلاء'
                ];
                
                for (let i = 1; i <= 300; i++) {
                    const randomName = arabicNames[Math.floor(Math.random() * arabicNames.length)];
                    const botNumber = String(i).padStart(3, '0');
                    const bot_id = `BOT_${botNumber}`;
                    const name = `${randomName}_${botNumber}`;
                    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${bot_id}`;
                    const behavior_type = ['active', 'normal', 'quiet'][Math.floor(Math.random() * 3)];
                    const activity_level = Math.floor(Math.random() * 10) + 1;
                    
                    const settings = JSON.stringify({
                        typing_speed: Math.floor(Math.random() * 3) + 2,
                        response_delay: Math.floor(Math.random() * 5) + 3,
                        personality: ['friendly', 'talkative', 'quiet', 'funny'][Math.floor(Math.random() * 4)]
                    });
                    
                    await db.asyncRun(
                        `INSERT INTO bots (bot_id, name, avatar, behavior_type, activity_level, settings) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [bot_id, name, avatar, behavior_type, activity_level, settings]
                    );
                    
                    if (i % 50 === 0) {
                        console.log(`✅ تم إنشاء ${i} بوت`);
                    }
                }
                
                console.log('✅ تم إنشاء 300 بوت بنجاح!\n');
            }
            
            console.log('\n🎉 تم إعداد النظام بنجاح!\n');
            console.log('📌 معلومات تسجيل الدخول:');
            console.log('   اسم المستخدم: admin');
            console.log('   كلمة المرور: admin123\n');
            console.log('🚀 لبدء النظام، استخدم الأمر: npm run setup && npm start');
            console.log('🤖 لتشغيل مدير البوتات، استخدم الأمر: npm run bot\n');
            
            readline.close();
            db.close();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('\n❌ حدث خطأ أثناء الإعداد:', error.message);
        db.close();
        process.exit(1);
    }
}

// تشغيل الإعداد
setup();
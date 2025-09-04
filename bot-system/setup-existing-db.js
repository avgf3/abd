const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupWithExistingDB() {
    console.log('🔌 ربط النظام بقاعدة البيانات الموجودة...\n');
    
    let connection;
    
    try {
        // الاتصال بقاعدة البيانات الموجودة
        console.log('📊 الاتصال بقاعدة البيانات...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME, // اسم قاعدة بياناتك الموجودة
            multipleStatements: true
        });
        
        console.log('✅ تم الاتصال بنجاح\n');
        
        // إنشاء الجداول المطلوبة فقط (بدون حذف البيانات الموجودة)
        console.log('🔨 إضافة جداول البوتات إلى قاعدة البيانات...');
        
        // جدول البوتات
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bots (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bot_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                avatar VARCHAR(255),
                status ENUM('online', 'offline', 'busy') DEFAULT 'offline',
                current_room VARCHAR(100) DEFAULT 'lobby',
                behavior_type VARCHAR(50) DEFAULT 'normal',
                activity_level INT DEFAULT 5,
                last_activity TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                settings JSON
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        // جدول الغرف (إذا لم يكن موجود)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INT PRIMARY KEY AUTO_INCREMENT,
                room_name VARCHAR(100) UNIQUE NOT NULL,
                room_type VARCHAR(50) DEFAULT 'public',
                max_users INT DEFAULT 100,
                current_users INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        // جدول سجل نشاط البوتات
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bot_activities (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bot_id VARCHAR(50),
                action_type VARCHAR(50),
                room_name VARCHAR(100),
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        // جدول الرسائل المحفوظة للبوتات
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bot_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                category VARCHAR(50),
                message TEXT,
                language VARCHAR(10) DEFAULT 'ar',
                usage_count INT DEFAULT 0
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        // جدول للمشرفين (إذا لم يكن لديك نظام مستخدمين)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS bot_admins (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('owner', 'admin') DEFAULT 'owner',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        console.log('✅ تم إضافة الجداول المطلوبة\n');
        
        // إضافة مستخدم افتراضي للوحة التحكم
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.execute(
            'INSERT IGNORE INTO bot_admins (username, password, role) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'owner']
        );
        
        // إضافة الغرف الافتراضية
        const rooms = ['lobby', 'general', 'gaming', 'music', 'sports'];
        for (const room of rooms) {
            await connection.execute(
                'INSERT IGNORE INTO rooms (room_name) VALUES (?)',
                [room]
            );
        }
        
        // إضافة رسائل افتراضية
        const messages = [
            { category: 'greeting', message: 'مرحبا بالجميع! 👋' },
            { category: 'greeting', message: 'السلام عليكم ورحمة الله' },
            { category: 'chat', message: 'كيف حالكم اليوم؟' },
            { category: 'chat', message: 'الجو جميل اليوم' },
            { category: 'reaction', message: 'هههههه 😂' },
            { category: 'farewell', message: 'إلى اللقاء' }
        ];
        
        for (const msg of messages) {
            await connection.execute(
                'INSERT IGNORE INTO bot_messages (category, message) VALUES (?, ?)',
                [msg.category, msg.message]
            );
        }
        
        // إنشاء البوتات
        console.log('🤖 إنشاء 300 بوت...');
        
        const arabicNames = [
            'أحمد', 'محمد', 'علي', 'حسن', 'خالد', 'عمر', 'سارة', 'فاطمة', 'مريم', 'نور',
            'يوسف', 'إبراهيم', 'عبدالله', 'عبدالرحمن', 'سلمان', 'فيصل', 'تركي', 'نواف'
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
            
            await connection.execute(
                `INSERT INTO bots (bot_id, name, avatar, behavior_type, activity_level, settings) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [bot_id, name, avatar, behavior_type, activity_level, settings]
            );
            
            if (i % 50 === 0) {
                console.log(`✅ تم إنشاء ${i} بوت`);
            }
        }
        
        console.log('\n🎉 تم الإعداد بنجاح!\n');
        console.log('📌 تم إضافة جداول البوتات إلى قاعدة بياناتك الموجودة');
        console.log('📌 معلومات دخول لوحة التحكم:');
        console.log('   اسم المستخدم: admin');
        console.log('   كلمة المرور: admin123\n');
        
        await connection.end();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ خطأ:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

setupWithExistingDB();
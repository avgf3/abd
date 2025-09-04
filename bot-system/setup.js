const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setup() {
    console.log('🚀 بدء إعداد نظام البوتات...\n');
    
    let connection;
    
    try {
        // الاتصال بـ MySQL بدون تحديد قاعدة البيانات
        console.log('📊 الاتصال بخادم MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });
        
        console.log('✅ تم الاتصال بنجاح\n');
        
        // قراءة ملف SQL
        console.log('📄 قراءة ملف قاعدة البيانات...');
        const sqlFile = await fs.readFile(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
        
        // تنفيذ الأوامر
        console.log('🔨 إنشاء قاعدة البيانات والجداول...');
        await connection.query(sqlFile);
        
        console.log('✅ تم إنشاء قاعدة البيانات بنجاح\n');
        
        // التبديل إلى قاعدة البيانات
        await connection.changeUser({ database: process.env.DB_NAME });
        
        // التحقق من وجود المستخدم الافتراضي
        const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if (users.length === 0) {
            console.log('👤 إنشاء المستخدم الافتراضي...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'owner']
            );
            console.log('✅ تم إنشاء المستخدم الافتراضي\n');
        }
        
        // إنشاء البوتات
        console.log('🤖 هل تريد إنشاء 300 بوت الآن؟ (نعم/لا)');
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('اختيارك: ', async (answer) => {
            if (answer.toLowerCase() === 'نعم' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                console.log('\n🤖 جاري إنشاء 300 بوت...');
                const Bot = require('./src/models/Bot');
                await Bot.createMultipleBots(300);
                console.log('✅ تم إنشاء البوتات بنجاح\n');
            }
            
            console.log('\n🎉 تم إعداد النظام بنجاح!\n');
            console.log('📌 معلومات تسجيل الدخول الافتراضية:');
            console.log('   اسم المستخدم: admin');
            console.log('   كلمة المرور: admin123\n');
            console.log('🚀 لبدء النظام، استخدم الأمر: npm start');
            console.log('🤖 لتشغيل مدير البوتات، استخدم الأمر: npm run bot\n');
            
            readline.close();
            await connection.end();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('\n❌ حدث خطأ أثناء الإعداد:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n📌 تأكد من:');
            console.error('   1. تشغيل خادم MySQL');
            console.error('   2. صحة بيانات الاتصال في ملف .env');
        }
        
        if (connection) {
            await connection.end();
        }
        
        process.exit(1);
    }
}

// تشغيل الإعداد
setup();
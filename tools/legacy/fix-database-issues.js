const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// إعداد الاتصال بقاعدة البيانات
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ متغير DATABASE_URL غير محدد');
    process.exit(1);
}

const client = new Client({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixDatabaseIssues() {
    try {
        console.log('🔧 بدء إصلاح مشاكل قاعدة البيانات...');
        
        await client.connect();
        console.log('✅ تم الاتصال بقاعدة البيانات');

        // 1. إضافة عمود profile_effect إذا لم يكن موجوداً
        console.log('🔧 التحقق من عمود profile_effect...');
        
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'profile_effect'
        `;
        
        const columnExists = await client.query(checkColumnQuery);
        
        if (columnExists.rows.length === 0) {
            console.log('➕ إضافة عمود profile_effect...');
            await client.query('ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT \'none\'');
            console.log('✅ تم إضافة عمود profile_effect');
        } else {
            console.log('✅ عمود profile_effect موجود بالفعل');
        }

        // 2. تحديث المستخدمين الذين لديهم قيم NULL
        console.log('🔧 تحديث القيم الفارغة لـ profile_effect...');
        await client.query('UPDATE users SET profile_effect = \'none\' WHERE profile_effect IS NULL');
        console.log('✅ تم تحديث القيم الفارغة');

        // 3. التحقق من جدول level_settings وإنشاؤه إذا لم يكن موجوداً
        console.log('🔧 التحقق من جدول level_settings...');
        
        const createLevelSettingsQuery = `
            CREATE TABLE IF NOT EXISTS level_settings (
                id SERIAL PRIMARY KEY,
                level INTEGER NOT NULL UNIQUE,
                required_points INTEGER NOT NULL,
                title TEXT NOT NULL,
                color TEXT DEFAULT '#FFFFFF',
                benefits JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;
        
        await client.query(createLevelSettingsQuery);
        console.log('✅ جدول level_settings جاهز');

        // 4. إدراج البيانات الافتراضية للمستويات
        console.log('🔧 إضافة المستويات الافتراضية...');
        
        const insertLevelsQuery = `
            INSERT INTO level_settings (level, required_points, title, color, benefits)
            VALUES 
                (1, 0, 'مبتدئ', '#808080', '{"description": "مستوى البداية"}'),
                (2, 100, 'نشيط', '#4169E1', '{"description": "عضو نشيط"}'),
                (3, 500, 'متقدم', '#32CD32', '{"description": "عضو متقدم"}'),
                (4, 1000, 'خبير', '#FFD700', '{"description": "عضو خبير"}'),
                (5, 2000, 'نجم', '#FF4500', '{"description": "عضو نجم"}')
            ON CONFLICT (level) DO NOTHING
        `;
        
        await client.query(insertLevelsQuery);
        console.log('✅ تم إضافة المستويات الافتراضية');

        // 5. التحقق من وجود أعمدة النقاط والمستويات في جدول users
        console.log('🔧 التحقق من أعمدة النقاط والمستويات...');
        
        const requiredColumns = ['points', 'level', 'total_points', 'level_progress'];
        
        for (const column of requiredColumns) {
            const checkQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = '${column}'
            `;
            
            const exists = await client.query(checkQuery);
            
            if (exists.rows.length === 0) {
                let defaultValue = '0';
                if (column === 'level') defaultValue = '1';
                
                console.log(`➕ إضافة عمود ${column}...`);
                await client.query(`ALTER TABLE users ADD COLUMN ${column} INTEGER DEFAULT ${defaultValue}`);
                console.log(`✅ تم إضافة عمود ${column}`);
            } else {
                console.log(`✅ عمود ${column} موجود بالفعل`);
            }
        }

        // 6. التحقق من جدول points_history
        console.log('🔧 التحقق من جدول points_history...');
        
        const createPointsHistoryQuery = `
            CREATE TABLE IF NOT EXISTS points_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                points INTEGER NOT NULL,
                reason TEXT NOT NULL,
                action TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        
        await client.query(createPointsHistoryQuery);
        console.log('✅ جدول points_history جاهز');

        // 7. إصلاح القيم الفارغة أو NULL في أعمدة النقاط
        console.log('🔧 إصلاح القيم الفارغة في أعمدة النقاط...');
        
        await client.query(`
            UPDATE users 
            SET 
                points = COALESCE(points, 0),
                level = COALESCE(level, 1),
                total_points = COALESCE(total_points, 0),
                level_progress = COALESCE(level_progress, 0)
            WHERE 
                points IS NULL 
                OR level IS NULL 
                OR total_points IS NULL 
                OR level_progress IS NULL
        `);
        
        console.log('✅ تم إصلاح القيم الفارغة');

        // 8. التحقق من البيانات النهائية
        console.log('📊 فحص البيانات النهائية...');
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE profile_effect IS NOT NULL) as users_with_effect,
                COUNT(*) FILTER (WHERE points IS NOT NULL) as users_with_points
            FROM users
        `;
        
        const stats = await client.query(statsQuery);
        console.log('📊 إحصائيات:', stats.rows[0]);

        console.log('✅ تم إكمال جميع الإصلاحات بنجاح!');
        
    } catch (error) {
        console.error('❌ خطأ في إصلاح قاعدة البيانات:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 تم قطع الاتصال من قاعدة البيانات');
    }
}

// تشغيل الإصلاحات
if (require.main === module) {
    fixDatabaseIssues()
        .then(() => {
            console.log('🎉 تم إكمال جميع الإصلاحات بنجاح!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 فشل في الإصلاحات:', error);
            process.exit(1);
        });
}

module.exports = { fixDatabaseIssues };
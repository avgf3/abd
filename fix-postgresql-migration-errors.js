import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fixPostgreSQLMigrationErrors() {
    console.log('🔧 إصلاح أخطاء الهجرة في PostgreSQL...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL غير محدد');
        return;
    }

    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ متصل بقاعدة البيانات');

        // 1. فحص وجود جدول level_settings
        console.log('🔍 فحص جدول level_settings...');
        const checkTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'level_settings'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('⚠️ جدول level_settings موجود، سيتم إعادة إنشاؤه...');
            
            // حذف الجدول الموجود
            await client.query('DROP TABLE IF EXISTS level_settings CASCADE;');
            console.log('🗑️ تم حذف الجدول القديم');
        }

        // 2. إنشاء جدول level_settings جديد
        console.log('🆕 إنشاء جدول level_settings جديد...');
        await client.query(`
            CREATE TABLE level_settings (
                id SERIAL PRIMARY KEY,
                level INTEGER NOT NULL UNIQUE,
                required_points INTEGER NOT NULL,
                title TEXT NOT NULL,
                color TEXT DEFAULT '#FFFFFF',
                benefits JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 3. إدراج البيانات الافتراضية
        console.log('📝 إدراج البيانات الافتراضية...');
        await client.query(`
            INSERT INTO level_settings (level, required_points, title, color, benefits) VALUES
            (1, 0, 'مبتدئ', '#808080', '{"description": "مستوى البداية", "features": ["دردشة أساسية"]}'),
            (2, 100, 'نشيط', '#4169E1', '{"description": "عضو نشيط", "features": ["دردشة", "صور شخصية"]}'),
            (3, 500, 'متقدم', '#32CD32', '{"description": "عضو متقدم", "features": ["دردشة", "تأثيرات", "ألوان"]}'),
            (4, 1000, 'خبير', '#FFD700', '{"description": "عضو خبير", "features": ["جميع المميزات", "شارات خاصة"]}'),
            (5, 2000, 'نجم', '#FF4500', '{"description": "عضو نجم", "features": ["جميع المميزات", "تأثيرات ذهبية"]}'),
            (6, 5000, 'أسطورة', '#9400D3', '{"description": "عضو أسطوري", "features": ["جميع المميزات", "تأثيرات خاصة"]}');
        `);

        // 4. فحص وإصلاح أعمدة المستخدمين المفقودة
        console.log('🔍 فحص أعمدة جدول users...');
        const requiredColumns = [
            { name: 'profile_effect', type: 'TEXT', default: "'none'" },
            { name: 'points', type: 'INTEGER', default: '0' },
            { name: 'level', type: 'INTEGER', default: '1' },
            { name: 'total_points', type: 'INTEGER', default: '0' },
            { name: 'level_progress', type: 'INTEGER', default: '0' }
        ];

        for (const column of requiredColumns) {
            const checkColumn = await client.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = $1;
            `, [column.name]);

            if (checkColumn.rows.length === 0) {
                console.log(`➕ إضافة عمود ${column.name}...`);
                await client.query(`
                    ALTER TABLE users ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default};
                `);
                console.log(`✅ تم إضافة عمود ${column.name}`);
            } else {
                console.log(`✅ عمود ${column.name} موجود`);
            }
        }

        // 5. تحديث القيم الفارغة
        console.log('🔄 تحديث القيم الفارغة...');
        await client.query(`
            UPDATE users SET 
                profile_effect = COALESCE(profile_effect, 'none'),
                points = COALESCE(points, 0),
                level = COALESCE(level, 1),
                total_points = COALESCE(total_points, 0),
                level_progress = COALESCE(level_progress, 0)
            WHERE profile_effect IS NULL OR points IS NULL OR level IS NULL 
               OR total_points IS NULL OR level_progress IS NULL;
        `);

        // 6. فحص جدول __drizzle_migrations وإصلاحه
        console.log('🔍 فحص جدول الهجرات...');
        await client.query(`
            CREATE SCHEMA IF NOT EXISTS drizzle;
        `);

        const checkMigrations = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'drizzle' 
                AND table_name = '__drizzle_migrations'
            );
        `);

        if (!checkMigrations.rows[0].exists) {
            console.log('🆕 إنشاء جدول الهجرات...');
            await client.query(`
                CREATE TABLE drizzle.__drizzle_migrations (
                    id SERIAL PRIMARY KEY,
                    hash TEXT NOT NULL,
                    created_at BIGINT
                );
            `);
        }

        // 7. تسجيل الهجرة الحالية
        await client.query(`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at) 
            VALUES ('level_settings_fix_' || extract(epoch from now()), extract(epoch from now())::bigint)
            ON CONFLICT DO NOTHING;
        `);

        console.log('✅ تم إصلاح جميع أخطاء الهجرة بنجاح!');
        
        // فحص نهائي
        const finalCheck = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM level_settings) as level_settings_count,
                (SELECT COUNT(*) FROM users) as users_count;
        `);
        
        console.log('📊 النتائج النهائية:');
        console.log(`   - إعدادات المستويات: ${finalCheck.rows[0].level_settings_count}`);
        console.log(`   - المستخدمين: ${finalCheck.rows[0].users_count}`);

    } catch (error) {
        console.error('❌ خطأ في إصلاح الهجرة:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 تم قطع الاتصال');
    }
}

// تشغيل الإصلاح
if (import.meta.url === `file://${process.argv[1]}`) {
    fixPostgreSQLMigrationErrors()
        .then(() => {
            console.log('🎉 تم إصلاح أخطاء الهجرة بنجاح!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 فشل في إصلاح أخطاء الهجرة:', error);
            process.exit(1);
        });
}

export default fixPostgreSQLMigrationErrors;
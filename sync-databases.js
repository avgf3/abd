import pkg from 'pg';
const { Client } = pkg;
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

async function syncDatabases() {
    console.log('🔄 مزامنة البيانات من PostgreSQL إلى SQLite...\n');

    // الاتصال بـ PostgreSQL
    const pgClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // الاتصال بـ SQLite
    const sqliteDb = new Database('./chat.db');

    try {
        await pgClient.connect();
        console.log('✅ متصل بـ PostgreSQL');
        console.log('✅ متصل بـ SQLite');

        // جلب جميع المستخدمين من PostgreSQL
        console.log('\n📥 جلب المستخدمين من PostgreSQL...');
        const pgUsers = await pgClient.query(`
            SELECT 
                id, username, password, user_type, role,
                profile_image, profile_banner, profile_background_color,
                status, gender, age, country, relation, bio,
                is_online, is_hidden, last_seen, join_date, created_at,
                is_muted, mute_expiry, is_banned, ban_expiry, is_blocked,
                ip_address, device_id, ignored_users, username_color,
                profile_effect, points, level, total_points, level_progress
            FROM users 
            ORDER BY id
        `);

        console.log(`📊 وُجد ${pgUsers.rows.length} مستخدم في PostgreSQL`);

        if (pgUsers.rows.length === 0) {
            console.log('❌ لا يوجد مستخدمين في PostgreSQL للمزامنة');
            return;
        }

        // حذف المستخدمين الموجودين في SQLite (ما عدا الضيوف ID >= 1000)
        console.log('\n🗑️ حذف المستخدمين الموجودين في SQLite...');
        sqliteDb.exec('DELETE FROM users WHERE id < 1000');
        console.log('✅ تم حذف المستخدمين القدامى');

        // إعداد استعلام الإدراج
        const insertStmt = sqliteDb.prepare(`
            INSERT OR REPLACE INTO users (
                id, username, password, user_type, role,
                profile_image, profile_banner, profile_background_color,
                status, gender, age, country, relation, bio,
                is_online, is_hidden, last_seen, join_date, created_at,
                is_muted, mute_expiry, is_banned, ban_expiry, is_blocked,
                ip_address, device_id, ignored_users, username_color,
                profile_effect, points, level, total_points, level_progress
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // نسخ كل مستخدم
        console.log('\n📤 نسخ المستخدمين إلى SQLite...');
        let successCount = 0;
        let errorCount = 0;

        for (const user of pgUsers.rows) {
            try {
                insertStmt.run(
                    user.id,
                    user.username,
                    user.password,
                    user.user_type,
                    user.role,
                    user.profile_image,
                    user.profile_banner,
                    user.profile_background_color,
                    user.status,
                    user.gender,
                    user.age,
                    user.country,
                    user.relation,
                    user.bio,
                    user.is_online ? 1 : 0,
                    user.is_hidden ? 1 : 0,
                    user.last_seen ? user.last_seen.toISOString() : null,
                    user.join_date ? user.join_date.toISOString() : null,
                    user.created_at ? user.created_at.toISOString() : null,
                    user.is_muted ? 1 : 0,
                    user.mute_expiry ? user.mute_expiry.toISOString() : null,
                    user.is_banned ? 1 : 0,
                    user.ban_expiry ? user.ban_expiry.toISOString() : null,
                    user.is_blocked ? 1 : 0,
                    user.ip_address,
                    user.device_id,
                    user.ignored_users || '[]',
                    user.username_color || '#FFFFFF',
                    user.profile_effect || 'none',
                    user.points || 0,
                    user.level || 1,
                    user.total_points || 0,
                    user.level_progress || 0
                );
                
                successCount++;
                console.log(`✅ نسخ: ${user.username} (ID: ${user.id})`);
                
            } catch (error) {
                errorCount++;
                console.log(`❌ فشل نسخ: ${user.username} - ${error.message}`);
            }
        }

        // التحقق من النتائج
        console.log('\n📊 نتائج المزامنة:');
        console.log(`✅ نجح: ${successCount} مستخدم`);
        console.log(`❌ فشل: ${errorCount} مستخدم`);

        // فحص SQLite بعد المزامنة
        console.log('\n🔍 فحص SQLite بعد المزامنة...');
        const sqliteUsers = sqliteDb.prepare('SELECT id, username, user_type FROM users ORDER BY id').all();
        
        console.log('👥 المستخدمين في SQLite:');
        sqliteUsers.forEach(user => {
            console.log(`   - ${user.username} (ID: ${user.id}, نوع: ${user.user_type})`);
        });

        console.log('\n🎉 تمت المزامنة بنجاح!');
        console.log('💡 الآن يمكن تسجيل الدخول بجميع المستخدمين');

    } catch (error) {
        console.error('❌ خطأ في المزامنة:', error.message);
        throw error;
    } finally {
        await pgClient.end();
        sqliteDb.close();
        console.log('\n🔌 تم قطع الاتصال من قواعد البيانات');
    }
}

// تشغيل المزامنة
if (import.meta.url === `file://${process.argv[1]}`) {
    syncDatabases()
        .then(() => {
            console.log('\n✅ انتهت المزامنة بنجاح!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 فشلت المزامنة:', error);
            process.exit(1);
        });
}

export default syncDatabases;
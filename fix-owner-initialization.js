import pkg from 'pg';
const { Client } = pkg;
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

class OwnerInitializationFixer {
    constructor() {
        this.pgClient = null;
        this.sqliteDb = null;
    }

    async connectPostgreSQL() {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl || !databaseUrl.startsWith('postgresql://')) {
            return null;
        }

        try {
            this.pgClient = new Client({
                connectionString: databaseUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000
            });

            await this.pgClient.connect();
            console.log('✅ متصل بـ PostgreSQL');
            return this.pgClient;
        } catch (error) {
            console.error('⚠️ فشل الاتصال بـ PostgreSQL:', error.message);
            return null;
        }
    }

    connectSQLite() {
        try {
            const dbPath = './chat.db';
            this.sqliteDb = new Database(dbPath);
            console.log('✅ متصل بـ SQLite');
            return this.sqliteDb;
        } catch (error) {
            console.error('⚠️ فشل الاتصال بـ SQLite:', error.message);
            return null;
        }
    }

    async initializeOwnerInPostgreSQL() {
        if (!this.pgClient) return false;

        try {
            console.log('🔧 تهيئة المالك في PostgreSQL...');

            // فحص وجود المالك الأساسي
            const ownerCheck = await this.pgClient.query(`
                SELECT id, username FROM users 
                WHERE username IN ('عبدالكريم', 'المالك') 
                OR user_type = 'owner' 
                ORDER BY id ASC
            `);

            if (ownerCheck.rows.length > 0) {
                console.log('✅ المالك موجود في PostgreSQL:', ownerCheck.rows[0]);
                return true;
            }

            // إنشاء المالك الأساسي
            console.log('🆕 إنشاء المالك الأساسي...');
            await this.pgClient.query(`
                INSERT INTO users (
                    username, password, user_type, role, profile_image, 
                    status, gender, age, country, relation, bio,
                    profile_background_color, username_color, user_theme,
                    is_online, is_hidden, is_muted, is_banned, is_blocked,
                    join_date, created_at, last_seen, ignored_users,
                    profile_effect, points, level, total_points, level_progress
                ) VALUES (
                    'عبدالكريم', 'عبدالكريم22333', 'owner', 'owner', '/default_avatar.svg',
                    'مالك الموقع', 'ذكر', 30, 'السعودية', 'مرتبط', 'مالك الموقع',
                    '#3c0d0d', '#FFD700', 'default',
                    false, false, false, false, false,
                    NOW(), NOW(), NOW(), '[]',
                    'golden', 50000, 10, 50000, 100
                )
                ON CONFLICT (username) DO UPDATE SET
                    user_type = 'owner',
                    role = 'owner',
                    status = 'مالك الموقع',
                    profile_effect = 'golden',
                    points = 50000,
                    level = 10
            `);

            // إنشاء المشرف المساعد
            console.log('🆕 إنشاء المشرف المساعد...');
            await this.pgClient.query(`
                INSERT INTO users (
                    username, password, user_type, role, profile_image,
                    status, gender, age, country, relation, bio,
                    profile_background_color, username_color, user_theme,
                    is_online, is_hidden, is_muted, is_banned, is_blocked,
                    join_date, created_at, last_seen, ignored_users,
                    profile_effect, points, level, total_points, level_progress
                ) VALUES (
                    'عبود', '22333', 'owner', 'owner', '/default_avatar.svg',
                    'مشرف مؤقت', 'ذكر', 25, 'العراق', 'أعزب', 'مشرف مؤقت',
                    '#3c0d0d', '#FF4500', 'default',
                    false, false, false, false, false,
                    NOW(), NOW(), NOW(), '[]',
                    'diamond', 25000, 8, 25000, 80
                )
                ON CONFLICT (username) DO UPDATE SET
                    user_type = 'owner',
                    role = 'owner',
                    status = 'مشرف مؤقت',
                    profile_effect = 'diamond',
                    points = 25000,
                    level = 8
            `);

            console.log('✅ تم إنشاء المالك والمشرف في PostgreSQL');
            return true;

        } catch (error) {
            console.error('❌ خطأ في تهيئة المالك في PostgreSQL:', error.message);
            return false;
        }
    }

    initializeOwnerInSQLite() {
        if (!this.sqliteDb) return false;

        try {
            console.log('🔧 تهيئة المالك في SQLite...');

            // فحص وجود المالك
            const ownerCheck = this.sqliteDb.prepare(`
                SELECT id, username FROM users 
                WHERE username IN ('المالك', 'عبدالكريم') 
                OR user_type = 'owner'
            `).all();

            if (ownerCheck.length > 0) {
                console.log('✅ المالك موجود في SQLite:', ownerCheck[0]);
                return true;
            }

            // إنشاء المالك
            console.log('🆕 إنشاء المالك في SQLite...');
            const insertOwner = this.sqliteDb.prepare(`
                INSERT OR REPLACE INTO users (
                    username, password, user_type, role, profile_image,
                    status, gender, age, country, relation, bio,
                    profile_background_color, username_color, user_theme,
                    is_online, is_hidden, is_muted, is_banned, is_blocked,
                    join_date, created_at, last_seen, ignored_users,
                    profile_effect, points, level, total_points, level_progress
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertOwner.run(
                'المالك', 'owner123', 'owner', 'owner', '/default_avatar.svg',
                'مالك الموقع', 'ذكر', 30, 'السعودية', 'مرتبط', 'مالك الموقع',
                '#3c0d0d', '#FFD700', 'default',
                0, 0, 0, 0, 0,
                new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), '[]',
                'golden', 50000, 10, 50000, 100
            );

            console.log('✅ تم إنشاء المالك في SQLite');
            return true;

        } catch (error) {
            console.error('❌ خطأ في تهيئة المالك في SQLite:', error.message);
            return false;
        }
    }

    async verifyOwnerInitialization() {
        console.log('🔍 التحقق من تهيئة المالك...');
        
        let postgresqlSuccess = false;
        let sqliteSuccess = false;

        // التحقق من PostgreSQL
        if (this.pgClient) {
            try {
                const pgOwners = await this.pgClient.query(`
                    SELECT id, username, user_type, role, status 
                    FROM users 
                    WHERE user_type = 'owner' 
                    ORDER BY id
                `);
                
                if (pgOwners.rows.length > 0) {
                    console.log('✅ المالكين في PostgreSQL:');
                    pgOwners.rows.forEach(owner => {
                        console.log(`   - ${owner.username} (ID: ${owner.id}) - ${owner.status}`);
                    });
                    postgresqlSuccess = true;
                } else {
                    console.log('⚠️ لا يوجد مالكين في PostgreSQL');
                }
            } catch (error) {
                console.error('❌ خطأ في فحص PostgreSQL:', error.message);
            }
        }

        // التحقق من SQLite
        if (this.sqliteDb) {
            try {
                const sqliteOwners = this.sqliteDb.prepare(`
                    SELECT id, username, user_type, role, status 
                    FROM users 
                    WHERE user_type = 'owner' 
                    ORDER BY id
                `).all();
                
                if (sqliteOwners.length > 0) {
                    console.log('✅ المالكين في SQLite:');
                    sqliteOwners.forEach(owner => {
                        console.log(`   - ${owner.username} (ID: ${owner.id}) - ${owner.status || 'مالك الموقع'}`);
                    });
                    sqliteSuccess = true;
                } else {
                    console.log('⚠️ لا يوجد مالكين في SQLite');
                }
            } catch (error) {
                console.error('❌ خطأ في فحص SQLite:', error.message);
            }
        }

        return { postgresqlSuccess, sqliteSuccess };
    }

    async disconnect() {
        if (this.pgClient) {
            try {
                await this.pgClient.end();
                console.log('🔌 تم قطع الاتصال من PostgreSQL');
            } catch (error) {
                console.error('⚠️ خطأ في قطع الاتصال من PostgreSQL:', error.message);
            }
        }

        if (this.sqliteDb) {
            try {
                this.sqliteDb.close();
                console.log('🔌 تم قطع الاتصال من SQLite');
            } catch (error) {
                console.error('⚠️ خطأ في قطع الاتصال من SQLite:', error.message);
            }
        }
    }
}

async function fixOwnerInitializationIssues() {
    console.log('🔧 إصلاح مشاكل تهيئة المالك...');
    
    const fixer = new OwnerInitializationFixer();
    
    try {
        // الاتصال بقواعد البيانات
        await fixer.connectPostgreSQL();
        fixer.connectSQLite();

        // تهيئة المالك في كلا القاعدتين
        const postgresqlResult = await fixer.initializeOwnerInPostgreSQL();
        const sqliteResult = fixer.initializeOwnerInSQLite();

        // التحقق من النتائج
        const verification = await fixer.verifyOwnerInitialization();

        console.log('📊 نتائج الإصلاح:');
        console.log(`   - PostgreSQL: ${postgresqlResult ? '✅ نجح' : '❌ فشل'}`);
        console.log(`   - SQLite: ${sqliteResult ? '✅ نجح' : '❌ فشل'}`);
        
        if (verification.postgresqlSuccess || verification.sqliteSuccess) {
            console.log('✅ تم إصلاح مشاكل تهيئة المالك بنجاح!');
            
            // إنشاء ملف تعليمات تسجيل الدخول
            const loginInstructions = `
# 🔑 معلومات تسجيل الدخول للمالكين

## PostgreSQL:
- **المالك الرئيسي**: عبدالكريم / عبدالكريم22333
- **المشرف**: عبود / 22333

## SQLite:
- **المالك**: المالك / owner123

## ملاحظات:
- تم إصلاح جميع مشاكل تهيئة المالك
- يمكن الآن تسجيل الدخول بأي من الحسابات أعلاه
- تم إعطاء المالكين نقاط ومستويات عالية
- تم تفعيل التأثيرات الخاصة للمالكين
            `;
            
            // حفظ التعليمات في ملف
            import('fs').then(fs => {
                fs.writeFileSync('owner-login-info.md', loginInstructions);
                console.log('📝 تم حفظ معلومات تسجيل الدخول في owner-login-info.md');
            });
            
        } else {
            console.log('❌ فشل في إصلاح مشاكل تهيئة المالك');
        }

    } catch (error) {
        console.error('❌ خطأ عام في إصلاح تهيئة المالك:', error.message);
        throw error;
    } finally {
        await fixer.disconnect();
    }
}

// تشغيل الإصلاح
if (import.meta.url === `file://${process.argv[1]}`) {
    fixOwnerInitializationIssues()
        .then(() => {
            console.log('🎉 تم إصلاح مشاكل تهيئة المالك بنجاح!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 فشل في إصلاح مشاكل تهيئة المالك:', error);
            process.exit(1);
        });
}

export { OwnerInitializationFixer, fixOwnerInitializationIssues };
export default fixOwnerInitializationIssues;
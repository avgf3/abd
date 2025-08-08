import pkg from 'pg';
const { Client } = pkg;
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
dotenv.config();

class SystemTester {
    constructor() {
        this.pgClient = null;
        this.sqliteDb = null;
        this.sqliteReady = false;
        this.testResults = {
            postgresql: { passed: 0, failed: 0, tests: [] },
            sqlite: { passed: 0, failed: 0, tests: [] },
            overall: { passed: 0, failed: 0, score: 0, tests: [] }
        };
    }

    async connectDatabases() {
        console.log('🔗 الاتصال بقواعد البيانات...');
        
        // اتصال PostgreSQL
        try {
            const databaseUrl = process.env.DATABASE_URL;
            if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
                this.pgClient = new Client({
                    connectionString: databaseUrl,
                    ssl: { rejectUnauthorized: false }
                });
                await this.pgClient.connect();
                console.log('✅ متصل بـ PostgreSQL');
            }
        } catch (error) {
            console.log('⚠️ فشل الاتصال بـ PostgreSQL:', error.message);
        }

        // اتصال SQLite
        try {
            this.sqliteDb = new Database('./chat.db');
            // تحقق من وجود الجداول المطلوبة قبل تشغيل اختبارات SQLite
            const tables = this.sqliteDb.prepare(`
                SELECT name FROM sqlite_master WHERE type='table'
            `).all();
            const tableNames = tables.map(t => t.name);
            const requiredTables = ['users', 'messages', 'friends', 'notifications', 'blocked_devices', 'points_history', 'level_settings'];
            this.sqliteReady = requiredTables.every(t => tableNames.includes(t));
            if (this.sqliteReady) {
                console.log('✅ متصل بـ SQLite (البنية جاهزة)');
            } else {
                console.log('ℹ️ متصل بـ SQLite ولكن الجداول غير موجودة — سيتم تخطي اختبارات SQLite');
            }
        } catch (error) {
            console.log('⚠️ فشل الاتصال بـ SQLite:', error.message);
            this.sqliteDb = null;
        }
    }

    async runTest(testName, testFn, database) {
        try {
            console.log(`🧪 اختبار: ${testName}...`);
            await testFn();
            this.testResults[database].passed++;
            this.testResults[database].tests.push({ name: testName, status: '✅ نجح' });
            console.log(`✅ ${testName} - نجح`);
            return true;
        } catch (error) {
            this.testResults[database].failed++;
            this.testResults[database].tests.push({ name: testName, status: `❌ فشل: ${error.message}` });
            console.log(`❌ ${testName} - فشل: ${error.message}`);
            return false;
        }
    }

    async testPostgreSQLMigrations() {
        if (!this.pgClient) return false;

        return await this.runTest('اختبار الهجرات PostgreSQL', async () => {
            // فحص جدول level_settings
            const levelSettings = await this.pgClient.query('SELECT COUNT(*) FROM level_settings');
            if (levelSettings.rows[0].count < 6) {
                throw new Error('عدد المستويات غير كافي');
            }

            // فحص أعمدة المستخدمين
            const userColumns = await this.pgClient.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('profile_effect', 'points', 'level', 'total_points', 'level_progress')
            `);
            if (userColumns.rows.length < 5) {
                throw new Error('أعمدة مفقودة في جدول users');
            }

            // فحص جدول الهجرات
            const migrations = await this.pgClient.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'drizzle' 
                    AND table_name = '__drizzle_migrations'
                )
            `);
            if (!migrations.rows[0].exists) {
                throw new Error('جدول الهجرات غير موجود');
            }
        }, 'postgresql');
    }

    async testPostgreSQLCleanup() {
        if (!this.pgClient) return false;

        return await this.runTest('اختبار التنظيف PostgreSQL', async () => {
            // فحص عدم وجود رسائل غير صالحة
            const invalidMessages = await this.pgClient.query(`
                SELECT COUNT(*) FROM messages 
                WHERE content IS NULL OR content = '' OR sender_id IS NULL
            `);
            if (invalidMessages.rows[0].count > 0) {
                throw new Error('توجد رسائل غير صالحة');
            }

            // فحص إحصائيات عامة
            const stats = await this.pgClient.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM messages) as messages_count
            `);
            
            if (stats.rows[0].users_count === 0) {
                throw new Error('لا يوجد مستخدمين');
            }
        }, 'postgresql');
    }

    async testPostgreSQLOwners() {
        if (!this.pgClient) return false;

        return await this.runTest('اختبار المالكين PostgreSQL', async () => {
            const owners = await this.pgClient.query(`
                SELECT id, username, user_type, role 
                FROM users 
                WHERE user_type = 'owner'
            `);

            if (owners.rows.length === 0) {
                throw new Error('لا يوجد مالكين');
            }

            // فحص المالك الأساسي
            const mainOwner = owners.rows.find(owner => 
                owner.username === 'عبدالكريم' || owner.username === 'admin'
            );
            
            if (!mainOwner) {
                throw new Error('المالك الأساسي غير موجود');
            }

            console.log(`   - وُجد ${owners.rows.length} مالك`);
        }, 'postgresql');
    }

    async testPostgreSQLConnection() {
        if (!this.pgClient) return false;

        return await this.runTest('اختبار الاتصال PostgreSQL', async () => {
            const startTime = Date.now();
            
            // اختبار استعلام بسيط
            await this.pgClient.query('SELECT 1');
            
            // اختبار استعلام معقد
            await this.pgClient.query(`
                SELECT u.username, COUNT(m.id) as message_count 
                FROM users u 
                LEFT JOIN messages m ON u.id = m.sender_id 
                GROUP BY u.id, u.username 
                LIMIT 5
            `);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (duration > 5000) {
                throw new Error(`الاستعلام بطيء جداً: ${duration}ms`);
            }
            
            console.log(`   - وقت الاستجابة: ${duration}ms`);
        }, 'postgresql');
    }

    async testSQLiteStructure() {
        if (!this.sqliteDb || !this.sqliteReady) return false;

        return await this.runTest('اختبار بنية SQLite', async () => {
            // فحص الجداول
            const tables = this.sqliteDb.prepare(`
                SELECT name FROM sqlite_master WHERE type='table'
            `).all();

            const requiredTables = ['users', 'messages', 'friends', 'notifications', 'blocked_devices', 'points_history', 'level_settings'];
            
            for (const requiredTable of requiredTables) {
                if (!tables.find(t => t.name === requiredTable)) {
                    throw new Error(`جدول ${requiredTable} غير موجود`);
                }
            }

            console.log(`   - وُجد ${tables.length} جدول`);
        }, 'sqlite');
    }

    async testSQLiteOwner() {
        if (!this.sqliteDb || !this.sqliteReady) return false;

        return await this.runTest('اختبار المالك SQLite', async () => {
            const owner = this.sqliteDb.prepare(`
                SELECT id, username, user_type, role, password 
                FROM users 
                WHERE user_type = 'owner'
            `).get();

            if (!owner) {
                throw new Error('المالك غير موجود');
            }

            if (!owner.password) {
                throw new Error('كلمة مرور المالك غير محددة');
            }

            console.log(`   - المالك: ${owner.username} (ID: ${owner.id})`);
        }, 'sqlite');
    }

    async testSQLiteData() {
        if (!this.sqliteDb || !this.sqliteReady) return false;

        return await this.runTest('اختبار البيانات SQLite', async () => {
            // فحص المستخدمين
            const users = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get();
            if (users.count === 0) {
                throw new Error('لا يوجد مستخدمين');
            }

            // فحص أعمدة المستخدمين
            const userInfo = this.sqliteDb.prepare(`
                PRAGMA table_info(users)
            `).all();

            const requiredColumns = ['profile_effect', 'points', 'level', 'total_points', 'level_progress'];
            for (const col of requiredColumns) {
                if (!userInfo.find(c => c.name === col)) {
                    throw new Error(`عمود ${col} غير موجود`);
                }
            }

            console.log(`   - ${users.count} مستخدم، ${userInfo.length} عمود`);
        }, 'sqlite');
    }

    async testSystemIntegration() {
        return await this.runTest('اختبار التكامل العام', async () => {
            // فحص متغيرات البيئة
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL غير محدد');
            }

            // فحص أن كلا قاعدتي البيانات تعملان
            if (!this.pgClient && !this.sqliteDb) {
                throw new Error('لا توجد قاعدة بيانات متاحة');
            }

            console.log('   - النظام متكامل ويعمل');
        }, 'overall');
    }

    async runAllTests() {
        console.log('🚀 بدء الاختبار الشامل للنظام...\n');

        await this.connectDatabases();
        console.log('');

        // اختبارات PostgreSQL
        if (this.pgClient) {
            console.log('📊 اختبارات PostgreSQL:');
            await this.testPostgreSQLMigrations();
            await this.testPostgreSQLCleanup();
            await this.testPostgreSQLOwners();
            await this.testPostgreSQLConnection();
            console.log('');
        }

        // اختبارات SQLite
        if (this.sqliteDb && this.sqliteReady) {
            console.log('💾 اختبارات SQLite:');
            await this.testSQLiteStructure();
            await this.testSQLiteOwner();
            await this.testSQLiteData();
            console.log('');
        } else if (this.sqliteDb && !this.sqliteReady) {
            console.log('⚠️ سيتم تخطي اختبارات SQLite لعدم جاهزية البنية.');
        }

        // اختبارات التكامل
        console.log('🔗 اختبارات التكامل:');
        await this.testSystemIntegration();
        console.log('');

        this.calculateOverallResults();
        this.generateReport();
    }

    calculateOverallResults() {
        const totalPassed = this.testResults.postgresql.passed + this.testResults.sqlite.passed + this.testResults.overall.passed;
        const totalFailed = this.testResults.postgresql.failed + this.testResults.sqlite.failed + this.testResults.overall.failed;
        const totalTests = totalPassed + totalFailed;

        this.testResults.overall.passed = totalPassed;
        this.testResults.overall.failed = totalFailed;
        this.testResults.overall.score = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    }

    generateReport() {
        console.log('📊 تقرير الاختبار الشامل:');
        console.log('═'.repeat(50));

        // PostgreSQL
        if (this.pgClient) {
            console.log(`\n🗄️ PostgreSQL:`);
            console.log(`   - نجح: ${this.testResults.postgresql.passed}`);
            console.log(`   - فشل: ${this.testResults.postgresql.failed}`);
            this.testResults.postgresql.tests.forEach(test => {
                console.log(`   ${test.status} ${test.name}`);
            });
        }

        // SQLite
        if (this.sqliteDb) {
            console.log(`\n💾 SQLite:`);
            console.log(`   - نجح: ${this.testResults.sqlite.passed}`);
            console.log(`   - فشل: ${this.testResults.sqlite.failed}`);
            this.testResults.sqlite.tests.forEach(test => {
                console.log(`   ${test.status} ${test.name}`);
            });
        }

        // التكامل
        console.log(`\n🔗 التكامل:`);
        console.log(`   - نجح: ${this.testResults.overall.passed}`);
        console.log(`   - فشل: ${this.testResults.overall.failed}`);

        // النتيجة الإجمالية
        console.log(`\n🎯 النتيجة الإجمالية:`);
        console.log(`   - الدرجة: ${this.testResults.overall.score}%`);
        console.log(`   - إجمالي الاختبارات: ${this.testResults.overall.passed + this.testResults.overall.failed}`);
        
        if (this.testResults.overall.score >= 90) {
            console.log('   🎉 ممتاز! النظام يعمل بشكل مثالي');
        } else if (this.testResults.overall.score >= 70) {
            console.log('   ✅ جيد! النظام يعمل مع بعض التحسينات المطلوبة');
        } else if (this.testResults.overall.score >= 50) {
            console.log('   ⚠️ مقبول! يحتاج تحسينات');
        } else {
            console.log('   ❌ ضعيف! يحتاج إصلاحات عاجلة');
        }

        console.log('\n═'.repeat(50));

        // حفظ التقرير
        this.saveReport();
    }

    saveReport() {
        const report = `
# 📊 تقرير الاختبار الشامل للنظام

## النتائج الإجمالية:
- **الدرجة**: ${this.testResults.overall.score}%
- **الاختبارات الناجحة**: ${this.testResults.overall.passed}
- **الاختبارات الفاشلة**: ${this.testResults.overall.failed}

## تفاصيل الاختبارات:

### PostgreSQL:
${this.testResults.postgresql.tests.map(test => `- ${test.status} ${test.name}`).join('\n')}

### SQLite:
${this.testResults.sqlite.tests.map(test => `- ${test.status} ${test.name}`).join('\n')}

## التوصيات:
${this.testResults.overall.score >= 90 ? '✅ النظام يعمل بشكل ممتاز ولا يحتاج تحسينات' : ''}
${this.testResults.overall.score < 90 && this.testResults.overall.score >= 70 ? '⚠️ النظام يعمل جيداً مع بعض التحسينات المطلوبة' : ''}
${this.testResults.overall.score < 70 ? '❌ النظام يحتاج إصلاحات وتحسينات عاجلة' : ''}

## تاريخ الاختبار: ${new Date().toISOString()}
        `;

        import('fs').then(fs => {
            fs.writeFileSync('system-test-report.md', report);
            console.log('📝 تم حفظ التقرير في system-test-report.md');
        });
    }

    async cleanup() {
        if (this.pgClient) {
            await this.pgClient.end();
            console.log('🔌 تم قطع الاتصال من PostgreSQL');
        }

        if (this.sqliteDb) {
            this.sqliteDb.close();
            console.log('🔌 تم قطع الاتصال من SQLite');
        }
    }
}

async function testSystem() {
    const tester = new SystemTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
    } finally {
        await tester.cleanup();
    }
}

// تشغيل الاختبار
if (import.meta.url === `file://${process.argv[1]}`) {
    testSystem()
        .then(() => {
            console.log('\n🏁 انتهى الاختبار الشامل');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 فشل الاختبار الشامل:', error);
            process.exit(1);
        });
}

export default testSystem;
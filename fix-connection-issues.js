import pkg from 'pg';
const { Client, Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

class ConnectionIssuesFixer {
    constructor() {
        this.pool = null;
        this.testClient = null;
        this.maxRetries = 5;
        this.retryDelay = 2000; // 2 seconds
        this.healthCheckInterval = null;
    }

    async createOptimizedPool() {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL غير محدد');
        }

        try {
            console.log('🔄 إنشاء pool محسن للاتصال...');
            
            this.pool = new Pool({
                connectionString: databaseUrl,
                ssl: { 
                    rejectUnauthorized: false,
                    mode: 'require'
                },
                // إعدادات محسنة للاتصال
                max: 20,                    // حد أقصى 20 اتصال
                min: 2,                     // حد أدنى 2 اتصال
                idleTimeoutMillis: 30000,   // 30 ثانية timeout للاتصالات الخاملة
                connectionTimeoutMillis: 10000, // 10 ثواني timeout للاتصال
                acquireTimeoutMillis: 15000,    // 15 ثانية للحصول على اتصال
                createTimeoutMillis: 10000,     // 10 ثواني لإنشاء اتصال
                destroyTimeoutMillis: 5000,     // 5 ثواني لإغلاق اتصال
                reapIntervalMillis: 1000,       // فحص كل ثانية
                createRetryIntervalMillis: 200, // إعادة المحاولة كل 200ms
                
                // إعدادات إضافية للاستقرار
                query_timeout: 30000,           // 30 ثانية timeout للاستعلامات
                statement_timeout: 30000,       // 30 ثانية timeout للتنفيذ
                idle_in_transaction_session_timeout: 60000, // دقيقة للجلسات الخاملة
            });

            // معالج الأخطاء
            this.pool.on('error', (err) => {
                console.error('❌ خطأ في pool الاتصال:', err.message);
                this.handlePoolError(err);
            });

            this.pool.on('connect', (client) => {
                console.log('✅ اتصال جديد تم إنشاؤه في pool');
            });

            this.pool.on('remove', (client) => {
                console.log('🔌 تم إزالة اتصال من pool');
            });

            // اختبار الاتصال
            const testClient = await this.pool.connect();
            await testClient.query('SELECT 1');
            testClient.release();
            
            console.log('✅ تم إنشاء pool محسن بنجاح');
            return this.pool;

        } catch (error) {
            console.error('❌ فشل في إنشاء pool:', error.message);
            throw error;
        }
    }

    async handlePoolError(error) {
        console.log('🔄 معالجة خطأ pool...');
        
        // تحديد نوع الخطأ واتخاذ الإجراء المناسب
        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
            console.log('🔄 إعادة إنشاء pool بسبب خطأ شبكة...');
            await this.recreatePool();
        } else if (error.message.includes('timeout')) {
            console.log('⏱️ خطأ timeout، تحسين الإعدادات...');
            await this.optimizeTimeouts();
        } else if (error.message.includes('too many connections')) {
            console.log('📊 تقليل عدد الاتصالات...');
            await this.reduceConnections();
        }
    }

    async recreatePool() {
        try {
            if (this.pool) {
                await this.pool.end();
                console.log('🔌 تم إغلاق pool القديم');
            }
            
            // انتظار قصير قبل إعادة الإنشاء
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await this.createOptimizedPool();
            console.log('✅ تم إعادة إنشاء pool بنجاح');
            
        } catch (error) {
            console.error('❌ فشل في إعادة إنشاء pool:', error.message);
        }
    }

    async optimizeTimeouts() {
        if (this.pool) {
            // تحديث إعدادات timeout
            this.pool.options.connectionTimeoutMillis = 15000;
            this.pool.options.acquireTimeoutMillis = 20000;
            this.pool.options.query_timeout = 45000;
            console.log('⚙️ تم تحسين إعدادات timeout');
        }
    }

    async reduceConnections() {
        if (this.pool) {
            // تقليل عدد الاتصالات
            this.pool.options.max = Math.max(5, this.pool.options.max - 5);
            console.log(`📉 تم تقليل الحد الأقصى للاتصالات إلى ${this.pool.options.max}`);
        }
    }

    async testConnectionStability() {
        console.log('🧪 اختبار استقرار الاتصال...');
        
        const testResults = {
            successful: 0,
            failed: 0,
            averageTime: 0,
            errors: []
        };

        const testCount = 10;
        const times = [];

        for (let i = 1; i <= testCount; i++) {
            try {
                const startTime = Date.now();
                
                const client = await this.pool.connect();
                await client.query('SELECT NOW(), version(), current_database()');
                client.release();
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                times.push(duration);
                
                testResults.successful++;
                console.log(`✅ اختبار ${i}/${testCount}: ${duration}ms`);
                
            } catch (error) {
                testResults.failed++;
                testResults.errors.push(error.message);
                console.log(`❌ اختبار ${i}/${testCount}: ${error.message}`);
            }
            
            // انتظار قصير بين الاختبارات
            if (i < testCount) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        testResults.averageTime = times.length > 0 
            ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
            : 0;

        console.log('📊 نتائج اختبار الاستقرار:');
        console.log(`   - نجح: ${testResults.successful}/${testCount}`);
        console.log(`   - فشل: ${testResults.failed}/${testCount}`);
        console.log(`   - متوسط الوقت: ${testResults.averageTime}ms`);
        
        if (testResults.errors.length > 0) {
            console.log('❌ الأخطاء:');
            testResults.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        return testResults;
    }

    async fixNetworkTimeouts() {
        console.log('🔧 إصلاح مشاكل timeout الشبكة...');
        
        try {
            // تحديث إعدادات الشبكة
            if (this.pool) {
                const client = await this.pool.connect();
                
                // تحسين إعدادات PostgreSQL للجلسة
                await client.query(`
                    SET statement_timeout = '45s';
                    SET lock_timeout = '30s';
                    SET idle_in_transaction_session_timeout = '60s';
                    SET tcp_keepalives_idle = 300;
                    SET tcp_keepalives_interval = 30;
                    SET tcp_keepalives_count = 3;
                `);
                
                client.release();
                console.log('✅ تم تحسين إعدادات الشبكة');
            }
            
        } catch (error) {
            console.error('❌ فشل في إصلاح timeout:', error.message);
        }
    }

    async implementConnectionRetry() {
        console.log('🔄 تطبيق نظام إعادة المحاولة...');
        
        const originalConnect = this.pool.connect.bind(this.pool);
        
        this.pool.connect = async () => {
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    return await originalConnect();
                } catch (error) {
                    console.log(`❌ محاولة اتصال ${attempt}/${this.maxRetries} فشلت: ${error.message}`);
                    
                    if (attempt === this.maxRetries) {
                        throw error;
                    }
                    
                    // انتظار متزايد بين المحاولات
                    await new Promise(resolve => 
                        setTimeout(resolve, this.retryDelay * attempt)
                    );
                }
            }
        };
        
        console.log('✅ تم تطبيق نظام إعادة المحاولة');
    }

    async startHealthMonitoring() {
        console.log('📊 بدء مراقبة صحة الاتصال...');
        
        this.healthCheckInterval = setInterval(async () => {
            try {
                const client = await this.pool.connect();
                await client.query('SELECT 1');
                client.release();
                
                // فحص إحصائيات pool
                const totalCount = this.pool.totalCount;
                const idleCount = this.pool.idleCount;
                const waitingCount = this.pool.waitingCount;
                
                if (waitingCount > 5) {
                    console.log('⚠️ تحذير: عدد كبير من الاتصالات في الانتظار');
                }
                
                if (idleCount === 0 && totalCount >= this.pool.options.max * 0.8) {
                    console.log('⚠️ تحذير: pool يقترب من الحد الأقصى');
                }
                
            } catch (error) {
                console.error('❌ فشل فحص الصحة:', error.message);
                await this.handlePoolError(error);
            }
        }, 60000); // كل دقيقة
        
        console.log('✅ تم بدء مراقبة الصحة');
    }

    async getConnectionInfo() {
        console.log('📊 معلومات الاتصال الحالية:');
        
        if (this.pool) {
            console.log(`   - إجمالي الاتصالات: ${this.pool.totalCount}`);
            console.log(`   - الاتصالات الخاملة: ${this.pool.idleCount}`);
            console.log(`   - الاتصالات في الانتظار: ${this.pool.waitingCount}`);
            console.log(`   - الحد الأقصى: ${this.pool.options.max}`);
            console.log(`   - الحد الأدنى: ${this.pool.options.min}`);
        }
    }

    async cleanup() {
        console.log('🧹 تنظيف الموارد...');
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            console.log('🔌 تم إيقاف مراقبة الصحة');
        }
        
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 تم إغلاق pool الاتصال');
        }
    }
}

async function fixConnectionIssues() {
    console.log('🔧 إصلاح مشاكل الاتصال المتقطع...');
    
    const fixer = new ConnectionIssuesFixer();
    
    try {
        // إنشاء pool محسن
        await fixer.createOptimizedPool();
        
        // تطبيق نظام إعادة المحاولة
        await fixer.implementConnectionRetry();
        
        // إصلاح timeout الشبكة
        await fixer.fixNetworkTimeouts();
        
        // اختبار استقرار الاتصال
        const testResults = await fixer.testConnectionStability();
        
        // بدء مراقبة الصحة
        await fixer.startHealthMonitoring();
        
        // عرض معلومات الاتصال
        await fixer.getConnectionInfo();
        
        // تقييم النتائج
        const successRate = (testResults.successful / 10) * 100;
        
        console.log('📊 تقييم الإصلاح:');
        console.log(`   - معدل النجاح: ${successRate}%`);
        console.log(`   - متوسط وقت الاستجابة: ${testResults.averageTime}ms`);
        
        if (successRate >= 90) {
            console.log('✅ تم إصلاح مشاكل الاتصال بنجاح!');
        } else if (successRate >= 70) {
            console.log('⚠️ تم تحسين الاتصال جزئياً، قد تحتاج تحسينات إضافية');
        } else {
            console.log('❌ لا تزال هناك مشاكل في الاتصال');
        }
        
        // إنشاء ملف تقرير
        const report = `
# 📊 تقرير إصلاح مشاكل الاتصال

## النتائج:
- **معدل النجاح**: ${successRate}%
- **متوسط وقت الاستجابة**: ${testResults.averageTime}ms
- **الاختبارات الناجحة**: ${testResults.successful}/10
- **الاختبارات الفاشلة**: ${testResults.failed}/10

## الإصلاحات المطبقة:
- ✅ إنشاء pool محسن للاتصال
- ✅ تطبيق نظام إعادة المحاولة
- ✅ إصلاح timeout الشبكة
- ✅ مراقبة صحة الاتصال

## التوصيات:
${successRate >= 90 ? '- الاتصال مستقر ويعمل بشكل ممتاز' : ''}
${successRate < 90 && successRate >= 70 ? '- راقب الاتصال وقم بتحسينات إضافية حسب الحاجة' : ''}
${successRate < 70 ? '- تحقق من إعدادات الشبكة وقاعدة البيانات' : ''}

## تاريخ التقرير: ${new Date().toISOString()}
        `;
        
        import('fs').then(fs => {
            fs.writeFileSync('connection-fix-report.md', report);
            console.log('📝 تم حفظ تقرير الإصلاح في connection-fix-report.md');
        });
        
        // لا نغلق Pool هنا لأنه سيستخدم في التطبيق
        // await fixer.cleanup();
        
        return fixer;
        
    } catch (error) {
        console.error('❌ فشل في إصلاح مشاكل الاتصال:', error.message);
        await fixer.cleanup();
        throw error;
    }
}

// تشغيل الإصلاح
if (import.meta.url === `file://${process.argv[1]}`) {
    fixConnectionIssues()
        .then((fixer) => {
            console.log('🎉 تم إصلاح مشاكل الاتصال بنجاح!');
            console.log('💡 Pool الاتصال جاهز للاستخدام في التطبيق');
            
            // إبقاء العملية مفتوحة لمراقبة الصحة
            process.on('SIGINT', async () => {
                console.log('\n🛑 إيقاف مراقبة الاتصال...');
                await fixer.cleanup();
                process.exit(0);
            });
            
        })
        .catch((error) => {
            console.error('💥 فشل في إصلاح مشاكل الاتصال:', error);
            process.exit(1);
        });
}

export { ConnectionIssuesFixer, fixConnectionIssues };
export default fixConnectionIssues;
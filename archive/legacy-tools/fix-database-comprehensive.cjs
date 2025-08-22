require('dotenv').config();

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const { existsSync, mkdirSync } = require('fs');
const { dirname } = require('path');

class DatabaseFixer {
  constructor() {
    this.databaseUrl = process.env.DATABASE_URL;
    this.issues = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      fix: '🔧',
    };
    console.log(`${icons[type]} ${message}`);
  }

  addIssue(issue) {
    this.issues.push(issue);
    this.log(issue, 'warning');
  }

  addFix(fix) {
    this.fixes.push(fix);
    this.log(fix, 'fix');
  }

  async checkPostgreSQLConnection() {
    this.log('فحص اتصال PostgreSQL...', 'info');

    if (!this.databaseUrl || !this.databaseUrl.startsWith('postgresql://')) {
      this.addIssue('DATABASE_URL غير محدد أو غير صحيح للـ PostgreSQL');
      return false;
    }

    try {
      const pool = new Pool({
        connectionString: this.databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        max: 1,
      });

      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();

      this.log('اتصال PostgreSQL يعمل بشكل صحيح', 'success');
      return true;
    } catch (error) {
      this.addIssue(`فشل اتصال PostgreSQL: ${error.message}`);
      return false;
    }
  }

  async diagnosePostgreSQL() {
    this.log('تشخيص تفصيلي لـ PostgreSQL...', 'info');

    if (!this.databaseUrl) {
      this.addIssue('DATABASE_URL غير محدد في ملف .env');
      return;
    }

    // تحليل رابط قاعدة البيانات
    try {
      const url = new URL(this.databaseUrl);
      this.log(`Host: ${url.hostname}`, 'info');
      this.log(`Port: ${url.port}`, 'info');
      this.log(`Database: ${url.pathname.slice(1)}`, 'info');
      this.log(`Username: ${url.username}`, 'info');
      this.log(`Password: ${url.password ? '***محدد***' : 'غير محدد'}`, 'info');
    } catch (error) {
      this.addIssue('رابط قاعدة البيانات غير صالح');
      return;
    }

    try {
      const pool = new Pool({
        connectionString: this.databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        max: 1,
      });

      const client = await pool.connect();

      // فحص الجداول الموجودة
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      if (tablesResult.rows.length > 0) {
        this.log('الجداول الموجودة:', 'info');
        tablesResult.rows.forEach((row) => {
          console.log(`  - ${row.table_name}`);
        });
      } else {
        this.addIssue('لا توجد جداول في قاعدة البيانات');
      }

      // فحص مخطط جدول المستخدمين
      const usersTableResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      if (usersTableResult.rows.length > 0) {
        this.log('أعمدة جدول المستخدمين:', 'info');
        usersTableResult.rows.forEach((row) => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
      } else {
        this.addIssue('جدول المستخدمين غير موجود');
      }

      client.release();
      await pool.end();
    } catch (error) {
      this.addIssue(`خطأ في تشخيص PostgreSQL: ${error.message}`);
    }
  }

  async setupSQLiteFallback() {
    this.log('إعداد SQLite كبديل...', 'info');

    try {
      const dbPath = './chat.db';
      const dbDir = dirname(dbPath);

      if (!existsSync(dbDir) && dbDir !== '.') {
        mkdirSync(dbDir, { recursive: true });
      }

      const db = new Database(dbPath);

      // فحص الجداول الموجودة
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      this.log(`الجداول الموجودة في SQLite: ${tables.length}`, 'info');
      tables.forEach((table) => console.log(`  - ${table.name}`));

      // فحص جدول المستخدمين
      try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        this.log(`عدد المستخدمين في SQLite: ${userCount.count}`, 'info');

        // فحص المالك
        const owner = db
          .prepare("SELECT * FROM users WHERE user_type = 'owner' OR username = 'المالك'")
          .get();
        if (owner) {
          this.log('مستخدم المالك موجود في SQLite', 'success');
        } else {
          this.addIssue('مستخدم المالك غير موجود في SQLite');
        }
      } catch (error) {
        this.addIssue(`خطأ في فحص جدول المستخدمين: ${error.message}`);
      }

      db.close();
      this.addFix('تم فحص SQLite بنجاح');
      return true;
    } catch (error) {
      this.addIssue(`فشل في فحص SQLite: ${error.message}`);
      return false;
    }
  }

  async checkServerLogs() {
    this.log('فحص سجلات الخادم...', 'info');

    try {
      const fs = require('fs');

      // فحص server-debug.log
      if (existsSync('./server-debug.log')) {
        const debugLog = fs.readFileSync('./server-debug.log', 'utf8');
        const errorLines = debugLog
          .split('\n')
          .filter(
            (line) => line.includes('Error') || line.includes('error') || line.includes('❌')
          );

        if (errorLines.length > 0) {
          this.addIssue(`وجد ${errorLines.length} أخطاء في سجل التشغيل`);
          errorLines.slice(0, 5).forEach((line) => {
            console.log(`    ${line.trim()}`);
          });
        }
      }

      // فحص server.log
      if (existsSync('./server.log')) {
        const serverLog = fs.readFileSync('./server.log', 'utf8');
        const errorLines = serverLog
          .split('\n')
          .filter((line) => line.includes('Error') || line.includes('error'));

        if (errorLines.length > 0) {
          this.addIssue(`وجد ${errorLines.length} أخطاء في سجل الخادم`);
        }
      }
    } catch (error) {
      this.log(`لا يمكن قراءة ملفات السجل: ${error.message}`, 'warning');
    }
  }

  async generateReport() {
    this.log('\n📊 تقرير التشخيص الشامل', 'info');
    this.log('='.repeat(60), 'info');

    this.log(`\n⚠️  المشاكل المكتشفة (${this.issues.length}):`, 'warning');
    if (this.issues.length === 0) {
      console.log('   لا توجد مشاكل مكتشفة! 🎉');
    } else {
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    this.log(`\n🔧 الإصلاحات والفحوصات المطبقة (${this.fixes.length}):`, 'fix');
    this.fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });

    this.log('\n💡 التوصيات:', 'info');
    console.log('   1. إذا كان PostgreSQL لا يعمل، استخدم SQLite للتطوير المحلي');
    console.log('   2. تحقق من صحة رابط DATABASE_URL في ملف .env');
    console.log('   3. تأكد من أن Supabase يعمل وأن الشبكة متصلة');
    console.log('   4. راقب السجلات بانتظام للتأكد من عدم وجود أخطاء جديدة');
    console.log('   5. استخدم npm run dev للتطوير المحلي');

    this.log('\n✅ تم إكمال التشخيص الشامل!', 'success');

    // تقديم نصائح حسب المشاكل المكتشفة
    if (this.issues.some((issue) => issue.includes('PostgreSQL'))) {
      this.log('\n🚨 نصيحة: مشكلة في PostgreSQL', 'warning');
      console.log('   يمكنك تشغيل المشروع باستخدام SQLite:');
      console.log('   1. غير DATABASE_URL في .env إلى: sqlite:./chat.db');
      console.log('   2. أو احذف DATABASE_URL لاستخدام SQLite تلقائياً');
      console.log('   3. شغل: npm run dev');
    }
  }

  async runComprehensiveDiagnosis() {
    this.log('🚀 بدء التشخيص الشامل لقاعدة البيانات...', 'info');

    // فحص PostgreSQL
    const pgWorking = await this.checkPostgreSQLConnection();

    if (pgWorking) {
      await this.diagnosePostgreSQL();
    }

    // فحص SQLite
    await this.setupSQLiteFallback();

    // فحص سجلات الخادم
    await this.checkServerLogs();

    // إنشاء التقرير
    await this.generateReport();
  }
}

// تشغيل التشخيص
const fixer = new DatabaseFixer();
fixer.runComprehensiveDiagnosis().catch(console.error);

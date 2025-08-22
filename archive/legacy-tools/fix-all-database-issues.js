import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

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

  async fixPostgreSQLSchema() {
    this.log('إصلاح مخطط PostgreSQL...', 'info');

    try {
      const pool = new Pool({
        connectionString: this.databaseUrl,
        ssl: { rejectUnauthorized: false },
      });

      const client = await pool.connect();

      // إنشاء الجداول الأساسية
      const createTablesSQL = `
        -- جدول المستخدمين
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT,
          user_type TEXT NOT NULL DEFAULT 'guest',
          role TEXT NOT NULL DEFAULT 'guest',
          profile_image TEXT,
          profile_banner TEXT,
          profile_background_color TEXT DEFAULT '#3c0d0d',
          status TEXT,
          gender TEXT,
          age INTEGER,
          country TEXT,
          relation TEXT,
          bio TEXT,
          is_online BOOLEAN DEFAULT false,
          is_hidden BOOLEAN DEFAULT false,
          last_seen TIMESTAMP,
          join_date TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          is_muted BOOLEAN DEFAULT false,
          mute_expiry TIMESTAMP,
          is_banned BOOLEAN DEFAULT false,
          ban_expiry TIMESTAMP,
          is_blocked BOOLEAN DEFAULT false,
          ip_address VARCHAR(45),
          device_id VARCHAR(100),
          ignored_users TEXT DEFAULT '[]',
          username_color TEXT DEFAULT '#FFFFFF',
          profile_effect TEXT DEFAULT 'none',
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          total_points INTEGER DEFAULT 0,
          level_progress INTEGER DEFAULT 0
        );

        -- جدول الرسائل
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER REFERENCES users(id),
          receiver_id INTEGER REFERENCES users(id),
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          is_private BOOLEAN DEFAULT false,
          room_id TEXT DEFAULT 'general',
          timestamp TIMESTAMP DEFAULT NOW()
        );

        -- جدول الأصدقاء
        CREATE TABLE IF NOT EXISTS friends (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          friend_id INTEGER REFERENCES users(id),
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- جدول الإشعارات
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- جدول الأجهزة المحظورة
        CREATE TABLE IF NOT EXISTS blocked_devices (
          id SERIAL PRIMARY KEY,
          ip_address TEXT NOT NULL,
          device_id TEXT NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id),
          reason TEXT NOT NULL,
          blocked_at TIMESTAMP NOT NULL,
          blocked_by INTEGER NOT NULL REFERENCES users(id),
          UNIQUE(ip_address, device_id)
        );

        -- جدول تاريخ النقاط
        CREATE TABLE IF NOT EXISTS points_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          reason TEXT NOT NULL,
          action TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- جدول إعدادات المستويات
        CREATE TABLE IF NOT EXISTS level_settings (
          id SERIAL PRIMARY KEY,
          level INTEGER NOT NULL UNIQUE,
          required_points INTEGER NOT NULL,
          title TEXT NOT NULL,
          color TEXT DEFAULT '#FFFFFF',
          benefits JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      await client.query(createTablesSQL);
      this.addFix('تم إنشاء/تحديث جداول PostgreSQL');

      // إدراج المستويات الافتراضية
      const defaultLevels = [
        { level: 1, required_points: 0, title: 'مبتدئ', color: '#FFFFFF' },
        { level: 2, required_points: 100, title: 'متحمس', color: '#00FF00' },
        { level: 3, required_points: 250, title: 'نشيط', color: '#0080FF' },
        { level: 4, required_points: 500, title: 'متقدم', color: '#8000FF' },
        { level: 5, required_points: 1000, title: 'خبير', color: '#FF8000' },
      ];

      for (const levelData of defaultLevels) {
        await client.query(
          `
          INSERT INTO level_settings (level, required_points, title, color)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (level) DO NOTHING
        `,
          [levelData.level, levelData.required_points, levelData.title, levelData.color]
        );
      }

      this.addFix('تم إدراج المستويات الافتراضية');

      // إنشاء مستخدم المالك إذا لم يكن موجوداً
      const ownerExists = await client.query(
        'SELECT id FROM users WHERE username = $1 OR user_type = $2',
        ['المالك', 'owner']
      );

      if (ownerExists.rows.length === 0) {
        await client.query(
          `
          INSERT INTO users (
            username, password, user_type, role, profile_image, 
            gender, points, level, profile_effect, username_color
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            'المالك',
            'owner123',
            'owner',
            'owner',
            '/default_avatar.svg',
            'male',
            50000,
            10,
            'golden',
            '#FFD700',
          ]
        );
        this.addFix('تم إنشاء مستخدم المالك الافتراضي');
      }

      client.release();
      await pool.end();
      return true;
    } catch (error) {
      this.addIssue(`فشل في إصلاح مخطط PostgreSQL: ${error.message}`);
      return false;
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

      // إنشاء الجداول
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT,
          user_type TEXT NOT NULL DEFAULT 'guest',
          role TEXT NOT NULL DEFAULT 'guest',
          profile_image TEXT DEFAULT '/default_avatar.svg',
          profile_banner TEXT,
          profile_background_color TEXT DEFAULT '#3c0d0d',
          status TEXT,
          gender TEXT DEFAULT 'male',
          age INTEGER,
          country TEXT,
          relation TEXT,
          bio TEXT,
          is_online INTEGER DEFAULT 0,
          is_hidden INTEGER DEFAULT 0,
          last_seen TEXT,
          join_date TEXT DEFAULT CURRENT_TIMESTAMP,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_muted INTEGER DEFAULT 0,
          mute_expiry TEXT,
          is_banned INTEGER DEFAULT 0,
          ban_expiry TEXT,
          is_blocked INTEGER DEFAULT 0,
          ip_address TEXT,
          device_id TEXT,
          ignored_users TEXT DEFAULT '[]',
          username_color TEXT DEFAULT '#FFFFFF',
          profile_effect TEXT DEFAULT 'none',
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          total_points INTEGER DEFAULT 0,
          level_progress INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER,
          receiver_id INTEGER,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          is_private INTEGER DEFAULT 0,
          room_id TEXT DEFAULT 'general',
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (receiver_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS level_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level INTEGER NOT NULL UNIQUE,
          required_points INTEGER NOT NULL,
          title TEXT NOT NULL,
          color TEXT DEFAULT '#FFFFFF',
          benefits TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // إنشاء مستخدم المالك إذا لم يكن موجوداً
      const ownerExists = db
        .prepare('SELECT id FROM users WHERE username = ? OR user_type = ?')
        .get('المالك', 'owner');

      if (!ownerExists) {
        db.prepare(
          `
          INSERT INTO users (
            username, password, user_type, role, profile_image, 
            gender, points, level, profile_effect, username_color
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          'المالك',
          'owner123',
          'owner',
          'owner',
          '/default_avatar.svg',
          'male',
          50000,
          10,
          'golden',
          '#FFD700'
        );
        this.addFix('تم إنشاء مستخدم المالك في SQLite');
      }

      db.close();
      this.addFix('تم إعداد SQLite بنجاح');
      return true;
    } catch (error) {
      this.addIssue(`فشل في إعداد SQLite: ${error.message}`);
      return false;
    }
  }

  async generateReport() {
    this.log('\n📊 تقرير الإصلاح الشامل', 'info');
    this.log('='.repeat(50), 'info');

    this.log(`\n⚠️  المشاكل المكتشفة (${this.issues.length}):`, 'warning');
    this.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });

    this.log(`\n🔧 الإصلاحات المطبقة (${this.fixes.length}):`, 'fix');
    this.fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });

    this.log('\n📋 التوصيات:', 'info');
    console.log('   1. تحقق من صحة رابط DATABASE_URL في ملف .env');
    console.log('   2. تأكد من أن Supabase يعمل بشكل صحيح');
    console.log('   3. استخدم SQLite للتطوير المحلي');
    console.log('   4. راقب السجلات للتأكد من عدم وجود أخطاء');

    this.log('\n✅ تم إكمال الإصلاح الشامل!', 'success');
  }

  async runComprehensiveFix() {
    this.log('🚀 بدء الإصلاح الشامل لقاعدة البيانات...', 'info');

    // فحص PostgreSQL
    const pgWorking = await this.checkPostgreSQLConnection();

    if (pgWorking) {
      await this.fixPostgreSQLSchema();
    } else {
      this.addFix('سيتم استخدام SQLite كبديل');
    }

    // إعداد SQLite كبديل
    await this.setupSQLiteFallback();

    // إنشاء التقرير
    await this.generateReport();
  }
}

// تشغيل الإصلاح
const fixer = new DatabaseFixer();
fixer.runComprehensiveFix().catch(console.error);

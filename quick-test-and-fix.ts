#!/usr/bin/env tsx
import dotenv from 'dotenv';
import postgres from 'postgres';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

dotenv.config();

class QuickSystemTest {
  private sql: postgres.Sql;
  private fixes: string[] = [];

  constructor() {
    this.sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      ssl: process.env.DATABASE_URL!.includes('localhost') ? false : 'require',
    });
  }

  async run() {
    console.log(chalk.blue.bold('\n🔧 فحص وإصلاح النظام...\n'));
    
    try {
      // 1. فحص قاعدة البيانات
      await this.testDatabase();
      
      // 2. فحص الخادم
      await this.testServer();
      
      // 3. فحص الملفات
      await this.testFiles();
      
      // عرض النتائج والإصلاحات
      this.showResults();
      
    } catch (error) {
      console.error(chalk.red('❌ خطأ:'), error);
    } finally {
      await this.sql.end();
    }
  }

  async testDatabase() {
    console.log(chalk.yellow('📊 فحص قاعدة البيانات...\n'));

    // التحقق من الاتصال
    try {
      await this.sql`SELECT NOW()`;
      console.log(chalk.green('✅ الاتصال بقاعدة البيانات يعمل'));
    } catch (error) {
      console.log(chalk.red('❌ فشل الاتصال بقاعدة البيانات'));
      this.fixes.push('تحقق من DATABASE_URL في ملف .env');
      return;
    }

    // التحقق من الجداول المطلوبة
    const requiredTables = [
      'users', 'rooms', 'messages', 'friends', 
      'wall_posts', 'notifications', 'level_settings',
      'vip_users', 'points_history'
    ];

    for (const table of requiredTables) {
      const result = await this.sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )
      `;
      
      if (!result[0].exists) {
        console.log(chalk.red(`❌ الجدول ${table} غير موجود`));
        this.fixes.push(`تشغيل migrations لإنشاء جدول ${table}`);
      }
    }

    // التحقق من البيانات الأساسية
    const rooms = await this.sql`SELECT COUNT(*) as count FROM rooms WHERE id IN ('general', 'games', 'support')`;
    if (rooms[0].count < 3) {
      console.log(chalk.yellow('⚠️ الغرف الافتراضية غير كاملة'));
      
      // إصلاح: إنشاء الغرف الافتراضية
      console.log(chalk.blue('🔧 إنشاء الغرف الافتراضية...'));
      try {
        // إنشاء مستخدم النظام
        const systemUser = await this.sql`
          INSERT INTO users (username, user_type, role)
          VALUES ('system', 'owner', 'owner')
          ON CONFLICT (username) DO UPDATE SET
            user_type = 'owner',
            role = 'owner'
          RETURNING id
        `;
        
        const systemUserId = systemUser[0].id;
        
        // إنشاء الغرف
        const defaultRooms = [
          { id: 'general', name: 'العامة', description: 'غرفة الدردشة العامة' },
          { id: 'games', name: 'الألعاب', description: 'غرفة الألعاب والمرح' },
          { id: 'support', name: 'الدعم', description: 'غرفة الدعم الفني' }
        ];

        for (const room of defaultRooms) {
          await this.sql`
            INSERT INTO rooms (id, name, description, created_by, is_default)
            VALUES (${room.id}, ${room.name}, ${room.description}, ${systemUserId}, true)
            ON CONFLICT (id) DO NOTHING
          `;
        }
        console.log(chalk.green('✅ تم إنشاء الغرف الافتراضية'));
      } catch (error) {
        console.log(chalk.red('❌ فشل إنشاء الغرف الافتراضية'));
      }
    }

    // التحقق من إعدادات المستويات
    const levels = await this.sql`SELECT COUNT(*) as count FROM level_settings`;
    if (levels[0].count < 5) {
      console.log(chalk.yellow('⚠️ إعدادات المستويات غير كاملة'));
      
      // إصلاح: إنشاء إعدادات المستويات
      console.log(chalk.blue('🔧 إنشاء إعدادات المستويات...'));
      try {
        const defaultLevels = [
          { level: 1, required_points: 0, title: 'مبتدئ', color: '#808080' },
          { level: 2, required_points: 100, title: 'نشط', color: '#00FF00' },
          { level: 3, required_points: 300, title: 'متقدم', color: '#0099FF' },
          { level: 4, required_points: 600, title: 'خبير', color: '#FF9900' },
          { level: 5, required_points: 1000, title: 'محترف', color: '#FF0000' },
        ];

        for (const level of defaultLevels) {
          await this.sql`
            INSERT INTO level_settings (level, required_points, title, color)
            VALUES (${level.level}, ${level.required_points}, ${level.title}, ${level.color})
            ON CONFLICT (level) DO NOTHING
          `;
        }
        console.log(chalk.green('✅ تم إنشاء إعدادات المستويات'));
      } catch (error) {
        console.log(chalk.red('❌ فشل إنشاء إعدادات المستويات'));
      }
    }
  }

  async testServer() {
    console.log(chalk.yellow('\n🌐 فحص الخادم...\n'));

    // التحقق من ملف .env
    try {
      await fs.access('.env');
      console.log(chalk.green('✅ ملف .env موجود'));
    } catch {
      console.log(chalk.red('❌ ملف .env غير موجود'));
      
      // إصلاح: إنشاء ملف .env
      console.log(chalk.blue('🔧 إنشاء ملف .env...'));
      const envContent = `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chat_app
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key-here`;
      
      await fs.writeFile('.env', envContent);
      console.log(chalk.green('✅ تم إنشاء ملف .env'));
    }

    // التحقق من تشغيل الخادم
    try {
      execSync('curl -s http://localhost:5000/api/health', { stdio: 'ignore' });
      console.log(chalk.green('✅ الخادم يعمل على المنفذ 5000'));
    } catch {
      console.log(chalk.yellow('⚠️ الخادم لا يستجيب'));
      this.fixes.push('تشغيل الخادم باستخدام: npm run dev');
    }
  }

  async testFiles() {
    console.log(chalk.yellow('\n📁 فحص الملفات والمجلدات...\n'));

    // التحقق من مجلدات الرفع
    const uploadDirs = [
      'client/public/uploads',
      'client/public/uploads/avatars',
      'client/public/uploads/banners',
      'client/public/uploads/profiles',
      'client/public/uploads/wall',
    ];

    for (const dir of uploadDirs) {
      try {
        await fs.access(dir);
      } catch {
        console.log(chalk.yellow(`⚠️ المجلد ${dir} غير موجود`));
        
        // إصلاح: إنشاء المجلد
        console.log(chalk.blue(`🔧 إنشاء ${dir}...`));
        await fs.mkdir(dir, { recursive: true });
        
        // إضافة .gitkeep
        await fs.writeFile(path.join(dir, '.gitkeep'), '');
        console.log(chalk.green(`✅ تم إنشاء ${dir}`));
      }
    }

    // التحقق من الصورة الافتراضية
    const defaultAvatar = 'client/public/default_avatar.svg';
    try {
      await fs.access(defaultAvatar);
      console.log(chalk.green('✅ الصورة الافتراضية موجودة'));
    } catch {
      console.log(chalk.yellow('⚠️ الصورة الافتراضية غير موجودة'));
      
      // إصلاح: إنشاء صورة افتراضية
      console.log(chalk.blue('🔧 إنشاء الصورة الافتراضية...'));
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#e0e0e0"/>
  <circle cx="50" cy="35" r="20" fill="#999"/>
  <ellipse cx="50" cy="70" rx="35" ry="25" fill="#999"/>
</svg>`;
      
      await fs.writeFile(defaultAvatar, svgContent);
      console.log(chalk.green('✅ تم إنشاء الصورة الافتراضية'));
    }
  }

  showResults() {
    console.log(chalk.gray('\n' + '='.repeat(60)));
    
    if (this.fixes.length === 0) {
      console.log(chalk.green.bold('\n✅ النظام جاهز للعمل!\n'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️ هناك بعض المشاكل التي تحتاج إلى إصلاح:\n'));
      this.fixes.forEach((fix, index) => {
        console.log(chalk.yellow(`${index + 1}. ${fix}`));
      });
    }
    
    console.log(chalk.gray('='.repeat(60) + '\n'));
  }
}

// تشغيل الفحص
const tester = new QuickSystemTest();
tester.run().catch(console.error);
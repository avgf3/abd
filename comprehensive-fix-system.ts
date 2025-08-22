#!/usr/bin/env tsx
import dotenv from 'dotenv';
import postgres from 'postgres';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import bcrypt from 'bcrypt';

dotenv.config();

interface FixResult {
  category: string;
  issue: string;
  fixed: boolean;
  details?: string;
}

class ComprehensiveSystemFixer {
  private sql: postgres.Sql;
  private results: FixResult[] = [];

  constructor() {
    this.sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      ssl: process.env.DATABASE_URL!.includes('localhost') ? false : 'require',
    });
  }

  async run() {
    console.log(chalk.blue.bold('\n🔧 بدء الفحص والإصلاح الشامل للنظام...\n'));
    console.log(chalk.gray('='.repeat(70)));
    
    try {
      // 1. إصلاح قاعدة البيانات
      await this.fixDatabase();
      
      // 2. إصلاح API والمسارات
      await this.fixAPI();
      
      // 3. إصلاح نظام المصادقة
      await this.fixAuthentication();
      
      // 4. إصلاح WebSocket
      await this.fixWebSocket();
      
      // 5. إصلاح الملفات والمجلدات
      await this.fixFileSystem();
      
      // عرض النتائج
      this.showResults();
      
    } catch (error) {
      console.error(chalk.red('❌ خطأ عام:'), error);
    } finally {
      await this.sql.end();
    }
  }

  async fixDatabase() {
    console.log(chalk.yellow('\n📊 إصلاح قاعدة البيانات...\n'));

    // 1. التحقق من الاتصال
    try {
      await this.sql`SELECT NOW()`;
      this.addResult('قاعدة البيانات', 'الاتصال', true);
    } catch (error) {
      this.addResult('قاعدة البيانات', 'الاتصال', false, 'تحقق من DATABASE_URL');
      return;
    }

    // 2. إنشاء الجداول المفقودة عبر migrations
    try {
      console.log(chalk.blue('🔧 تشغيل database migrations...'));
      execSync('npm run db:push', { stdio: 'inherit' });
      this.addResult('قاعدة البيانات', 'الجداول', true);
    } catch (error) {
      this.addResult('قاعدة البيانات', 'الجداول', false, 'فشل تشغيل migrations');
    }

    // 3. إنشاء البيانات الافتراضية
    await this.createDefaultData();
  }

  async createDefaultData() {
    console.log(chalk.blue('🔧 إنشاء البيانات الافتراضية...'));

    try {
      // مستخدم النظام
      const systemUser = await this.sql`
        INSERT INTO users (username, user_type, role, password)
        VALUES ('system', 'owner', 'owner', ${await bcrypt.hash('system123', 10)})
        ON CONFLICT (username) DO UPDATE SET
          user_type = 'owner',
          role = 'owner'
        RETURNING id
      `;
      const systemUserId = systemUser[0].id;

      // الغرف الافتراضية
      const defaultRooms = [
        { id: 'general', name: 'العامة', description: 'غرفة الدردشة العامة', icon: '💬' },
        { id: 'games', name: 'الألعاب', description: 'غرفة الألعاب والمرح', icon: '🎮' },
        { id: 'support', name: 'الدعم', description: 'غرفة الدعم الفني', icon: '🛟' },
        { id: 'music', name: 'الموسيقى', description: 'غرفة الموسيقى والغناء', icon: '🎵' },
        { id: 'technology', name: 'التقنية', description: 'غرفة النقاشات التقنية', icon: '💻' }
      ];

      for (const room of defaultRooms) {
        await this.sql`
          INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active)
          VALUES (${room.id}, ${room.name}, ${room.description}, ${room.icon}, ${systemUserId}, true, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            icon = EXCLUDED.icon,
            is_default = true,
            is_active = true
        `;
      }

      // إعدادات المستويات
      const levels = [
        { level: 1, required_points: 0, title: 'مبتدئ', color: '#808080' },
        { level: 2, required_points: 100, title: 'نشط', color: '#00FF00' },
        { level: 3, required_points: 300, title: 'متقدم', color: '#0099FF' },
        { level: 4, required_points: 600, title: 'خبير', color: '#FF9900' },
        { level: 5, required_points: 1000, title: 'محترف', color: '#FF0000' },
        { level: 6, required_points: 1500, title: 'بطل', color: '#9900FF' },
        { level: 7, required_points: 2500, title: 'أسطورة', color: '#FFD700' },
        { level: 8, required_points: 4000, title: 'ملك', color: '#FF1493' },
        { level: 9, required_points: 6000, title: 'إمبراطور', color: '#00FFFF' },
        { level: 10, required_points: 10000, title: 'إله الدردشة', color: '#FF00FF' }
      ];

      for (const level of levels) {
        await this.sql`
          INSERT INTO level_settings (level, required_points, title, color)
          VALUES (${level.level}, ${level.required_points}, ${level.title}, ${level.color})
          ON CONFLICT (level) DO UPDATE SET
            required_points = EXCLUDED.required_points,
            title = EXCLUDED.title,
            color = EXCLUDED.color
        `;
      }

      // إنشاء مستخدم اختبار
      const testUser = await this.sql`
        INSERT INTO users (username, user_type, role, password, points, level)
        VALUES ('test_user', 'member', 'member', ${await bcrypt.hash('Test123!@#', 10)}, 500, 3)
        ON CONFLICT (username) DO UPDATE SET
          password = ${await bcrypt.hash('Test123!@#', 10)},
          points = 500,
          level = 3
        RETURNING id
      `;

      // إنشاء مستخدم إداري
      await this.sql`
        INSERT INTO users (username, user_type, role, password, points, level)
        VALUES ('admin', 'owner', 'owner', ${await bcrypt.hash('admin123', 10)}, 10000, 10)
        ON CONFLICT (username) DO UPDATE SET
          user_type = 'owner',
          role = 'owner',
          password = ${await bcrypt.hash('admin123', 10)}
      `;

      this.addResult('قاعدة البيانات', 'البيانات الافتراضية', true);
    } catch (error: any) {
      this.addResult('قاعدة البيانات', 'البيانات الافتراضية', false, error.message);
    }
  }

  async fixAPI() {
    console.log(chalk.yellow('\n🌐 إصلاح API والمسارات...\n'));

    // التحقق من ملفات API
    const apiFiles = [
      'server/routes.ts',
      'server/routes/auth.ts',
      'server/routes/messages.ts',
      'server/routes/rooms.ts',
      'server/routes/users.ts',
      'server/routes/friends.ts',
      'server/routes/notifications.ts'
    ];

    for (const file of apiFiles) {
      try {
        await fs.access(file);
      } catch {
        this.addResult('API', `ملف ${file}`, false, 'الملف غير موجود');
      }
    }

    // إصلاح مسار health check
    await this.fixHealthCheck();
  }

  async fixHealthCheck() {
    const routesPath = 'server/routes.ts';
    try {
      let content = await fs.readFile(routesPath, 'utf-8');
      
      if (!content.includes('/api/health')) {
        console.log(chalk.blue('🔧 إضافة مسار health check...'));
        
        const healthRoute = `
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });`;

        // إضافة المسار قبل تسجيل المسارات الأخرى
        content = content.replace(
          'export function registerRoutes(app: Express) {',
          `export function registerRoutes(app: Express) {${healthRoute}`
        );
        
        await fs.writeFile(routesPath, content);
        this.addResult('API', 'مسار health check', true);
      } else {
        this.addResult('API', 'مسار health check', true, 'موجود مسبقاً');
      }
    } catch (error: any) {
      this.addResult('API', 'مسار health check', false, error.message);
    }
  }

  async fixAuthentication() {
    console.log(chalk.yellow('\n🔐 إصلاح نظام المصادقة...\n'));

    // التحقق من تشفير كلمات المرور
    try {
      const users = await this.sql`
        SELECT id, username, password 
        FROM users 
        WHERE password IS NOT NULL 
        AND password NOT LIKE '$2b$%'
        LIMIT 10
      `;

      if (users.length > 0) {
        console.log(chalk.blue(`🔧 تشفير ${users.length} كلمة مرور غير مشفرة...`));
        
        for (const user of users) {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await this.sql`
            UPDATE users 
            SET password = ${hashedPassword}
            WHERE id = ${user.id}
          `;
        }
        
        this.addResult('المصادقة', 'تشفير كلمات المرور', true, `تم تشفير ${users.length} كلمة مرور`);
      } else {
        this.addResult('المصادقة', 'تشفير كلمات المرور', true, 'جميع كلمات المرور مشفرة');
      }
    } catch (error: any) {
      this.addResult('المصادقة', 'تشفير كلمات المرور', false, error.message);
    }

    // إصلاح ملف auth.ts
    await this.fixAuthFile();
  }

  async fixAuthFile() {
    const authPath = 'server/routes/auth.ts';
    try {
      const content = await fs.readFile(authPath, 'utf-8');
      
      // التحقق من وجود bcrypt
      if (!content.includes("import bcrypt from 'bcrypt'") && !content.includes('import * as bcrypt')) {
        console.log(chalk.blue('🔧 إضافة استيراد bcrypt...'));
        
        const updatedContent = `import bcrypt from 'bcrypt';\n${content}`;
        await fs.writeFile(authPath, updatedContent);
        
        this.addResult('المصادقة', 'استيراد bcrypt', true);
      }
      
      // التحقق من استخدام bcrypt.compare
      if (content.includes('password === ') && !content.includes('bcrypt.compare')) {
        console.log(chalk.blue('🔧 تحديث مقارنة كلمة المرور لاستخدام bcrypt...'));
        
        const updatedContent = content.replace(
          /password === user\.password/g,
          'await bcrypt.compare(password, user.password)'
        );
        
        await fs.writeFile(authPath, updatedContent);
        this.addResult('المصادقة', 'مقارنة كلمة المرور', true);
      }
    } catch (error: any) {
      this.addResult('المصادقة', 'ملف auth.ts', false, error.message);
    }
  }

  async fixWebSocket() {
    console.log(chalk.yellow('\n🔌 إصلاح WebSocket...\n'));

    const realtimePath = 'server/realtime.ts';
    try {
      const content = await fs.readFile(realtimePath, 'utf-8');
      
      // التحقق من CORS
      if (!content.includes('cors:')) {
        console.log(chalk.blue('🔧 إضافة إعدادات CORS لـ Socket.IO...'));
        
        const updatedContent = content.replace(
          'const io = new SocketServer(server',
          `const io = new SocketServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : ['http://localhost:5173', 'http://localhost:5000'],
      credentials: true
    }`
        );
        
        await fs.writeFile(realtimePath, updatedContent);
        this.addResult('WebSocket', 'إعدادات CORS', true);
      } else {
        this.addResult('WebSocket', 'إعدادات CORS', true, 'موجودة مسبقاً');
      }
    } catch (error: any) {
      this.addResult('WebSocket', 'ملف realtime.ts', false, error.message);
    }
  }

  async fixFileSystem() {
    console.log(chalk.yellow('\n📁 إصلاح نظام الملفات...\n'));

    // إنشاء المجلدات المطلوبة
    const requiredDirs = [
      'client/public/uploads',
      'client/public/uploads/avatars',
      'client/public/uploads/banners',
      'client/public/uploads/profiles',
      'client/public/uploads/wall',
      'migrations',
      'server/scripts'
    ];

    for (const dir of requiredDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, '.gitkeep'), '');
        this.addResult('نظام الملفات', `مجلد ${dir}`, true);
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          this.addResult('نظام الملفات', `مجلد ${dir}`, false, error.message);
        }
      }
    }

    // إنشاء الملفات الافتراضية
    await this.createDefaultFiles();
  }

  async createDefaultFiles() {
    // الصورة الافتراضية
    const defaultAvatar = 'client/public/default_avatar.svg';
    try {
      await fs.access(defaultAvatar);
    } catch {
      console.log(chalk.blue('🔧 إنشاء الصورة الافتراضية...'));
      
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#f0f0f0"/>
  <circle cx="50" cy="50" r="45" fill="#e0e0e0"/>
  <circle cx="50" cy="35" r="20" fill="#999"/>
  <ellipse cx="50" cy="70" rx="35" ry="25" fill="#999"/>
</svg>`;
      
      await fs.writeFile(defaultAvatar, svgContent);
      this.addResult('نظام الملفات', 'الصورة الافتراضية', true);
    }

    // ملف .env.example
    const envExample = '.env.example';
    try {
      await fs.access(envExample);
    } catch {
      const envContent = `# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Server
PORT=5000
NODE_ENV=development

# Session
SESSION_SECRET=your-secret-key-here

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Admin
ADMIN_PASSWORD=admin123`;
      
      await fs.writeFile(envExample, envContent);
      this.addResult('نظام الملفات', 'ملف .env.example', true);
    }
  }

  addResult(category: string, issue: string, fixed: boolean, details?: string) {
    this.results.push({ category, issue, fixed, details });
    
    if (fixed) {
      console.log(chalk.green(`✅ ${issue}`));
    } else {
      console.log(chalk.red(`❌ ${issue}`));
    }
    
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  showResults() {
    console.log(chalk.gray('\n' + '='.repeat(70)));
    console.log(chalk.blue.bold('\n📊 ملخص النتائج:\n'));

    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const fixed = categoryResults.filter(r => r.fixed).length;
      const total = categoryResults.length;
      
      const icon = fixed === total ? '✅' : fixed > 0 ? '⚠️' : '❌';
      console.log(chalk.yellow(`${icon} ${category}: ${fixed}/${total}`));
      
      // عرض المشاكل غير المحلولة
      const unfixed = categoryResults.filter(r => !r.fixed);
      if (unfixed.length > 0) {
        unfixed.forEach(r => {
          console.log(chalk.red(`   - ${r.issue}: ${r.details || 'يحتاج إلى إصلاح يدوي'}`));
        });
      }
    }

    const totalFixed = this.results.filter(r => r.fixed).length;
    const totalIssues = this.results.length;

    console.log(chalk.gray('\n' + '='.repeat(70)));
    
    if (totalFixed === totalIssues) {
      console.log(chalk.green.bold('\n✅ تم إصلاح جميع المشاكل بنجاح! ✅\n'));
      console.log(chalk.blue('🚀 يمكنك الآن تشغيل النظام باستخدام: npm run dev\n'));
    } else {
      console.log(chalk.yellow.bold(`\n⚠️ تم إصلاح ${totalFixed} من ${totalIssues} مشكلة\n`));
      console.log(chalk.red('يرجى مراجعة المشاكل المتبقية وإصلاحها يدوياً.\n'));
    }
    
    console.log(chalk.gray('='.repeat(70) + '\n'));
  }
}

// تشغيل الإصلاح الشامل
const fixer = new ComprehensiveSystemFixer();
fixer.run().catch(console.error);
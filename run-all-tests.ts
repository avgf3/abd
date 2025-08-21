#!/usr/bin/env tsx
import dotenv from 'dotenv';
import postgres from 'postgres';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';
const WS_URL = process.env.WS_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

class SystemTester {
  private sql: postgres.Sql;
  private results: TestResult[] = [];
  private testUser: any = {};
  private socket: Socket | null = null;

  constructor() {
    this.sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      ssl: process.env.DATABASE_URL!.includes('localhost') ? false : 'require',
    });
  }

  async runAllTests() {
    console.log(chalk.blue.bold('\n🔍 بدء الفحص الشامل للنظام...\n'));
    console.log(chalk.gray('='.repeat(60)));

    try {
      // اختبارات قاعدة البيانات
      await this.testDatabase();
      
      // اختبارات API
      await this.testAPI();
      
      // اختبارات WebSocket
      await this.testWebSocket();
      
      // اختبارات الأمان
      await this.testSecurity();
      
      // اختبارات الملفات والمجلدات
      await this.testFileSystem();
      
      // عرض النتائج
      this.displayResults();
      
    } catch (error) {
      console.error(chalk.red('❌ خطأ عام في الاختبارات:'), error);
    } finally {
      if (this.socket) this.socket.disconnect();
      await this.sql.end();
    }
  }

  async runTest(name: string, testFn: () => Promise<void>) {
    const startTime = Date.now();
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime,
      });
      console.log(chalk.green(`✅ ${name}`));
    } catch (error: any) {
      this.results.push({
        name,
        passed: false,
        error: error.message,
        duration: Date.now() - startTime,
      });
      console.log(chalk.red(`❌ ${name}`));
      console.log(chalk.gray(`   السبب: ${error.message}`));
    }
  }

  async testDatabase() {
    console.log(chalk.yellow('\n📊 اختبار قاعدة البيانات:\n'));

    await this.runTest('الاتصال بقاعدة البيانات', async () => {
      const result = await this.sql`SELECT NOW()`;
      if (!result[0]) throw new Error('فشل الاتصال');
    });

    await this.runTest('التحقق من الجداول الأساسية', async () => {
      const tables = [
        'users', 'rooms', 'messages',
        'friends', 'wall_posts', 'notifications'
      ];
      
      for (const table of tables) {
        const result = await this.sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          )
        `;
        if (!result[0].exists) {
          throw new Error(`الجدول ${table} غير موجود`);
        }
      }
    });

    await this.runTest('التحقق من الفهارس', async () => {
      const result = await this.sql`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `;
      if (result[0].count < 10) {
        throw new Error('عدد الفهارس قليل جداً');
      }
    });

    await this.runTest('التحقق من البيانات الأساسية', async () => {
      // التحقق من وجود غرف افتراضية
      const rooms = await this.sql`
        SELECT id FROM rooms WHERE id IN ('general', 'games', 'support')
      `;
      if (rooms.length < 3) {
        throw new Error('الغرف الافتراضية غير موجودة');
      }

      // التحقق من إعدادات المستويات
      const levels = await this.sql`SELECT COUNT(*) as count FROM level_settings`;
      if (levels[0].count < 5) {
        throw new Error('إعدادات المستويات غير كاملة');
      }
    });
  }

  async testAPI() {
    console.log(chalk.yellow('\n🌐 اختبار واجهات API:\n'));

    // إنشاء مستخدم اختبار
    const timestamp = Date.now();
    this.testUser = {
      username: `test_user_${timestamp}`,
      password: 'Test123!@#',
      email: `test${timestamp}@example.com`,
    };

    await this.runTest('تسجيل مستخدم جديد', async () => {
      try {
        const response = await axios.post(`${API_URL}/api/register`, this.testUser);
        if (!response.data.success) {
          throw new Error(response.data.error || 'فشل التسجيل');
        }
        this.testUser.id = response.data.user.id;
      } catch (error: any) {
        if (error.response) {
          throw new Error(`HTTP ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`لا يمكن الاتصال بالخادم على ${API_URL}`);
        }
        throw error;
      }
    });

    await this.runTest('تسجيل الدخول', async () => {
      try {
        const response = await axios.post(`${API_URL}/api/login`, {
          username: this.testUser.username,
          password: this.testUser.password,
        });
        if (!response.data.success) {
          throw new Error('فشل تسجيل الدخول');
        }
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.testUser.cookie = cookies[0].split(';')[0];
        }
      } catch (error: any) {
        if (error.response) {
          throw new Error(`HTTP ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`لا يمكن الاتصال بالخادم على ${API_URL}`);
        }
        throw error;
      }
    });

    await this.runTest('جلب معلومات المستخدم', async () => {
      const response = await axios.get(`${API_URL}/api/user`, {
        headers: { Cookie: this.testUser.cookie },
      });
      if (!response.data.user || response.data.user.username !== this.testUser.username) {
        throw new Error('معلومات المستخدم غير صحيحة');
      }
    });

    await this.runTest('إرسال رسالة', async () => {
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          roomId: 'general',
          content: 'رسالة اختبار من النظام',
        },
        {
          headers: { Cookie: this.testUser.cookie },
        }
      );
      if (!response.data.success) {
        throw new Error('فشل إرسال الرسالة');
      }
    });

    await this.runTest('جلب الرسائل', async () => {
      const response = await axios.get(`${API_URL}/api/messages/general`, {
        headers: { Cookie: this.testUser.cookie },
      });
      if (!Array.isArray(response.data.messages)) {
        throw new Error('صيغة الرسائل غير صحيحة');
      }
    });

    await this.runTest('جلب قائمة الغرف', async () => {
      const response = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Cookie: this.testUser.cookie },
      });
      if (!Array.isArray(response.data.rooms) || response.data.rooms.length === 0) {
        throw new Error('قائمة الغرف فارغة');
      }
    });

    await this.runTest('جلب المستخدمين المتصلين', async () => {
      const response = await axios.get(`${API_URL}/api/online-users`, {
        headers: { Cookie: this.testUser.cookie },
      });
      if (!Array.isArray(response.data.users)) {
        throw new Error('صيغة المستخدمين غير صحيحة');
      }
    });
  }

  async testWebSocket() {
    console.log(chalk.yellow('\n🔌 اختبار WebSocket:\n'));

    await this.runTest('الاتصال بـ WebSocket', async () => {
      return new Promise((resolve, reject) => {
        this.socket = io(WS_URL, {
          auth: { sessionId: this.testUser.cookie },
        });

        this.socket.on('connect', () => {
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          reject(new Error(`فشل الاتصال: ${error.message}`));
        });

        setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), 5000);
      });
    });

    await this.runTest('الانضمام إلى غرفة', async () => {
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('لا يوجد اتصال WebSocket'));
          return;
        }

        this.socket.emit('join-room', 'general');
        
        this.socket.once('room-joined', (data) => {
          if (data.roomId === 'general') {
            resolve();
          } else {
            reject(new Error('الغرفة غير صحيحة'));
          }
        });

        setTimeout(() => reject(new Error('انتهت مهلة الانضمام')), 5000);
      });
    });

    await this.runTest('إرسال رسالة عبر WebSocket', async () => {
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('لا يوجد اتصال WebSocket'));
          return;
        }

        const testMessage = `اختبار WebSocket ${Date.now()}`;

        this.socket.once('new-message', (message) => {
          if (message.content === testMessage) {
            resolve();
          }
        });

        this.socket.emit('send-message', {
          roomId: 'general',
          content: testMessage,
        });

        setTimeout(() => reject(new Error('لم تصل الرسالة')), 5000);
      });
    });
  }

  async testSecurity() {
    console.log(chalk.yellow('\n🔒 اختبار الأمان:\n'));

    await this.runTest('رفض الوصول بدون مصادقة', async () => {
      try {
        await axios.get(`${API_URL}/api/user`);
        throw new Error('يجب أن يفشل الطلب');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          throw new Error('كود الخطأ غير صحيح');
        }
      }
    });

    await this.runTest('رفض كلمة مرور خاطئة', async () => {
      try {
        await axios.post(`${API_URL}/api/login`, {
          username: this.testUser.username,
          password: 'WrongPassword',
        });
        throw new Error('يجب أن يفشل تسجيل الدخول');
      } catch (error: any) {
        if (error.response?.status !== 401) {
          throw new Error('كود الخطأ غير صحيح');
        }
      }
    });

    await this.runTest('التحقق من تشفير كلمات المرور', async () => {
      const result = await this.sql`
        SELECT password FROM users WHERE username = ${this.testUser.username}
      `;
      if (!result[0]?.password || result[0].password === this.testUser.password) {
        throw new Error('كلمة المرور غير مشفرة');
      }
    });
  }

  async testFileSystem() {
    console.log(chalk.yellow('\n📁 اختبار النظام الملفات:\n'));

    await this.runTest('التحقق من مجلدات الرفع', async () => {
      const dirs = [
        'client/public/uploads/avatars',
        'client/public/uploads/banners',
        'client/public/uploads/profiles',
        'client/public/uploads/wall',
      ];

      for (const dir of dirs) {
        try {
          await fs.access(dir);
        } catch {
          // إنشاء المجلد إذا لم يكن موجود
          await fs.mkdir(dir, { recursive: true });
        }
      }
    });

    await this.runTest('التحقق من الملفات الأساسية', async () => {
      const files = [
        'server/index.ts',
        'client/src/App.tsx',
        'shared/schema.ts',
        'package.json',
        '.env',
      ];

      for (const file of files) {
        try {
          await fs.access(file);
        } catch {
          throw new Error(`الملف ${file} غير موجود`);
        }
      }
    });

    await this.runTest('التحقق من صورة الافتراضية', async () => {
      const defaultAvatar = 'client/public/default_avatar.svg';
      try {
        await fs.access(defaultAvatar);
      } catch {
        // إنشاء صورة افتراضية إذا لم تكن موجودة
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="#e0e0e0"/>
          <circle cx="50" cy="35" r="20" fill="#999"/>
          <ellipse cx="50" cy="70" rx="35" ry="25" fill="#999"/>
        </svg>`;
        await fs.writeFile(defaultAvatar, svgContent);
      }
    });
  }

  displayResults() {
    console.log(chalk.gray('\n' + '='.repeat(60)));
    console.log(chalk.blue.bold('\n📊 نتائج الاختبارات:\n'));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    // عرض ملخص
    console.log(chalk.green(`✅ نجح: ${passed} اختبار`));
    console.log(chalk.red(`❌ فشل: ${failed} اختبار`));
    console.log(chalk.gray(`📝 المجموع: ${total} اختبار`));

    // عرض الاختبارات الفاشلة
    if (failed > 0) {
      console.log(chalk.red.bold('\n❌ الاختبارات الفاشلة:\n'));
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(chalk.red(`• ${r.name}`));
          if (r.error) {
            console.log(chalk.gray(`  السبب: ${r.error}`));
          }
        });
    }

    // النتيجة النهائية
    console.log(chalk.gray('\n' + '='.repeat(60)));
    if (failed === 0) {
      console.log(chalk.green.bold('✅ ✅ ✅ جميع الاختبارات نجحت! ✅ ✅ ✅'));
    } else {
      console.log(chalk.red.bold(`⚠️ فشل ${failed} من ${total} اختبار`));
      
      // اقتراحات الإصلاح
      console.log(chalk.yellow.bold('\n💡 اقتراحات الإصلاح:\n'));
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(chalk.yellow(`• ${r.name}:`));
          console.log(chalk.gray(`  - تحقق من ${this.getSuggestion(r.name)}`));
        });
    }
    console.log(chalk.gray('='.repeat(60) + '\n'));
  }

  getSuggestion(testName: string): string {
    if (testName.includes('قاعدة البيانات')) {
      return 'اتصال قاعدة البيانات ومتغير DATABASE_URL';
    }
    if (testName.includes('API')) {
      return 'أن الخادم يعمل على المنفذ الصحيح';
    }
    if (testName.includes('WebSocket')) {
      return 'إعدادات Socket.IO والمنفذ';
    }
    if (testName.includes('ملف')) {
      return 'وجود الملفات والصلاحيات';
    }
    if (testName.includes('مجلد')) {
      return 'إنشاء المجلدات المطلوبة';
    }
    return 'الكود المتعلق بهذه الميزة';
  }
}

// تشغيل الاختبارات
const tester = new SystemTester();
tester.runAllTests().catch(console.error);
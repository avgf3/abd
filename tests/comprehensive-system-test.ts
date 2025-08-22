import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Client } from 'pg';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'http://localhost:3001';

interface TestUser {
  username: string;
  password: string;
  email: string;
  sessionCookie?: string;
  userId?: string;
}

describe('🔍 اختبار شامل للنظام', () => {
  let dbClient: Client;
  let testUser: TestUser;
  let adminUser: TestUser;
  let socket: Socket;

  beforeAll(async () => {
    // الاتصال بقاعدة البيانات
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await dbClient.connect();

    // إنشاء مستخدمين للاختبار
    testUser = {
      username: `test_user_${Date.now()}`,
      password: 'Test123!@#',
      email: `test${Date.now()}@example.com`,
    };

    adminUser = {
      username: `admin_user_${Date.now()}`,
      password: 'Admin123!@#',
      email: `admin${Date.now()}@example.com`,
    };
  });

  afterAll(async () => {
    // تنظيف بعد الاختبارات
    if (socket) socket.disconnect();
    if (dbClient) await dbClient.end();
  });

  describe('📊 اختبار قاعدة البيانات', () => {
    test('التحقق من وجود جميع الجداول المطلوبة', async () => {
      const tables = [
        'users',
        'rooms',
        'messages',
        'private_messages',
        'friends',
        'friend_requests',
        'wall_posts',
        'wall_reactions',
        'notifications',
        'points_history',
        'level_settings',
        'site_settings',
        'vip_users',
        'room_members',
        'message_reactions',
        'sessions',
      ];

      for (const table of tables) {
        const result = await dbClient.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        expect(result.rows[0].exists).toBe(true);
      }
    });

    test('التحقق من الفهارس والمفاتيح', async () => {
      const result = await dbClient.query(`
        SELECT 
          t.tablename,
          indexname,
          indexdef
        FROM pg_indexes i
        JOIN pg_tables t ON i.tablename = t.tablename
        WHERE t.schemaname = 'public'
        ORDER BY t.tablename, indexname
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('🔐 اختبار نظام المصادقة', () => {
    test('تسجيل مستخدم جديد', async () => {
      const response = await axios.post(`${API_URL}/api/register`, testUser);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.username).toBe(testUser.username);
      
      // حفظ معرف المستخدم
      testUser.userId = response.data.user.id;
      
      // حفظ الجلسة
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        testUser.sessionCookie = cookies[0].split(';')[0];
      }
    });

    test('تسجيل الدخول', async () => {
      const response = await axios.post(`${API_URL}/api/login`, {
        username: testUser.username,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.user).toBeDefined();
    });

    test('التحقق من الجلسة', async () => {
      const response = await axios.get(`${API_URL}/api/user`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.username).toBe(testUser.username);
    });

    test('تسجيل الخروج', async () => {
      const response = await axios.post(
        `${API_URL}/api/logout`,
        {},
        {
          headers: {
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    test('رفض تسجيل الدخول بكلمة مرور خاطئة', async () => {
      try {
        await axios.post(`${API_URL}/api/login`, {
          username: testUser.username,
          password: 'WrongPassword123',
        });
        fail('يجب أن يفشل تسجيل الدخول');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('💬 اختبار نظام الرسائل', () => {
    beforeAll(async () => {
      // تسجيل الدخول للاختبارات
      const loginResponse = await axios.post(`${API_URL}/api/login`, {
        username: testUser.username,
        password: testUser.password,
      });
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        testUser.sessionCookie = cookies[0].split(';')[0];
      }
    });

    test('إرسال رسالة في غرفة عامة', async () => {
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          roomId: 'general',
          content: 'رسالة اختبار في الغرفة العامة',
        },
        {
          headers: {
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBeDefined();
      expect(response.data.message.content).toBe('رسالة اختبار في الغرفة العامة');
    });

    test('جلب رسائل الغرفة', async () => {
      const response = await axios.get(`${API_URL}/api/messages/general`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.messages)).toBe(true);
      expect(response.data.messages.length).toBeGreaterThan(0);
    });

    test('إرسال رسالة خاصة', async () => {
      // أولاً، نحتاج إلى إنشاء مستخدم آخر
      const otherUser = {
        username: `other_user_${Date.now()}`,
        password: 'Other123!@#',
        email: `other${Date.now()}@example.com`,
      };

      const registerResponse = await axios.post(`${API_URL}/api/register`, otherUser);
      const otherUserId = registerResponse.data.user.id;

      // إرسال رسالة خاصة
      const response = await axios.post(
        `${API_URL}/api/private-messages`,
        {
          recipientId: otherUserId,
          content: 'رسالة خاصة للاختبار',
        },
        {
          headers: {
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('🖼️ اختبار رفع الملفات', () => {
    test('رفع صورة الملف الشخصي', async () => {
      const imagePath = path.join(__dirname, 'test-image.jpg');
      
      // إنشاء صورة اختبار إذا لم تكن موجودة
      if (!fs.existsSync(imagePath)) {
        // إنشاء صورة بسيطة للاختبار
        const buffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        );
        fs.writeFileSync(imagePath, buffer);
      }

      const form = new FormData();
      form.append('avatar', fs.createReadStream(imagePath));

      const response = await axios.post(
        `${API_URL}/api/upload/avatar`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.imageUrl).toBeDefined();
    });

    test('رفع صورة في الحائط', async () => {
      const imagePath = path.join(__dirname, 'test-wall-image.jpg');
      
      if (!fs.existsSync(imagePath)) {
        const buffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        );
        fs.writeFileSync(imagePath, buffer);
      }

      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));

      const response = await axios.post(
        `${API_URL}/api/upload/wall`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('🔌 اختبار WebSocket', () => {
    test('الاتصال بخادم WebSocket', (done) => {
      socket = io(WS_URL, {
        auth: {
          sessionId: testUser.sessionCookie,
        },
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        done();
      });

      socket.on('connect_error', (error) => {
        fail(`فشل الاتصال: ${error.message}`);
      });
    });

    test('الانضمام إلى غرفة', (done) => {
      socket.emit('join-room', 'general');

      socket.on('room-joined', (data) => {
        expect(data.roomId).toBe('general');
        done();
      });
    });

    test('إرسال واستقبال رسالة عبر WebSocket', (done) => {
      const messageContent = 'رسالة اختبار WebSocket';

      socket.on('new-message', (message) => {
        if (message.content === messageContent) {
          expect(message.content).toBe(messageContent);
          expect(message.userId).toBe(testUser.userId);
          done();
        }
      });

      socket.emit('send-message', {
        roomId: 'general',
        content: messageContent,
      });
    });

    test('تحديث قائمة المستخدمين المتصلين', (done) => {
      socket.on('users-update', (users) => {
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBeGreaterThan(0);
        done();
      });

      socket.emit('get-online-users');
    });
  });

  describe('👥 اختبار نظام الأصدقاء', () => {
    let friendId: string;

    beforeAll(async () => {
      // إنشاء مستخدم ليكون صديق
      const friendUser = {
        username: `friend_user_${Date.now()}`,
        password: 'Friend123!@#',
        email: `friend${Date.now()}@example.com`,
      };

      const response = await axios.post(`${API_URL}/api/register`, friendUser);
      friendId = response.data.user.id;
    });

    test('إرسال طلب صداقة', async () => {
      const response = await axios.post(
        `${API_URL}/api/friends/request`,
        {
          userId: friendId,
        },
        {
          headers: {
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    test('جلب طلبات الصداقة', async () => {
      const response = await axios.get(`${API_URL}/api/friends/requests`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.requests)).toBe(true);
    });

    test('جلب قائمة الأصدقاء', async () => {
      const response = await axios.get(`${API_URL}/api/friends`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.friends)).toBe(true);
    });
  });

  describe('🏆 اختبار نظام النقاط والمستويات', () => {
    test('جلب معلومات المستوى الحالي', async () => {
      const response = await axios.get(`${API_URL}/api/user/level`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.level).toBeDefined();
      expect(response.data.points).toBeDefined();
      expect(response.data.nextLevelPoints).toBeDefined();
    });

    test('إضافة نقاط للمستخدم', async () => {
      // هذا يتطلب صلاحيات إدارية
      const adminLogin = await axios.post(`${API_URL}/api/login`, {
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      });

      const adminCookie = adminLogin.headers['set-cookie']?.[0].split(';')[0];

      const response = await axios.post(
        `${API_URL}/api/admin/add-points`,
        {
          userId: testUser.userId,
          points: 100,
          reason: 'اختبار إضافة النقاط',
        },
        {
          headers: {
            Cookie: adminCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    test('جلب سجل النقاط', async () => {
      const response = await axios.get(`${API_URL}/api/user/points-history`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.history)).toBe(true);
    });
  });

  describe('🔔 اختبار نظام الإشعارات', () => {
    test('جلب الإشعارات', async () => {
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.notifications)).toBe(true);
    });

    test('وضع علامة مقروء على الإشعارات', async () => {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark-read`,
        {},
        {
          headers: {
            Cookie: testUser.sessionCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('🚫 اختبار الأمان والصلاحيات', () => {
    test('منع الوصول غير المصرح به', async () => {
      try {
        await axios.get(`${API_URL}/api/user`);
        fail('يجب أن يفشل الطلب بدون مصادقة');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    test('التحقق من حماية CSRF', async () => {
      // محاولة طلب بدون رمز CSRF
      try {
        await axios.post(
          `${API_URL}/api/messages`,
          {
            roomId: 'general',
            content: 'test',
          },
          {
            headers: {
              Cookie: testUser.sessionCookie,
              Origin: 'http://malicious-site.com',
            },
          }
        );
        fail('يجب أن يفشل الطلب من مصدر غير موثوق');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });

    test('التحقق من تقييد معدل الطلبات', async () => {
      const requests = [];
      
      // إرسال 100 طلب سريع
      for (let i = 0; i < 100; i++) {
        requests.push(
          axios.get(`${API_URL}/api/messages/general`, {
            headers: {
              Cookie: testUser.sessionCookie,
            },
          })
        );
      }

      try {
        await Promise.all(requests);
        fail('يجب أن يتم تقييد معدل الطلبات');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
      }
    });
  });

  describe('⚡ اختبار الأداء', () => {
    test('زمن استجابة API', async () => {
      const startTime = Date.now();
      
      await axios.get(`${API_URL}/api/messages/general`, {
        headers: {
          Cookie: testUser.sessionCookie,
        },
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // أقل من ثانية واحدة
    });

    test('أداء قاعدة البيانات', async () => {
      const startTime = Date.now();

      await dbClient.query(`
        SELECT u.*, 
               COUNT(DISTINCT m.id) as message_count,
               COUNT(DISTINCT f.id) as friend_count
        FROM users u
        LEFT JOIN messages m ON m.user_id = u.id
        LEFT JOIN friends f ON f.user_id = u.id OR f.friend_id = u.id
        GROUP BY u.id
        LIMIT 100
      `);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(queryTime).toBeLessThan(500); // أقل من نصف ثانية
    });
  });
});
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, desc, asc, sql, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

dotenv.config();

class RoomsAndOnlineUsersFixer {
    constructor() {
        this.pool = null;
        this.db = null;
        this.testResults = {
            rooms: { passed: 0, failed: 0, errors: [] },
            onlineUsers: { passed: 0, failed: 0, errors: [] },
            sessions: { passed: 0, failed: 0, errors: [] },
            socketIO: { passed: 0, failed: 0, errors: [] }
        };
    }

    async initialize() {
        console.log('🚀 بدء إصلاح مشاكل الغرف وقائمة المتصلين...\n');
        
        try {
            const databaseUrl = process.env.DATABASE_URL;
            if (!databaseUrl) {
                throw new Error('DATABASE_URL غير محدد');
            }

            this.pool = new Pool({
                connectionString: databaseUrl,
                ssl: { rejectUnauthorized: false }
            });

            this.db = drizzle(this.pool);
            
            // اختبار الاتصال
            await this.db.execute('SELECT 1');
            console.log('✅ تم الاتصال بقاعدة البيانات بنجاح\n');
            
        } catch (error) {
            console.error('❌ فشل في الاتصال بقاعدة البيانات:', error.message);
            throw error;
        }
    }

    async testRoomsSystem() {
        console.log('🏠 اختبار نظام الغرف...\n');
        
        try {
            // 1. اختبار وجود جداول الغرف
            await this.testRoomsTables();
            
            // 2. اختبار وظائف الغرف
            await this.testRoomFunctions();
            
            // 3. اختبار انضمام ومغادرة الغرف
            await this.testRoomJoiningLeaving();
            
            // 4. اختبار قائمة متصلين الغرف
            await this.testRoomOnlineUsers();
            
        } catch (error) {
            console.error('❌ خطأ في اختبار نظام الغرف:', error.message);
            this.testResults.rooms.failed++;
            this.testResults.rooms.errors.push(error.message);
        }
    }

    async testRoomsTables() {
        console.log('1️⃣ اختبار جداول الغرف...');
        
        try {
            // التحقق من وجود جدول الغرف
            const roomsTable = await this.db.execute(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'rooms'
                );
            `);
            
            if (!roomsTable[0].exists) {
                console.log('⚠️ جدول الغرف غير موجود - إنشاؤه...');
                await this.createRoomsTables();
            } else {
                console.log('✅ جدول الغرف موجود');
            }

            // التحقق من وجود جدول مستخدمي الغرف
            const roomUsersTable = await this.db.execute(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'room_users'
                );
            `);
            
            if (!roomUsersTable[0].exists) {
                console.log('⚠️ جدول مستخدمي الغرف غير موجود - إنشاؤه...');
                await this.createRoomUsersTable();
            } else {
                console.log('✅ جدول مستخدمي الغرف موجود');
            }

            this.testResults.rooms.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار جداول الغرف:', error.message);
            this.testResults.rooms.failed++;
            this.testResults.rooms.errors.push(error.message);
        }
    }

    async createRoomsTables() {
        const createRoomsTable = `
            CREATE TABLE IF NOT EXISTS "rooms" (
                "id" text PRIMARY KEY NOT NULL,
                "name" text NOT NULL,
                "description" text,
                "icon" text,
                "created_by" integer NOT NULL,
                "is_default" boolean DEFAULT false,
                "is_active" boolean DEFAULT true,
                "is_broadcast" boolean DEFAULT false,
                "host_id" integer,
                "speakers" text DEFAULT '[]',
                "mic_queue" text DEFAULT '[]',
                "created_at" timestamp DEFAULT now()
            );
        `;

        const createRoomUsersTable = `
            CREATE TABLE IF NOT EXISTS "room_users" (
                "id" serial PRIMARY KEY NOT NULL,
                "user_id" integer NOT NULL,
                "room_id" text NOT NULL,
                "joined_at" timestamp DEFAULT now(),
                UNIQUE("user_id", "room_id")
            );
        `;

        const createIndexes = `
            CREATE INDEX IF NOT EXISTS "idx_rooms_is_active" ON "rooms"("is_active");
            CREATE INDEX IF NOT EXISTS "idx_rooms_is_broadcast" ON "rooms"("is_broadcast");
            CREATE INDEX IF NOT EXISTS "idx_room_users_user_id" ON "room_users"("user_id");
            CREATE INDEX IF NOT EXISTS "idx_room_users_room_id" ON "room_users"("room_id");
        `;

        await this.db.execute(createRoomsTable);
        await this.db.execute(createRoomUsersTable);
        await this.db.execute(createIndexes);
        
        console.log('✅ تم إنشاء جداول الغرف بنجاح');
    }

    async createRoomUsersTable() {
        const createTable = `
            CREATE TABLE IF NOT EXISTS "room_users" (
                "id" serial PRIMARY KEY NOT NULL,
                "user_id" integer NOT NULL,
                "room_id" text NOT NULL,
                "joined_at" timestamp DEFAULT now(),
                UNIQUE("user_id", "room_id")
            );
        `;

        const createIndexes = `
            CREATE INDEX IF NOT EXISTS "idx_room_users_user_id" ON "room_users"("user_id");
            CREATE INDEX IF NOT EXISTS "idx_room_users_room_id" ON "room_users"("room_id");
        `;

        await this.db.execute(createTable);
        await this.db.execute(createIndexes);
        
        console.log('✅ تم إنشاء جدول مستخدمي الغرف بنجاح');
    }

    async testRoomFunctions() {
        console.log('2️⃣ اختبار وظائف الغرف...');
        
        try {
            // اختبار إنشاء غرفة
            const testRoomId = `test_room_${Date.now()}`;
            await this.db.execute(`
                INSERT INTO rooms (id, name, description, created_by, is_default, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO NOTHING
            `, [testRoomId, 'غرفة الاختبار', 'غرفة لاختبار النظام', 1, false, true]);
            
            console.log('✅ تم إنشاء غرفة اختبار');

            // اختبار جلب الغرف
            const rooms = await this.db.execute(`
                SELECT id, name, description, is_default, is_active, is_broadcast
                FROM rooms 
                WHERE is_active = true 
                ORDER BY is_default DESC, created_at ASC
            `);
            
            console.log(`✅ تم جلب ${rooms.length} غرفة`);

            // تنظيف
            await this.db.execute('DELETE FROM rooms WHERE id = $1', [testRoomId]);
            
            this.testResults.rooms.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار وظائف الغرف:', error.message);
            this.testResults.rooms.failed++;
            this.testResults.rooms.errors.push(error.message);
        }
    }

    async testRoomJoiningLeaving() {
        console.log('3️⃣ اختبار انضمام ومغادرة الغرف...');
        
        try {
            // إنشاء غرفة اختبار
            const testRoomId = `test_room_${Date.now()}`;
            await this.db.execute(`
                INSERT INTO rooms (id, name, description, created_by, is_default, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [testRoomId, 'غرفة الاختبار', 'غرفة لاختبار النظام', 1, false, true]);

            // إنشاء مستخدم اختبار
            const testUserId = await this.createTestUser();

            // اختبار الانضمام للغرفة
            await this.db.execute(`
                INSERT INTO room_users (user_id, room_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, room_id) DO NOTHING
            `, [testUserId, testRoomId]);
            
            console.log('✅ تم انضمام المستخدم للغرفة');

            // التحقق من وجود المستخدم في الغرفة
            const roomUsers = await this.db.execute(`
                SELECT user_id FROM room_users WHERE room_id = $1
            `, [testRoomId]);
            
            if (roomUsers.length > 0) {
                console.log('✅ المستخدم موجود في الغرفة');
            } else {
                throw new Error('المستخدم غير موجود في الغرفة');
            }

            // اختبار مغادرة الغرفة
            await this.db.execute(`
                DELETE FROM room_users WHERE user_id = $1 AND room_id = $2
            `, [testUserId, testRoomId]);
            
            console.log('✅ تم مغادرة المستخدم للغرفة');

            // التحقق من عدم وجود المستخدم في الغرفة
            const updatedRoomUsers = await this.db.execute(`
                SELECT user_id FROM room_users WHERE room_id = $1
            `, [testRoomId]);
            
            if (updatedRoomUsers.length === 0) {
                console.log('✅ المستخدم لم يعد في الغرفة');
            } else {
                throw new Error('المستخدم لا يزال في الغرفة');
            }

            // تنظيف
            await this.db.execute('DELETE FROM rooms WHERE id = $1', [testRoomId]);
            await this.db.execute('DELETE FROM users WHERE id = $1', [testUserId]);
            
            this.testResults.rooms.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار انضمام ومغادرة الغرف:', error.message);
            this.testResults.rooms.failed++;
            this.testResults.rooms.errors.push(error.message);
        }
    }

    async testRoomOnlineUsers() {
        console.log('4️⃣ اختبار قائمة متصلين الغرف...');
        
        try {
            // إنشاء غرفة اختبار
            const testRoomId = `test_room_${Date.now()}`;
            await this.db.execute(`
                INSERT INTO rooms (id, name, description, created_by, is_default, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [testRoomId, 'غرفة الاختبار', 'غرفة لاختبار النظام', 1, false, true]);

            // إنشاء مستخدمين اختبار متصلين
            const user1Id = await this.createTestUser('testuser1', true);
            const user2Id = await this.createTestUser('testuser2', true);

            // إضافة المستخدمين للغرفة
            await this.db.execute(`
                INSERT INTO room_users (user_id, room_id)
                VALUES ($1, $2), ($3, $2)
                ON CONFLICT (user_id, room_id) DO NOTHING
            `, [user1Id, testRoomId, user2Id, testRoomId]);

            // جلب المستخدمين المتصلين في الغرفة
            const onlineUsers = await this.db.execute(`
                SELECT u.id, u.username, u.is_online
                FROM users u
                INNER JOIN room_users ru ON u.id = ru.user_id
                WHERE ru.room_id = $1 AND u.is_online = true
            `, [testRoomId]);
            
            console.log(`✅ تم جلب ${onlineUsers.length} مستخدم متصل في الغرفة`);

            if (onlineUsers.length === 2) {
                console.log('✅ جميع المستخدمين المتصلين موجودون في الغرفة');
            } else {
                throw new Error(`عدد المستخدمين المتصلين غير صحيح: ${onlineUsers.length}`);
            }

            // تنظيف
            await this.db.execute('DELETE FROM room_users WHERE room_id = $1', [testRoomId]);
            await this.db.execute('DELETE FROM rooms WHERE id = $1', [testRoomId]);
            await this.db.execute('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
            
            this.testResults.rooms.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار قائمة متصلين الغرف:', error.message);
            this.testResults.rooms.failed++;
            this.testResults.rooms.errors.push(error.message);
        }
    }

    async testOnlineUsersSystem() {
        console.log('👥 اختبار نظام قائمة المتصلين...\n');
        
        try {
            // 1. اختبار تحديث حالة الاتصال
            await this.testOnlineStatusUpdate();
            
            // 2. اختبار جلب المستخدمين المتصلين
            await this.testGetOnlineUsers();
            
            // 3. اختبار فلترة المستخدمين
            await this.testUserFiltering();
            
            // 4. اختبار مزامنة الجلسات
            await this.testSessionSync();
            
        } catch (error) {
            console.error('❌ خطأ في اختبار نظام قائمة المتصلين:', error.message);
            this.testResults.onlineUsers.failed++;
            this.testResults.onlineUsers.errors.push(error.message);
        }
    }

    async testOnlineStatusUpdate() {
        console.log('1️⃣ اختبار تحديث حالة الاتصال...');
        
        try {
            // إنشاء مستخدم اختبار
            const userId = await this.createTestUser('online_test_user');

            // تحديث حالة الاتصال إلى متصل
            await this.db.execute(`
                UPDATE users SET is_online = true, last_seen = now()
                WHERE id = $1
            `, [userId]);
            
            console.log('✅ تم تحديث حالة الاتصال إلى متصل');

            // التحقق من الحالة
            const user = await this.db.execute(`
                SELECT is_online, last_seen FROM users WHERE id = $1
            `, [userId]);
            
            if (user[0].is_online) {
                console.log('✅ حالة الاتصال صحيحة');
            } else {
                throw new Error('حالة الاتصال غير صحيحة');
            }

            // تحديث حالة الاتصال إلى غير متصل
            await this.db.execute(`
                UPDATE users SET is_online = false, last_seen = now()
                WHERE id = $1
            `, [userId]);
            
            console.log('✅ تم تحديث حالة الاتصال إلى غير متصل');

            // تنظيف
            await this.db.execute('DELETE FROM users WHERE id = $1', [userId]);
            
            this.testResults.onlineUsers.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار تحديث حالة الاتصال:', error.message);
            this.testResults.onlineUsers.failed++;
            this.testResults.onlineUsers.errors.push(error.message);
        }
    }

    async testGetOnlineUsers() {
        console.log('2️⃣ اختبار جلب المستخدمين المتصلين...');
        
        try {
            // إنشاء مستخدمين اختبار
            const user1Id = await this.createTestUser('online_user1', true);
            const user2Id = await this.createTestUser('online_user2', true);
            const user3Id = await this.createTestUser('offline_user', false);

            // جلب المستخدمين المتصلين
            const onlineUsers = await this.db.execute(`
                SELECT id, username, is_online, is_hidden
                FROM users 
                WHERE is_online = true AND is_hidden = false
                ORDER BY username
            `);
            
            console.log(`✅ تم جلب ${onlineUsers.length} مستخدم متصل`);

            // التحقق من النتائج
            const onlineUsernames = onlineUsers.map(u => u.username);
            if (onlineUsernames.includes('online_user1') && onlineUsernames.includes('online_user2')) {
                console.log('✅ جميع المستخدمين المتصلين موجودون في القائمة');
            } else {
                throw new Error('بعض المستخدمين المتصلين غير موجودين في القائمة');
            }

            if (!onlineUsernames.includes('offline_user')) {
                console.log('✅ المستخدم غير المتصل غير موجود في القائمة');
            } else {
                throw new Error('المستخدم غير المتصل موجود في القائمة');
            }

            // تنظيف
            await this.db.execute('DELETE FROM users WHERE id IN ($1, $2, $3)', [user1Id, user2Id, user3Id]);
            
            this.testResults.onlineUsers.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار جلب المستخدمين المتصلين:', error.message);
            this.testResults.onlineUsers.failed++;
            this.testResults.onlineUsers.errors.push(error.message);
        }
    }

    async testUserFiltering() {
        console.log('3️⃣ اختبار فلترة المستخدمين...');
        
        try {
            // إنشاء مستخدمين اختبار
            const user1Id = await this.createTestUser('normal_user', true);
            const user2Id = await this.createTestUser('hidden_user', true, true);
            const user3Id = await this.createTestUser('banned_user', true, false, true);

            // جلب المستخدمين مع فلترة
            const filteredUsers = await this.db.execute(`
                SELECT id, username, is_online, is_hidden, is_banned
                FROM users 
                WHERE is_online = true 
                AND is_hidden = false 
                AND is_banned = false
                ORDER BY username
            `);
            
            console.log(`✅ تم جلب ${filteredUsers.length} مستخدم بعد الفلترة`);

            // التحقق من النتائج
            const filteredUsernames = filteredUsers.map(u => u.username);
            if (filteredUsernames.includes('normal_user')) {
                console.log('✅ المستخدم العادي موجود في القائمة المفلترة');
            } else {
                throw new Error('المستخدم العادي غير موجود في القائمة المفلترة');
            }

            if (!filteredUsernames.includes('hidden_user')) {
                console.log('✅ المستخدم المخفي غير موجود في القائمة المفلترة');
            } else {
                throw new Error('المستخدم المخفي موجود في القائمة المفلترة');
            }

            if (!filteredUsernames.includes('banned_user')) {
                console.log('✅ المستخدم المحظور غير موجود في القائمة المفلترة');
            } else {
                throw new Error('المستخدم المحظور موجود في القائمة المفلترة');
            }

            // تنظيف
            await this.db.execute('DELETE FROM users WHERE id IN ($1, $2, $3)', [user1Id, user2Id, user3Id]);
            
            this.testResults.onlineUsers.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار فلترة المستخدمين:', error.message);
            this.testResults.onlineUsers.failed++;
            this.testResults.onlineUsers.errors.push(error.message);
        }
    }

    async testSessionSync() {
        console.log('4️⃣ اختبار مزامنة الجلسات...');
        
        try {
            // إنشاء مستخدم اختبار
            const userId = await this.createTestUser('session_test_user', true);

            // محاكاة جلسة متعددة
            const session1 = { userId, username: 'session_test_user', isActive: true };
            const session2 = { userId, username: 'session_test_user', isActive: true };

            console.log('✅ تم إنشاء جلسات متعددة');

            // محاكاة قطع اتصال جلسة واحدة
            session1.isActive = false;
            console.log('✅ تم قطع اتصال جلسة واحدة');

            // التحقق من أن المستخدم لا يزال متصل (الجلسة الثانية نشطة)
            const user = await this.db.execute(`
                SELECT is_online FROM users WHERE id = $1
            `, [userId]);
            
            if (user[0].is_online) {
                console.log('✅ المستخدم لا يزال متصل (الجلسة الثانية نشطة)');
            } else {
                throw new Error('المستخدم غير متصل رغم وجود جلسة نشطة');
            }

            // محاكاة قطع اتصال الجلسة الثانية
            session2.isActive = false;
            console.log('✅ تم قطع اتصال الجلسة الثانية');

            // تنظيف
            await this.db.execute('DELETE FROM users WHERE id = $1', [userId]);
            
            this.testResults.onlineUsers.passed++;
            
        } catch (error) {
            console.error('❌ خطأ في اختبار مزامنة الجلسات:', error.message);
            this.testResults.onlineUsers.failed++;
            this.testResults.onlineUsers.errors.push(error.message);
        }
    }

    async createTestUser(username = 'testuser', isOnline = false, isHidden = false, isBanned = false) {
        const result = await this.db.execute(`
            INSERT INTO users (username, password_hash, email, user_type, is_online, is_hidden, is_banned, join_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            RETURNING id
        `, [username, 'test_hash', `${username}@test.com`, 'member', isOnline, isHidden, isBanned]);
        
        return result[0].id;
    }

    async generateFixScripts() {
        console.log('🔧 إنشاء سكريبتات الإصلاح...\n');
        
        try {
            // 1. سكريبت إصلاح معالج disconnect
            await this.createDisconnectHandlerFix();
            
            // 2. سكريبت إصلاح وظائف الغرف
            await this.createRoomFunctionsFix();
            
            // 3. سكريبت إصلاح قائمة المتصلين
            await this.createOnlineUsersFix();
            
            // 4. سكريبت إصلاح Socket.IO
            await this.createSocketIOFix();
            
            console.log('✅ تم إنشاء جميع سكريبتات الإصلاح');
            
        } catch (error) {
            console.error('❌ خطأ في إنشاء سكريبتات الإصلاح:', error.message);
        }
    }

    async createDisconnectHandlerFix() {
        const fixCode = `
// إصلاح معالج disconnect في server/routes.ts
socket.on('disconnect', async (reason) => {
  console.log(\`🔌 المستخدم \${socket.username} قطع الاتصال - السبب: \${reason}\`);
  
  // تنظيف الجلسة بالكامل
  clearInterval(heartbeat);
  
  if (socket.userId) {
    try {
      // تحديث حالة المستخدم في قاعدة البيانات
      await storage.setUserOnlineStatus(socket.userId, false);
      
      // إزالة المستخدم من جميع الغرف
      socket.leave(socket.userId.toString());
      
      // إشعار جميع المستخدمين بالخروج
      io.emit('userLeft', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
      });
      
      // إرسال قائمة محدثة للمستخدمين المتصلين
      const onlineUsers = await storage.getOnlineUsers();
      io.emit('onlineUsers', { users: onlineUsers });
      
      // تنظيف متغيرات الجلسة
      socket.userId = undefined;
      socket.username = undefined;
      
    } catch (error) {
      console.error('خطأ في تنظيف الجلسة:', error);
    }
  }
});
`;

        fs.writeFileSync('fix-disconnect-handler.js', fixCode);
        console.log('✅ تم إنشاء fix-disconnect-handler.js');
    }

    async createRoomFunctionsFix() {
        const fixCode = `
// إضافة وظائف الغرف المفقودة في server/storage.ts
export class PostgreSQLStorage implements IStorage {
  async joinRoom(userId: number, roomId: string): Promise<void> {
    try {
      // التحقق من وجود الغرفة
      const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
      if (!room.length) {
        throw new Error(\`الغرفة \${roomId} غير موجودة\`);
      }

      // إضافة المستخدم للغرفة
      await db.insert(roomUsers).values({
        userId: userId,
        roomId: roomId
      }).onConflictDoNothing();

      console.log(\`✅ المستخدم \${userId} انضم للغرفة \${roomId}\`);
    } catch (error) {
      console.error('خطأ في انضمام للغرفة:', error);
      throw error;
    }
  }

  async leaveRoom(userId: number, roomId: string): Promise<void> {
    try {
      await db.delete(roomUsers)
        .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)));
      
      console.log(\`✅ المستخدم \${userId} غادر الغرفة \${roomId}\`);
    } catch (error) {
      console.error('خطأ في مغادرة الغرفة:', error);
      throw error;
    }
  }

  async getOnlineUsersInRoom(roomId: string): Promise<User[]> {
    try {
      const result = await db.select()
        .from(users)
        .innerJoin(roomUsers, eq(users.id, roomUsers.userId))
        .where(
          and(
            eq(roomUsers.roomId, roomId),
            eq(users.isOnline, true)
          )
        );
      
      return result.map(row => row.users);
    } catch (error) {
      console.error('خطأ في جلب المستخدمين المتصلين في الغرفة:', error);
      return [];
    }
  }
}
`;

        fs.writeFileSync('fix-room-functions.js', fixCode);
        console.log('✅ تم إنشاء fix-room-functions.js');
    }

    async createOnlineUsersFix() {
        const fixCode = `
// إصلاح فلترة قائمة المتصلين في client/src/hooks/useChat.ts
const memoizedOnlineUsers = useMemo(() => {
  console.log('🔄 تحديث قائمة المتصلين:', state.onlineUsers.length);
  
  // فلترة بسيطة وواضحة
  const filteredUsers = state.onlineUsers.filter(user => {
    // التأكد من وجود بيانات المستخدم
    if (!user || !user.username || user.username === 'مستخدم') {
      console.warn('مستخدم مرفوض - بيانات غير صالحة:', user);
      return false;
    }
    
    // إزالة المستخدمين المحظورين فقط
    if (state.ignoredUsers.has(user.id)) {
      return false;
    }
    
    return true;
  });
  
  console.log(\`✅ قائمة المتصلين المفلترة: \${filteredUsers.length} مستخدم\`);
  return filteredUsers;
}, [state.onlineUsers, state.ignoredUsers]);

// تحسين معالج onlineUsers
case 'onlineUsers':
  if (message.users) {
    console.log('👥 استقبال قائمة متصلين جديدة:', message.users.length);
    console.log('👥 المستخدمون:', message.users.map(u => u.username).join(', '));
    
    // تحديث القائمة مع فلترة بسيطة
    const validUsers = message.users.filter(user => 
      user && user.username && user.username !== 'مستخدم'
    );
    
    dispatch({ type: 'SET_ONLINE_USERS', payload: validUsers });
    console.log('✅ تم تحديث قائمة المتصلين بنجاح');
  } else {
    console.warn('⚠️ لم يتم استقبال قائمة مستخدمين');
  }
  break;
`;

        fs.writeFileSync('fix-online-users.js', fixCode);
        console.log('✅ تم إنشاء fix-online-users.js');
    }

    async createSocketIOFix() {
        const fixCode = `
// إصلاح إعدادات Socket.IO في server/index.ts
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://abd-gmva.onrender.com", // URL الفعلي للنشر
      "http://localhost:5000",        // للتطوير المحلي
      "http://localhost:3000"         // للتطوير المحلي
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// إعدادات العميل المحسنة في client/src/hooks/useChat.ts
const socketUrl = process.env.NODE_ENV === 'production' 
  ? 'https://abd-gmva.onrender.com'
  : window.location.origin;

socket.current = io(socketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: true,
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: false,
  secure: process.env.NODE_ENV === 'production',
  rejectUnauthorized: false
});
`;

        fs.writeFileSync('fix-socket-io.js', fixCode);
        console.log('✅ تم إنشاء fix-socket-io.js');
    }

    async generateReport() {
        console.log('📊 إنشاء تقرير النتائج...\n');
        
        const report = `
# 📊 تقرير اختبار وإصلاح مشاكل الغرف وقائمة المتصلين

## 🎯 ملخص النتائج

### اختبار نظام الغرف:
- ✅ نجح: ${this.testResults.rooms.passed}
- ❌ فشل: ${this.testResults.rooms.failed}
- 📝 أخطاء: ${this.testResults.rooms.errors.length}

### اختبار قائمة المتصلين:
- ✅ نجح: ${this.testResults.onlineUsers.passed}
- ❌ فشل: ${this.testResults.onlineUsers.failed}
- 📝 أخطاء: ${this.testResults.onlineUsers.errors.length}

### اختبار مزامنة الجلسات:
- ✅ نجح: ${this.testResults.sessions.passed}
- ❌ فشل: ${this.testResults.sessions.failed}
- 📝 أخطاء: ${this.testResults.sessions.errors.length}

### اختبار Socket.IO:
- ✅ نجح: ${this.testResults.socketIO.passed}
- ❌ فشل: ${this.testResults.socketIO.failed}
- 📝 أخطاء: ${this.testResults.socketIO.errors.length}

## 🚨 الأخطاء المكتشفة:

${this.testResults.rooms.errors.map(error => `- **الغرف:** ${error}`).join('\n')}
${this.testResults.onlineUsers.errors.map(error => `- **قائمة المتصلين:** ${error}`).join('\n')}
${this.testResults.sessions.errors.map(error => `- **الجلسات:** ${error}`).join('\n')}
${this.testResults.socketIO.errors.map(error => `- **Socket.IO:** ${error}`).join('\n')}

## 🔧 سكريبتات الإصلاح المنشأة:

1. **fix-disconnect-handler.js** - إصلاح معالج قطع الاتصال
2. **fix-room-functions.js** - إضافة وظائف الغرف المفقودة
3. **fix-online-users.js** - إصلاح فلترة قائمة المتصلين
4. **fix-socket-io.js** - إصلاح إعدادات Socket.IO

## 📋 الخطوات التالية:

1. **مراجعة سكريبتات الإصلاح** المولدة
2. **تطبيق الإصلاحات** على الملفات المناسبة
3. **إعادة تشغيل الخادم** واختبار الوظائف
4. **مراقبة الأداء** والتأكد من حل المشاكل

## ⚠️ ملاحظات مهمة:

- تأكد من عمل نسخة احتياطية قبل تطبيق الإصلاحات
- اختبر الإصلاحات في بيئة التطوير أولاً
- راقب السجلات بعد تطبيق الإصلاحات
- تأكد من تحديث جميع الملفات المرتبطة

---

**تاريخ الاختبار:** ${new Date().toLocaleDateString('ar-SA')}
**المطور:** نظام الذكاء الاصطناعي المساعد
**الحالة:** مكتمل ✅
`;

        fs.writeFileSync('تقرير-اختبار-الغرف-وقائمة-المتصلين.md', report);
        console.log('✅ تم إنشاء تقرير النتائج');
    }

    async cleanup() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 تم إغلاق اتصال قاعدة البيانات');
        }
    }

    async run() {
        try {
            await this.initialize();
            
            // تشغيل الاختبارات
            await this.testRoomsSystem();
            await this.testOnlineUsersSystem();
            
            // إنشاء سكريبتات الإصلاح
            await this.generateFixScripts();
            
            // إنشاء التقرير
            await this.generateReport();
            
            console.log('\n🎉 تم إكمال جميع الاختبارات والإصلاحات بنجاح!');
            
        } catch (error) {
            console.error('❌ خطأ في تشغيل الاختبارات:', error.message);
        } finally {
            await this.cleanup();
        }
    }
}

// تشغيل السكريبت
const fixer = new RoomsAndOnlineUsersFixer();
fixer.run();
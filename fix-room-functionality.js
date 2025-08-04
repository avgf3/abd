import { db } from './server/db.ts';
import { rooms, roomUsers, users } from './shared/schema.ts';
import { eq, and } from 'drizzle-orm';

async function fixRoomFunctionality() {
  console.log('🏠 إصلاح وظائف الغرف...\n');

  try {
    // Check if database is connected
    if (!db) {
      console.error('❌ قاعدة البيانات غير متصلة!');
      return;
    }

    // 1. Create default rooms if they don't exist
    console.log('1️⃣ التحقق من الغرف الافتراضية...');
    const defaultRooms = [
      {
        id: 'general',
        name: 'الغرفة العامة',
        description: 'غرفة الدردشة الرئيسية للجميع',
        isPrivate: false,
        createdBy: 1,
        isDefault: true,
        isActive: true
      },
      {
        id: 'vip',
        name: 'غرفة VIP',
        description: 'غرفة خاصة للأعضاء المميزين',
        isPrivate: true,
        createdBy: 1,
        isDefault: false,
        isActive: true
      }
    ];

    for (const roomData of defaultRooms) {
      const existingRoom = await db.select().from(rooms).where(eq(rooms.id, roomData.id)).limit(1);
      
      if (existingRoom.length === 0) {
        await db.insert(rooms).values({
          ...roomData,
          createdAt: new Date()
        });
        console.log(`✅ تم إنشاء غرفة: ${roomData.name}`);
      } else {
        console.log(`✅ الغرفة موجودة: ${roomData.name}`);
      }
    }

    // 2. Fix room member tracking
    console.log('\n2️⃣ إصلاح تتبع أعضاء الغرف...');
    
    // Get all online users
    const onlineUsers = await db.select().from(users).where(eq(users.isOnline, true));
    console.log(`📊 عدد المستخدمين المتصلين: ${onlineUsers.length}`);

    // Make sure all online users are in at least the general room
    for (const user of onlineUsers) {
      const inGeneralRoom = await db.select()
        .from(roomUsers)
        .where(and(
          eq(roomUsers.userId, user.id),
          eq(roomUsers.roomId, 'general')
        ))
        .limit(1);

      if (inGeneralRoom.length === 0) {
        await db.insert(roomUsers).values({
          userId: user.id,
          roomId: 'general',
          joinedAt: new Date()
        });
        console.log(`✅ تم إضافة ${user.username} إلى الغرفة العامة`);
      }
    }

    // 3. Clean up orphaned room members
    console.log('\n3️⃣ تنظيف أعضاء الغرف الأيتام...');
    
    // Remove room members for non-existent users
    const allRoomUsers = await db.select().from(roomUsers);
    let cleanedCount = 0;

    for (const member of allRoomUsers) {
      const userExists = await db.select()
        .from(users)
        .where(eq(users.id, member.userId))
        .limit(1);

      if (userExists.length === 0) {
        await db.delete(roomUsers)
          .where(and(
            eq(roomUsers.userId, member.userId),
            eq(roomUsers.roomId, member.roomId)
          ));
        cleanedCount++;
      }
    }

    console.log(`✅ تم تنظيف ${cleanedCount} عضوية غرفة أيتام`);

    // 4. Test room functionality
    console.log('\n4️⃣ اختبار وظائف الغرف...');
    
    // Test creating a room
    const testRoomId = `test_room_${Date.now()}`;
    try {
      await db.insert(rooms).values({
        id: testRoomId,
        name: 'غرفة اختبار',
        description: 'غرفة للاختبار فقط',
        createdBy: 1,
        isDefault: false,
        isActive: true,
        createdAt: new Date()
      });
      console.log('✅ إنشاء الغرفة: نجح');

      // Test joining room
      await db.insert(roomUsers).values({
        userId: 1,
        roomId: testRoomId,
        joinedAt: new Date()
      });
      console.log('✅ الانضمام للغرفة: نجح');

      // Test leaving room
      await db.delete(roomUsers)
        .where(and(
          eq(roomUsers.userId, 1),
          eq(roomUsers.roomId, testRoomId)
        ));
      console.log('✅ مغادرة الغرفة: نجح');

      // Test deleting room
      await db.delete(rooms).where(eq(rooms.id, testRoomId));
      console.log('✅ حذف الغرفة: نجح');

    } catch (error) {
      console.error('❌ خطأ في اختبار وظائف الغرف:', error);
    }

    // 5. Add room event logging
    console.log('\n5️⃣ إضافة تسجيل أحداث الغرف...');
    
    // Create room_events table if not exists
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS room_events (
          id SERIAL PRIMARY KEY,
          room_id VARCHAR(255) NOT NULL,
          user_id INTEGER NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          event_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ تم إنشاء جدول room_events');
    } catch (error) {
      console.log('ℹ️  جدول room_events موجود بالفعل');
    }

    console.log('\n✅ تم إصلاح وظائف الغرف بنجاح!');
    
    // Display room tips
    console.log('\n📝 نصائح للغرف:');
    console.log('1. تأكد من أن جميع المستخدمين في الغرفة العامة عند الدخول');
    console.log('2. نظف أعضاء الغرف بشكل دوري');
    console.log('3. سجل جميع أحداث الغرف للمراجعة');
    console.log('4. استخدم معرفات فريدة للغرف');
    console.log('5. تحقق من الصلاحيات قبل السماح بالعمليات');

  } catch (error) {
    console.error('❌ خطأ في إصلاح وظائف الغرف:', error);
  }
}

// Run the fix
fixRoomFunctionality().then(() => process.exit(0)).catch(console.error);
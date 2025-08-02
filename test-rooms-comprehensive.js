const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, desc, asc, sql } = require('drizzle-orm');

// إعداد قاعدة البيانات
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

// استيراد الجداول
const { rooms, roomUsers, users } = require('./shared/schema.ts');

async function comprehensiveRoomsTest() {
  console.log('🔍 بدء اختبار شامل لنظام الغرف...\n');

  try {
    // 1. اختبار الاتصال بقاعدة البيانات
    console.log('1️⃣ اختبار الاتصال بقاعدة البيانات...');
    await db.execute('SELECT 1');
    console.log('✅ الاتصال بقاعدة البيانات يعمل\n');

    // 2. جلب جميع الغرف مع عدد المستخدمين
    console.log('2️⃣ جلب جميع الغرف مع عدد المستخدمين...');
    const allRooms = await db.select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      icon: rooms.icon,
      createdBy: rooms.createdBy,
      isDefault: rooms.isDefault,
      isActive: rooms.isActive,
      isBroadcast: rooms.isBroadcast,
      hostId: rooms.hostId,
      speakers: rooms.speakers,
      micQueue: rooms.micQueue,
      createdAt: rooms.createdAt,
      userCount: sql`(
        SELECT COUNT(*)::int 
        FROM room_users ru 
        WHERE ru.room_id = rooms.id
      )`
    })
    .from(rooms)
    .where(eq(rooms.isActive, true))
    .orderBy(desc(rooms.isDefault), asc(rooms.createdAt));

    console.log(`✅ تم جلب ${allRooms.length} غرفة:`);
    allRooms.forEach(room => {
      console.log(`   - ${room.name} (${room.id}) - ${room.userCount} مستخدم`);
    });
    console.log('');

    // 3. اختبار جلب المستخدمين في كل غرفة
    console.log('3️⃣ اختبار جلب المستخدمين في كل غرفة...');
    for (const room of allRooms) {
      const roomUsersData = await db.select({
        userId: roomUsers.userId,
        joinedAt: roomUsers.joinedAt
      })
      .from(roomUsers)
      .where(eq(roomUsers.roomId, room.id));

      console.log(`   غرفة "${room.name}": ${roomUsersData.length} مستخدم`);
      if (roomUsersData.length > 0) {
        for (const ru of roomUsersData) {
          const user = await db.select({
            username: users.username,
            userType: users.userType
          })
          .from(users)
          .where(eq(users.id, ru.userId));
          
          if (user[0]) {
            console.log(`     - ${user[0].username} (${user[0].userType})`);
          }
        }
      }
    }
    console.log('');

    // 4. اختبار إنشاء غرفة جديدة
    console.log('4️⃣ اختبار إنشاء غرفة جديدة...');
    const testRoomId = `test_room_${Date.now()}`;
    const newRoom = await db.insert(rooms).values({
      id: testRoomId,
      name: 'غرفة الاختبار الشامل',
      description: 'غرفة لاختبار النظام الشامل',
      icon: '',
      createdBy: 1,
      isDefault: false,
      isActive: true,
      isBroadcast: false,
      hostId: null,
      speakers: '[]',
      micQueue: '[]'
    }).returning();

    console.log(`✅ تم إنشاء غرفة جديدة: ${newRoom[0].name}`);
    console.log('');

    // 5. اختبار انضمام مستخدم للغرفة
    console.log('5️⃣ اختبار انضمام مستخدم للغرفة...');
    await db.insert(roomUsers).values({
      userId: 1,
      roomId: testRoomId
    });

    console.log('✅ تم انضمام المستخدم للغرفة');
    console.log('');

    // 6. اختبار جلب الغرف مرة أخرى للتأكد من التحديث
    console.log('6️⃣ اختبار جلب الغرف بعد التحديث...');
    const updatedRooms = await db.select({
      id: rooms.id,
      name: rooms.name,
      userCount: sql`(
        SELECT COUNT(*)::int 
        FROM room_users ru 
        WHERE ru.room_id = rooms.id
      )`
    })
    .from(rooms)
    .where(eq(rooms.isActive, true));

    console.log(`✅ تم جلب ${updatedRooms.length} غرفة محدثة:`);
    updatedRooms.forEach(room => {
      console.log(`   - ${room.name}: ${room.userCount} مستخدم`);
    });
    console.log('');

    // 7. اختبار API endpoint
    console.log('7️⃣ اختبار API endpoint...');
    try {
      console.log('🔍 اختبار API الغرف...');
      const response = await fetch('https://abd-ylo2.onrender.com/api/rooms');
      if (response.ok) {
        const data = await response.json();
        console.log(`
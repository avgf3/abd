import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { rooms, roomUsers, users } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function debugRooms() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return;
  }

  console.log('🔍 فحص نظام الغرف...');
  
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    
    // 1. فحص الغرف الموجودة
    console.log('\n📁 الغرف الموجودة في قاعدة البيانات:');
    const allRooms = await db.select().from(rooms);
    console.log(`عدد الغرف: ${allRooms.length}`);
    allRooms.forEach(room => {
      console.log(`- ${room.name} (${room.id}) - نشطة: ${room.isActive} - افتراضية: ${room.isDefault}`);
    });
    
    // 2. فحص المستخدمين في الغرف
    console.log('\n👥 المستخدمين في الغرف:');
    const roomUsersData = await db.select({
      roomId: roomUsers.roomId,
      userId: roomUsers.userId,
      joinedAt: roomUsers.joinedAt
    }).from(roomUsers);
    
    console.log(`عدد انضمامات الغرف: ${roomUsersData.length}`);
    roomUsersData.forEach(ru => {
      console.log(`- المستخدم ${ru.userId} في الغرفة ${ru.roomId} منذ ${ru.joinedAt}`);
    });
    
    // 3. إنشاء غرف افتراضية إذا لم تكن موجودة
    console.log('\n🏗️ إنشاء الغرف الافتراضية...');
    
    const defaultRooms = [
      {
        id: 'general',
        name: 'الدردشة العامة',
        description: 'الغرفة الرئيسية للدردشة',
        isDefault: true,
        isActive: true,
        isBroadcast: false,
        createdBy: 1
      },
      {
        id: 'broadcast',
        name: 'غرفة البث المباشر',
        description: 'غرفة خاصة للبث المباشر مع نظام المايك',
        isDefault: false,
        isActive: true,
        isBroadcast: true,
        createdBy: 1,
        hostId: 1
      },
      {
        id: 'music',
        name: 'أغاني وسهر',
        description: 'غرفة للموسيقى والترفيه',
        isDefault: false,
        isActive: true,
        isBroadcast: false,
        createdBy: 1
      }
    ];
    
    for (const room of defaultRooms) {
      try {
        await db.insert(rooms).values(room).onConflictDoNothing();
        console.log(`✅ تم إنشاء/تحديث الغرفة: ${room.name}`);
      } catch (error) {
        console.log(`⚠️ خطأ في إنشاء الغرفة ${room.name}:`, error.message);
      }
    }
    
    // 4. فحص الغرف بعد الإنشاء
    console.log('\n📁 الغرف بعد التحديث:');
    const updatedRooms = await db.select().from(rooms).where(eq(rooms.isActive, true));
    console.log(`عدد الغرف النشطة: ${updatedRooms.length}`);
    updatedRooms.forEach(room => {
      console.log(`- ${room.name} (${room.id}) - نشطة: ${room.isActive}`);
    });
    
    // 5. اختبار API call
    console.log('\n🌐 اختبار API call...');
    try {
      const response = await fetch('http://localhost:3000/api/rooms');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API يعمل - عدد الغرف المُرجعة: ${data.rooms.length}`);
        data.rooms.forEach(room => {
          console.log(`- API: ${room.name} (${room.id})`);
        });
      } else {
        console.log(`❌ API لا يعمل - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ خطأ في اتصال API:`, error.message);
    }
    
    await pool.end();
    console.log('\n✅ انتهى فحص نظام الغرف');
    
  } catch (error) {
    console.error('❌ خطأ في فحص الغرف:', error);
  }
}

debugRooms().catch(console.error);
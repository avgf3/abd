import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { rooms, roomUsers, users } from './shared/schema.ts';
import { eq, and } from 'drizzle-orm';

async function fixRoomsSystem() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return;
  }

  console.log('🔧 إصلاح نظام الغرف بشكل شامل...');
  
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    
    // 1. فحص وإنشاء الغرف الافتراضية
    console.log('\n🏗️ إنشاء الغرف الافتراضية...');
    
    const defaultRooms = [
      {
        id: 'general',
        name: 'الدردشة العامة',
        description: 'الغرفة الرئيسية للدردشة',
        isDefault: true,
        isActive: true,
        isBroadcast: false,
        createdBy: 1,
        icon: '',
        hostId: null,
        speakers: '[]',
        micQueue: '[]'
      },
      {
        id: 'broadcast',
        name: 'غرفة البث المباشر',
        description: 'غرفة خاصة للبث المباشر مع نظام المايك',
        isDefault: false,
        isActive: true,
        isBroadcast: true,
        createdBy: 1,
        icon: '',
        hostId: 1,
        speakers: '[]',
        micQueue: '[]'
      },
      {
        id: 'music',
        name: 'أغاني وسهر',
        description: 'غرفة للموسيقى والترفيه',
        isDefault: false,
        isActive: true,
        isBroadcast: false,
        createdBy: 1,
        icon: '',
        hostId: null,
        speakers: '[]',
        micQueue: '[]'
      }
    ];
    
    for (const room of defaultRooms) {
      try {
        // محاولة إدراج الغرفة أو تحديثها إذا كانت موجودة
        const existingRoom = await db.select().from(rooms).where(eq(rooms.id, room.id)).limit(1);
        
        if (existingRoom.length === 0) {
          await db.insert(rooms).values(room);
          console.log(`✅ تم إنشاء الغرفة: ${room.name}`);
        } else {
          // تحديث الغرفة الموجودة لضمان أنها نشطة
          await db.update(rooms)
            .set({ 
              isActive: true,
              name: room.name,
              description: room.description
            })
            .where(eq(rooms.id, room.id));
          console.log(`🔄 تم تحديث الغرفة: ${room.name}`);
        }
      } catch (error) {
        console.log(`⚠️ خطأ في معالجة الغرفة ${room.name}:`, error.message);
      }
    }
    
    // 2. فحص الغرف النشطة
    console.log('\n📁 فحص الغرف النشطة...');
    const activeRooms = await db.select().from(rooms).where(eq(rooms.isActive, true));
    console.log(`عدد الغرف النشطة: ${activeRooms.length}`);
    
    activeRooms.forEach(room => {
      console.log(`- ${room.name} (${room.id}) - المنشئ: ${room.createdBy} - بث: ${room.isBroadcast}`);
    });
    
    // 3. إضافة المستخدم الأول للغرفة العامة إذا لم يكن موجود
    console.log('\n👤 فحص انضمام المستخدمين للغرف...');
    
    const generalRoomUsers = await db.select()
      .from(roomUsers)
      .where(eq(roomUsers.roomId, 'general'));
    
    console.log(`عدد المستخدمين في الغرفة العامة: ${generalRoomUsers.length}`);
    
    // إضافة المستخدم الأول (المالك) للغرفة العامة إذا لم يكن موجود
    const ownerInGeneral = generalRoomUsers.find(ru => ru.userId === 1);
    if (!ownerInGeneral) {
      try {
        await db.insert(roomUsers).values({
          userId: 1,
          roomId: 'general'
        });
        console.log('✅ تم إضافة المالك للغرفة العامة');
      } catch (error) {
        console.log('⚠️ المالك موجود مسبقاً في الغرفة العامة');
      }
    }
    
    // 4. اختبار API
    console.log('\n🌐 اختبار API للغرف...');
    try {
      const response = await fetch('http://localhost:3000/api/rooms');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API يعمل بنجاح - عدد الغرف: ${data.rooms.length}`);
        
        // عرض أول 3 غرف
        data.rooms.slice(0, 3).forEach(room => {
          console.log(`  - ${room.name} (${room.id}) - مستخدمين: ${room.userCount}`);
        });
      } else {
        console.log(`❌ API لا يعمل - Status: ${response.status}`);
        const errorText = await response.text();
        console.log('تفاصيل الخطأ:', errorText);
      }
    } catch (error) {
      console.log(`❌ خطأ في اتصال API:`, error.message);
      console.log('تأكد من أن الخادم يعمل على المنفذ 3000');
    }
    
    // 5. إنشاء تقرير نهائي
    console.log('\n📊 التقرير النهائي:');
    
    const finalRooms = await db.select().from(rooms).where(eq(rooms.isActive, true));
    const totalRoomUsers = await db.select().from(roomUsers);
    
    console.log(`إجمالي الغرف النشطة: ${finalRooms.length}`);
    console.log(`إجمالي انضمامات الغرف: ${totalRoomUsers.length}`);
    
    // إحصائيات مفصلة لكل غرفة
    for (const room of finalRooms.slice(0, 5)) { // أول 5 غرف فقط
      const roomUserCount = await db.select()
        .from(roomUsers)
        .where(eq(roomUsers.roomId, room.id));
      
      console.log(`  📁 ${room.name}: ${roomUserCount.length} مستخدم`);
    }
    
    await pool.end();
    
    console.log('\n✅ تم إصلاح نظام الغرف بنجاح!');
    console.log('\n📝 الخطوات التالية:');
    console.log('1. تأكد من أن الخادم يعمل (npm run dev)');
    console.log('2. افتح المتصفح وتحقق من ظهور الغرف');
    console.log('3. جرب الانضمام لغرفة مختلفة');
    console.log('4. تحقق من وجود رسائل في console المتصفح');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح نظام الغرف:', error);
  }
}

// تشغيل الإصلاح
fixRoomsSystem().catch(console.error);
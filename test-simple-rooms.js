#!/usr/bin/env node

/**
 * اختبار بسيط لنظام الغرف المبسط
 * يختبر الوظائف الأساسية فقط
 */

const { roomService } = require('./server/services/RoomService');

console.log('🧪 بدء اختبار نظام الغرف المبسط...\n');

async function testBasicRoomFunctions() {
  try {
    console.log('1️⃣ اختبار إنشاء الغرفة العامة...');
    await roomService.ensureGeneralRoom();
    console.log('✅ تم إنشاء الغرفة العامة\n');

    console.log('2️⃣ اختبار جلب جميع الغرف...');
    const rooms = await roomService.getAllRooms();
    console.log(`✅ تم جلب ${rooms.length} غرفة:`);
    rooms.forEach(room => {
      console.log(`   - ${room.name} (${room.id}) - مستخدمين: ${room.userCount}`);
    });
    console.log('');

    console.log('3️⃣ اختبار إنشاء غرفة جديدة...');
    const testRoom = await roomService.createRoom({
      name: 'غرفة اختبار',
      description: 'غرفة للاختبار البسيط',
      createdBy: 1,
      isBroadcast: false
    });
    console.log(`✅ تم إنشاء غرفة: ${testRoom.name} (${testRoom.id})\n`);

    console.log('4️⃣ اختبار انضمام مستخدم للغرفة...');
    await roomService.joinRoom(1, testRoom.id);
    console.log(`✅ المستخدم 1 انضم للغرفة ${testRoom.id}\n`);

    console.log('5️⃣ اختبار جلب مستخدمي الغرفة...');
    const roomUsers = await roomService.getRoomUsers(testRoom.id);
    console.log(`✅ الغرفة ${testRoom.id} تحتوي على ${roomUsers.length} مستخدم\n`);

    console.log('6️⃣ اختبار مغادرة المستخدم للغرفة...');
    await roomService.leaveRoom(1, testRoom.id);
    console.log(`✅ المستخدم 1 غادر الغرفة ${testRoom.id}\n`);

    console.log('7️⃣ اختبار حذف الغرفة...');
    await roomService.deleteRoom(testRoom.id);
    console.log(`✅ تم حذف الغرفة ${testRoom.id}\n`);

    console.log('🎉 جميع الاختبارات نجحت!\n');
    
    console.log('📊 ملخص النظام المبسط:');
    console.log('✅ إنشاء الغرف');
    console.log('✅ جلب الغرف');
    console.log('✅ انضمام/مغادرة الغرف');
    console.log('✅ حذف الغرف');
    console.log('✅ إدارة المستخدمين');
    
    return true;
  } catch (error) {
    console.error('❌ فشل الاختبار:', error.message);
    return false;
  }
}

async function testRoomPermissions() {
  console.log('\n🔐 اختبار صلاحيات الغرف...');
  
  try {
    // اختبار منع حذف الغرفة العامة
    try {
      await roomService.deleteRoom('general');
      console.log('❌ خطأ: تم السماح بحذف الغرفة العامة!');
      return false;
    } catch (error) {
      console.log('✅ منع حذف الغرفة العامة بنجاح');
    }

    // اختبار إنشاء غرفة بمعرف مكرر
    const room1 = await roomService.createRoom({
      name: 'غرفة مكررة',
      createdBy: 1,
      id: 'duplicate_test'
    });
    
    try {
      await roomService.createRoom({
        name: 'غرفة مكررة 2',
        createdBy: 1,
        id: 'duplicate_test'
      });
      console.log('❌ خطأ: تم السماح بإنشاء غرفة بمعرف مكرر!');
      return false;
    } catch (error) {
      console.log('✅ منع إنشاء غرفة بمعرف مكرر بنجاح');
    }

    // تنظيف
    await roomService.deleteRoom('duplicate_test');
    console.log('✅ تم تنظيف البيانات التجريبية');
    
    return true;
  } catch (error) {
    console.error('❌ فشل اختبار الصلاحيات:', error.message);
    return false;
  }
}

// تشغيل الاختبارات
(async () => {
  const basicTest = await testBasicRoomFunctions();
  const permissionTest = await testRoomPermissions();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 نتائج الاختبار النهائية:');
  console.log('='.repeat(50));
  console.log(`الوظائف الأساسية: ${basicTest ? '✅ نجح' : '❌ فشل'}`);
  console.log(`اختبار الصلاحيات: ${permissionTest ? '✅ نجح' : '❌ فشل'}`);
  
  if (basicTest && permissionTest) {
    console.log('\n🎉 نظام الغرف المبسط يعمل بشكل مثالي!');
    console.log('💡 يمكنك الآن استخدام النظام بثقة');
  } else {
    console.log('\n⚠️ هناك مشاكل تحتاج إصلاح');
  }
  
  process.exit(basicTest && permissionTest ? 0 : 1);
})();
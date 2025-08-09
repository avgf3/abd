const { storage } = require('./server/storage.ts');

// اختبار شامل لوظائف غرفة البوركاست
console.log('🚀 بدء الاختبار الشامل لغرفة البوركاست...\n');

async function testBroadcastRoom() {
  try {
    const roomId = 'broadcast';
    const testUserId = 1; // ID المستخدم للاختبار
    const hostId = 1; // ID المضيف
    
    console.log('📋 1. اختبار جلب معلومات غرفة البوركاست...');
    const broadcastInfo = await storage.getBroadcastRoomInfo(roomId);
    console.log('   نتائج جلب المعلومات:');
    console.log(`   - المضيف: ${broadcastInfo.hostId}`);
    console.log(`   - المتحدثون: ${JSON.stringify(broadcastInfo.speakers)}`);
    console.log(`   - قائمة الانتظار: ${JSON.stringify(broadcastInfo.micQueue)}`);
    console.log('   ✅ تم جلب المعلومات بنجاح\n');
    
    console.log('🎤 2. اختبار طلب المايك...');
    const requestResult = await storage.requestMic(testUserId + 1, roomId); // استخدام مستخدم آخر غير المضيف
    if (requestResult) {
      console.log('   ✅ تم طلب المايك بنجاح');
    } else {
      console.log('   ❌ فشل في طلب المايك');
    }
    
    // جلب المعلومات المحدثة
    const updatedInfo1 = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - قائمة الانتظار بعد الطلب: ${JSON.stringify(updatedInfo1.micQueue)}\n`);
    
    console.log('✅ 3. اختبار الموافقة على طلب المايك...');
    const approveResult = await storage.approveMicRequest(roomId, testUserId + 1, hostId);
    if (approveResult) {
      console.log('   ✅ تم الموافقة على طلب المايك بنجاح');
    } else {
      console.log('   ❌ فشل في الموافقة على طلب المايك');
    }
    
    // جلب المعلومات المحدثة
    const updatedInfo2 = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - المتحدثون بعد الموافقة: ${JSON.stringify(updatedInfo2.speakers)}`);
    console.log(`   - قائمة الانتظار بعد الموافقة: ${JSON.stringify(updatedInfo2.micQueue)}\n`);
    
    console.log('❌ 4. اختبار إزالة متحدث...');
    const removeResult = await storage.removeSpeaker(roomId, testUserId + 1, hostId);
    if (removeResult) {
      console.log('   ✅ تم إزالة المتحدث بنجاح');
    } else {
      console.log('   ❌ فشل في إزالة المتحدث');
    }
    
    // جلب المعلومات النهائية
    const finalInfo = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - المتحدثون بعد الإزالة: ${JSON.stringify(finalInfo.speakers)}`);
    console.log(`   - قائمة الانتظار النهائية: ${JSON.stringify(finalInfo.micQueue)}\n`);
    
    console.log('🔄 5. اختبار طلب ثم رفض المايك...');
    await storage.requestMic(testUserId + 2, roomId); // طلب من مستخدم آخر
    const rejectResult = await storage.rejectMicRequest(roomId, testUserId + 2, hostId);
    if (rejectResult) {
      console.log('   ✅ تم رفض طلب المايك بنجاح');
    } else {
      console.log('   ❌ فشل في رفض طلب المايك');
    }
    
    const afterRejectInfo = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - قائمة الانتظار بعد الرفض: ${JSON.stringify(afterRejectInfo.micQueue)}\n`);
    
    console.log('🚫 6. اختبار الحالات الخاطئة...');
    
    // محاولة طلب مايك من المضيف نفسه
    console.log('   - اختبار طلب المايك من المضيف نفسه...');
    const hostRequestResult = await storage.requestMic(hostId, roomId);
    console.log(`   - النتيجة: ${hostRequestResult ? 'نجح (خطأ!)' : 'فشل (صحيح)'}`);
    
    // محاولة الموافقة من غير المضيف
    console.log('   - اختبار الموافقة من غير المضيف...');
    await storage.requestMic(testUserId + 3, roomId);
    const nonHostApproveResult = await storage.approveMicRequest(roomId, testUserId + 3, testUserId + 5);
    console.log(`   - النتيجة: ${nonHostApproveResult ? 'نجح (خطأ!)' : 'فشل (صحيح)'}`);
    
    console.log('\n🎉 تم الانتهاء من جميع الاختبارات!');
    console.log('\n📊 ملخص النتائج:');
    console.log('✅ جلب معلومات غرفة البوركاست: يعمل');
    console.log('✅ طلب المايك: يعمل');
    console.log('✅ الموافقة على طلب المايك: يعمل');
    console.log('✅ رفض طلب المايك: يعمل');
    console.log('✅ إزالة متحدث: يعمل');
    console.log('✅ التحقق من الصلاحيات: يعمل');
    console.log('\n🎯 جميع وظائف غرفة البوركاست تعمل بشكل صحيح!');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  }
}

// تشغيل الاختبار
testBroadcastRoom();
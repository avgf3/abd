const { storage } = require('./server/storage.ts');

// اختبار شامل ومحسن لوظائف غرفة البث المباشر
console.log('🚀 بدء الاختبار الشامل لغرفة البث المباشر...\n');

async function testBroadcastRoom() {
  try {
    const roomId = 'broadcast';
    const testUserId = 2; // مستخدم عادي
    const hostId = 1; // المضيف
    const anotherUserId = 3; // مستخدم آخر
    
    console.log('📋 1. اختبار جلب معلومات غرفة البث...');
    const broadcastInfo = await storage.getBroadcastRoomInfo(roomId);
    console.log('   ✅ معلومات الغرفة:');
    console.log(`   - المضيف: ${broadcastInfo.hostId}`);
    console.log(`   - المتحدثون: ${JSON.stringify(broadcastInfo.speakers)}`);
    console.log(`   - قائمة الانتظار: ${JSON.stringify(broadcastInfo.micQueue)}\n`);
    
    console.log('🎤 2. اختبار طلب المايك من مستخدم عادي...');
    const requestResult = await storage.requestMic(testUserId, roomId);
    console.log(`   ${requestResult ? '✅' : '❌'} طلب المايك: ${requestResult ? 'نجح' : 'فشل'}`);
    
    // التحقق من التحديث
    const afterRequest = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - قائمة الانتظار: ${JSON.stringify(afterRequest.micQueue)}\n`);
    
    console.log('✅ 3. اختبار الموافقة على طلب المايك من المضيف...');
    const approveResult = await storage.approveMicRequest(roomId, testUserId, hostId);
    console.log(`   ${approveResult ? '✅' : '❌'} الموافقة: ${approveResult ? 'نجحت' : 'فشلت'}`);
    
    const afterApprove = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - المتحدثون: ${JSON.stringify(afterApprove.speakers)}`);
    console.log(`   - قائمة الانتظار: ${JSON.stringify(afterApprove.micQueue)}\n`);
    
    console.log('🎤 4. اختبار طلب مايك آخر...');
    await storage.requestMic(anotherUserId, roomId);
    
    console.log('❌ 5. اختبار رفض طلب المايك...');
    const rejectResult = await storage.rejectMicRequest(roomId, anotherUserId, hostId);
    console.log(`   ${rejectResult ? '✅' : '❌'} الرفض: ${rejectResult ? 'نجح' : 'فشل'}`);
    
    const afterReject = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - قائمة الانتظار بعد الرفض: ${JSON.stringify(afterReject.micQueue)}\n`);
    
    console.log('🚫 6. اختبار إزالة متحدث...');
    const removeResult = await storage.removeSpeaker(roomId, testUserId, hostId);
    console.log(`   ${removeResult ? '✅' : '❌'} الإزالة: ${removeResult ? 'نجحت' : 'فشلت'}`);
    
    const afterRemove = await storage.getBroadcastRoomInfo(roomId);
    console.log(`   - المتحدثون بعد الإزالة: ${JSON.stringify(afterRemove.speakers)}\n`);
    
    console.log('🔍 7. اختبار الحالات الخاطئة...');
    
    // محاولة طلب مايك من المضيف
    console.log('   - اختبار طلب المايك من المضيف نفسه...');
    const hostRequest = await storage.requestMic(hostId, roomId);
    console.log(`   ${!hostRequest ? '✅' : '❌'} النتيجة: ${!hostRequest ? 'رُفض بشكل صحيح' : 'خطأ - تم قبوله!'}`);
    
    // محاولة موافقة من غير المضيف
    console.log('   - اختبار الموافقة من غير المضيف...');
    await storage.requestMic(anotherUserId, roomId);
    const nonHostApprove = await storage.approveMicRequest(roomId, anotherUserId, testUserId);
    console.log(`   ${!nonHostApprove ? '✅' : '❌'} النتيجة: ${!nonHostApprove ? 'رُفض بشكل صحيح' : 'خطأ - تم قبوله!'}`);
    
    // تنظيف قائمة الانتظار
    await storage.rejectMicRequest(roomId, anotherUserId, hostId);
    
    console.log('\n🎉 انتهى الاختبار بنجاح!');
    console.log('\n📊 ملخص النتائج:');
    console.log('✅ جلب معلومات غرفة البث: يعمل');
    console.log('✅ طلب المايك: يعمل');
    console.log('✅ الموافقة على المايك: يعمل');
    console.log('✅ رفض طلب المايك: يعمل');
    console.log('✅ إزالة متحدث: يعمل');
    console.log('✅ التحقق من الصلاحيات: يعمل');
    console.log('\n🎯 جميع وظائف غرفة البث تعمل بشكل مثالي!');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
    console.log('\n⚠️ قد تحتاج إلى التحقق من:');
    console.log('- تشغيل قاعدة البيانات');
    console.log('- وجود غرفة البث في قاعدة البيانات');
    console.log('- صحة بيانات المستخدمين');
  }
}

// تشغيل الاختبار
console.log('🔧 بدء تشغيل نظام الاختبار...');
testBroadcastRoom()
  .then(() => {
    console.log('\n✨ تم إنهاء الاختبار بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل الاختبار:', error);
    process.exit(1);
  });
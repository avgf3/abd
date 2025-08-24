// ملف اختبار عملية إزالة المشرف
const apiUrl = 'http://localhost:5000';

async function testDemoteModerator() {
  console.log('🧪 بدء اختبار إزالة المشرف...\n');

  try {
    // 1. جلب قائمة المستخدمين لإيجاد مشرف
    console.log('📋 جلب قائمة المستخدمين...');
    const usersResponse = await fetch(`${apiUrl}/api/users`);
    const usersData = await usersResponse.json();
    
    const moderators = usersData.users.filter(u => u.userType === 'moderator');
    console.log(`✅ تم العثور على ${moderators.length} مشرف`);
    
    if (moderators.length === 0) {
      console.log('⚠️ لا يوجد مشرفين لاختبارهم');
      return;
    }

    const targetMod = moderators[0];
    console.log(`🎯 المشرف المستهدف: ${targetMod.username} (ID: ${targetMod.id})`);

    // 2. محاكاة طلب إزالة المشرف (يحتاج لصلاحيات المالك)
    console.log('\n📤 إرسال طلب إزالة المشرف...');
    const demoteResponse = await fetch(`${apiUrl}/api/moderation/demote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // يحتاج لـ cookie أو token المالك هنا
      },
      body: JSON.stringify({
        moderatorId: 1, // افتراض أن المالك له ID = 1
        targetUserId: targetMod.id
      })
    });

    console.log(`📨 حالة الاستجابة: ${demoteResponse.status}`);
    const demoteResult = await demoteResponse.json();
    console.log('📄 نتيجة الطلب:', demoteResult);

    // 3. التحقق من تحديث المستخدم
    if (demoteResponse.ok) {
      console.log('\n🔍 التحقق من التحديث...');
      const checkResponse = await fetch(`${apiUrl}/api/users`);
      const checkData = await checkResponse.json();
      
      const updatedUser = checkData.users.find(u => u.id === targetMod.id);
      console.log(`✅ نوع المستخدم الحالي: ${updatedUser?.userType}`);
      console.log(`   الاسم: ${updatedUser?.username}`);
    }

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  }
}

// تشغيل الاختبار
testDemoteModerator();
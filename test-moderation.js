// اختبار نظام الإدارة المحسن
const testModeration = async () => {
  console.log('🛡️ اختبار نظام الإدارة المحسن');

  // اختبار 1: كتم مستخدم بواسطة المالك
  const testMute = await fetch('http://localhost:5000/api/moderation/mute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moderatorId: 1, // المالك
      targetUserId: 1000, // مستخدم اختبار
      reason: 'اختبار النظام المطور',
      duration: 1 // دقيقة واحدة
    })
  });

  console.log('نتيجة اختبار الكتم:', await testMute.text());

  // اختبار 2: إلغاء الكتم
  setTimeout(async () => {
    const testUnmute = await fetch('http://localhost:5000/api/moderation/unmute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moderatorId: 1,
        targetUserId: 1000
      })
    });

    console.log('نتيجة اختبار إلغاء الكتم:', await testUnmute.text());
  }, 5000);

  // اختبار 3: طرد مؤقت
  setTimeout(async () => {
    const testBan = await fetch('http://localhost:5000/api/moderation/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moderatorId: 1,
        targetUserId: 1000,
        reason: 'اختبار الطرد',
        duration: 1
      })
    });

    console.log('نتيجة اختبار الطرد:', await testBan.text());
  }, 10000);
};

testModeration().catch(console.error);
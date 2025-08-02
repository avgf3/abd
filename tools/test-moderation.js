// اختبار نظام الإدارة المحسن
const testModeration = async () => {
  console.log('🛡️ اختبار نظام الإدارة المحسن');

  // اختبار 1: كتم مستخدم بواسطة المالك
  const testMute = await fetch('https://abd-ylo2.onrender.com/api/moderation/mute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId,
      duration: 300, // 5 minutes
      reason: 'Test mute'
    })
  });

  console.log('نتيجة اختبار الكتم:', await testMute.text());

  // اختبار 2: إلغاء الكتم
  setTimeout(async () => {
    const testUnmute = await fetch('https://abd-ylo2.onrender.com/api/moderation/unmute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId
      })
    });

    console.log('نتيجة اختبار إلغاء الكتم:', await testUnmute.text());
  }, 5000);

  // اختبار 3: طرد مؤقت
  setTimeout(async () => {
    const testBan = await fetch('https://abd-ylo2.onrender.com/api/moderation/ban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        duration: 3600, // 1 hour
        reason: 'Test ban'
      })
    });

    console.log('نتيجة اختبار الطرد:', await testBan.text());
  }, 10000);
};

testModeration().catch(console.error);
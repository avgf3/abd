const dotenv = require('dotenv');
dotenv.config();

async function finalTest() {
  console.log('🧪 اختبار شامل لنظام المصادقة');
  console.log('=====================================');
  
  try {
    // اختبار 1: تسجيل دخول زائر جديد
    console.log('\n1️⃣ اختبار تسجيل دخول زائر جديد:');
    const uniqueUser = 'user' + Math.floor(Math.random() * 1000);
    console.log('اسم المستخدم:', uniqueUser);
    
    const guestResponse = await fetch('http://localhost:10000/api/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: uniqueUser
      })
    });

    console.log('الحالة:', guestResponse.status);
    const guestData = await guestResponse.text();
    console.log('الاستجابة:', guestData);
    
    let token = null;
    try {
      const guestJson = JSON.parse(guestData);
      if (guestJson.success) {
        console.log('✅ نجح تسجيل الدخول كزائر');
        token = guestJson.token;
        console.log('تم الحصول على token:', !!token);
      } else {
        console.log('❌ فشل تسجيل الدخول:', guestJson.error);
      }
    } catch (e) {
      console.log('❌ خطأ في تحليل JSON');
    }
    
    // اختبار 2: محاولة تسجيل دخول بنفس الاسم (يجب أن يفشل)
    console.log('\n2️⃣ اختبار تسجيل دخول بنفس الاسم (يجب أن يفشل):');
    const duplicateResponse = await fetch('http://localhost:10000/api/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: uniqueUser
      })
    });

    console.log('الحالة:', duplicateResponse.status);
    const duplicateData = await duplicateResponse.text();
    console.log('الاستجابة:', duplicateData);
    
    // اختبار 3: تسجيل دخول عضو
    console.log('\n3️⃣ اختبار تسجيل دخول عضو:');
    const memberResponse = await fetch('http://localhost:10000/api/auth/member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'wrongpassword'
      })
    });

    console.log('الحالة:', memberResponse.status);
    const memberData = await memberResponse.text();
    console.log('الاستجابة:', memberData);
    
    console.log('\n🏁 انتهى الاختبار الشامل');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
  }
}

finalTest();
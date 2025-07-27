import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

// اختبار جلب جميع المستخدمين
async function testGetAllUsers() {
  console.log('🔍 اختبار جلب جميع المستخدمين...');
  try {
    const response = await fetch(`${SERVER_URL}/api/users`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ تم جلب المستخدمين بنجاح:', data.users.length, 'مستخدم');
      console.log('👥 أسماء المستخدمين:', data.users.map(u => u.username).join(', '));
      return true;
    } else {
      console.log('❌ فشل في جلب المستخدمين:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    return false;
  }
}

// اختبار endpoints رفع الصور
async function testUploadEndpoints() {
  console.log('🔍 اختبار endpoints رفع الصور...');
  try {
    // فحص endpoint البروفايل
    const profileResponse = await fetch(`${SERVER_URL}/api/upload/profile-image`, {
      method: 'POST',
      body: new FormData() // فارغة للاختبار
    });
    
    console.log('📷 Profile endpoint status:', profileResponse.status);
    
    // فحص endpoint البانر
    const bannerResponse = await fetch(`${SERVER_URL}/api/upload/profile-banner`, {
      method: 'POST',
      body: new FormData() // فارغة للاختبار
    });
    
    console.log('🖼️ Banner endpoint status:', bannerResponse.status);
    
    return true;
  } catch (error) {
    console.log('❌ خطأ في اختبار endpoints:', error.message);
    return false;
  }
}

// اختبار حالة الخادم
async function testServerStatus() {
  console.log('🔍 فحص حالة الخادم...');
  try {
    const response = await fetch(`${SERVER_URL}/api/health`);
    if (response.ok) {
      console.log('✅ الخادم يعمل بشكل طبيعي');
      return true;
    } else {
      console.log('⚠️ الخادم يعمل لكن هناك مشاكل');
      return false;
    }
  } catch (error) {
    console.log('❌ الخادم لا يعمل:', error.message);
    return false;
  }
}

// تشغيل جميع الاختبارات
async function runAllTests() {
  console.log('🚀 بدء الاختبارات الشاملة...\n');
  
  const tests = [
    { name: 'حالة الخادم', test: testServerStatus },
    { name: 'جلب جميع المستخدمين', test: testGetAllUsers },
    { name: 'endpoints رفع الصور', test: testUploadEndpoints }
  ];
  
  let passedTests = 0;
  
  for (const { name, test } of tests) {
    console.log(`\n--- اختبار: ${name} ---`);
    const result = await test();
    if (result) {
      passedTests++;
    }
    console.log('---\n');
  }
  
  console.log(`📊 النتائج: ${passedTests}/${tests.length} اختبار نجح`);
  
  if (passedTests === tests.length) {
    console.log('🎉 جميع الاختبارات نجحت!');
  } else {
    console.log('⚠️ هناك مشاكل تحتاج إصلاح');
  }
}

// تشغيل الاختبارات مباشرة
runAllTests();
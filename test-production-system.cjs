const { Pool } = require('@neondatabase/serverless');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// إعدادات الاختبار
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

console.log('🧪 بدء الاختبار الشامل للنظام في بيئة الإنتاج');
console.log('📡 رابط الخادم:', SERVER_URL);
console.log('🗄️ قاعدة البيانات:', DATABASE_URL ? 'متصلة' : 'غير متصلة');

// متغيرات الاختبار
let testResults = {
  database: false,
  server: false,
  auth: false,
  users: false,
  messages: false,
  uploads: false,
  realtime: false
};

let testToken = null;
let testUserId = null;

async function testDatabaseConnection() {
  console.log('\n🔍 اختبار الاتصال بقاعدة البيانات...');
  
  try {
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    // اختبار الاتصال
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ الاتصال بقاعدة البيانات ناجح');
    console.log('⏰ وقت الخادم:', result.rows[0].current_time);
    
    // اختبار الجداول
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 الجداول الموجودة:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // اختبار عدد المستخدمين
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('👥 عدد المستخدمين:', userCount.rows[0].count);
    
    testResults.database = true;
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في قاعدة البيانات:', error.message);
    return false;
  }
}

async function testServerHealth() {
  console.log('\n🔍 اختبار صحة الخادم...');
  
  try {
    const { stdout } = await execAsync(`curl -s ${SERVER_URL}/api/health`);
    const response = JSON.parse(stdout);
    
    if (response.status === 'ok') {
      console.log('✅ الخادم يعمل بشكل صحيح');
      console.log('📊 معلومات النظام:', response);
      testResults.server = true;
      return true;
    } else {
      console.error('❌ الخادم لا يستجيب بشكل صحيح');
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بالخادم:', error.message);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔍 اختبار نظام المصادقة...');
  
  try {
    // اختبار تسجيل دخول ضيف
    const guestData = {
      username: `testguest_${Date.now()}`,
      gender: 'male'
    };
    
    const guestResponse = await axios.post(`${SERVER_URL}/api/auth/guest`, guestData);
    
    if (guestResponse.data.success) {
      console.log('✅ تسجيل الدخول كضيف ناجح');
      console.log('👤 بيانات المستخدم:', guestResponse.data.user.username);
      
      testToken = guestResponse.data.token;
      testUserId = guestResponse.data.user.id;
      testResults.auth = true;
      
      // اختبار التحقق من الـ token
      const verifyResponse = await axios.get(`${SERVER_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      
      if (verifyResponse.data.success) {
        console.log('✅ التحقق من الـ token ناجح');
      }
      
      return true;
    } else {
      console.error('❌ فشل في تسجيل الدخول كضيف:', guestResponse.data.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في المصادقة:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testUserManagement() {
  console.log('\n🔍 اختبار إدارة المستخدمين...');
  
  if (!testToken) {
    console.error('❌ لا يوجد token للاختبار');
    return false;
  }
  
  try {
    // اختبار الحصول على بيانات المستخدم
    const profileResponse = await axios.get(`${SERVER_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (profileResponse.data.success) {
      console.log('✅ جلب بيانات المستخدم ناجح');
      console.log('👤 اسم المستخدم:', profileResponse.data.user.username);
      
      // اختبار تحديث الملف الشخصي
      const updateData = {
        bio: 'هذا اختبار للنظام المحدث'
      };
      
      const updateResponse = await axios.put(`${SERVER_URL}/api/users/${testUserId}`, updateData, {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      
      if (updateResponse.data.success) {
        console.log('✅ تحديث الملف الشخصي ناجح');
      }
      
      // اختبار البحث عن المستخدمين
      const searchResponse = await axios.get(`${SERVER_URL}/api/users/search/test`, {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      
      if (searchResponse.data.success) {
        console.log('✅ البحث عن المستخدمين ناجح');
        console.log('🔍 عدد النتائج:', searchResponse.data.users.length);
      }
      
      testResults.users = true;
      return true;
    } else {
      console.error('❌ فشل في جلب بيانات المستخدم');
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في إدارة المستخدمين:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testMessaging() {
  console.log('\n🔍 اختبار نظام الرسائل...');
  
  if (!testToken) {
    console.error('❌ لا يوجد token للاختبار');
    return false;
  }
  
  try {
    // اختبار جلب الرسائل العامة
    const publicResponse = await axios.get(`${SERVER_URL}/api/messages/public?roomId=general&limit=10`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (publicResponse.data.success) {
      console.log('✅ جلب الرسائل العامة ناجح');
      console.log('💬 عدد الرسائل:', publicResponse.data.messages.length);
      
      // اختبار إحصائيات الرسائل
      const statsResponse = await axios.get(`${SERVER_URL}/api/messages/unread/count`, {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      
      if (statsResponse.data.success) {
        console.log('✅ إحصائيات الرسائل ناجحة');
        console.log('📊 الرسائل غير المقروءة:', statsResponse.data.count);
      }
      
      testResults.messages = true;
      return true;
    } else {
      console.error('❌ فشل في جلب الرسائل');
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في نظام الرسائل:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testUploadSystem() {
  console.log('\n🔍 اختبار نظام رفع الملفات...');
  
  if (!testToken) {
    console.error('❌ لا يوجد token للاختبار');
    return false;
  }
  
  try {
    // اختبار إحصائيات الرفع
    const statsResponse = await axios.get(`${SERVER_URL}/api/uploads/stats`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    
    if (statsResponse.data.success) {
      console.log('✅ إحصائيات الرفع ناجحة');
      console.log('📊 إجمالي الملفات:', statsResponse.data.stats.total.files);
      console.log('💾 الحجم الإجمالي:', statsResponse.data.stats.total.sizeMB + ' MB');
      
      testResults.uploads = true;
      return true;
    } else {
      console.error('❌ فشل في إحصائيات الرفع');
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في نظام الرفع:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testServerInfo() {
  console.log('\n🔍 اختبار معلومات الخادم...');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/server-info`);
    
    if (response.data) {
      console.log('✅ معلومات الخادم ناجحة');
      console.log('👥 المستخدمين المتصلين:', response.data.connectedUsers);
      console.log('🏠 الغرف النشطة:', response.data.activeRooms.length);
      console.log('🕐 وقت الخادم:', response.data.serverTime);
      console.log('🏷️ الإصدار:', response.data.version);
      console.log('🌍 البيئة:', response.data.environment);
      
      testResults.realtime = true;
      return true;
    } else {
      console.error('❌ فشل في جلب معلومات الخادم');
      return false;
    }
    
  } catch (error) {
    console.error('❌ خطأ في معلومات الخادم:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 بدء تشغيل جميع الاختبارات...\n');
  
  // تشغيل الاختبارات بالتسلسل
  await testDatabaseConnection();
  await testServerHealth();
  await testAuthentication();
  await testUserManagement();
  await testMessaging();
  await testUploadSystem();
  await testServerInfo();
  
  // عرض النتائج النهائية
  console.log('\n' + '='.repeat(50));
  console.log('📋 نتائج الاختبار الشامل:');
  console.log('='.repeat(50));
  
  const testNames = {
    database: '🗄️ قاعدة البيانات',
    server: '🖥️ الخادم',
    auth: '🔐 المصادقة',
    users: '👥 إدارة المستخدمين',
    messages: '💬 نظام الرسائل',
    uploads: '📁 رفع الملفات',
    realtime: '⚡ الوقت الحقيقي'
  };
  
  let passedTests = 0;
  let totalTests = Object.keys(testResults).length;
  
  for (const [key, value] of Object.entries(testResults)) {
    const status = value ? '✅ نجح' : '❌ فشل';
    console.log(`${testNames[key]}: ${status}`);
    if (value) passedTests++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 النتيجة النهائية: ${passedTests}/${totalTests} اختبار نجح`);
  
  if (passedTests === totalTests) {
    console.log('🎉 تهانينا! جميع الاختبارات نجحت - النظام جاهز للإنتاج!');
  } else {
    console.log('⚠️ بعض الاختبارات فشلت - يحتاج النظام إلى إصلاحات إضافية');
  }
  
  console.log('='.repeat(50));
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// تشغيل الاختبارات
runAllTests().catch(error => {
  console.error('💥 خطأ عام في الاختبار:', error.message);
  process.exit(1);
});
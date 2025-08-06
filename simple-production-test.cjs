const { Pool } = require('@neondatabase/serverless');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres";
const SERVER_URL = "http://localhost:3000";

console.log('🧪 اختبار النظام المحدث - الصيانة الشاملة مكتملة');
console.log('='.repeat(60));

async function testDatabase() {
  console.log('\n🔍 اختبار قاعدة البيانات...');
  
  try {
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    const result = await pool.query('SELECT NOW() as time, COUNT(*) as user_count FROM users');
    console.log('✅ قاعدة البيانات متصلة');
    console.log('⏰ الوقت:', result.rows[0].time);
    console.log('👥 عدد المستخدمين:', result.rows[0].user_count);
    
    // اختبار الجداول الأساسية
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'messages', 'friends', 'notifications')
      ORDER BY table_name
    `);
    
    console.log('📋 الجداول الأساسية:');
    tables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
    
    return true;
  } catch (error) {
    console.error('❌ خطأ في قاعدة البيانات:', error.message);
    return false;
  }
}

async function testServer() {
  console.log('\n🔍 اختبار الخادم...');
  
  try {
    const { stdout } = await execAsync(`curl -s ${SERVER_URL}/api/health`);
    const health = JSON.parse(stdout);
    
    console.log('✅ الخادم يعمل');
    console.log('📊 الحالة:', health.status);
    console.log('🏷️ الإصدار:', health.version);
    
    const { stdout: info } = await execAsync(`curl -s ${SERVER_URL}/api/server-info`);
    const serverInfo = JSON.parse(info);
    
    console.log('👥 المتصلين:', serverInfo.connectedUsers);
    console.log('🏠 الغرف النشطة:', serverInfo.activeRooms.length);
    console.log('🌍 البيئة:', serverInfo.environment);
    
    return true;
  } catch (error) {
    console.error('❌ خطأ في الخادم:', error.message);
    return false;
  }
}

async function testAuth() {
  console.log('\n🔍 اختبار المصادقة...');
  
  try {
    const username = `test_${Date.now()}`;
    const guestData = JSON.stringify({ username, gender: 'male' });
    
    const { stdout } = await execAsync(`curl -s -X POST -H "Content-Type: application/json" -d '${guestData}' ${SERVER_URL}/api/auth/guest`);
    const response = JSON.parse(stdout);
    
    if (response.success) {
      console.log('✅ تسجيل الدخول كضيف يعمل');
      console.log('👤 المستخدم:', response.user.username);
      console.log('🔑 تم إنشاء Token بنجاح');
      return true;
    } else {
      console.error('❌ فشل تسجيل الدخول:', response.error);
      return false;
    }
  } catch (error) {
    console.error('❌ خطأ في المصادقة:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 بدء الاختبارات...\n');
  
  const results = {
    database: await testDatabase(),
    server: await testServer(),
    auth: await testAuth()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 نتائج الاختبار:');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`🗄️ قاعدة البيانات: ${results.database ? '✅ نجح' : '❌ فشل'}`);
  console.log(`🖥️ الخادم: ${results.server ? '✅ نجح' : '❌ فشل'}`);
  console.log(`🔐 المصادقة: ${results.auth ? '✅ نجح' : '❌ فشل'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 النتيجة النهائية: ${passed}/${total} اختبارات نجحت`);
  
  if (passed === total) {
    console.log('🎉 ممتاز! النظام يعمل بشكل صحيح');
    console.log('✨ الصيانة الشاملة مكتملة بنجاح');
    console.log('🚀 النظام جاهز للإنتاج');
  } else {
    console.log('⚠️ يحتاج النظام إلى إصلاحات إضافية');
  }
  
  console.log('='.repeat(60));
}

runTests().catch(console.error);
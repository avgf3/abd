const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config();

async function test() {
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require',
  });

  console.log('🔍 اختبار النظام النهائي\n');
  
  try {
    // اختبار قاعدة البيانات
    const time = await sql\`SELECT NOW()\`;
    console.log('✅ قاعدة البيانات تعمل');
    
    // عد الجداول
    const tables = await sql\`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    \`;
    console.log(\`✅ عدد الجداول: \${tables[0].count}\`);
    
    // البيانات الأساسية
    const rooms = await sql\`SELECT COUNT(*) as count FROM rooms\`;
    const users = await sql\`SELECT COUNT(*) as count FROM users\`;
    const messages = await sql\`SELECT COUNT(*) as count FROM messages\`;
    
    console.log(\`✅ الغرف: \${rooms[0].count}\`);
    console.log(\`✅ المستخدمون: \${users[0].count}\`);
    console.log(\`✅ الرسائل: \${messages[0].count}\`);
    
    console.log('\n✅ ✅ ✅ النظام يعمل بشكل جيد! ✅ ✅ ✅');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await sql.end();
  }
}

test();

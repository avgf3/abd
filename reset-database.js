import postgres from 'postgres';

async function resetDatabase() {
  console.log('🔄 بدء عملية إعادة تعيين قاعدة البيانات...');
  
  const databaseUrl = 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد في ملف .env');
    process.exit(1);
  }
  
  const client = postgres(databaseUrl, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
  });
  
  try {
    console.log('🗑️ حذف جميع البيانات من الجداول...');
    
    // حذف البيانات بالترتيب الصحيح لتجنب مشاكل المفاتيح الأجنبية
    await client`TRUNCATE TABLE 
      message_reactions,
      points_history,
      vip_users,
      blocked_devices,
      notifications,
      friends,
      messages,
      room_members,
      rooms,
      users 
      RESTART IDENTITY CASCADE`;
    
    console.log('✅ تم حذف جميع البيانات بنجاح');
    
    console.log('🎉 تمت إعادة تعيين قاعدة البيانات بنجاح!');
    console.log('📝 ملاحظة: أول مستخدم يسجل في الموقع سيصبح المالك تلقائياً');
    
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين قاعدة البيانات:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
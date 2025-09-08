// سكريپت فوري لإلغاء حظر جميع المحظورين
import { readFileSync } from 'fs';

const DATABASE_URL = 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';

// استخراج معلومات Supabase
const projectRef = 'qzehjgmawnrihmepboca';
const supabaseUrl = `https://${projectRef}.supabase.co`;

// مفتاح Supabase العام (anon key) - يجب الحصول عليه من لوحة التحكم
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZWhqZ21hd25yaWhtZXBib2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MjY4MDMsImV4cCI6MjA0MTQwMjgwM30.QVzGYiWrOCRhZgMnCEb6dDTNbMFMNlWUgCJlEJyY8zM';

async function unblockAllUsers() {
  console.log('🚀 بدء إلغاء حظر جميع المحظورين...');
  
  try {
    console.log('🔍 البحث عن المستخدمين المحظورين...');
    
    // جلب المستخدمين المحظورين
    const blockedResponse = await fetch(`${supabaseUrl}/rest/v1/users?is_blocked=eq.true&select=id,username,user_type`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!blockedResponse.ok) {
      console.log(`❌ خطأ في جلب البيانات: ${blockedResponse.status} ${blockedResponse.statusText}`);
      const errorText = await blockedResponse.text();
      console.log('تفاصيل الخطأ:', errorText);
      return;
    }
    
    const blockedUsers = await blockedResponse.json();
    
    if (blockedUsers.length === 0) {
      console.log('✅ لا يوجد مستخدمين محظورين');
      return;
    }
    
    console.log(`📋 تم العثور على ${blockedUsers.length} مستخدم محظور:`);
    blockedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (ID: ${user.id}) - ${user.user_type}`);
    });
    
    console.log('\n🔓 إلغاء حظر جميع المستخدمين...');
    
    // إلغاء حظر جميع المستخدمين
    const unblockResponse = await fetch(`${supabaseUrl}/rest/v1/users?is_blocked=eq.true`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        is_blocked: false,
        ip_address: null,
        device_id: null
      })
    });
    
    if (!unblockResponse.ok) {
      console.log(`❌ خطأ في إلغاء الحظر: ${unblockResponse.status} ${unblockResponse.statusText}`);
      const errorText = await unblockResponse.text();
      console.log('تفاصيل الخطأ:', errorText);
      return;
    }
    
    console.log(`✅ تم إلغاء حظر ${blockedUsers.length} مستخدم`);
    
    // تنظيف جدول الأجهزة المحجوبة
    console.log('🧹 تنظيف الأجهزة المحجوبة...');
    
    const deleteDevicesResponse = await fetch(`${supabaseUrl}/rest/v1/blocked_devices`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (deleteDevicesResponse.ok) {
      console.log('✅ تم تنظيف جدول الأجهزة المحجوبة');
    } else {
      console.log('⚠️ لم يتم تنظيف الأجهزة المحجوبة (قد لا تكون موجودة)');
    }
    
    // التحقق النهائي
    console.log('🔍 التحقق النهائي...');
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/users?is_blocked=eq.true&select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    
    if (checkResponse.ok) {
      const remainingUsers = await checkResponse.json();
      const remainingCount = remainingUsers.length;
      
      if (remainingCount === 0) {
        console.log('\n🎉 تم إلغاء حظر جميع المستخدمين بنجاح!');
        console.log('✨ لا يوجد مستخدمين محظورين في قاعدة البيانات');
      } else {
        console.log(`\n⚠️ لا يزال هناك ${remainingCount} مستخدم محظور`);
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.log('\n💡 يمكنك تشغيل هذه الأوامر SQL مباشرة في لوحة تحكم Supabase:');
    console.log('');
    console.log('-- إلغاء حظر جميع المستخدمين');
    console.log("UPDATE users SET is_blocked = false, ip_address = NULL, device_id = NULL WHERE is_blocked = true;");
    console.log('');
    console.log('-- تنظيف الأجهزة المحجوبة');
    console.log("DELETE FROM blocked_devices;");
  }
}

// تشغيل السكريپت
unblockAllUsers()
  .then(() => {
    console.log('\n✅ انتهى السكريپت');
  })
  .catch((error) => {
    console.error('❌ خطأ في تشغيل السكريپت:', error);
  });
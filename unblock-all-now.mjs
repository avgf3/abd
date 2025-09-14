// سكريپت فوري لإلغاء حظر جميع المحظورين
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// قراءة متغيرات البيئة
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  try {
    const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
    const envLines = envFile.split('\n');
    for (const line of envLines) {
      if (line.startsWith('DATABASE_URL=')) {
        DATABASE_URL = line.split('=')[1].trim();
        break;
      }
    }
  } catch (error) {
    console.error('❌ لا يمكن العثور على DATABASE_URL');
    process.exit(1);
  }
}

// استخراج معلومات Supabase من رابط قاعدة البيانات
function parseSupabaseUrl(url) {
  try {
    // مثال: postgresql://postgres:[password]@[host]:[port]/postgres
    const regex = /postgresql:\/\/postgres:([^@]+)@([^:]+):(\d+)\/postgres/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('رابط قاعدة البيانات غير صحيح');
    }
    
    const [, password, host, port] = match;
    const projectRef = host.split('.')[0];
    
    return {
      projectRef,
      password,
      host,
      port,
      supabaseUrl: `https://${projectRef}.supabase.co`,
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWN5cGJoYnpxcWd5bWdxcGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MTA5NzAsImV4cCI6MjA1MTQ4Njk3MH0.TdDJmLKIBm9nzQGcjNL6-8_ZJX8d4XRJQHG5JCmJ2rY' // مفتاح عام افتراضي
    };
  } catch (error) {
    console.error('❌ خطأ في تحليل رابط قاعدة البيانات:', error.message);
    return null;
  }
}

async function unblockAllUsers() {
  console.log('🚀 بدء إلغاء حظر جميع المحظورين...');
  
  const supabaseInfo = parseSupabaseUrl(DATABASE_URL);
  if (!supabaseInfo) {
    console.log('❌ لا يمكن الوصول لقاعدة البيانات');
    return;
  }
  
  try {
    console.log('🔍 البحث عن المستخدمين المحظورين...');
    
    // جلب المستخدمين المحظورين
    const blockedResponse = await fetch(`${supabaseInfo.supabaseUrl}/rest/v1/users?is_blocked=eq.true&select=id,username`, {
      headers: {
        'apikey': supabaseInfo.anonKey,
        'Authorization': `Bearer ${supabaseInfo.anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!blockedResponse.ok) {
      throw new Error(`خطأ في جلب البيانات: ${blockedResponse.status}`);
    }
    
    const blockedUsers = await blockedResponse.json();
    
    if (blockedUsers.length === 0) {
      console.log('✅ لا يوجد مستخدمين محظورين');
      return;
    }
    
    console.log(`📋 تم العثور على ${blockedUsers.length} مستخدم محظور:`);
    blockedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (ID: ${user.id})`);
    });
    
    console.log('\n🔓 إلغاء حظر جميع المستخدمين...');
    
    // إلغاء حظر جميع المستخدمين
    const unblockResponse = await fetch(`${supabaseInfo.supabaseUrl}/rest/v1/users?is_blocked=eq.true`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseInfo.anonKey,
        'Authorization': `Bearer ${supabaseInfo.anonKey}`,
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
      throw new Error(`خطأ في إلغاء الحظر: ${unblockResponse.status}`);
    }
    
    console.log(`✅ تم إلغاء حظر ${blockedUsers.length} مستخدم`);
    
    // تنظيف جدول الأجهزة المحجوبة
    console.log('🧹 تنظيف الأجهزة المحجوبة...');
    
    const deleteDevicesResponse = await fetch(`${supabaseInfo.supabaseUrl}/rest/v1/blocked_devices`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseInfo.anonKey,
        'Authorization': `Bearer ${supabaseInfo.anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (deleteDevicesResponse.ok) {
      console.log('✅ تم تنظيف جدول الأجهزة المحجوبة');
    }
    
    // التحقق النهائي
    console.log('🔍 التحقق النهائي...');
    const checkResponse = await fetch(`${supabaseInfo.supabaseUrl}/rest/v1/users?is_blocked=eq.true&select=count`, {
      headers: {
        'apikey': supabaseInfo.anonKey,
        'Authorization': `Bearer ${supabaseInfo.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    
    if (checkResponse.ok) {
      const remainingCount = parseInt(checkResponse.headers.get('content-range')?.split('/')[1] || '0');
      
      if (remainingCount === 0) {
        console.log('\n🎉 تم إلغاء حظر جميع المستخدمين بنجاح!');
        console.log('✨ لا يوجد مستخدمين محظورين في قاعدة البيانات');
      } else {
        console.log(`\n⚠️  لا يزال هناك ${remainingCount} مستخدم محظور`);
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    
    // محاولة بديلة باستخدام SQL مباشر
    console.log('\n🔄 محاولة طريقة بديلة...');
    console.log('💡 يمكنك تشغيل هذه الأوامر SQL مباشرة:');
    console.log('');
    console.log('-- إلغاء حظر جميع المستخدمين');
    console.log("UPDATE users SET is_blocked = false, ip_address = NULL, device_id = NULL WHERE is_blocked = true;");
    console.log('');
    console.log('-- تنظيف الأجهزة المحجوبة');
    console.log("DELETE FROM blocked_devices;");
    console.log('');
    console.log('-- التحقق');
    console.log("SELECT COUNT(*) FROM users WHERE is_blocked = true;");
  }
}

// تشغيل السكريپت
unblockAllUsers()
  .then(() => {
    console.log('\n✅ انتهى السكريپت');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ خطأ في تشغيل السكريپت:', error);
    process.exit(1);
  });
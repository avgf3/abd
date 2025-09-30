import { storage } from './server/storage';
import { moderationSystem } from './server/moderation';
import * as readline from 'readline';

// إنشاء واجهة للمدخلات
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// دالة للحصول على تأكيد من المستخدم
function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'نعم');
    });
  });
}

async function deleteAllBlockedUsers() {
  try {
    console.log('🔍 البحث عن المستخدمين المحظورين...\n');

    // جلب جميع المستخدمين المحظورين
    const allUsers = await storage.getAllUsers();
    const blockedUsers = allUsers.filter((user) => user.isBlocked === true);

    if (blockedUsers.length === 0) {
      console.log('✅ لا يوجد مستخدمين محظورين للحذف');
      rl.close();
      return;
    }

    console.log(`⚠️  تم العثور على ${blockedUsers.length} مستخدم محظور:\n`);

    // عرض قائمة المستخدمين المحظورين
    blockedUsers.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.username} (ID: ${user.id})`);
      console.log(`   📧 النوع: ${user.userType}`);
      console.log(`   🌐 عنوان IP: ${user.ipAddress || 'غير متوفر'}`);
      console.log(`   📱 معرف الجهاز: ${user.deviceId || 'غير متوفر'}`);
      console.log(`   📅 تاريخ الانضمام: ${user.joinDate ? new Date(user.joinDate).toLocaleDateString('ar-EG') : 'غير متوفر'}`);
      console.log('   ' + '─'.repeat(50));
    });

    console.log('\n🚨 تحذير هام:');
    console.log('• سيتم حذف هؤلاء المستخدمين نهائياً من قاعدة البيانات');
    console.log('• سيتم حذف جميع رسائلهم وبياناتهم');
    console.log('• سيتم تنظيف جدول الأجهزة المحجوبة');
    console.log('• هذا الإجراء لا يمكن التراجع عنه!\n');

    // طلب التأكيد الأول
    const firstConfirm = await askConfirmation('❓ هل أنت متأكد من أنك تريد حذف جميع المستخدمين المحظورين؟ (yes/y/نعم): ');
    
    if (!firstConfirm) {
      console.log('❌ تم إلغاء العملية');
      rl.close();
      return;
    }

    // طلب التأكيد الثاني
    const secondConfirm = await askConfirmation(`⚠️  تأكيد نهائي: اكتب "DELETE" أو "حذف" لتأكيد حذف ${blockedUsers.length} مستخدم محظور: `);
    
    if (!secondConfirm) {
      console.log('❌ تم إلغاء العملية');
      rl.close();
      return;
    }

    console.log('\n🚀 بدء عملية الحذف...\n');

    let deletedCount = 0;
    let errors = 0;

    // حذف كل مستخدم محظور
    for (const user of blockedUsers) {
      try {
        console.log(`🗑️  حذف المستخدم: ${user.username} (ID: ${user.id})...`);

        // حذف المستخدم من قاعدة البيانات
        const deleteResult = await storage.deleteUser(user.id);
        
        if (deleteResult) {
          deletedCount++;
          console.log(`   ✅ تم حذف ${user.username} بنجاح`);
        } else {
          errors++;
          console.log(`   ❌ فشل في حذف ${user.username}`);
        }
      } catch (error) {
        errors++;
        console.log(`   ❌ خطأ في حذف ${user.username}:`, error);
      }
    }

    console.log('\n🧹 تنظيف جدول الأجهزة المحجوبة...');

    try {
      // حذف جميع الأجهزة المحجوبة للمستخدمين المحذوفين
      const blockedDevices = await storage.getBlockedDevices();
      const blockedUserIds = blockedUsers.map(u => u.id);
      
      let cleanedDevices = 0;
      for (const device of blockedDevices) {
        if (blockedUserIds.includes(device.userId)) {
          await storage.deleteBlockedDevice(device.userId);
          cleanedDevices++;
        }
      }
      
      console.log(`✅ تم تنظيف ${cleanedDevices} جهاز محجوب`);
    } catch (error) {
      console.log('❌ خطأ في تنظيف الأجهزة المحجوبة:', error);
    }

    // عرض النتائج النهائية
    console.log('\n' + '='.repeat(60));
    console.log('📊 تقرير العملية:');
    console.log(`✅ تم حذف: ${deletedCount} مستخدم`);
    console.log(`❌ فشل في الحذف: ${errors} مستخدم`);
    console.log(`📋 إجمالي المحظورين: ${blockedUsers.length} مستخدم`);
    console.log('='.repeat(60));

    if (deletedCount > 0) {
      console.log('\n🎉 تمت العملية بنجاح!');
      console.log('✨ تم تنظيف قاعدة البيانات من جميع المستخدمين المحظورين');
      
      // التحقق النهائي
      console.log('\n🔍 التحقق النهائي...');
      const remainingUsers = await storage.getAllUsers();
      const remainingBlocked = remainingUsers.filter(u => u.isBlocked === true);
      
      if (remainingBlocked.length === 0) {
        console.log('✅ تأكيد: لا يوجد مستخدمين محظورين في قاعدة البيانات');
      } else {
        console.log(`⚠️  تحذير: لا يزال هناك ${remainingBlocked.length} مستخدم محظور في قاعدة البيانات`);
      }
    } else {
      console.log('\n💥 لم يتم حذف أي مستخدم!');
      console.log('❓ تحقق من الأخطاء أعلاه');
    }

  } catch (error) {
    console.error('\n❌ خطأ عام في تشغيل السكريپت:', error);
  } finally {
    rl.close();
  }
}

// إضافة دالة للتحقق من وجود دالة حذف المستخدم
async function checkDeleteFunction() {
  try {
    // التحقق من وجود دالة deleteUser في storage
    if (typeof storage.deleteUser !== 'function') {
      console.log('⚠️  تحذير: دالة deleteUser غير موجودة في storage');
      console.log('💡 سيتم استخدام طريقة بديلة للحذف');
      return false;
    }
    return true;
  } catch (error) {
    console.log('❌ خطأ في التحقق من دالة الحذف:', error);
    return false;
  }
}

// دالة بديلة للحذف باستخدام تحديث الحالة
async function alternativeDeleteBlockedUsers() {
  try {
    console.log('🔄 استخدام الطريقة البديلة: إلغاء حظر جميع المستخدمين بدلاً من الحذف...\n');

    const allUsers = await storage.getAllUsers();
    const blockedUsers = allUsers.filter((user) => user.isBlocked === true);

    if (blockedUsers.length === 0) {
      console.log('✅ لا يوجد مستخدمين محظورين');
      return;
    }

    console.log(`📋 سيتم إلغاء حظر ${blockedUsers.length} مستخدم:\n`);

    let unblocked = 0;
    let errors = 0;

    for (const user of blockedUsers) {
      try {
        console.log(`🔓 إلغاء حظر: ${user.username} (ID: ${user.id})...`);
        
        // استخدام نظام الإدارة لإلغاء الحظر
        const result = await moderationSystem.unblockUser(1, user.id); // استخدام ID المالك (1)
        
        if (result) {
          unblocked++;
          console.log(`   ✅ تم إلغاء حظر ${user.username}`);
        } else {
          errors++;
          console.log(`   ❌ فشل في إلغاء حظر ${user.username}`);
        }
      } catch (error) {
        errors++;
        console.log(`   ❌ خطأ في إلغاء حظر ${user.username}:`, error);
      }
    }

    console.log('\n📊 النتائج:');
    console.log(`✅ تم إلغاء حظر: ${unblocked} مستخدم`);
    console.log(`❌ فشل: ${errors} مستخدم`);

  } catch (error) {
    console.error('❌ خطأ في الطريقة البديلة:', error);
  }
}

// تشغيل السكريپت
async function main() {
  console.log('🚀 سكريپت حذف المستخدمين المحظورين');
  console.log('=' .repeat(50));

  // التحقق من دالة الحذف
  const hasDeleteFunction = await checkDeleteFunction();

  if (hasDeleteFunction) {
    await deleteAllBlockedUsers();
  } else {
    console.log('\n🔄 سيتم استخدام طريقة إلغاء الحظر بدلاً من الحذف');
    const useAlternative = await askConfirmation('❓ هل تريد إلغاء حظر جميع المستخدمين المحظورين بدلاً من حذفهم؟ (yes/y/نعم): ');
    
    if (useAlternative) {
      await alternativeDeleteBlockedUsers();
    } else {
      console.log('❌ تم إلغاء العملية');
    }
    
    rl.close();
  }

  console.log('\n✅ انتهى السكريپت');
  process.exit(0);
}

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
  console.error('❌ خطأ غير متوقع:', error);
  rl.close();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n⏹️  تم إيقاف السكريپت بواسطة المستخدم');
  rl.close();
  process.exit(0);
});

// تشغيل السكريپت الرئيسي
main().catch((error) => {
  console.error('❌ خطأ في تشغيل السكريپت:', error);
  rl.close();
  process.exit(1);
});
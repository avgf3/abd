const fs = require('fs');
const path = require('path');

// محاولة جمع متطلبات Drizzle ORM
let db, eq, users;
try {
  const storage = require('./server/storage.ts');
  const drizzleDb = require('./server/db/index.ts');
  const schema = require('./shared/schema.ts');
  
  db = drizzleDb.db;
  eq = drizzleDb.eq;
  users = schema.users;
} catch (error) {
  console.error('❌ خطأ في تحميل مكتبات قاعدة البيانات:', error.message);
  console.log('🔄 محاولة استخدام طريقة بديلة...');
  process.exit(1);
}

console.log('🔧 بدء تنظيف وإصلاح صور قاعدة البيانات...\n');

async function fixImageDatabase() {
  try {
    // جلب جميع المستخدمين
    console.log('📋 جلب قائمة المستخدمين من قاعدة البيانات...');
    const allUsers = await db.select().from(users);
    
    console.log(`👥 تم العثور على ${allUsers.length} مستخدم`);
    
    let fixedProfileImages = 0;
    let fixedBanners = 0;
    let skippedUsers = 0;
    
    for (const user of allUsers) {
      console.log(`\n🔍 فحص المستخدم: ${user.username} (ID: ${user.id})`);
      
      let needsUpdate = false;
      let updateData = {};
      
      // فحص صورة البروفايل
      if (user.profileImage) {
        const profileImage = user.profileImage;
        
        if (profileImage.startsWith('data:')) {
          console.log('  ✅ صورة البروفايل: base64 (لا تحتاج إصلاح)');
        } else if (profileImage === '/default_avatar.svg') {
          console.log('  ✅ صورة البروفايل: افتراضية (لا تحتاج إصلاح)');
        } else if (profileImage.startsWith('/uploads/')) {
          // فحص وجود الملف
          const filePath = path.join(__dirname, 'client/public', profileImage);
          
          if (fs.existsSync(filePath)) {
            console.log('  🔄 تحويل صورة البروفايل إلى base64...');
            
            try {
              const fileBuffer = fs.readFileSync(filePath);
              const base64Image = fileBuffer.toString('base64');
              
              // تحديد نوع MIME من امتداد الملف
              let mimeType = 'image/jpeg'; // افتراضي
              if (profileImage.endsWith('.png')) mimeType = 'image/png';
              else if (profileImage.endsWith('.gif')) mimeType = 'image/gif';
              else if (profileImage.endsWith('.webp')) mimeType = 'image/webp';
              else if (profileImage.endsWith('.svg')) mimeType = 'image/svg+xml';
              
              const dataUrl = `data:${mimeType};base64,${base64Image}`;
              updateData.profileImage = dataUrl;
              needsUpdate = true;
              
              console.log(`  ✅ تم تحويل صورة البروفايل (${(base64Image.length / 1024).toFixed(1)} KB)`);
              fixedProfileImages++;
              
              // حذف الملف الأصلي بعد التحويل
              fs.unlinkSync(filePath);
              console.log('  🗑️ تم حذف الملف الأصلي');
              
            } catch (conversionError) {
              console.log(`  ❌ فشل في تحويل صورة البروفايل: ${conversionError.message}`);
              updateData.profileImage = '/default_avatar.svg';
              needsUpdate = true;
            }
          } else {
            console.log('  ❌ ملف صورة البروفايل غير موجود - تعيين صورة افتراضية');
            updateData.profileImage = '/default_avatar.svg';
            needsUpdate = true;
            fixedProfileImages++;
          }
        } else {
          console.log('  ⚠️ صورة البروفايل بصيغة غير معروفة - تعيين صورة افتراضية');
          updateData.profileImage = '/default_avatar.svg';
          needsUpdate = true;
          fixedProfileImages++;
        }
      }
      
      // فحص صورة البانر
      if (user.profileBanner) {
        const profileBanner = user.profileBanner;
        
        if (profileBanner.startsWith('data:')) {
          console.log('  ✅ صورة البانر: base64 (لا تحتاج إصلاح)');
        } else if (profileBanner.startsWith('http')) {
          console.log('  ✅ صورة البانر: رابط خارجي (لا تحتاج إصلاح)');
        } else if (profileBanner.startsWith('/uploads/')) {
          // فحص وجود الملف
          const filePath = path.join(__dirname, 'client/public', profileBanner);
          
          if (fs.existsSync(filePath)) {
            console.log('  🔄 تحويل صورة البانر إلى base64...');
            
            try {
              const fileBuffer = fs.readFileSync(filePath);
              const base64Image = fileBuffer.toString('base64');
              
              // تحديد نوع MIME
              let mimeType = 'image/jpeg';
              if (profileBanner.endsWith('.png')) mimeType = 'image/png';
              else if (profileBanner.endsWith('.gif')) mimeType = 'image/gif';
              else if (profileBanner.endsWith('.webp')) mimeType = 'image/webp';
              else if (profileBanner.endsWith('.svg')) mimeType = 'image/svg+xml';
              
              const dataUrl = `data:${mimeType};base64,${base64Image}`;
              updateData.profileBanner = dataUrl;
              needsUpdate = true;
              
              console.log(`  ✅ تم تحويل صورة البانر (${(base64Image.length / 1024).toFixed(1)} KB)`);
              fixedBanners++;
              
              // حذف الملف الأصلي
              fs.unlinkSync(filePath);
              console.log('  🗑️ تم حذف الملف الأصلي');
              
            } catch (conversionError) {
              console.log(`  ❌ فشل في تحويل صورة البانر: ${conversionError.message}`);
              updateData.profileBanner = null;
              needsUpdate = true;
            }
          } else {
            console.log('  ❌ ملف صورة البانر غير موجود - إزالة البانر');
            updateData.profileBanner = null;
            needsUpdate = true;
            fixedBanners++;
          }
        } else {
          console.log('  ⚠️ صورة البانر بصيغة غير معروفة - إزالة البانر');
          updateData.profileBanner = null;
          needsUpdate = true;
          fixedBanners++;
        }
      }
      
      // تحديث المستخدم إذا لزم الأمر
      if (needsUpdate) {
        try {
          await db.update(users)
            .set(updateData)
            .where(eq(users.id, user.id));
          
          console.log('  📝 تم تحديث بيانات المستخدم في قاعدة البيانات');
        } catch (updateError) {
          console.log(`  ❌ فشل في تحديث بيانات المستخدم: ${updateError.message}`);
        }
      } else {
        console.log('  ✅ لا حاجة لتحديث بيانات المستخدم');
        skippedUsers++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ملخص نتائج التنظيف:');
    console.log(`👥 إجمالي المستخدمين: ${allUsers.length}`);
    console.log(`🖼️ صور البروفايل المُصلحة: ${fixedProfileImages}`);
    console.log(`🎨 صور البانر المُصلحة: ${fixedBanners}`);
    console.log(`⏭️ المستخدمين المتجاهلين: ${skippedUsers}`);
    console.log('✅ تم الانتهاء من تنظيف قاعدة البيانات بنجاح!');
    
    // إنشاء تقرير إضافي
    console.log('\n🔍 فحص الحالة النهائية...');
    const updatedUsers = await db.select().from(users);
    
    const stats = {
      base64ProfileImages: 0,
      defaultProfileImages: 0,
      filePathProfileImages: 0,
      base64Banners: 0,
      externalBanners: 0,
      nullBanners: 0,
      filePathBanners: 0
    };
    
    updatedUsers.forEach(user => {
      // إحصائيات صور البروفايل
      if (user.profileImage) {
        if (user.profileImage.startsWith('data:')) {
          stats.base64ProfileImages++;
        } else if (user.profileImage === '/default_avatar.svg') {
          stats.defaultProfileImages++;
        } else {
          stats.filePathProfileImages++;
        }
      }
      
      // إحصائيات صور البانر
      if (user.profileBanner) {
        if (user.profileBanner.startsWith('data:')) {
          stats.base64Banners++;
        } else if (user.profileBanner.startsWith('http')) {
          stats.externalBanners++;
        } else {
          stats.filePathBanners++;
        }
      } else {
        stats.nullBanners++;
      }
    });
    
    console.log('\n📈 الإحصائيات النهائية:');
    console.log(`🔸 صور البروفايل Base64: ${stats.base64ProfileImages}`);
    console.log(`🔸 صور البروفايل الافتراضية: ${stats.defaultProfileImages}`);
    console.log(`🔸 صور البروفايل بمسارات ملفات (مشاكل): ${stats.filePathProfileImages}`);
    console.log(`🔸 صور البانر Base64: ${stats.base64Banners}`);
    console.log(`🔸 صور البانر الخارجية: ${stats.externalBanners}`);
    console.log(`🔸 بدون صور بانر: ${stats.nullBanners}`);
    console.log(`🔸 صور البانر بمسارات ملفات (مشاكل): ${stats.filePathBanners}`);
    
    if (stats.filePathProfileImages + stats.filePathBanners === 0) {
      console.log('\n🎉 ممتاز! لا توجد مشاكل في قاعدة البيانات');
    } else {
      console.log('\n⚠️ لا تزال هناك بعض المشاكل تحتاج مراجعة يدوية');
    }
    
  } catch (error) {
    console.error('\n❌ خطأ في تنظيف قاعدة البيانات:', error);
    throw error;
  }
}

// تشغيل الإصلاح
fixImageDatabase()
  .then(() => {
    console.log('\n🏁 انتهى تنظيف قاعدة البيانات بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل في تنظيف قاعدة البيانات:', error);
    process.exit(1);
  });
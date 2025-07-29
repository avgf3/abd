const fs = require('fs');
const path = require('path');

console.log('🔧 بدء تنظيف وإصلاح صور قاعدة البيانات...\n');

// محاولة الوصول لقاعدة البيانات
let storage;
try {
  // محاولة تحميل storage
  const { createStorage } = require('./server/storage.js');
  storage = createStorage();
} catch (error) {
  console.log('🔄 محاولة طريقة بديلة للوصول لقاعدة البيانات...');
  try {
    storage = require('./server/storage.ts');
  } catch (error2) {
    console.error('❌ فشل في الوصول لقاعدة البيانات:', error2.message);
    console.log('⚠️ سيتم العمل على الملفات فقط...');
  }
}

async function fixImageFilesOnly() {
  console.log('📂 تنظيف الملفات القديمة وتحويلها...\n');
  
  const uploadsDir = path.join(__dirname, 'client/public/uploads');
  const profilesDir = path.join(uploadsDir, 'profiles');
  const bannersDir = path.join(uploadsDir, 'banners');
  
  let converted = 0;
  let errors = 0;
  
  // معالجة صور البروفايل
  if (fs.existsSync(profilesDir)) {
    console.log('🔍 فحص مجلد صور البروفايل...');
    const profileFiles = fs.readdirSync(profilesDir);
    
    for (const filename of profileFiles) {
      const filePath = path.join(profilesDir, filename);
      
      try {
        const stats = fs.statSync(filePath);
        const fileSize = (stats.size / 1024).toFixed(1);
        
        console.log(`  📄 ${filename} (${fileSize} KB)`);
        
        // قراءة الملف وتحويله لـ base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64Image = fileBuffer.toString('base64');
        
        // تحديد نوع MIME
        let mimeType = 'image/jpeg';
        if (filename.endsWith('.png')) mimeType = 'image/png';
        else if (filename.endsWith('.gif')) mimeType = 'image/gif';
        else if (filename.endsWith('.webp')) mimeType = 'image/webp';
        else if (filename.endsWith('.svg')) mimeType = 'image/svg+xml';
        
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        // إنشاء ملف التحويل
        const outputPath = path.join(profilesDir, `${filename}.base64.txt`);
        fs.writeFileSync(outputPath, dataUrl);
        
        console.log(`    ✅ تم تحويل إلى base64 (${(base64Image.length / 1024).toFixed(1)} KB)`);
        converted++;
        
      } catch (error) {
        console.log(`    ❌ خطأ في معالجة ${filename}: ${error.message}`);
        errors++;
      }
    }
  }
  
  // معالجة صور البانر
  if (fs.existsSync(bannersDir)) {
    console.log('\n🔍 فحص مجلد صور البانر...');
    const bannerFiles = fs.readdirSync(bannersDir);
    
    for (const filename of bannerFiles) {
      if (filename.endsWith('.base64.txt')) continue; // تجاهل ملفات التحويل
      
      const filePath = path.join(bannersDir, filename);
      
      try {
        const stats = fs.statSync(filePath);
        const fileSize = (stats.size / 1024).toFixed(1);
        
        console.log(`  📄 ${filename} (${fileSize} KB)`);
        
        // قراءة الملف وتحويله لـ base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64Image = fileBuffer.toString('base64');
        
        // تحديد نوع MIME
        let mimeType = 'image/jpeg';
        if (filename.endsWith('.png')) mimeType = 'image/png';
        else if (filename.endsWith('.gif')) mimeType = 'image/gif';
        else if (filename.endsWith('.webp')) mimeType = 'image/webp';
        else if (filename.endsWith('.svg')) mimeType = 'image/svg+xml';
        
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        // إنشاء ملف التحويل
        const outputPath = path.join(bannersDir, `${filename}.base64.txt`);
        fs.writeFileSync(outputPath, dataUrl);
        
        console.log(`    ✅ تم تحويل إلى base64 (${(base64Image.length / 1024).toFixed(1)} KB)`);
        converted++;
        
      } catch (error) {
        console.log(`    ❌ خطأ في معالجة ${filename}: ${error.message}`);
        errors++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 تم تحويل ${converted} ملف`);
  console.log(`❌ ${errors} خطأ`);
  console.log('\n💡 يمكنك الآن نسخ محتوى ملفات .base64.txt ولصقها في قاعدة البيانات يدوياً');
  console.log('🔍 أو استخدام أداة التشخيص في المتصفح لرؤية البيانات الحالية');
}

// دالة لإنشاء تقرير بحالة قاعدة البيانات
async function createDatabaseReport() {
  if (!storage) {
    console.log('⚠️ لا يمكن الوصول لقاعدة البيانات');
    return;
  }
  
  try {
    console.log('📋 إنشاء تقرير حالة قاعدة البيانات...\n');
    
    const users = await storage.getAllUsers();
    console.log(`👥 إجمالي المستخدمين: ${users.length}\n`);
    
    let stats = {
      base64Profiles: 0,
      defaultProfiles: 0,
      filePathProfiles: 0,
      base64Banners: 0,
      externalBanners: 0,
      nullBanners: 0,
      filePathBanners: 0
    };
    
    console.log('🔍 فحص صور المستخدمين...');
    
    for (const user of users) {
      let issues = [];
      
      // فحص صورة البروفايل
      if (user.profileImage) {
        if (user.profileImage.startsWith('data:')) {
          stats.base64Profiles++;
        } else if (user.profileImage === '/default_avatar.svg') {
          stats.defaultProfiles++;
        } else {
          stats.filePathProfiles++;
          issues.push('صورة البروفايل: مسار ملف');
        }
      }
      
      // فحص صورة البانر
      if (user.profileBanner) {
        if (user.profileBanner.startsWith('data:')) {
          stats.base64Banners++;
        } else if (user.profileBanner.startsWith('http')) {
          stats.externalBanners++;
        } else {
          stats.filePathBanners++;
          issues.push('صورة البانر: مسار ملف');
        }
      } else {
        stats.nullBanners++;
      }
      
      if (issues.length > 0) {
        console.log(`  ⚠️ ${user.username} (ID: ${user.id}): ${issues.join(', ')}`);
      }
    }
    
    console.log('\n📈 إحصائيات الصور:');
    console.log(`🔸 صور البروفايل Base64: ${stats.base64Profiles}`);
    console.log(`🔸 صور البروفايل الافتراضية: ${stats.defaultProfiles}`);
    console.log(`🔸 صور البروفايل بمسارات ملفات: ${stats.filePathProfiles}`);
    console.log(`🔸 صور البانر Base64: ${stats.base64Banners}`);
    console.log(`🔸 صور البانر الخارجية: ${stats.externalBanners}`);
    console.log(`🔸 بدون صور بانر: ${stats.nullBanners}`);
    console.log(`🔸 صور البانر بمسارات ملفات: ${stats.filePathBanners}`);
    
    const totalIssues = stats.filePathProfiles + stats.filePathBanners;
    
    if (totalIssues === 0) {
      console.log('\n🎉 ممتاز! لا توجد مشاكل في قاعدة البيانات');
    } else {
      console.log(`\n⚠️ يوجد ${totalIssues} مشكلة تحتاج إصلاح`);
    }
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء تقرير قاعدة البيانات:', error.message);
  }
}

async function main() {
  try {
    // إنشاء تقرير أولي
    await createDatabaseReport();
    
    console.log('\n' + '='.repeat(60));
    
    // تحويل الملفات
    await fixImageFilesOnly();
    
    console.log('\n✅ تم الانتهاء من المعالجة');
    console.log('\n💡 لإكمال الإصلاح:');
    console.log('1. افتح صفحة التشخيص: http://localhost:3000/test-image-upload.html');
    console.log('2. انقر على "عرض الصور الموجودة" لرؤية الحالة الحالية');
    console.log('3. استخدم ملفات .base64.txt لتحديث قاعدة البيانات يدوياً إذا لزم الأمر');
    
  } catch (error) {
    console.error('💥 خطأ عام:', error);
  }
}

main();
#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار المجلدات
const framesDir = './client/public/frames';
const outputDir = './webp-frames-hq';

// إنشاء مجلد الإخراج
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎯 تحويل الإطارات من PNG إلى WebP بأعلى جودة...\n');
console.log('━'.repeat(60));
console.log('⚙️  الإعدادات المستخدمة:');
console.log('• Lossless compression (ضغط بدون فقدان)');
console.log('• الحفاظ على الشفافية الكاملة');
console.log('• الحفاظ على جميع الألوان');
console.log('• أفضل جودة ممكنة');
console.log('━'.repeat(60) + '\n');

async function convertToWebP() {
  let convertedCount = 0;
  let totalSizePNG = 0;
  let totalSizeWebP = 0;
  
  // تحويل الإطارات من 10 إلى 42
  for (let i = 10; i <= 42; i++) {
    const inputPath = path.join(framesDir, `frame${i}.png`);
    const outputPath = path.join(outputDir, `frame${i}.webp`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  الإطار ${i} غير موجود`);
      continue;
    }
    
    try {
      // الحصول على حجم PNG الأصلي
      const pngStats = fs.statSync(inputPath);
      totalSizePNG += pngStats.size;
      
      // تحويل إلى WebP بأعلى جودة (lossless)
      // -lossless: ضغط بدون فقدان في الجودة
      // -exact: الحفاظ على الألوان RGB بدقة
      // -alpha_q 100: أعلى جودة للشفافية
      // -m 6: أبطأ ضغط لكن أفضل نتيجة
      const command = `cwebp -lossless -exact -alpha_q 100 -m 6 "${inputPath}" -o "${outputPath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      // الحصول على حجم WebP الناتج
      const webpStats = fs.statSync(outputPath);
      totalSizeWebP += webpStats.size;
      
      const compressionRatio = ((1 - webpStats.size / pngStats.size) * 100).toFixed(1);
      
      console.log(`✅ الإطار ${i}: PNG ${(pngStats.size / 1024).toFixed(1)}KB → WebP ${(webpStats.size / 1024).toFixed(1)}KB (توفير ${compressionRatio}%)`);
      convertedCount++;
      
    } catch (error) {
      console.error(`❌ فشل تحويل الإطار ${i}: ${error.message}`);
    }
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 النتائج النهائية:\n');
  console.log(`✅ تم تحويل ${convertedCount} إطار بنجاح`);
  console.log(`📁 الملفات محفوظة في: ${path.resolve(outputDir)}`);
  console.log(`\n💾 مقارنة الأحجام:`);
  console.log(`• حجم PNG الإجمالي: ${(totalSizePNG / 1024 / 1024).toFixed(2)} MB`);
  console.log(`• حجم WebP الإجمالي: ${(totalSizeWebP / 1024 / 1024).toFixed(2)} MB`);
  console.log(`• نسبة التوفير: ${((1 - totalSizeWebP / totalSizePNG) * 100).toFixed(1)}%`);
  console.log('\n🌟 مميزات WebP:');
  console.log('• جودة مطابقة 100% للأصل (lossless)');
  console.log('• دعم كامل للشفافية');
  console.log('• دعم 16.7 مليون لون (مثل PNG)');
  console.log('• حجم أصغر من PNG بنفس الجودة');
  console.log('━'.repeat(60));
  
  // إنشاء تقرير مقارنة
  await createComparisonReport();
}

async function createComparisonReport() {
  console.log('\n📝 إنشاء تقرير مقارنة...');
  
  // اختيار إطار للمقارنة التفصيلية
  const sampleFrame = 20;
  const pngPath = path.join(framesDir, `frame${sampleFrame}.png`);
  const webpPath = path.join(outputDir, `frame${sampleFrame}.webp`);
  
  if (fs.existsSync(pngPath) && fs.existsSync(webpPath)) {
    try {
      // الحصول على معلومات تفصيلية
      const { stdout: pngInfo } = await execAsync(`identify -verbose "${pngPath}" | grep -E "(Format:|Geometry:|Depth:|Colorspace:|Colors:)" | head -10`);
      const { stdout: webpInfo } = await execAsync(`identify -verbose "${webpPath}" | grep -E "(Format:|Geometry:|Depth:|Colorspace:|Colors:)" | head -10`);
      
      console.log(`\n🔍 مقارنة تفصيلية للإطار ${sampleFrame}:`);
      console.log('\nPNG الأصلي:');
      console.log(pngInfo);
      console.log('\nWebP المحول:');
      console.log(webpInfo);
      
    } catch (error) {
      // تجاهل الأخطاء في التقرير
    }
  }
  
  console.log('\n✨ تمت العملية بنجاح!');
}

// التحقق من وجود cwebp
exec('cwebp -version', (error) => {
  if (error) {
    console.log('⚠️  يجب تثبيت أدوات WebP أولاً');
    console.log('📦 جاري التثبيت...\n');
    
    exec('sudo apt-get update && sudo apt-get install -y webp', (installError) => {
      if (installError) {
        console.error('❌ فشل تثبيت WebP tools');
        process.exit(1);
      } else {
        console.log('✅ تم تثبيت WebP tools بنجاح\n');
        convertToWebP();
      }
    });
  } else {
    convertToWebP();
  }
});
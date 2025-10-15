#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الإطارات
const framesDir = './client/public/frames';

// إنشاء مجلدات للخيارات المختلفة
const outputDirs = {
  optimized: './gif-optimized',
  dithered: './gif-dithered',
  nodelay: './gif-nodelay',
  webp: './webp-frames'  // بديل أفضل لـ GIF
};

// إنشاء المجلدات
Object.values(outputDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🎨 سأقوم بتحويل الإطارات بعدة طرق للحفاظ على الجودة:\n');
console.log('1️⃣ GIF محسّن مع تحسين الألوان');
console.log('2️⃣ GIF مع Floyd-Steinberg dithering');
console.log('3️⃣ GIF بدون ضغط');
console.log('4️⃣ WebP (بديل حديث بجودة أفضل)\n');

// التحقق من وجود ImageMagick
exec('convert -version', async (error) => {
  if (error) {
    console.log('خطأ: يجب تثبيت ImageMagick أولاً');
    process.exit(1);
  }

  // تحويل إطار واحد كمثال (frame 20)
  const sampleFrame = 20;
  const inputPath = path.join(framesDir, `frame${sampleFrame}.png`);
  
  if (!fs.existsSync(inputPath)) {
    console.log('الإطار المختار غير موجود');
    process.exit(1);
  }

  console.log(`📸 سأستخدم الإطار ${sampleFrame} كمثال للمقارنة...\n`);

  // 1. GIF محسّن مع تحسين الألوان
  const optimizedPath = path.join(outputDirs.optimized, `frame${sampleFrame}.gif`);
  await convertWithMethod(
    inputPath,
    optimizedPath,
    '-colors 256 -dither None +dither',
    'GIF محسّن (256 لون)'
  );

  // 2. GIF مع Floyd-Steinberg dithering
  const ditheredPath = path.join(outputDirs.dithered, `frame${sampleFrame}.gif`);
  await convertWithMethod(
    inputPath,
    ditheredPath,
    '-dither FloydSteinberg -colors 256',
    'GIF مع Dithering'
  );

  // 3. GIF بدون ضغط
  const noDelayPath = path.join(outputDirs.nodelay, `frame${sampleFrame}.gif`);
  await convertWithMethod(
    inputPath,
    noDelayPath,
    '-quality 100 -colors 256',
    'GIF بجودة 100%'
  );

  // 4. WebP (بديل أفضل)
  const webpPath = path.join(outputDirs.webp, `frame${sampleFrame}.webp`);
  await convertWithMethod(
    inputPath,
    webpPath,
    '-quality 95 -define webp:lossless=true',
    'WebP (lossless)'
  );

  // مقارنة الأحجام والجودة
  console.log('\n' + '='.repeat(60));
  console.log('📊 مقارنة النتائج:\n');
  
  // الملف الأصلي
  const originalStats = fs.statSync(inputPath);
  console.log(`🔷 PNG الأصلي: ${(originalStats.size / 1024).toFixed(2)} KB`);
  
  // الملفات المحولة
  compareFile(optimizedPath, 'GIF محسّن');
  compareFile(ditheredPath, 'GIF مع Dithering');
  compareFile(noDelayPath, 'GIF بجودة 100%');
  compareFile(webpPath, 'WebP');
  
  console.log('\n💡 نصائح:');
  console.log('• GIF محدود بـ 256 لون فقط، لذلك ستفقد بعض التفاصيل');
  console.log('• Dithering يحسن التدرجات لكن قد يضيف "نقاط" صغيرة');
  console.log('• WebP يحافظ على جودة أفضل بكثير من GIF');
  console.log('• إذا كنت تحتاج للشفافية والجودة العالية، استخدم PNG أو WebP');
  
  console.log('\n🎯 لتحويل جميع الإطارات بأفضل طريقة، اختر إحدى الخيارات:');
  console.log('1. node convert-all-frames-optimized.js');
  console.log('2. node convert-all-frames-dithered.js');
  console.log('3. node convert-all-frames-webp.js');
});

async function convertWithMethod(input, output, options, description) {
  return new Promise((resolve) => {
    const command = `convert "${input}" ${options} "${output}"`;
    
    exec(command, (error) => {
      if (error) {
        console.error(`❌ فشل ${description}: ${error.message}`);
      } else {
        console.log(`✅ تم إنشاء ${description}`);
      }
      resolve();
    });
  });
}

function compareFile(filePath, description) {
  try {
    const stats = fs.statSync(filePath);
    console.log(`• ${description}: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (e) {
    console.log(`• ${description}: فشل الإنشاء`);
  }
}
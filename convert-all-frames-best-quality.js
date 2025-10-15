#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الإطارات
const framesDir = './client/public/frames';
const outputDir = './high-quality-gifs';

// إنشاء مجلد الإخراج
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎨 تحويل الإطارات من 10 إلى 42 بأفضل جودة ممكنة لـ GIF...\n');
console.log('⚙️ الإعدادات المستخدمة:');
console.log('• استخدام خوارزمية تحسين الألوان');
console.log('• الحفاظ على الشفافية');
console.log('• استخدام أفضل palette ممكن');
console.log('• تقليل الفقد في الجودة\n');

exec('convert -version', (error) => {
  if (error) {
    console.log('خطأ: يجب تثبيت ImageMagick أولاً');
    process.exit(1);
  }

  let convertedCount = 0;
  const promises = [];

  // تحويل كل إطار من 10 إلى 42
  for (let i = 10; i <= 42; i++) {
    const framePath = path.join(framesDir, `frame${i}.png`);
    const outputPath = path.join(outputDir, `frame${i}.gif`);
    
    if (fs.existsSync(framePath)) {
      const promise = new Promise((resolve, reject) => {
        // أوامر محسّنة للحفاظ على الجودة
        // -strip: إزالة metadata غير ضرورية
        // -coalesce: تحسين الإطارات
        // -colors 256: استخدام أقصى عدد ألوان ممكن لـ GIF
        // -dither FloydSteinberg: لتحسين التدرجات
        // -remap: استخدام palette محسّن
        const command = `convert "${framePath}" -strip -coalesce -colors 256 -dither FloydSteinberg -quality 100 "${outputPath}"`;
        
        exec(command, (error) => {
          if (error) {
            console.error(`❌ فشل تحويل الإطار ${i}:`, error.message);
            reject(error);
          } else {
            const originalStats = fs.statSync(framePath);
            const outputStats = fs.statSync(outputPath);
            const compressionRatio = ((1 - outputStats.size / originalStats.size) * 100).toFixed(1);
            
            console.log(`✅ الإطار ${i}: PNG ${(originalStats.size / 1024).toFixed(1)}KB → GIF ${(outputStats.size / 1024).toFixed(1)}KB (ضغط ${compressionRatio}%)`);
            convertedCount++;
            resolve();
          }
        });
      });
      
      promises.push(promise);
    }
  }

  Promise.all(promises)
    .then(() => {
      console.log('\n' + '='.repeat(60));
      console.log(`✨ تم التحويل بنجاح!`);
      console.log(`📁 الملفات محفوظة في: ${path.resolve(outputDir)}`);
      console.log(`📊 عدد الإطارات المحولة: ${convertedCount}`);
      console.log('\n🔍 ملاحظات حول الجودة:');
      console.log('• GIF محدود بـ 256 لون، لذا قد تلاحظ بعض الفرق عن PNG');
      console.log('• تم استخدام dithering لتحسين التدرجات اللونية');
      console.log('• إذا كانت الجودة غير مرضية، جرّب WebP بدلاً من GIF');
      console.log('='.repeat(60));
    })
    .catch(error => {
      console.error('\n❌ حدث خطأ أثناء التحويل:', error);
    });
});
#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الإطارات
const framesDir = './client/public/frames';
const outputDir = './individual-gifs';

// إنشاء مجلد الإخراج إذا لم يكن موجوداً
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 تم إنشاء مجلد: ${outputDir}`);
}

// التحقق من وجود ImageMagick
exec('convert -version', (error) => {
  if (error) {
    console.log('خطأ: يجب تثبيت ImageMagick أولاً');
    console.log('قم بتشغيل: sudo apt-get install imagemagick');
    process.exit(1);
  }
  
  console.log('🎯 بدء تحويل الإطارات من 10 إلى 42...\n');
  
  let convertedCount = 0;
  let totalSize = 0;
  const promises = [];
  
  // تحويل كل إطار من 10 إلى 42
  for (let i = 10; i <= 42; i++) {
    const framePath = path.join(framesDir, `frame${i}.png`);
    const outputPath = path.join(outputDir, `frame${i}.gif`);
    
    if (fs.existsSync(framePath)) {
      const promise = new Promise((resolve, reject) => {
        // تحويل PNG إلى GIF
        const command = `convert "${framePath}" "${outputPath}"`;
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ فشل تحويل الإطار ${i}:`, error.message);
            reject(error);
          } else {
            const stats = fs.statSync(outputPath);
            totalSize += stats.size;
            convertedCount++;
            console.log(`✅ تم تحويل الإطار ${i} -> ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(2)} KB)`);
            resolve();
          }
        });
      });
      
      promises.push(promise);
    } else {
      console.log(`⚠️  الإطار ${i} غير موجود - تم تخطيه`);
    }
  }
  
  // انتظار اكتمال جميع التحويلات
  Promise.all(promises)
    .then(() => {
      console.log('\n' + '='.repeat(50));
      console.log(`🎉 تم الانتهاء من التحويل!`);
      console.log(`📊 عدد الإطارات المحولة: ${convertedCount}`);
      console.log(`💾 الحجم الإجمالي: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📁 موقع الملفات: ${path.resolve(outputDir)}`);
      console.log('='.repeat(50));
    })
    .catch(error => {
      console.error('\n❌ حدث خطأ أثناء التحويل:', error);
    });
});
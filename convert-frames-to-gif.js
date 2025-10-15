#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الإطارات
const framesDir = './client/public/frames';
const outputDir = './';
const outputFile = 'frames-10-42.gif';

// التحقق من وجود ImageMagick
exec('convert -version', (error) => {
  if (error) {
    console.log('خطأ: يجب تثبيت ImageMagick أولاً');
    console.log('قم بتشغيل: sudo apt-get install imagemagick');
    process.exit(1);
  }
  
  // بناء قائمة الإطارات من 10 إلى 42
  const frames = [];
  for (let i = 10; i <= 42; i++) {
    const framePath = path.join(framesDir, `frame${i}.png`);
    if (fs.existsSync(framePath)) {
      frames.push(framePath);
    } else {
      console.log(`تحذير: الإطار ${i} غير موجود`);
    }
  }
  
  if (frames.length === 0) {
    console.log('خطأ: لم يتم العثور على أي إطارات');
    process.exit(1);
  }
  
  console.log(`تم العثور على ${frames.length} إطار`);
  console.log('جاري تحويل الإطارات إلى GIF...');
  
  // أمر ImageMagick لتحويل الإطارات إلى GIF
  // -delay 10 = تأخير 10/100 ثانية بين الإطارات (100ms)
  // -loop 0 = تكرار لا نهائي
  const command = `convert -delay 10 -loop 0 ${frames.join(' ')} ${path.join(outputDir, outputFile)}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('خطأ في تحويل الصور:', error);
      return;
    }
    
    console.log(`✅ تم إنشاء ملف GIF بنجاح: ${outputFile}`);
    console.log(`📍 الموقع: ${path.resolve(outputDir, outputFile)}`);
    
    // عرض معلومات عن الملف الناتج
    const stats = fs.statSync(path.join(outputDir, outputFile));
    console.log(`📊 حجم الملف: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  });
});
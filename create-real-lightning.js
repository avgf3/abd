#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// المسارات
const inputFile = './webp-frames-hq/frame42.webp';
const outputDir = './lightning-effect';
const tempDir = './lightning-temp';

// إنشاء المجلدات
[outputDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('⚡ إنشاء تأثير البرق الحقيقي على الإطار 42\n');
console.log('━'.repeat(60));

async function createRealLightning() {
  try {
    // تحويل WebP إلى PNG
    const basePng = path.join(tempDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    // الحصول على أبعاد الصورة
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${basePng}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    console.log(`📐 أبعاد الإطار: ${width}x${height}`);
    console.log('\n🎨 إنشاء برق حقيقي متحرك...\n');
    
    // إنشاء إطارات البرق
    const totalFrames = 20;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(tempDir, `frame${String(i).padStart(3, '0')}.png`);
      
      // نسخ الإطار الأصلي
      await execAsync(`cp "${basePng}" "${framePath}"`);
      
      // إضافة البرق فقط في إطارات محددة لإنشاء تأثير وميض حقيقي
      if (i === 4 || i === 5 || i === 12 || i === 13) {
        // رسم البرق العشوائي
        const startX1 = width * 0.3;
        const startX2 = width * 0.7;
        const startY = height - 50;
        const meetX = width * 0.5;
        const meetY = 100;
        
        // إنشاء مسار البرق بشكل عشوائي متعرج
        let lightning1 = `M ${startX1},${startY} `;
        let lightning2 = `M ${startX2},${startY} `;
        
        // البرق الأول - متعرج
        for (let j = 0; j < 5; j++) {
          const progress = j / 4;
          const x = startX1 + (meetX - startX1) * progress + (Math.random() - 0.5) * 40;
          const y = startY - (startY - meetY) * progress;
          lightning1 += `L ${x},${y} `;
        }
        
        // البرق الثاني - متعرج
        for (let j = 0; j < 5; j++) {
          const progress = j / 4;
          const x = startX2 + (meetX - startX2) * progress + (Math.random() - 0.5) * 40;
          const y = startY - (startY - meetY) * progress;
          lightning2 += `L ${x},${y} `;
        }
        
        // تطبيق البرق على الإطار
        const lightningCommand = `convert "${framePath}" \\
          \\( -size ${width}x${height} xc:transparent \\
             -stroke white -strokewidth 3 -fill none \\
             -draw "path '${lightning1}'" \\
             -draw "path '${lightning2}'" \\
             -channel A -evaluate multiply 0.9 +channel \\
          \\) -compose screen -composite \\
          \\( -size ${width}x${height} xc:transparent \\
             -stroke "rgba(150,200,255,0.8)" -strokewidth 8 -fill none \\
             -draw "path '${lightning1}'" \\
             -draw "path '${lightning2}'" \\
             -blur 0x4 \\
          \\) -compose screen -composite \\
          \\( -size ${width}x${height} xc:transparent \\
             -stroke "rgba(200,230,255,0.5)" -strokewidth 15 -fill none \\
             -draw "path '${lightning1}'" \\
             -draw "path '${lightning2}'" \\
             -blur 0x8 \\
          \\) -compose screen -composite \\
          "${framePath}"`;
        
        await execAsync(lightningCommand);
      }
      
      frames.push(framePath);
      process.stdout.write(`\r  إنشاء الإطارات: ${i + 1}/${totalFrames}`);
    }
    
    console.log('\n\n✅ تم إنشاء جميع الإطارات');
    
    // إنشاء WebP متحرك
    console.log('\n🎬 إنشاء WebP متحرك...');
    const outputWebP = path.join(outputDir, 'frame42-real-lightning.webp');
    
    // تحويل الإطارات إلى WebP متحرك مع تأخير مختلف لكل إطار
    const delays = Array(totalFrames).fill(100); // 100ms default
    delays[4] = 50;  // وميض سريع
    delays[5] = 50;
    delays[12] = 50;
    delays[13] = 50;
    
    let webpCommand = 'img2webp -loop 0 ';
    frames.forEach((frame, i) => {
      webpCommand += `-d ${delays[i]} "${frame}" `;
    });
    webpCommand += `-o "${outputWebP}"`;
    
    try {
      await execAsync(webpCommand);
    } catch (e) {
      // بديل: إنشاء GIF أولاً ثم تحويله
      console.log('⚠️  استخدام طريقة بديلة...');
      const gifPath = path.join(outputDir, 'temp.gif');
      await execAsync(`convert -delay 10 -loop 0 ${frames.join(' ')} "${gifPath}"`);
      await execAsync(`convert "${gifPath}" "${outputWebP}"`);
      await execAsync(`rm "${gifPath}"`);
    }
    
    // تنظيف
    await execAsync(`rm -rf ${tempDir}`);
    
    const stats = fs.statSync(outputWebP);
    
    console.log('\n' + '━'.repeat(60));
    console.log('✨ تم إنشاء تأثير البرق الحقيقي!\n');
    console.log(`📁 الملف: ${outputWebP}`);
    console.log(`📊 الحجم: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log('\n⚡ خصائص التأثير:');
    console.log('   • برق متعرج واقعي داخل الإطار');
    console.log('   • وميض في أوقات محددة (ليس مستمر)');
    console.log('   • البرق يظهر مع الشخصية في نفس الإطار');
    console.log('   • حركة طبيعية مثل البرق الحقيقي');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  }
}

// بدء العملية
createRealLightning();
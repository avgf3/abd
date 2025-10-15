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

console.log('⚡ إنشاء تأثير البرق المتطور على الإطار 42\n');
console.log('━'.repeat(60));

// دالة لإنشاء مسار برق عشوائي
function generateLightningPath(startX, startY, endX, endY, segments = 8) {
  let path = `M ${startX},${startY} `;
  
  for (let i = 1; i <= segments; i++) {
    const progress = i / segments;
    
    // الموقع الأساسي
    let x = startX + (endX - startX) * progress;
    let y = startY + (endY - startY) * progress;
    
    // إضافة عشوائية متناقصة كلما اقتربنا من النهاية
    const randomFactor = (1 - progress) * 30;
    x += (Math.random() - 0.5) * randomFactor * 2;
    y += (Math.random() - 0.5) * randomFactor;
    
    path += `L ${x},${y} `;
  }
  
  return path;
}

async function createAdvancedLightning() {
  try {
    // تحويل WebP إلى PNG
    const basePng = path.join(tempDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    // الحصول على أبعاد الصورة
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${basePng}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    console.log(`📐 أبعاد الإطار: ${width}x${height}`);
    console.log('\n🎨 إنشاء برق متطور بتفاصيل واقعية...\n');
    
    // إعدادات الحركة
    const totalFrames = 60; // المزيد من الإطارات لحركة أنعم
    const frames = [];
    
    // مواقع ظهور البرق
    const lightningEvents = [
      { start: 8, end: 11 },    // البرق الأول
      { start: 25, end: 28 },   // البرق الثاني
      { start: 45, end: 48 },   // البرق الثالث
    ];
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(tempDir, `frame${String(i).padStart(3, '0')}.png`);
      
      // نسخ الإطار الأصلي
      await execAsync(`cp "${basePng}" "${framePath}"`);
      
      // التحقق من وجود حدث برق
      let isLightningFrame = false;
      let lightningIntensity = 0;
      
      for (const event of lightningEvents) {
        if (i >= event.start && i <= event.end) {
          isLightningFrame = true;
          // حساب شدة البرق (تلاشي تدريجي)
          const eventProgress = (i - event.start) / (event.end - event.start);
          lightningIntensity = eventProgress < 0.5 ? eventProgress * 2 : (1 - eventProgress) * 2;
          break;
        }
      }
      
      if (isLightningFrame) {
        // نقاط البداية والنهاية
        const centerX = width * 0.5;
        const topY = 50;
        
        // إنشاء عدة خطوط برق
        const mainLightning1 = generateLightningPath(width * 0.25, height - 30, centerX, topY);
        const mainLightning2 = generateLightningPath(width * 0.75, height - 30, centerX, topY);
        
        // فروع ثانوية
        const branch1 = generateLightningPath(width * 0.35, height * 0.6, width * 0.15, height * 0.4, 4);
        const branch2 = generateLightningPath(width * 0.65, height * 0.6, width * 0.85, height * 0.4, 4);
        
        // تطبيق البرق مع طبقات متعددة
        const lightningCommand = `convert "${framePath}" \\
          \\( -size ${width}x${height} xc:transparent \\
             -stroke "rgba(255,255,255,${lightningIntensity})" -strokewidth 2 -fill none \\
             -draw "path '${mainLightning1}'" \\
             -draw "path '${mainLightning2}'" \\
             -draw "path '${branch1}'" \\
             -draw "path '${branch2}'" \\
          \\) -compose screen -composite \\
          \\( -size ${width}x${height} xc:transparent \\
             -stroke "rgba(200,220,255,${lightningIntensity * 0.8})" -strokewidth 5 -fill none \\
             -draw "path '${mainLightning1}'" \\
             -draw "path '${mainLightning2}'" \\
             -blur 0x2 \\
          \\) -compose screen -composite \\
          \\( -size ${width}x${height} xc:transparent \\
             -stroke "rgba(150,200,255,${lightningIntensity * 0.5})" -strokewidth 10 -fill none \\
             -draw "path '${mainLightning1}'" \\
             -draw "path '${mainLightning2}'" \\
             -blur 0x5 \\
          \\) -compose screen -composite \\
          \\( -size ${width}x${height} xc:transparent \\
             -fill "rgba(200,220,255,${lightningIntensity * 0.2})" \\
             -draw "circle ${centerX},${topY} ${centerX + 30},${topY}" \\
             -blur 0x10 \\
          \\) -compose screen -composite \\
          -modulate ${100 + lightningIntensity * 20},100,100 \\
          "${framePath}"`;
        
        await execAsync(lightningCommand);
      }
      
      frames.push(framePath);
      
      // شريط التقدم
      const progress = Math.floor((i + 1) / totalFrames * 100);
      process.stdout.write(`\r  التقدم: ${progress}% [${'█'.repeat(progress / 2)}${'░'.repeat(50 - progress / 2)}]`);
    }
    
    console.log('\n\n✅ تم إنشاء جميع الإطارات بنجاح');
    
    // إنشاء WebP متحرك بجودة عالية
    console.log('\n🎬 إنشاء WebP متحرك عالي الجودة...');
    const outputWebP = path.join(outputDir, 'frame42-advanced-lightning.webp');
    
    // إنشاء أمر img2webp مع تأخيرات مخصصة
    let webpCommand = 'img2webp -loop 0 -lossless ';
    frames.forEach((frame) => {
      webpCommand += `-d 33 "${frame}" `; // 30 FPS
    });
    webpCommand += `-o "${outputWebP}"`;
    
    try {
      await execAsync(webpCommand);
    } catch (e) {
      // طريقة بديلة
      console.log('⚠️  استخدام طريقة بديلة للتحويل...');
      const gifPath = path.join(tempDir, 'temp.gif');
      await execAsync(`convert -delay 3 -loop 0 ${frames.join(' ')} "${gifPath}"`);
      await execAsync(`convert "${gifPath}" -quality 98 "${outputWebP}"`);
      await execAsync(`rm "${gifPath}"`);
    }
    
    // إنشاء GIF للمعاينة السريعة
    console.log('\n🎬 إنشاء GIF للمعاينة...');
    const gifPath = path.join(outputDir, 'frame42-advanced-lightning.gif');
    await execAsync(`convert -delay 3 -loop 0 ${frames.slice(0, -1, 3).join(' ')} "${gifPath}"`);
    
    // تنظيف
    await execAsync(`rm -rf ${tempDir}`);
    
    // معلومات الملفات
    const webpStats = fs.statSync(outputWebP);
    const gifStats = fs.existsSync(gifPath) ? fs.statSync(gifPath) : null;
    
    console.log('\n' + '━'.repeat(60));
    console.log('✨ تم إنشاء تأثير البرق المتطور بنجاح!\n');
    console.log('📁 الملفات المنشأة:');
    console.log(`   • WebP: ${outputWebP} (${(webpStats.size / 1024).toFixed(1)} KB)`);
    if (gifStats) {
      console.log(`   • GIF: ${gifPath} (${(gifStats.size / 1024).toFixed(1)} KB)`);
    }
    console.log('\n⚡ مميزات التأثير:');
    console.log('   • برق واقعي متعرج مع فروع ثانوية');
    console.log('   • 3 ومضات برق منفصلة خلال الحركة');
    console.log('   • توهج في نقطة الالتقاء');
    console.log('   • إضاءة تؤثر على الإطار كاملاً');
    console.log('   • 60 إطار بسرعة 30 FPS');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  }
}

// بدء العملية
createAdvancedLightning();
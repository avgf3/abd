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
const outputDir = './frame-border-effect';
const tempDir = './temp-frames';

// إنشاء المجلدات
[outputDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('✨ إنشاء تأثير الوميض المتحرك على حدود الإطار الدائري\n');
console.log('━'.repeat(60));

async function createFrameBorderEffect() {
  try {
    // تحويل WebP إلى PNG
    const basePng = path.join(tempDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    // الحصول على أبعاد الصورة
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${basePng}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    console.log(`📐 أبعاد الإطار: ${width}x${height}`);
    console.log('\n🎨 إنشاء وميض متحرك على حدود الدائرة...\n');
    
    // مركز ونصف قطر الدائرة (بافتراض أن الإطار دائري)
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10; // ترك مساحة صغيرة
    
    // إعدادات الحركة
    const totalFrames = 30;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(tempDir, `frame${String(i).padStart(3, '0')}.png`);
      
      // حساب موقع الوميض (يتحرك حول الدائرة)
      const angle = (i / totalFrames) * Math.PI * 2;
      
      // إنشاء تأثير وميض متحرك على حدود الدائرة
      const command = `convert "${basePng}" \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke none -fill none \\
           -strokewidth 0 \\
           \\( +clone \\
              -fill "radial-gradient:white-transparent" \\
              -draw "translate ${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius} circle 0,0 30,0" \\
              -blur 0x10 \\
              -channel A -evaluate multiply 0.8 +channel \\
           \\) \\
           \\( +clone \\
              -fill "radial-gradient:white-transparent" \\
              -draw "translate ${centerX + Math.cos(angle + Math.PI) * radius},${centerY + Math.sin(angle + Math.PI) * radius} circle 0,0 30,0" \\
              -blur 0x10 \\
              -channel A -evaluate multiply 0.8 +channel \\
           \\) \\
           -compose screen -composite \\
           -compose screen -composite \\
        \\) \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke "rgba(150,200,255,0.6)" -strokewidth 3 -fill none \\
           -draw "circle ${centerX},${centerY} ${centerX + radius},${centerY}" \\
           -blur 0x2 \\
        \\) \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke none \\
           -fill "radial-gradient:rgba(200,220,255,0.3)-transparent" \\
           -draw "translate ${centerX + Math.cos(angle - 0.5) * radius},${centerY + Math.sin(angle - 0.5) * radius} circle 0,0 50,0" \\
           -blur 0x15 \\
        \\) \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke none \\
           -fill "radial-gradient:rgba(200,220,255,0.3)-transparent" \\
           -draw "translate ${centerX + Math.cos(angle + 0.5) * radius},${centerY + Math.sin(angle + 0.5) * radius} circle 0,0 50,0" \\
           -blur 0x15 \\
        \\) \\
        -compose screen -composite \\
        -compose screen -composite \\
        -compose screen -composite \\
        -compose screen -composite \\
        "${framePath}"`;
      
      await execAsync(command);
      frames.push(framePath);
      
      process.stdout.write(`\r  إنشاء الإطارات: ${i + 1}/${totalFrames}`);
    }
    
    console.log('\n\n✅ تم إنشاء جميع الإطارات');
    
    // إنشاء WebP متحرك
    console.log('\n🎬 إنشاء WebP متحرك...');
    const outputWebP = path.join(outputDir, 'frame42-border-glow.webp');
    
    let webpCommand = 'img2webp -loop 0 ';
    frames.forEach((frame) => {
      webpCommand += `-d 50 "${frame}" `; // سرعة متوسطة
    });
    webpCommand += `-o "${outputWebP}"`;
    
    try {
      await execAsync(webpCommand);
    } catch (e) {
      console.log('⚠️  استخدام طريقة بديلة...');
      const gifPath = path.join(outputDir, 'frame42-border-glow.gif');
      await execAsync(`convert -delay 5 -loop 0 ${frames.join(' ')} "${gifPath}"`);
      await execAsync(`convert "${gifPath}" "${outputWebP}"`);
    }
    
    // تنظيف
    await execAsync(`rm -rf ${tempDir}`);
    
    const stats = fs.statSync(outputWebP);
    
    console.log('\n' + '━'.repeat(60));
    console.log('✨ تم إنشاء التأثير بنجاح!\n');
    console.log(`📁 الملف: ${outputWebP}`);
    console.log(`📊 الحجم: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log('\n🌟 خصائص التأثير:');
    console.log('   • وميض متحرك على حدود الإطار الدائري');
    console.log('   • الضوء يدور حول الدائرة');
    console.log('   • توهج ناعم أزرق-أبيض');
    console.log('   • التأثير على حدود الإطار فقط');
    console.log('━'.repeat(60));
    
    // إنشاء نسخة أخرى بتأثير مختلف
    await createAlternativeEffect();
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  }
}

// تأثير بديل - وميض نابض على كامل الحدود
async function createAlternativeEffect() {
  console.log('\n\n🎨 إنشاء تأثير بديل - وميض نابض...\n');
  
  try {
    const basePng = path.join(outputDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${basePng}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    const totalFrames = 20;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(tempDir, `pulse${String(i).padStart(3, '0')}.png`);
      
      // حساب شدة النبض
      const intensity = (Math.sin(i / totalFrames * Math.PI * 2) + 1) / 2;
      const glowSize = 5 + intensity * 15;
      const opacity = 0.3 + intensity * 0.7;
      
      // إنشاء تأثير نبض على الحدود
      const command = `convert "${basePng}" \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke "rgba(100,200,255,${opacity})" -strokewidth ${3 + intensity * 4} -fill none \\
           -draw "circle ${centerX},${centerY} ${centerX + radius},${centerY}" \\
           -blur 0x${glowSize} \\
        \\) \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke "rgba(200,230,255,${opacity * 0.5})" -strokewidth ${8 + intensity * 8} -fill none \\
           -draw "circle ${centerX},${centerY} ${centerX + radius},${centerY}" \\
           -blur 0x${glowSize * 1.5} \\
        \\) \\
        -compose screen -composite \\
        -compose screen -composite \\
        "${framePath}"`;
      
      await execAsync(command);
      frames.push(framePath);
      
      process.stdout.write(`\r  إنشاء إطارات النبض: ${i + 1}/${totalFrames}`);
    }
    
    console.log('\n\n✅ تم إنشاء التأثير البديل');
    
    // إنشاء WebP للتأثير البديل
    const outputWebP2 = path.join(outputDir, 'frame42-border-pulse.webp');
    
    let webpCommand = 'img2webp -loop 0 ';
    frames.forEach((frame) => {
      webpCommand += `-d 50 "${frame}" `;
    });
    webpCommand += `-o "${outputWebP2}"`;
    
    try {
      await execAsync(webpCommand);
    } catch (e) {
      const gifPath = path.join(outputDir, 'frame42-border-pulse.gif');
      await execAsync(`convert -delay 5 -loop 0 ${frames.join(' ')} "${gifPath}"`);
      await execAsync(`convert "${gifPath}" "${outputWebP2}"`);
    }
    
    // تنظيف نهائي
    await execAsync(`rm -rf ${tempDir} ${basePng}`);
    
    const stats = fs.statSync(outputWebP2);
    
    console.log('\n📁 التأثير البديل: ' + outputWebP2);
    console.log(`📊 الحجم: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log('🌟 نبض متوهج على كامل حدود الدائرة');
    
  } catch (error) {
    console.error('خطأ في التأثير البديل:', error.message);
  }
}

// بدء العملية
createFrameBorderEffect();
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
const outputDir = './profile-effects';

// إنشاء المجلد
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('⚡ إنشاء تأثيرات البروفايل المتحركة\n');
console.log('━'.repeat(60));

async function createProfileEffects() {
  try {
    // تحويل إلى PNG للعمل
    const basePng = path.join(outputDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    console.log('🎯 إنشاء 4 تأثيرات احترافية:\n');
    
    // 1. تأثير البرق الكهربائي
    await createElectricEffect(basePng);
    
    // 2. تأثير اللهب
    await createFireEffect(basePng);
    
    // 3. تأثير الجليد المتلألئ
    await createIceEffect(basePng);
    
    // 4. تأثير الطاقة الذهبية
    await createGoldEnergyEffect(basePng);
    
    // حذف الملف المؤقت
    await execAsync(`rm "${basePng}"`);
    
    console.log('\n' + '━'.repeat(60));
    console.log('✅ تم إنشاء جميع التأثيرات بنجاح!');
    console.log('\n📁 الملفات في: ' + outputDir);
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

// 1. تأثير البرق الكهربائي
async function createElectricEffect(basePng) {
  console.log('⚡ إنشاء تأثير البرق الكهربائي...');
  
  const frames = [];
  const frameCount = 24;
  
  for (let i = 0; i < frameCount; i++) {
    const tempFrame = path.join(outputDir, `electric_${i}.png`);
    
    // برق عشوائي في مواضع مختلفة
    const showLightning = i % 6 === 0 || i % 6 === 1; // وميض كل 6 إطارات
    
    if (showLightning) {
      // إنشاء خطوط برق عشوائية
      let lightningPaths = '';
      for (let j = 0; j < 3; j++) {
        const startX = 100 + Math.random() * 305;
        const startY = 50 + Math.random() * 100;
        const endX = 100 + Math.random() * 305;
        const endY = 350 + Math.random() * 105;
        
        let path = `M ${startX},${startY} `;
        for (let k = 0; k < 5; k++) {
          const x = startX + (endX - startX) * (k / 4) + (Math.random() - 0.5) * 50;
          const y = startY + (endY - startY) * (k / 4);
          path += `L ${x},${y} `;
        }
        
        lightningPaths += `-draw "stroke rgba(150,200,255,0.9) stroke-width 2 fill none path '${path}'" `;
        lightningPaths += `-draw "stroke rgba(255,255,255,0.7) stroke-width 1 fill none path '${path}'" `;
      }
      
      await execAsync(`convert "${basePng}" \\
        \\( -clone 0 -fill black -colorize 100% \\
           ${lightningPaths} \\
           -blur 0x2 \\
        \\) -compose Screen -composite \\
        \\( -clone 0 -fill black -colorize 100% \\
           ${lightningPaths} \\
           -blur 0x5 \\
           -fill "rgba(100,150,255,0.5)" -colorize 50% \\
        \\) -compose Screen -composite \\
        -modulate 110,100,100 \\
        "${tempFrame}"`);
    } else {
      // إطار عادي مع توهج خفيف
      await execAsync(`convert "${basePng}" \\
        \\( -clone 0 -alpha extract \\
           -blur 0x2 \\
           -fill "rgba(150,200,255,0.1)" -colorize 20% \\
        \\) -compose Screen -composite \\
        "${tempFrame}"`);
    }
    
    frames.push(tempFrame);
  }
  
  // تحويل إلى WebP
  const outputFile = path.join(outputDir, 'frame42-electric.webp');
  await convertFramesToWebP(frames, outputFile, 50);
  
  // تنظيف
  for (const frame of frames) {
    await execAsync(`rm "${frame}"`);
  }
  
  console.log('   ✅ تم - تأثير البرق الكهربائي');
}

// 2. تأثير اللهب
async function createFireEffect(basePng) {
  console.log('🔥 إنشاء تأثير اللهب...');
  
  const frames = [];
  const frameCount = 20;
  
  for (let i = 0; i < frameCount; i++) {
    const tempFrame = path.join(outputDir, `fire_${i}.png`);
    
    // حركة اللهب من الأسفل
    let flameCommands = '';
    for (let j = 0; j < 5; j++) {
      const x = 150 + j * 50 + Math.sin(i / 3 + j) * 20;
      const y = 450 - i * 3 - Math.random() * 50;
      const size = 30 + Math.random() * 20;
      const opacity = 0.6 - (i / frameCount) * 0.3;
      
      flameCommands += `-draw "fill rgba(255,100,0,${opacity}) circle ${x},${y} ${x + size},${y}" `;
      flameCommands += `-draw "fill rgba(255,200,0,${opacity * 0.7}) circle ${x},${y - 10} ${x + size * 0.7},${y - 10}" `;
    }
    
    await execAsync(`convert "${basePng}" \\
      \\( -size 505x505 xc:transparent \\
         ${flameCommands} \\
         -blur 0x8 \\
      \\) -compose Screen -composite \\
      \\( -clone 0 -modulate 100,120,95 \\) \\
      -compose Multiply -composite \\
      "${tempFrame}"`);
    
    frames.push(tempFrame);
  }
  
  const outputFile = path.join(outputDir, 'frame42-fire.webp');
  await convertFramesToWebP(frames, outputFile, 50);
  
  for (const frame of frames) {
    await execAsync(`rm "${frame}"`);
  }
  
  console.log('   ✅ تم - تأثير اللهب');
}

// 3. تأثير الجليد المتلألئ
async function createIceEffect(basePng) {
  console.log('❄️  إنشاء تأثير الجليد...');
  
  const frames = [];
  const frameCount = 30;
  
  for (let i = 0; i < frameCount; i++) {
    const tempFrame = path.join(outputDir, `ice_${i}.png`);
    
    // بلورات ثلج متلألئة
    let sparkles = '';
    for (let j = 0; j < 15; j++) {
      const x = 50 + Math.random() * 405;
      const y = 50 + Math.random() * 405;
      const size = 3 + Math.random() * 5;
      const opacity = Math.sin((i + j * 2) / 5) * 0.4 + 0.6;
      
      sparkles += `-draw "fill rgba(200,230,255,${opacity}) circle ${x},${y} ${x + size},${y}" `;
    }
    
    await execAsync(`convert "${basePng}" \\
      \\( -clone 0 -modulate 100,70,110 \\) \\
      \\( -size 505x505 xc:transparent \\
         ${sparkles} \\
         -blur 0x1 \\
      \\) -compose Screen -composite \\
      \\( -clone 0 -alpha extract \\
         -blur 0x3 \\
         -fill "rgba(150,200,255,0.2)" -colorize 30% \\
      \\) -compose Screen -composite \\
      "${tempFrame}"`);
    
    frames.push(tempFrame);
  }
  
  const outputFile = path.join(outputDir, 'frame42-ice.webp');
  await convertFramesToWebP(frames, outputFile, 80);
  
  for (const frame of frames) {
    await execAsync(`rm "${frame}"`);
  }
  
  console.log('   ✅ تم - تأثير الجليد');
}

// 4. تأثير الطاقة الذهبية
async function createGoldEnergyEffect(basePng) {
  console.log('✨ إنشاء تأثير الطاقة الذهبية...');
  
  const frames = [];
  const frameCount = 25;
  
  for (let i = 0; i < frameCount; i++) {
    const tempFrame = path.join(outputDir, `gold_${i}.png`);
    
    // جزيئات ذهبية دوارة
    let particles = '';
    for (let j = 0; j < 8; j++) {
      const angle = (i / frameCount + j / 8) * Math.PI * 2;
      const radius = 150 + Math.sin(i / 5) * 30;
      const x = 252.5 + Math.cos(angle) * radius;
      const y = 252.5 + Math.sin(angle) * radius;
      const size = 10 + Math.sin(i / 3 + j) * 5;
      
      particles += `-draw "fill rgba(255,215,0,0.8) circle ${x},${y} ${x + size},${y}" `;
      particles += `-draw "fill rgba(255,255,100,0.5) circle ${x},${y} ${x + size * 1.5},${y}" `;
    }
    
    await execAsync(`convert "${basePng}" \\
      \\( -size 505x505 xc:transparent \\
         ${particles} \\
         -blur 0x5 \\
      \\) -compose Screen -composite \\
      \\( -clone 0 -alpha extract \\
         -blur 0x4 \\
         -fill "rgba(255,215,0,0.15)" -colorize 20% \\
      \\) -compose Screen -composite \\
      "${tempFrame}"`);
    
    frames.push(tempFrame);
  }
  
  const outputFile = path.join(outputDir, 'frame42-gold.webp');
  await convertFramesToWebP(frames, outputFile, 60);
  
  for (const frame of frames) {
    await execAsync(`rm "${frame}"`);
  }
  
  console.log('   ✅ تم - تأثير الطاقة الذهبية');
}

// تحويل الإطارات إلى WebP متحرك
async function convertFramesToWebP(frames, outputFile, delay) {
  let command = `img2webp -loop 0 `;
  frames.forEach(frame => {
    command += `-d ${delay} "${frame}" `;
  });
  command += `-o "${outputFile}"`;
  
  try {
    await execAsync(command);
  } catch (e) {
    // بديل: استخدام convert
    const tempGif = outputFile.replace('.webp', '.gif');
    await execAsync(`convert -delay ${delay / 10} -loop 0 ${frames.join(' ')} "${tempGif}"`);
    await execAsync(`convert "${tempGif}" -quality 95 "${outputFile}"`);
    await execAsync(`rm "${tempGif}"`);
  }
  
  const stats = fs.statSync(outputFile);
  console.log(`      📦 الحجم: ${(stats.size / 1024).toFixed(1)} KB`);
}

// تشغيل
createProfileEffects();
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
const outputDir = './frame-glow-effect';
const tempDir = './temp-frames';

// إنشاء المجلدات
[outputDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('✨ إنشاء تأثير التوهج المتحرك على حدود الإطار\n');
console.log('━'.repeat(60));

async function createCircleGlow() {
  try {
    // تحويل WebP إلى PNG
    const basePng = path.join(tempDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    // الحصول على أبعاد الصورة
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${basePng}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    console.log(`📐 أبعاد الإطار: ${width}x${height}`);
    console.log('\n🎨 إنشاء توهج متحرك على الإطار الدائري...\n');
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // إنشاء 3 تأثيرات مختلفة
    await createRotatingGlow(basePng, width, height, centerX, centerY, radius);
    await createPulsingGlow(basePng, width, height, centerX, centerY, radius);
    await createSparkleEffect(basePng, width, height, centerX, centerY, radius);
    
    // تنظيف
    await execAsync(`rm -rf ${tempDir}`);
    
    console.log('\n' + '━'.repeat(60));
    console.log('✅ تم إنشاء جميع التأثيرات بنجاح!');
    console.log('\n📁 الملفات المنشأة في: ' + outputDir);
    console.log('   1️⃣ frame42-rotating-glow.webp - توهج دوار');
    console.log('   2️⃣ frame42-pulsing-glow.webp - نبض متوهج');
    console.log('   3️⃣ frame42-sparkle.webp - بريق متحرك');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  }
}

// تأثير 1: توهج دوار حول الإطار
async function createRotatingGlow(basePng, width, height, centerX, centerY, radius) {
  console.log('🌟 إنشاء توهج دوار...');
  
  const frames = [];
  const totalFrames = 30;
  
  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(tempDir, `rotate${i}.png`);
    const angle = (i / totalFrames) * 360;
    
    // حساب موقع التوهج
    const glowX = centerX + Math.cos(angle * Math.PI / 180) * radius;
    const glowY = centerY + Math.sin(angle * Math.PI / 180) * radius;
    
    const command = `convert "${basePng}" \\
      \\( +clone -alpha extract \\
         -morphology EdgeOut Diamond \\
         -blur 0x3 \\
         -fill "rgba(150,200,255,0.8)" -colorize 100% \\
      \\) -compose Over -composite \\
      \\( -size ${width}x${height} xc:none \\
         -fill "radial-gradient:rgba(200,230,255,0.8)-transparent" \\
         -draw "circle ${glowX},${glowY} ${glowX + 40},${glowY}" \\
         -blur 0x20 \\
      \\) -compose Screen -composite \\
      "${framePath}"`;
    
    await execAsync(command);
    frames.push(framePath);
  }
  
  // تحويل إلى WebP
  const outputFile = path.join(outputDir, 'frame42-rotating-glow.webp');
  await convertToWebP(frames, outputFile, 33);
  console.log('   ✅ اكتمل');
}

// تأثير 2: نبض متوهج
async function createPulsingGlow(basePng, width, height, centerX, centerY, radius) {
  console.log('💫 إنشاء نبض متوهج...');
  
  const frames = [];
  const totalFrames = 20;
  
  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(tempDir, `pulse${i}.png`);
    const intensity = (Math.sin(i / totalFrames * Math.PI * 2) + 1) / 2;
    
    const command = `convert "${basePng}" \\
      \\( +clone -alpha extract \\
         -morphology EdgeOut Diamond:${1 + intensity * 3} \\
         -blur 0x${2 + intensity * 8} \\
         -fill "rgba(100,200,255,${0.3 + intensity * 0.5})" -colorize 100% \\
      \\) -compose Over -composite \\
      "${framePath}"`;
    
    await execAsync(command);
    frames.push(framePath);
  }
  
  const outputFile = path.join(outputDir, 'frame42-pulsing-glow.webp');
  await convertToWebP(frames, outputFile, 50);
  console.log('   ✅ اكتمل');
}

// تأثير 3: بريق متحرك
async function createSparkleEffect(basePng, width, height, centerX, centerY, radius) {
  console.log('✨ إنشاء بريق متحرك...');
  
  const frames = [];
  const totalFrames = 25;
  
  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(tempDir, `sparkle${i}.png`);
    
    // مواقع عشوائية للبريق على محيط الدائرة
    let sparkles = '';
    for (let j = 0; j < 8; j++) {
      const angle = (j / 8 + i / totalFrames) * Math.PI * 2;
      const sparkleX = centerX + Math.cos(angle) * radius;
      const sparkleY = centerY + Math.sin(angle) * radius;
      const size = 10 + Math.random() * 15;
      const opacity = 0.5 + Math.random() * 0.5;
      
      sparkles += `-fill "rgba(255,255,255,${opacity})" -draw "circle ${sparkleX},${sparkleY} ${sparkleX + size},${sparkleY}" `;
    }
    
    const command = `convert "${basePng}" \\
      \\( -size ${width}x${height} xc:none \\
         ${sparkles} \\
         -blur 0x3 \\
      \\) -compose Screen -composite \\
      \\( +clone -alpha extract \\
         -morphology EdgeOut Diamond \\
         -blur 0x2 \\
         -fill "rgba(200,220,255,0.3)" -colorize 100% \\
      \\) -compose Over -composite \\
      "${framePath}"`;
    
    await execAsync(command);
    frames.push(framePath);
  }
  
  const outputFile = path.join(outputDir, 'frame42-sparkle.webp');
  await convertToWebP(frames, outputFile, 40);
  console.log('   ✅ اكتمل');
}

// تحويل الإطارات إلى WebP
async function convertToWebP(frames, outputFile, delay) {
  let webpCommand = `img2webp -loop 0 `;
  frames.forEach(frame => {
    webpCommand += `-d ${delay} "${frame}" `;
  });
  webpCommand += `-o "${outputFile}"`;
  
  try {
    await execAsync(webpCommand);
  } catch (e) {
    // بديل
    const gifFile = outputFile.replace('.webp', '.gif');
    await execAsync(`convert -delay ${delay/10} -loop 0 ${frames.join(' ')} "${gifFile}"`);
    await execAsync(`convert "${gifFile}" "${outputFile}"`);
    await execAsync(`rm "${gifFile}"`);
  }
}

// بدء العملية
createCircleGlow();
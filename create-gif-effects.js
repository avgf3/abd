#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الإطارات
const framesDir = './client/public/frames';
const outputBaseDir = './gif-effects';

// إنشاء مجلدات للتأثيرات المختلفة
const effectDirs = {
  original: 'original-gif',
  glow: 'glow-effect',
  shadow: 'shadow-effect',
  animated: 'animated-effect',
  neon: 'neon-effect',
  blur: 'blur-effect',
  rainbow: 'rainbow-effect',
  pulse: 'pulse-effect'
};

// إنشاء المجلدات
Object.entries(effectDirs).forEach(([effect, dir]) => {
  const fullPath = path.join(outputBaseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

console.log('✨ سأقوم بتحويل الإطارات وتطبيق تأثيرات مختلفة عليها\n');
console.log('📁 التأثيرات المتاحة:');
console.log('1️⃣ Original - تحويل بدون تأثيرات');
console.log('2️⃣ Glow - تأثير التوهج');
console.log('3️⃣ Shadow - تأثير الظلال');
console.log('4️⃣ Animated - حركة متموجة');
console.log('5️⃣ Neon - تأثير النيون');
console.log('6️⃣ Blur - تأثير الضبابية');
console.log('7️⃣ Rainbow - تأثير قوس قزح');
console.log('8️⃣ Pulse - تأثير النبض\n');

// سأستخدم بعض الإطارات كأمثلة
const sampleFrames = [10, 15, 20, 25, 30, 35, 40];

async function applyEffects() {
  for (const frameNum of sampleFrames) {
    const inputPath = path.join(framesDir, `frame${frameNum}.png`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️ الإطار ${frameNum} غير موجود`);
      continue;
    }
    
    console.log(`\n🎨 معالجة الإطار ${frameNum}...`);
    
    // 1. تحويل عادي بأعلى جودة
    await applyEffect(
      inputPath, 
      frameNum, 
      'original',
      '-define png:preserve-colortype -define png:preserve-iCCP -colors 256 -dither FloydSteinberg'
    );
    
    // 2. تأثير التوهج
    await applyEffect(
      inputPath,
      frameNum,
      'glow',
      '-colors 256 -channel A -blur 0x8 -channel +A -compose screen -composite'
    );
    
    // 3. تأثير الظلال
    await applyEffect(
      inputPath,
      frameNum,
      'shadow',
      '\\( +clone -background black -shadow 80x3+5+5 \\) +swap -background none -layers merge +repage -colors 256'
    );
    
    // 4. حركة متموجة (سيتم تحويلها لاحقاً إلى GIF متحرك)
    await applyEffect(
      inputPath,
      frameNum,
      'animated',
      '-colors 256 -wave 10x100'
    );
    
    // 5. تأثير النيون
    await applyEffect(
      inputPath,
      frameNum,
      'neon',
      '-colors 256 -colorspace RGB -channel RGB -separate -edge 1 -negate -combine -colorspace sRGB'
    );
    
    // 6. تأثير الضبابية مع الحفاظ على الحواف
    await applyEffect(
      inputPath,
      frameNum,
      'blur',
      '-colors 256 -blur 0x2'
    );
    
    // 7. تأثير قوس قزح
    await applyEffect(
      inputPath,
      frameNum,
      'rainbow',
      '-colors 256 -modulate 100,150,100'
    );
    
    // 8. تأثير النبض (تكبير وتصغير)
    await applyEffect(
      inputPath,
      frameNum,
      'pulse',
      '-colors 256 -distort SRT 1.1'
    );
  }
  
  console.log('\n✅ تم الانتهاء من تطبيق التأثيرات!');
  console.log(`📁 الملفات محفوظة في: ${path.resolve(outputBaseDir)}`);
  
  // إنشاء بعض الـ GIF المتحركة كأمثلة
  await createAnimatedGifs();
}

async function applyEffect(inputPath, frameNum, effect, command) {
  return new Promise((resolve) => {
    const outputPath = path.join(outputBaseDir, effectDirs[effect], `frame${frameNum}.gif`);
    const fullCommand = `convert "${inputPath}" ${command} "${outputPath}"`;
    
    exec(fullCommand, (error) => {
      if (error) {
        console.log(`  ❌ ${effect}: فشل`);
      } else {
        console.log(`  ✅ ${effect}: تم`);
      }
      resolve();
    });
  });
}

async function createAnimatedGifs() {
  console.log('\n🎬 إنشاء أمثلة GIF متحركة...\n');
  
  // مثال 1: تأثير النبض المتحرك
  const pulseFrames = [];
  for (let i = 0; i < 10; i++) {
    const scale = 1 + (Math.sin(i * Math.PI / 5) * 0.1);
    pulseFrames.push(`\\( ./client/public/frames/frame20.png -distort SRT ${scale} \\)`);
  }
  
  const pulseCommand = `convert -delay 10 ${pulseFrames.join(' ')} -colors 256 -loop 0 ${path.join(outputBaseDir, 'animated-pulse.gif')}`;
  
  exec(pulseCommand, (error) => {
    if (error) {
      console.log('❌ فشل إنشاء GIF النبض');
    } else {
      console.log('✅ تم إنشاء animated-pulse.gif - نبض متحرك');
    }
  });
  
  // مثال 2: تأثير الدوران
  const rotateFrames = [];
  for (let i = 0; i < 12; i++) {
    const angle = i * 30;
    rotateFrames.push(`\\( ./client/public/frames/frame25.png -rotate ${angle} \\)`);
  }
  
  const rotateCommand = `convert -delay 8 ${rotateFrames.join(' ')} -colors 256 -loop 0 ${path.join(outputBaseDir, 'animated-rotate.gif')}`;
  
  exec(rotateCommand, (error) => {
    if (error) {
      console.log('❌ فشل إنشاء GIF الدوران');
    } else {
      console.log('✅ تم إنشاء animated-rotate.gif - دوران 360°');
    }
  });
  
  // مثال 3: تأثير التلاشي
  const fadeFrames = [];
  for (let i = 0; i <= 10; i++) {
    const opacity = i * 10;
    fadeFrames.push(`\\( ./client/public/frames/frame30.png -alpha set -channel A -evaluate set ${opacity}% \\)`);
  }
  
  const fadeCommand = `convert -delay 10 ${fadeFrames.join(' ')} -colors 256 -loop 0 ${path.join(outputBaseDir, 'animated-fade.gif')}`;
  
  exec(fadeCommand, (error) => {
    if (error) {
      console.log('❌ فشل إنشاء GIF التلاشي');
    } else {
      console.log('✅ تم إنشاء animated-fade.gif - تلاشي تدريجي');
    }
  });
}

// بدء تطبيق التأثيرات
exec('convert -version', (error) => {
  if (error) {
    console.log('خطأ: يجب تثبيت ImageMagick أولاً');
    process.exit(1);
  }
  
  applyEffects();
});
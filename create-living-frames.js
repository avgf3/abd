#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الإطارات
const framesDir = './client/public/frames';
const outputDir = './living-frames';

// إنشاء مجلد الإخراج
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎬 جعل الإطارات حية بحركات رائعة!\n');
console.log('━'.repeat(60));

// تعريف أنواع الحركات المختلفة
const animations = {
  // حركة النبض - قلب ينبض
  pulse: {
    name: '💓 نبض القلب',
    frames: 20,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 20; i++) {
        const scale = 1 + (Math.sin(i * Math.PI / 10) * 0.15);
        frames.push(`\\( "${input}" -gravity center -distort SRT "${scale}" \\)`);
      }
      return `convert -delay 5 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-pulse.gif"`;
    }
  },
  
  // حركة التنفس - شهيق وزفير
  breathe: {
    name: '🌬️ تنفس',
    frames: 30,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 30; i++) {
        const scale = 1 + (Math.sin(i * Math.PI / 15) * 0.08);
        const opacity = 85 + (Math.sin(i * Math.PI / 15) * 15);
        frames.push(`\\( "${input}" -gravity center -distort SRT "${scale}" -alpha set -channel A -evaluate set ${opacity}% \\)`);
      }
      return `convert -delay 6 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-breathe.gif"`;
    }
  },
  
  // حركة الرقص - يمين وشمال
  dance: {
    name: '💃 رقص',
    frames: 16,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 16; i++) {
        const rotation = Math.sin(i * Math.PI / 8) * 15;
        const moveX = Math.sin(i * Math.PI / 4) * 10;
        frames.push(`\\( "${input}" -distort SRT "${moveX},0 1 ${rotation}" \\)`);
      }
      return `convert -delay 6 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-dance.gif"`;
    }
  },
  
  // حركة القفز - صعود ونزول
  jump: {
    name: '🦘 قفز',
    frames: 20,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 20; i++) {
        let moveY = 0;
        if (i < 10) {
          moveY = -(i * i * 0.3); // صعود متسارع
        } else {
          moveY = -((20 - i) * (20 - i) * 0.3); // نزول متسارع
        }
        frames.push(`\\( "${input}" -distort SRT "0,${moveY} 1 0" \\)`);
      }
      return `convert -delay 4 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-jump.gif"`;
    }
  },
  
  // حركة الدوران 360
  spin: {
    name: '🌀 دوران',
    frames: 24,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 24; i++) {
        const angle = (i * 360 / 24);
        frames.push(`\\( "${input}" -distort SRT "${angle}" \\)`);
      }
      return `convert -delay 4 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-spin.gif"`;
    }
  },
  
  // حركة الاهتزاز
  shake: {
    name: '🫨 اهتزاز',
    frames: 12,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 12; i++) {
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;
        frames.push(`\\( "${input}" -distort SRT "${offsetX},${offsetY} 1 0" \\)`);
      }
      return `convert -delay 3 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-shake.gif"`;
    }
  },
  
  // حركة التموج
  wave: {
    name: '🌊 موجة',
    frames: 20,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 20; i++) {
        const amplitude = 10 + (i * 0.5);
        frames.push(`\\( "${input}" -wave ${amplitude}x200 \\)`);
      }
      return `convert -delay 5 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-wave.gif"`;
    }
  },
  
  // حركة البندول
  pendulum: {
    name: '🔔 بندول',
    frames: 20,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 20; i++) {
        const angle = Math.sin(i * Math.PI / 10) * 20;
        frames.push(`\\( "${input}" -distort SRT "0,-50 1 ${angle} 0,50" \\)`);
      }
      return `convert -delay 5 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-pendulum.gif"`;
    }
  },
  
  // حركة الومضة
  blink: {
    name: '✨ ومضة',
    frames: 15,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 15; i++) {
        let opacity = 100;
        if (i === 7 || i === 8) opacity = 0;
        else if (i === 6 || i === 9) opacity = 50;
        frames.push(`\\( "${input}" -alpha set -channel A -evaluate set ${opacity}% \\)`);
      }
      return `convert -delay 8 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-blink.gif"`;
    }
  },
  
  // حركة الطيران
  fly: {
    name: '🦋 طيران',
    frames: 30,
    create: (input, frameNum, outputBase) => {
      const frames = [];
      for (let i = 0; i < 30; i++) {
        const x = i * 10 - 150;
        const y = Math.sin(i * Math.PI / 5) * 30;
        const rotation = Math.sin(i * Math.PI / 10) * 10;
        frames.push(`\\( "${input}" -distort SRT "${x},${y} 1 ${rotation}" \\)`);
      }
      return `convert -delay 4 -loop 0 ${frames.join(' ')} -colors 256 "${outputBase}-fly.gif"`;
    }
  }
};

// تطبيق الحركات على الإطارات
async function createLivingFrames() {
  // سأطبق على بعض الإطارات كأمثلة
  const sampleFrames = [10, 15, 20, 25, 30, 35, 40];
  
  console.log(`🎯 سأطبق ${Object.keys(animations).length} حركة مختلفة على الإطارات\n`);
  
  for (const frameNum of sampleFrames) {
    const inputPath = path.join(framesDir, `frame${frameNum}.png`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️ الإطار ${frameNum} غير موجود`);
      continue;
    }
    
    console.log(`\n📸 الإطار ${frameNum}:`);
    console.log('─'.repeat(40));
    
    const outputBase = path.join(outputDir, `frame${frameNum}`);
    
    // تطبيق كل حركة
    for (const [animType, animation] of Object.entries(animations)) {
      try {
        const command = animation.create(inputPath, frameNum, outputBase);
        await execAsync(command);
        console.log(`  ✅ ${animation.name}`);
      } catch (error) {
        console.log(`  ❌ ${animation.name} - فشل`);
      }
    }
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('✨ تم إنشاء الإطارات الحية بنجاح!');
  console.log(`📁 الملفات محفوظة في: ${path.resolve(outputDir)}`);
  console.log('\n💡 كل إطار له الآن 10 حركات مختلفة:');
  Object.entries(animations).forEach(([type, anim]) => {
    console.log(`   • ${anim.name} (${type}.gif)`);
  });
  
  // إنشاء صفحة HTML للمعاينة
  createPreviewHTML();
}

// إنشاء صفحة معاينة HTML
function createPreviewHTML() {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>معاينة الإطارات الحية</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: #fff;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            color: #ffd700;
            margin-bottom: 40px;
        }
        .frame-section {
            margin-bottom: 60px;
            background: #2a2a2a;
            padding: 20px;
            border-radius: 10px;
        }
        .frame-title {
            font-size: 24px;
            color: #4a9eff;
            margin-bottom: 20px;
            text-align: center;
        }
        .animations-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .animation-item {
            text-align: center;
            background: #3a3a3a;
            padding: 15px;
            border-radius: 8px;
            transition: transform 0.3s;
        }
        .animation-item:hover {
            transform: scale(1.05);
        }
        .animation-item img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
        }
        .animation-name {
            margin-top: 10px;
            font-size: 16px;
            color: #ffd700;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 معاينة الإطارات الحية</h1>
        ${[10, 15, 20, 25, 30, 35, 40].map(frameNum => `
        <div class="frame-section">
            <h2 class="frame-title">الإطار ${frameNum}</h2>
            <div class="animations-grid">
                ${Object.entries(animations).map(([type, anim]) => `
                <div class="animation-item">
                    <img src="frame${frameNum}-${type}.gif" alt="${anim.name}">
                    <div class="animation-name">${anim.name}</div>
                </div>
                `).join('')}
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(outputDir, 'preview.html'), html);
  console.log('\n🌐 تم إنشاء صفحة معاينة: living-frames/preview.html');
}

// بدء العملية
exec('convert -version', (error) => {
  if (error) {
    console.log('خطأ: يجب تثبيت ImageMagick أولاً');
    process.exit(1);
  }
  
  createLivingFrames();
});
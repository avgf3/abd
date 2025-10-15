#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const inputFile = './webp-frames-hq/frame42.webp';
const outputDir = './live-effects';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('⚡ تطبيق تأثيرات حية مباشرة\n');

async function apply() {
  try {
    // 1. نبض
    console.log('1️⃣ نبض متحرك...');
    await execAsync(`convert "${inputFile}" \\( +clone -resize 95% \\) \\( +clone -resize 105% \\) \\( +clone -resize 95% \\) -delete 0 -loop 0 -delay 20 "${outputDir}/pulse.webp"`);
    
    // 2. وميض
    console.log('2️⃣ وميض...');
    await execAsync(`convert "${inputFile}" \\( +clone -modulate 120 \\) \\( +clone -modulate 80 \\) -loop 0 -delay 15 "${outputDir}/flash.webp"`);
    
    // 3. اهتزاز
    console.log('3️⃣ اهتزاز...');
    await execAsync(`convert "${inputFile}" \\( +clone -roll +3+0 \\) \\( +clone -roll -3+0 \\) \\( +clone -roll 0+3 \\) \\( +clone -roll 0-3 \\) -loop 0 -delay 5 "${outputDir}/shake.webp"`);
    
    // 4. دوران بسيط
    console.log('4️⃣ دوران...');
    let rotateCmd = 'convert -delay 10 -loop 0 ';
    for (let i = 0; i < 36; i++) {
      rotateCmd += `\\( "${inputFile}" -background none -rotate ${i * 10} \\) `;
    }
    rotateCmd += `"${outputDir}/rotate.webp"`;
    await execAsync(rotateCmd);
    
    // 5. توهج
    console.log('5️⃣ توهج...');
    await execAsync(`convert "${inputFile}" \\
      \\( +clone -blur 0x5 -evaluate multiply 1.2 \\) \\
      \\( +clone -blur 0x10 -evaluate multiply 0.8 \\) \\
      -delete 0 -loop 0 -delay 30 "${outputDir}/glow.webp"`);
    
    console.log('\n✅ تم!');
    console.log(`📁 الملفات في: ${outputDir}/`);
    
    // عرض الأحجام
    const files = fs.readdirSync(outputDir);
    console.log('\n📊 الملفات المنشأة:');
    for (const file of files) {
      const stats = fs.statSync(`${outputDir}/${file}`);
      console.log(`   • ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
    }
    
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

apply();
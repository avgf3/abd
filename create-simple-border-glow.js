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
const outputDir = './border-glow';

// إنشاء المجلد
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('✨ إنشاء وميض متحرك على حدود الإطار الدائري\n');

async function createBorderGlow() {
  try {
    // أولاً: نحتاج لمعرفة إذا كان الإطار دائري أم لا
    // سأفترض أنه دائري وأطبق التأثير على الحواف
    
    console.log('🎨 إنشاء تأثير الوميض...\n');
    
    // إنشاء GIF مباشرة بتأثير بسيط
    const frames = 20;
    let convertCommand = 'convert -delay 5 -loop 0 ';
    
    for (let i = 0; i < frames; i++) {
      const intensity = Math.sin(i / frames * Math.PI * 2) * 0.5 + 0.5;
      const strokeWidth = 2 + intensity * 6;
      const blur = 3 + intensity * 7;
      
      convertCommand += `\\( "${inputFile}" `;
      convertCommand += `-bordercolor "rgba(150,200,255,${intensity})" `;
      convertCommand += `-border ${strokeWidth} `;
      convertCommand += `-blur 0x${blur} `;
      convertCommand += `\\) `;
    }
    
    const outputGif = path.join(outputDir, 'frame42-border-glow.gif');
    convertCommand += outputGif;
    
    await execAsync(convertCommand);
    
    // تحويل GIF إلى WebP
    const outputWebP = path.join(outputDir, 'frame42-border-glow.webp');
    await execAsync(`convert "${outputGif}" "${outputWebP}"`);
    
    // إنشاء نسخة أخرى بتأثير دوار
    console.log('🌀 إنشاء توهج دوار...\n');
    
    let rotateCommand = 'convert -delay 3 -loop 0 ';
    
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * 360;
      
      rotateCommand += `\\( "${inputFile}" `;
      rotateCommand += `-background none `;
      rotateCommand += `\\( +clone -alpha extract `;
      rotateCommand += `-morphology EdgeOut Diamond `;
      rotateCommand += `-blur 0x5 `;
      rotateCommand += `-shade ${angle}x30 `;
      rotateCommand += `-fill "rgb(150,200,255)" -tint 100 `;
      rotateCommand += `\\) -compose Screen -composite `;
      rotateCommand += `\\) `;
    }
    
    const rotateGif = path.join(outputDir, 'frame42-rotate-glow.gif');
    rotateCommand += rotateGif;
    
    await execAsync(rotateCommand);
    
    const rotateWebP = path.join(outputDir, 'frame42-rotate-glow.webp');
    await execAsync(`convert "${rotateGif}" "${rotateWebP}"`);
    
    // الحصول على أحجام الملفات
    const files = [
      { name: 'frame42-border-glow.webp', desc: 'نبض متوهج' },
      { name: 'frame42-rotate-glow.webp', desc: 'توهج دوار' }
    ];
    
    console.log('━'.repeat(60));
    console.log('✅ تم إنشاء التأثيرات بنجاح!\n');
    console.log('📁 الملفات المنشأة:');
    
    for (const file of files) {
      const filePath = path.join(outputDir, file.name);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   • ${file.name} - ${file.desc} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    }
    
    console.log('\n🌟 التأثيرات:');
    console.log('   • وميض نابض على حدود الإطار');
    console.log('   • توهج دوار حول الإطار');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

createBorderGlow();
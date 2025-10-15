#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createModernGlow() {
  console.log('✨ تطبيق تأثير الوهج الراقي الحديث...\n');
  
  const input = 'test-frame.png';
  const output = 'modern-glow.webp';
  
  // إنشاء 15 إطار للحركة الناعمة
  const frames = [];
  
  for (let i = 0; i < 15; i++) {
    const frame = `temp_${i}.png`;
    const glowIntensity = 0.3 + 0.2 * Math.sin(i * Math.PI / 7.5);
    const glowSize = 15 + 10 * Math.sin(i * Math.PI / 7.5);
    
    // تأثير وهج ناعم وراقي
    await execAsync(`convert "${input}" \\
      \\( +clone \\
         -channel A -morphology Distance Euclidean:1,30 +channel \\
         -blur 0x${glowSize} \\
         -evaluate multiply ${glowIntensity} \\
         -fill "rgba(180,200,255,0.6)" -colorize 30% \\
      \\) \\
      -compose Screen -composite \\
      \\( +clone \\
         -alpha extract \\
         -morphology EdgeOut Diamond \\
         -blur 0x3 \\
         -evaluate multiply ${glowIntensity * 0.8} \\
         -fill "rgba(220,230,255,0.8)" -colorize 50% \\
      \\) \\
      -compose Screen -composite \\
      "${frame}"`);
    
    frames.push(frame);
  }
  
  // تجميع الإطارات في WebP متحرك
  let cmd = 'img2webp -loop 0 -lossless ';
  frames.forEach(f => cmd += `-d 100 ${f} `);
  cmd += `-o ${output}`;
  
  try {
    await execAsync(cmd);
  } catch (e) {
    // بديل
    await execAsync(`convert -delay 10 -loop 0 ${frames.join(' ')} temp.gif`);
    await execAsync(`convert temp.gif -quality 98 ${output}`);
    await execAsync('rm temp.gif');
  }
  
  // تنظيف
  await execAsync(`rm temp_*.png`);
  
  console.log('✅ تم إنشاء تأثير الوهج الراقي!');
  console.log(`📁 الملف: ${output}`);
  console.log('\n🌟 مواصفات التأثير:');
  console.log('   • وهج ناعم ومتدرج');
  console.log('   • حركة سلسة وهادئة');
  console.log('   • ألوان زرقاء فاتحة راقية');
  console.log('   • لا يؤثر على ألوان الصورة الأصلية');
}

createModernGlow().catch(console.error);
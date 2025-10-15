#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

// الملف الأصلي
const inputFile = './webp-frames-hq/frame42.webp';
const outputDir = './animated-frames';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎯 تطبيق تأثيرات حية مباشرة على الإطار\n');

async function applyLiveEffects() {
  // 1. تأثير Cinemagraph - حركة جزئية في الصورة
  console.log('1️⃣ تأثير الحركة الجزئية...');
  await execAsync(`convert "${inputFile}" -duplicate 19 -morph 5 -loop 0 "${outputDir}/frame42-morph.gif"`);
  await execAsync(`convert "${outputDir}/frame42-morph.gif" "${outputDir}/frame42-morph.webp"`);
  
  // 2. تأثير Glitch
  console.log('2️⃣ تأثير Glitch...');
  await execAsync(`convert "${inputFile}" \\
    \\( +clone -channel RGB -separate +channel -delay 5 \\) \\
    \\( +clone -roll +5+0 -delay 5 \\) \\
    \\( +clone -roll -5+0 -delay 5 \\) \\
    -delete 0 -loop 0 "${outputDir}/frame42-glitch.gif"`);
  await execAsync(`convert "${outputDir}/frame42-glitch.gif" "${outputDir}/frame42-glitch.webp"`);
  
  // 3. تأثير Pulse/Zoom
  console.log('3️⃣ تأثير النبض...');
  await execAsync(`convert "${inputFile}" -duplicate 9 \\
    -distort SRT "%[fx:w/2],%[fx:h/2] 1,%[fx:1+0.05*sin(2*pi*t/n)] 0" \\
    -loop 0 "${outputDir}/frame42-pulse.gif"`);
  await execAsync(`convert "${outputDir}/frame42-pulse.gif" "${outputDir}/frame42-pulse.webp"`);
  
  // 4. تأثير الدوران
  console.log('4️⃣ تأثير الدوران...');
  await execAsync(`convert "${inputFile}" -duplicate 35 -distort SRT "%[fx:t*10]" \\
    -loop 0 "${outputDir}/frame42-spin.gif"`);
  await execAsync(`convert "${outputDir}/frame42-spin.gif" "${outputDir}/frame42-spin.webp"`);
  
  // 5. تأثير Wave
  console.log('5️⃣ تأثير الموجة...');
  await execAsync(`convert "${inputFile}" -duplicate 19 \\
    -distort Wave "%[fx:20*sin(2*pi*t/n)],200" \\
    -loop 0 "${outputDir}/frame42-wave.gif"`);
  await execAsync(`convert "${outputDir}/frame42-wave.gif" "${outputDir}/frame42-wave.webp"`);
  
  // حذف ملفات GIF المؤقتة
  await execAsync(`rm ${outputDir}/*.gif`);
  
  console.log('\n✅ تم تطبيق جميع التأثيرات!');
  console.log(`📁 الملفات في: ${outputDir}/`);
}

applyLiveEffects().catch(console.error);
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

console.log('⚡ إنشاء تأثير البرق اللامع على الإطار 42\n');
console.log('━'.repeat(60));

async function createLightningEffect() {
  try {
    // أولاً: الحصول على أبعاد الصورة
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${inputFile}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    console.log(`📐 أبعاد الإطار: ${width}x${height}`);
    console.log('\n🎨 إنشاء تأثير البرق...\n');
    
    // عدد الإطارات للحركة
    const totalFrames = 30;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const progress = i / (totalFrames - 1);
      
      // حساب موقع البرق
      const yPos = height * (1 - progress);
      
      // حساب الشفافية والسطوع
      let opacity = 0;
      let blur = 0;
      
      if (progress < 0.3) {
        // البداية - ظهور تدريجي
        opacity = (progress / 0.3) * 100;
        blur = 3;
      } else if (progress < 0.7) {
        // المنتصف - أقصى سطوع
        opacity = 100;
        blur = 2;
      } else {
        // النهاية - اختفاء تدريجي
        opacity = ((1 - progress) / 0.3) * 100;
        blur = 4;
      }
      
      // إنشاء إطار مع تأثير البرق
      const framePath = path.join(tempDir, `frame${String(i).padStart(3, '0')}.png`);
      
      // أمر ImageMagick المعقد لإنشاء البرق
      const command = `convert "${inputFile}" \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke "rgba(255,255,255,${opacity/100})" -fill none -strokewidth 3 \\
           -draw "path 'M ${width*0.3},${height} Q ${width*0.4},${yPos + height*0.2} ${width*0.5},${yPos}'" \\
           -draw "path 'M ${width*0.7},${height} Q ${width*0.6},${yPos + height*0.2} ${width*0.5},${yPos}'" \\
           -blur 0x${blur} \\
        \\) \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke "rgba(100,200,255,${opacity*0.8/100})" -fill none -strokewidth 5 \\
           -draw "path 'M ${width*0.3},${height} Q ${width*0.4},${yPos + height*0.2} ${width*0.5},${yPos}'" \\
           -draw "path 'M ${width*0.7},${height} Q ${width*0.6},${yPos + height*0.2} ${width*0.5},${yPos}'" \\
           -blur 0x${blur + 2} \\
        \\) \\
        \\( -size ${width}x${height} xc:transparent \\
           -stroke "rgba(150,220,255,${opacity*0.5/100})" -fill none -strokewidth 8 \\
           -draw "path 'M ${width*0.3},${height} Q ${width*0.4},${yPos + height*0.2} ${width*0.5},${yPos}'" \\
           -draw "path 'M ${width*0.7},${height} Q ${width*0.6},${yPos + height*0.2} ${width*0.5},${yPos}'" \\
           -blur 0x${blur + 4} \\
        \\) \\
        -compose screen -composite \\
        -compose screen -composite \\
        -compose screen -composite \\
        "${framePath}"`;
      
      await execAsync(command);
      frames.push(framePath);
      
      // شريط التقدم
      const progressBar = '█'.repeat(Math.floor(progress * 30)) + '░'.repeat(30 - Math.floor(progress * 30));
      process.stdout.write(`\r  التقدم: [${progressBar}] ${Math.floor(progress * 100)}%`);
    }
    
    console.log('\n\n✅ تم إنشاء جميع الإطارات');
    console.log('\n🎬 تجميع الإطارات في WebP متحرك...');
    
    // تحويل إلى WebP متحرك
    const outputFile = path.join(outputDir, 'frame42-lightning.webp');
    const webpCommand = `img2webp -loop 0 -d 50 ${frames.join(' ')} -o "${outputFile}"`;
    
    await execAsync(webpCommand);
    
    // إنشاء نسخة GIF أيضاً للمعاينة السريعة
    const gifFile = path.join(outputDir, 'frame42-lightning.gif');
    const gifCommand = `convert -delay 5 -loop 0 ${frames.join(' ')} "${gifFile}"`;
    
    await execAsync(gifCommand);
    
    // تنظيف الملفات المؤقتة
    await execAsync(`rm -rf ${tempDir}`);
    
    // الحصول على معلومات الملفات
    const webpStats = fs.statSync(outputFile);
    const gifStats = fs.statSync(gifFile);
    
    console.log('\n' + '━'.repeat(60));
    console.log('✨ تم إنشاء تأثير البرق بنجاح!\n');
    console.log('📁 الملفات المنشأة:');
    console.log(`   • WebP متحرك: ${outputFile} (${(webpStats.size / 1024).toFixed(1)} KB)`);
    console.log(`   • GIF للمعاينة: ${gifFile} (${(gifStats.size / 1024).toFixed(1)} KB)`);
    console.log('\n⚡ خصائص التأثير:');
    console.log('   • برق مزدوج يبدأ من الأسفل');
    console.log('   • يلتقي الخطان في الأعلى');
    console.log('   • توهج أزرق-أبيض لامع');
    console.log('   • حركة سلسة مع 30 إطار');
    console.log('━'.repeat(60));
    
    // إنشاء صفحة معاينة HTML
    createPreviewHTML(outputFile, gifFile);
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  }
}

function createPreviewHTML(webpFile, gifFile) {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>معاينة تأثير البرق - الإطار 42</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0a0a0a;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            flex-direction: column;
        }
        .container {
            text-align: center;
            padding: 20px;
        }
        h1 {
            color: #4a9eff;
            margin-bottom: 30px;
        }
        .preview-box {
            display: inline-block;
            margin: 20px;
            padding: 20px;
            background: #1a1a1a;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(74, 158, 255, 0.5);
        }
        .preview-box img {
            max-width: 400px;
            height: auto;
            border-radius: 5px;
        }
        .label {
            margin-top: 10px;
            color: #ffd700;
            font-size: 18px;
        }
        .info {
            margin-top: 30px;
            padding: 20px;
            background: #2a2a2a;
            border-radius: 10px;
            max-width: 600px;
        }
        .lightning-icon {
            font-size: 30px;
            animation: flash 2s infinite;
        }
        @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><span class="lightning-icon">⚡</span> تأثير البرق على الإطار 42 <span class="lightning-icon">⚡</span></h1>
        
        <div class="preview-box">
            <img src="${path.basename(webpFile)}" alt="WebP Animation">
            <div class="label">WebP متحرك (جودة عالية)</div>
        </div>
        
        <div class="preview-box">
            <img src="${path.basename(gifFile)}" alt="GIF Animation">
            <div class="label">GIF للمعاينة السريعة</div>
        </div>
        
        <div class="info">
            <h2>معلومات التأثير</h2>
            <p>• برق مزدوج يبدأ من الأسفل ويلتقي في الأعلى</p>
            <p>• توهج أزرق-أبيض لامع مع طبقات متعددة</p>
            <p>• 30 إطار لحركة سلسة</p>
            <p>• تأثير الظهور والاختفاء التدريجي</p>
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(outputDir, 'preview.html'), html);
  console.log('\n🌐 صفحة المعاينة: lightning-effect/preview.html');
}

// بدء العملية
createLightningEffect();
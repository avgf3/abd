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
    // أولاً: تحويل WebP إلى PNG للعمل معه
    const basePng = path.join(tempDir, 'base.png');
    await execAsync(`convert "${inputFile}" "${basePng}"`);
    
    // الحصول على أبعاد الصورة
    const { stdout: dimensions } = await execAsync(`identify -format "%wx%h" "${basePng}"`);
    const [width, height] = dimensions.trim().split('x').map(Number);
    
    console.log(`📐 أبعاد الإطار: ${width}x${height}`);
    console.log('\n🎨 إنشاء تأثير البرق...\n');
    
    // عدد الإطارات للحركة
    const totalFrames = 30;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const progress = i / (totalFrames - 1);
      
      // حساب موقع البرق
      const yPos = height - (height * progress);
      
      // حساب الشفافية والسطوع
      let intensity = 0;
      let glowSize = 0;
      
      if (progress < 0.2) {
        // البداية - ظهور تدريجي
        intensity = (progress / 0.2);
        glowSize = 15;
      } else if (progress < 0.8) {
        // المنتصف - أقصى سطوع
        intensity = 1;
        glowSize = 20;
      } else {
        // النهاية - اختفاء مع وميض
        intensity = (1 - progress) / 0.2;
        glowSize = 25;
      }
      
      // إنشاء إطار مع تأثير البرق
      const framePath = path.join(tempDir, `frame${String(i).padStart(3, '0')}.png`);
      
      // أمر مبسط ومحسّن
      const command = `convert "${basePng}" \\
        \\( +clone -fill black -colorize 100% \\
           -stroke white -strokewidth 2 \\
           -draw "path 'M ${width*0.3},${height} Q ${width*0.4},${yPos + height*0.1} ${width*0.5},${yPos}'" \\
           -draw "path 'M ${width*0.7},${height} Q ${width*0.6},${yPos + height*0.1} ${width*0.5},${yPos}'" \\
           -blur 0x3 \\
           -stroke "rgba(100,200,255,0.8)" -strokewidth 4 \\
           -draw "path 'M ${width*0.3},${height} Q ${width*0.4},${yPos + height*0.1} ${width*0.5},${yPos}'" \\
           -draw "path 'M ${width*0.7},${height} Q ${width*0.6},${yPos + height*0.1} ${width*0.5},${yPos}'" \\
           -blur 0x${glowSize} \\
           -evaluate multiply ${intensity} \\
        \\) \\
        -compose screen -composite \\
        "${framePath}"`;
      
      await execAsync(command);
      frames.push(framePath);
      
      // شريط التقدم
      const progressBar = '█'.repeat(Math.floor(progress * 30)) + '░'.repeat(30 - Math.floor(progress * 30));
      process.stdout.write(`\r  التقدم: [${progressBar}] ${Math.floor(progress * 100)}%`);
    }
    
    console.log('\n\n✅ تم إنشاء جميع الإطارات');
    
    // إنشاء GIF أولاً للتأكد من نجاح العملية
    console.log('\n🎬 إنشاء GIF متحرك...');
    const gifFile = path.join(outputDir, 'frame42-lightning.gif');
    const gifCommand = `convert -delay 3 -loop 0 ${frames.join(' ')} "${gifFile}"`;
    await execAsync(gifCommand);
    
    // محاولة إنشاء WebP متحرك
    console.log('\n🎬 تحويل إلى WebP متحرك...');
    const outputFile = path.join(outputDir, 'frame42-lightning.webp');
    
    try {
      // محاولة استخدام img2webp
      const webpCommand = `img2webp -loop 0 -d 30 ${frames.join(' ')} -o "${outputFile}"`;
      await execAsync(webpCommand);
    } catch (e) {
      // إذا فشل، استخدم طريقة بديلة
      console.log('⚠️  استخدام طريقة بديلة لإنشاء WebP...');
      // تحويل GIF إلى WebP
      await execAsync(`convert "${gifFile}" -quality 95 "${outputFile}"`);
    }
    
    // تنظيف الملفات المؤقتة
    await execAsync(`rm -rf ${tempDir}`);
    
    // الحصول على معلومات الملفات
    const gifStats = fs.statSync(gifFile);
    let webpStats = null;
    if (fs.existsSync(outputFile)) {
      webpStats = fs.statSync(outputFile);
    }
    
    console.log('\n' + '━'.repeat(60));
    console.log('✨ تم إنشاء تأثير البرق بنجاح!\n');
    console.log('📁 الملفات المنشأة:');
    console.log(`   • GIF متحرك: ${gifFile} (${(gifStats.size / 1024).toFixed(1)} KB)`);
    if (webpStats) {
      console.log(`   • WebP متحرك: ${outputFile} (${(webpStats.size / 1024).toFixed(1)} KB)`);
    }
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
            text-shadow: 0 0 20px rgba(74, 158, 255, 0.5);
        }
        .preview-box {
            display: inline-block;
            margin: 20px;
            padding: 20px;
            background: #1a1a1a;
            border-radius: 10px;
            box-shadow: 0 0 30px rgba(74, 158, 255, 0.3);
            transition: transform 0.3s;
        }
        .preview-box:hover {
            transform: scale(1.05);
            box-shadow: 0 0 40px rgba(74, 158, 255, 0.5);
        }
        .preview-box img {
            max-width: 400px;
            height: auto;
            border-radius: 5px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
        .label {
            margin-top: 15px;
            color: #ffd700;
            font-size: 20px;
            font-weight: bold;
        }
        .info {
            margin-top: 30px;
            padding: 20px;
            background: #2a2a2a;
            border-radius: 10px;
            max-width: 600px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
        .lightning-icon {
            font-size: 40px;
            animation: flash 2s infinite;
            display: inline-block;
        }
        @keyframes flash {
            0%, 100% { 
                opacity: 1; 
                transform: scale(1);
                filter: drop-shadow(0 0 10px #4a9eff);
            }
            50% { 
                opacity: 0.3; 
                transform: scale(0.9);
                filter: drop-shadow(0 0 5px #4a9eff);
            }
        }
        h2 {
            color: #4a9eff;
            margin-bottom: 15px;
        }
        p {
            margin: 10px 0;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><span class="lightning-icon">⚡</span> تأثير البرق على الإطار 42 <span class="lightning-icon">⚡</span></h1>
        
        <div class="preview-box">
            <img src="${path.basename(gifFile)}" alt="Lightning Animation">
            <div class="label">تأثير البرق المتحرك</div>
        </div>
        
        <div class="info">
            <h2>⚡ مواصفات التأثير</h2>
            <p>• برق مزدوج يبدأ من الأسفل ويلتقي في الأعلى</p>
            <p>• توهج أزرق-أبيض لامع مع تأثير الإضاءة</p>
            <p>• 30 إطار لحركة سلسة ومستمرة</p>
            <p>• تأثير الظهور والاختفاء التدريجي</p>
            <p>• حجم محسّن للويب مع جودة عالية</p>
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(outputDir, 'preview.html'), html);
  console.log('\n🌐 صفحة المعاينة: lightning-effect/preview.html');
}

// بدء العملية
createLightningEffect();
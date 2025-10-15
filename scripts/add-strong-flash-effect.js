import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FRAMES_DIR = join(__dirname, '../client/public/frames');
const OUTPUT_DIR = join(__dirname, '../client/public/frames');
const START_FRAME = 10;
const END_FRAME = 42;

// إعدادات تأثير الوميض القوي
const FLASH_SETTINGS = {
  brightness: 1.25,      // زيادة السطوع 25%
  saturation: 1.15,      // زيادة التشبع 15%
  lightness: 10,         // إضاءة أقوى
  glowBlur: 12,          // ضبابية التوهج
  glowBrightness: 1.8,   // سطوع التوهج
  glowOpacity: 0.45,     // شفافية التوهج 45%
  sharpen: 0.8,          // حدة أقوى
};

/**
 * إضافة تأثير وميض قوي ولامع على الإطار
 * @param {number} frameNumber - رقم الإطار
 */
async function addStrongFlashEffect(frameNumber) {
  const inputPath = join(FRAMES_DIR, `frame${frameNumber}.png`);
  const outputPath = join(OUTPUT_DIR, `frame${frameNumber}.png`);
  
  if (!existsSync(inputPath)) {
    console.log(`⚠️  الإطار ${frameNumber} غير موجود`);
    return;
  }

  try {
    console.log(`🔄 إضافة وميض قوي للإطار ${frameNumber}...`);
    
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // 1. تحسين الصورة الأساسية بسطوع وتشبع أعلى
    const enhancedImage = await image
      .modulate({
        brightness: FLASH_SETTINGS.brightness,
        saturation: FLASH_SETTINGS.saturation,
        lightness: FLASH_SETTINGS.lightness
      })
      .sharpen({
        sigma: FLASH_SETTINGS.sharpen,
      })
      .toBuffer();
    
    // 2. إنشاء تأثير توهج قوي
    const strongGlow = await sharp(inputPath)
      .blur(FLASH_SETTINGS.glowBlur)
      .modulate({
        brightness: FLASH_SETTINGS.glowBrightness,
        saturation: 1.3
      })
      .toBuffer();
    
    // 3. إنشاء تأثير وميض إضافي (sparkle effect)
    const sparkle = await sharp(inputPath)
      .blur(4)
      .modulate({
        brightness: 2.0,
        saturation: 1.4
      })
      .toBuffer();
    
    // 4. دمج جميع الطبقات لإنشاء تأثير وميض متعدد الطبقات
    await sharp(enhancedImage)
      .composite([
        {
          input: strongGlow,
          blend: 'screen',
          opacity: FLASH_SETTINGS.glowOpacity
        },
        {
          input: sparkle,
          blend: 'lighten',
          opacity: 0.2
        }
      ])
      .png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toFile(outputPath);
    
    console.log(`✨ تم إضافة وميض قوي للإطار ${frameNumber}`);
  } catch (error) {
    console.error(`❌ خطأ في معالجة الإطار ${frameNumber}:`, error.message);
  }
}

/**
 * معالجة جميع الإطارات
 */
async function processAllFrames() {
  console.log('✨ بدء إضافة تأثير الوميض القوي على الإطارات من 10 إلى 42...\n');
  console.log('⚙️  الإعدادات:');
  console.log(`   - سطوع: ${FLASH_SETTINGS.brightness}x`);
  console.log(`   - تشبع: ${FLASH_SETTINGS.saturation}x`);
  console.log(`   - توهج: ${FLASH_SETTINGS.glowOpacity * 100}%\n`);
  
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  for (let i = START_FRAME; i <= END_FRAME; i++) {
    await addStrongFlashEffect(i);
  }
  
  console.log('\n🎉 تمت معالجة جميع الإطارات بنجاح!');
  console.log(`📁 الملفات المحفوظة في: ${OUTPUT_DIR}`);
  console.log('\n💡 نصيحة: إذا كان التأثير قوياً جداً، استخدم add-flash-effect-to-frames.js للحصول على تأثير أخف');
}

// تشغيل السكريبت
processAllFrames().catch(console.error);

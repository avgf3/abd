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

/**
 * إضافة تأثير وميض/فلاش على الإطار
 * @param {number} frameNumber - رقم الإطار
 */
async function addFlashEffectToFrame(frameNumber) {
  const inputPath = join(FRAMES_DIR, `frame${frameNumber}.png`);
  const outputPath = join(OUTPUT_DIR, `frame${frameNumber}.png`);
  
  if (!existsSync(inputPath)) {
    console.log(`⚠️  الإطار ${frameNumber} غير موجود`);
    return;
  }

  try {
    console.log(`🔄 معالجة الإطار ${frameNumber}...`);
    
    // قراءة الصورة الأصلية
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // إنشاء طبقة وميض شفافة بتأثير لامع
    // نستخدم modulate لزيادة السطوع والتشبع قليلاً لإضافة تأثير لامع
    const enhancedImage = await image
      .modulate({
        brightness: 1.15,  // زيادة السطوع بنسبة 15%
        saturation: 1.1,   // زيادة التشبع بنسبة 10%
        lightness: 5       // إضافة إضاءة خفيفة
      })
      .sharpen({
        sigma: 0.5,        // حدة خفيفة لإبراز التفاصيل
      })
      .toBuffer();
    
    // إنشاء تأثير توهج خفيف على الحواف
    const glowEffect = await sharp(inputPath)
      .blur(8)             // ضبابية لإنشاء توهج
      .modulate({
        brightness: 1.5,   // توهج ساطع
        saturation: 1.2
      })
      .toBuffer();
    
    // دمج الطبقات: الصورة المحسنة + تأثير التوهج الخفيف
    await sharp(enhancedImage)
      .composite([
        {
          input: glowEffect,
          blend: 'screen',   // مزج بطريقة screen لإضافة إضاءة
          opacity: 0.3       // شفافية 30% للتوهج
        }
      ])
      .png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toFile(outputPath);
    
    console.log(`✅ تم معالجة الإطار ${frameNumber} بنجاح`);
  } catch (error) {
    console.error(`❌ خطأ في معالجة الإطار ${frameNumber}:`, error.message);
  }
}

/**
 * معالجة جميع الإطارات من 10 إلى 42
 */
async function processAllFrames() {
  console.log('🚀 بدء إضافة تأثير الوميض على الإطارات من 10 إلى 42...\n');
  
  // التأكد من وجود مجلد الإخراج
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // معالجة كل إطار على حدة
  for (let i = START_FRAME; i <= END_FRAME; i++) {
    await addFlashEffectToFrame(i);
  }
  
  console.log('\n✨ تمت معالجة جميع الإطارات بنجاح!');
  console.log(`📁 الملفات المحفوظة في: ${OUTPUT_DIR}`);
}

// تشغيل السكريبت
processAllFrames().catch(console.error);

import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FRAMES_DIR = join(__dirname, '../client/public/frames');
const BACKUP_DIR = join(__dirname, '../client/public/frames-backup');
const START_FRAME = 10;
const END_FRAME = 42;

/**
 * نسخ احتياطي للإطارات الأصلية
 */
function backupOriginalFrames() {
  console.log('🔄 بدء النسخ الاحتياطي للإطارات الأصلية...\n');
  
  // إنشاء مجلد النسخ الاحتياطي
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 تم إنشاء مجلد النسخ الاحتياطي: ${BACKUP_DIR}\n`);
  }
  
  let successCount = 0;
  let skipCount = 0;
  
  for (let i = START_FRAME; i <= END_FRAME; i++) {
    const sourcePath = join(FRAMES_DIR, `frame${i}.png`);
    const backupPath = join(BACKUP_DIR, `frame${i}.png`);
    
    if (!existsSync(sourcePath)) {
      console.log(`⚠️  الإطار ${i} غير موجود - تخطي`);
      skipCount++;
      continue;
    }
    
    try {
      copyFileSync(sourcePath, backupPath);
      console.log(`✅ تم نسخ الإطار ${i}`);
      successCount++;
    } catch (error) {
      console.error(`❌ خطأ في نسخ الإطار ${i}:`, error.message);
    }
  }
  
  console.log(`\n✨ اكتمل النسخ الاحتياطي!`);
  console.log(`📊 الإحصائيات:`);
  console.log(`   - تم نسخ: ${successCount} إطار`);
  console.log(`   - تم تخطي: ${skipCount} إطار`);
  console.log(`📁 النسخ الاحتياطية في: ${BACKUP_DIR}`);
}

// تشغيل السكريبت
backupOriginalFrames();

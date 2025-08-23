import { promises as fsp } from 'fs';
import path from 'path';

/**
 * التأكد من وجود جميع مجلدات الرفع المطلوبة
 */
export async function ensureUploadDirectories(): Promise<void> {
  const baseUploadPath = path.join(process.cwd(), 'client', 'public', 'uploads');
  
  // قائمة المجلدات المطلوبة
  const requiredDirs = [
    'avatars',
    'banners',
    'profiles',
    'rooms',
    'messages',
    'wall'
  ];

  console.log('🔍 التحقق من مجلدات الرفع...');
  
  for (const dir of requiredDirs) {
    const fullPath = path.join(baseUploadPath, dir);
    
    try {
      // التحقق من وجود المجلد
      await fsp.stat(fullPath);
      console.log(`✅ المجلد موجود: ${dir}`);
    } catch (error) {
      // المجلد غير موجود، محاولة إنشائه
      try {
        await fsp.mkdir(fullPath, { recursive: true });
        console.log(`📁 تم إنشاء المجلد: ${dir}`);
      } catch (mkdirError) {
        console.error(`❌ فشل إنشاء المجلد ${dir}:`, mkdirError);
      }
    }
  }
  
  // إنشاء مجلد temp كاحتياط
  const tempUploadPath = path.join(process.cwd(), 'temp', 'uploads');
  try {
    await fsp.mkdir(tempUploadPath, { recursive: true });
    
    // إنشاء نفس المجلدات الفرعية في temp
    for (const dir of requiredDirs) {
      const tempDirPath = path.join(tempUploadPath, dir);
      await fsp.mkdir(tempDirPath, { recursive: true }).catch(() => {});
    }
    
    console.log('✅ تم إنشاء مجلدات الاحتياط في temp');
  } catch (error) {
    console.error('⚠️ تحذير: فشل إنشاء مجلدات temp:', error);
  }
  
  console.log('✨ انتهى التحقق من مجلدات الرفع');
}

/**
 * التحقق من صلاحيات الكتابة في مجلد
 */
export async function checkWritePermission(dirPath: string): Promise<boolean> {
  try {
    const testFile = path.join(dirPath, '.write-test');
    await fsp.writeFile(testFile, 'test');
    await fsp.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * التحقق من صلاحيات جميع مجلدات الرفع
 */
export async function checkUploadPermissions(): Promise<void> {
  const baseUploadPath = path.join(process.cwd(), 'client', 'public', 'uploads');
  
  const dirs = [
    'avatars',
    'banners',
    'profiles',
    'rooms',
    'messages',
    'wall'
  ];

  console.log('🔐 التحقق من صلاحيات الكتابة...');
  
  for (const dir of dirs) {
    const fullPath = path.join(baseUploadPath, dir);
    const hasPermission = await checkWritePermission(fullPath);
    
    if (hasPermission) {
      console.log(`✅ صلاحيات الكتابة متاحة: ${dir}`);
    } else {
      console.warn(`⚠️ تحذير: لا توجد صلاحيات كتابة في: ${dir}`);
    }
  }
}
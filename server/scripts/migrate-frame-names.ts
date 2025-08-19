/**
 * سكريبت تحويل أسماء الإطارات القديمة إلى الجديدة
 * يحدث قاعدة البيانات لتتوافق مع النظام الجديد
 */

import { db, dbType } from '../database-adapter';

// خريطة التحويل من الأسماء القديمة إلى الجديدة
const frameNameMapping: Record<string, string> = {
  // التيجان
  'enhanced-crown-frame': 'crown-gold',
  'crown-frame-silver': 'crown-silver',
  'crown-frame-rosegold': 'crown-rosegold',
  'crown-frame-blue': 'crown-blue',
  'crown-frame-emerald': 'crown-emerald',
  'crown-frame-purple': 'crown-purple',
  'crown-frame-classic-gold': 'crown-classic-gold',
  'crown-frame-classic-coolpink': 'crown-classic-pink',
  // SVIP
  'svip1-frame-gold': 'svip1-gold',
  'svip1-frame-pink': 'svip1-pink',
  'svip2-frame-gold': 'svip2-gold',
  'svip2-frame-pink': 'svip2-pink',
  // خاص
  'wings-frame-king': 'wings-king',
  'wings-frame-queen': 'wings-queen'
};

async function migrateFrameNames() {
  console.log('🔄 بدء تحويل أسماء الإطارات...');
  
  try {
    // جلب جميع المستخدمين الذين لديهم إطارات
    let users;
    if (dbType === 'postgresql') {
      users = await db.query('SELECT id, username, avatar_frame FROM users WHERE avatar_frame IS NOT NULL AND avatar_frame != $1', ['none']);
    } else {
      users = await db.prepare('SELECT id, username, avatar_frame FROM users WHERE avatar_frame IS NOT NULL AND avatar_frame != ?').all('none');
    }
    
    const usersToUpdate = (dbType === 'postgresql' ? users.rows : users) || [];
    console.log(`📊 عدد المستخدمين المطلوب تحديثهم: ${usersToUpdate.length}`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // تحديث كل مستخدم
    for (const user of usersToUpdate) {
      const oldFrame = user.avatar_frame;
      const newFrame = frameNameMapping[oldFrame];
      
      if (newFrame) {
        // تحديث الإطار
        if (dbType === 'postgresql') {
          await db.query(
            'UPDATE users SET avatar_frame = $1 WHERE id = $2',
            [newFrame, user.id]
          );
        } else {
          await db.prepare('UPDATE users SET avatar_frame = ? WHERE id = ?').run(newFrame, user.id);
        }
        
        console.log(`✅ تحديث ${user.username}: ${oldFrame} → ${newFrame}`);
        updatedCount++;
      } else if (oldFrame && oldFrame !== 'none' && !Object.values(frameNameMapping).includes(oldFrame)) {
        // إطار غير معروف
        console.log(`⚠️  إطار غير معروف للمستخدم ${user.username}: ${oldFrame}`);
        skippedCount++;
      } else {
        // الإطار بالفعل محدث
        console.log(`✔️  ${user.username} لديه إطار محدث بالفعل: ${oldFrame}`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 ملخص التحويل:');
    console.log(`   ✅ تم تحديث: ${updatedCount} مستخدم`);
    console.log(`   ⏭️  تم تخطي: ${skippedCount} مستخدم`);
    console.log('\n✨ تم الانتهاء من تحويل أسماء الإطارات!');
    
  } catch (error) {
    console.error('❌ خطأ في تحويل أسماء الإطارات:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
if (require.main === module) {
  migrateFrameNames().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('خطأ:', error);
    process.exit(1);
  });
}

export { migrateFrameNames };
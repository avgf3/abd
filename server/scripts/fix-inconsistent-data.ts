import { db } from '../database-adapter';
import { users } from '../../shared/schema';
import { eq, isNull, or, sql } from 'drizzle-orm';

async function fixInconsistentData() {
  console.log('🔧 بدء إصلاح البيانات غير المتسقة...');

  try {
    // 1. إصلاح قيم profileBackgroundColor الفارغة أو غير الصالحة
    console.log('📌 إصلاح ألوان الخلفية...');
    
    // الحصول على المستخدمين بقيم غير صالحة
    const usersWithInvalidColors = await db
      .select()
      .from(users)
      .where(
        or(
          isNull(users.profileBackgroundColor),
          eq(users.profileBackgroundColor, ''),
          eq(users.profileBackgroundColor, 'null'),
          eq(users.profileBackgroundColor, 'undefined')
        )
      );

    console.log(`  - عدد المستخدمين بألوان غير صالحة: ${usersWithInvalidColors.length}`);

    // تحديث القيم غير الصالحة إلى القيمة الافتراضية
    if (usersWithInvalidColors.length > 0) {
      await db
        .update(users)
        .set({ profileBackgroundColor: '#3c0d0d' })
        .where(
          or(
            isNull(users.profileBackgroundColor),
            eq(users.profileBackgroundColor, ''),
            eq(users.profileBackgroundColor, 'null'),
            eq(users.profileBackgroundColor, 'undefined')
          )
        );
      console.log('  ✅ تم تحديث ألوان الخلفية غير الصالحة');
    }

    // 2. إصلاح قيم usernameColor الفارغة أو غير الصالحة
    console.log('📌 إصلاح ألوان أسماء المستخدمين...');
    
    const usersWithInvalidUsernameColors = await db
      .select()
      .from(users)
      .where(
        or(
          isNull(users.usernameColor),
          eq(users.usernameColor, ''),
          eq(users.usernameColor, 'null'),
          eq(users.usernameColor, 'undefined')
        )
      );

    console.log(`  - عدد المستخدمين بألوان أسماء غير صالحة: ${usersWithInvalidUsernameColors.length}`);

    if (usersWithInvalidUsernameColors.length > 0) {
      await db
        .update(users)
        .set({ usernameColor: '#000000' })
        .where(
          or(
            isNull(users.usernameColor),
            eq(users.usernameColor, ''),
            eq(users.usernameColor, 'null'),
            eq(users.usernameColor, 'undefined')
          )
        );
      console.log('  ✅ تم تحديث ألوان الأسماء غير الصالحة');
    }

    // 3. إصلاح قيم userTheme الفارغة أو غير الصالحة
    console.log('📌 إصلاح الثيمات...');
    
    const usersWithInvalidThemes = await db
      .select()
      .from(users)
      .where(
        or(
          isNull(users.userTheme),
          eq(users.userTheme, ''),
          eq(users.userTheme, 'null'),
          eq(users.userTheme, 'undefined')
        )
      );

    console.log(`  - عدد المستخدمين بثيمات غير صالحة: ${usersWithInvalidThemes.length}`);

    if (usersWithInvalidThemes.length > 0) {
      await db
        .update(users)
        .set({ userTheme: 'default' })
        .where(
          or(
            isNull(users.userTheme),
            eq(users.userTheme, ''),
            eq(users.userTheme, 'null'),
            eq(users.userTheme, 'undefined')
          )
        );
      console.log('  ✅ تم تحديث الثيمات غير الصالحة');
    }

    // 4. إصلاح قيم profileEffect الفارغة أو غير الصالحة
    console.log('📌 إصلاح التأثيرات...');
    
    const usersWithInvalidEffects = await db
      .select()
      .from(users)
      .where(
        or(
          isNull(users.profileEffect),
          eq(users.profileEffect, ''),
          eq(users.profileEffect, 'null'),
          eq(users.profileEffect, 'undefined')
        )
      );

    console.log(`  - عدد المستخدمين بتأثيرات غير صالحة: ${usersWithInvalidEffects.length}`);

    if (usersWithInvalidEffects.length > 0) {
      await db
        .update(users)
        .set({ profileEffect: 'none' })
        .where(
          or(
            isNull(users.profileEffect),
            eq(users.profileEffect, ''),
            eq(users.profileEffect, 'null'),
            eq(users.profileEffect, 'undefined')
          )
        );
      console.log('  ✅ تم تحديث التأثيرات غير الصالحة');
    }

    // 5. التحقق من صحة ألوان HEX
    console.log('📌 التحقق من صحة ألوان HEX...');
    
    const allUsers = await db.select().from(users);
    let invalidHexCount = 0;

    for (const user of allUsers) {
      let needsUpdate = false;
      const updates: any = {};

      // التحقق من profileBackgroundColor
      if (user.profileBackgroundColor) {
        const color = String(user.profileBackgroundColor).trim();
        const isGradient = color.toLowerCase().startsWith('linear-gradient(');
        if (!isGradient && !isValidHexColor(color)) {
          updates.profileBackgroundColor = '#3c0d0d';
          needsUpdate = true;
          invalidHexCount++;
        }
      }

      // التحقق من usernameColor
      if (user.usernameColor && !isValidHexColor(user.usernameColor)) {
        updates.usernameColor = '#000000';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db
          .update(users)
          .set(updates)
          .where(eq(users.id, user.id));
      }
    }

    if (invalidHexCount > 0) {
      console.log(`  ✅ تم إصلاح ${invalidHexCount} لون HEX غير صالح`);
    } else {
      console.log('  ✅ جميع ألوان HEX صالحة');
    }

    // 6. عرض ملخص نهائي
    console.log('\n📊 ملخص البيانات بعد الإصلاح:');
    
    const summary = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        usersWithColor: sql<number>`count(case when ${users.profileBackgroundColor} != '#3c0d0d' then 1 end)`,
        usersWithEffect: sql<number>`count(case when ${users.profileEffect} != 'none' then 1 end)`,
        usersWithCustomUsername: sql<number>`count(case when ${users.usernameColor} != '#000000' and ${users.usernameColor} != '#FFFFFF' then 1 end)`,
      })
      .from(users);

    console.log(`  - إجمالي المستخدمين: ${summary[0].totalUsers}`);
    console.log(`  - مستخدمون بألوان خلفية مخصصة: ${summary[0].usersWithColor}`);
    console.log(`  - مستخدمون بتأثيرات: ${summary[0].usersWithEffect}`);
    console.log(`  - مستخدمون بألوان أسماء مخصصة: ${summary[0].usersWithCustomUsername}`);

    console.log('\n✅ تم إصلاح البيانات بنجاح!');

  } catch (error) {
    console.error('❌ خطأ في إصلاح البيانات:', error);
    process.exit(1);
  }
}

// دالة للتحقق من صحة كود HEX
function isValidHexColor(color: string): boolean {
  if (!color) return false;
  const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
  return hexPattern.test(color.trim());
}

// تشغيل السكريبت
fixInconsistentData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
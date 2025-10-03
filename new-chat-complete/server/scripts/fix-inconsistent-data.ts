import { eq, isNull, or, sql } from 'drizzle-orm';

import { users } from '../../shared/schema';
import { db } from '../database-adapter';

async function fixInconsistentData() {
  try {
    // 1. إصلاح قيم profileBackgroundColor الفارغة أو غير الصالحة
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

    // تحديث القيم غير الصالحة إلى القيمة الافتراضية
    if (usersWithInvalidColors.length > 0) {
      await db
        .update(users)
        .set({ profileBackgroundColor: '#2a2a2a' })
        .where(
          or(
            isNull(users.profileBackgroundColor),
            eq(users.profileBackgroundColor, ''),
            eq(users.profileBackgroundColor, 'null'),
            eq(users.profileBackgroundColor, 'undefined')
          )
        );
    }

    // 2. إصلاح قيم usernameColor الفارغة أو غير الصالحة
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

    if (usersWithInvalidUsernameColors.length > 0) {
      await db
        .update(users)
        .set({ usernameColor: '#4A90E2' })
        .where(
          or(
            isNull(users.usernameColor),
            eq(users.usernameColor, ''),
            eq(users.usernameColor, 'null'),
            eq(users.usernameColor, 'undefined')
          )
        );
    }

    // 4. إصلاح قيم profileEffect الفارغة أو غير الصالحة
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
    }

    // 5. التحقق من صحة ألوان HEX
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
          updates.profileBackgroundColor = '#2a2a2a';
          needsUpdate = true;
          invalidHexCount++;
        }
      }

      // التحقق من usernameColor
      if (
        !user.usernameColor ||
        String(user.usernameColor).toLowerCase() === '#ffffff' ||
        String(user.usernameColor).toLowerCase() === '#fff' ||
        !isValidHexColor(user.usernameColor)
      ) {
        updates.usernameColor = '#4A90E2';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.update(users).set(updates).where(eq(users.id, user.id));
      }
    }

    if (invalidHexCount > 0) {
    } else {
    }

    // 6. عرض ملخص نهائي
    const summary = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        usersWithColor: sql<number>`count(case when ${users.profileBackgroundColor} != '#2a2a2a' then 1 end)`,
        usersWithEffect: sql<number>`count(case when ${users.profileEffect} != 'none' then 1 end)`,
        usersWithCustomUsername: sql<number>`count(case when ${users.usernameColor} != '#4A90E2' then 1 end)`,
      })
      .from(users);
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

# نظام النقاط والمستويات 🎯

تم إضافة نظام نقاط ومستويات شامل لتطبيق الشات لتحفيز المستخدمين ومكافأة نشاطهم.

## ✨ المميزات المضافة

### 📊 نظام النقاط
- **نقاط إرسال الرسائل**: 1 نقطة لكل رسالة
- **نقاط تسجيل الدخول اليومي**: 5 نقاط
- **نقاط إكمال الملف الشخصي**: 10 نقاط
- **نقاط إضافة صديق**: 3 نقاط
- **نقاط أول رسالة**: 5 نقاط
- **نقاط النشاط الأسبوعي**: 20 نقطة
- **نقاط النشاط الشهري**: 50 نقطة

### 🏆 نظام المستويات
1. **مبتدئ** (0 نقطة) - اللون: `#8B4513`
2. **عضو نشط** (50 نقطة) - اللون: `#CD853F`
3. **عضو متميز** (150 نقطة) - اللون: `#DAA520`
4. **عضو خبير** (300 نقطة) - اللون: `#FFD700`
5. **عضو محترف** (500 نقطة) - اللون: `#FF8C00`
6. **خبير متقدم** (750 نقطة) - اللون: `#FF6347`
7. **خبير النخبة** (1000 نقطة) - اللون: `#DC143C`
8. **أسطورة** (1500 نقطة) - اللون: `#8A2BE2`
9. **أسطورة النخبة** (2000 نقطة) - اللون: `#4B0082`
10. **إمبراطور** (3000 نقطة) - اللون: `#000080`

## 🗄️ التغييرات في قاعدة البيانات

### إضافات جدول المستخدمين
```sql
ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level_progress INTEGER DEFAULT 0;
```

### جدول تاريخ النقاط الجديد
```sql
CREATE TABLE points_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول إعدادات المستويات الجديد
```sql
CREATE TABLE level_settings (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  required_points INTEGER NOT NULL,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#FFFFFF',
  benefits JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 التشغيل والإعداد

### للـ SQLite (قاعدة البيانات المحلية)
```bash
node setup-points-system.js
```

### للـ PostgreSQL (قاعدة البيانات السحابية)
```bash
node setup-points-system-pg.js
```

## 📁 الملفات المضافة

1. **`shared/points-system.ts`** - منطق نظام النقاط والمستويات
2. **`setup-points-system.js`** - سكريبت إعداد SQLite
3. **`setup-points-system-pg.js`** - سكريبت إعداد PostgreSQL
4. **`shared/schema.ts`** - محدث بجداول النقاط (PostgreSQL)
5. **`shared/schema-sqlite.ts`** - محدث بجداول النقاط (SQLite)

## 🔧 الاستخدام في الكود

### استيراد النظام
```typescript
import { 
  calculateLevel, 
  calculateLevelProgress, 
  checkLevelUp,
  DEFAULT_POINTS_CONFIG,
  DEFAULT_LEVELS
} from './shared/points-system';
```

### حساب النقاط
```typescript
// إضافة نقاط لمستخدم
const pointsToAdd = DEFAULT_POINTS_CONFIG.MESSAGE_SENT;
const newTotalPoints = user.totalPoints + pointsToAdd;

// حساب المستوى الجديد
const newLevel = calculateLevel(newTotalPoints);
const newProgress = calculateLevelProgress(newTotalPoints);

// التحقق من ترقية المستوى
const levelUpInfo = checkLevelUp(user.totalPoints, newTotalPoints);
if (levelUpInfo.leveledUp) {
  console.log(`تهانينا! لقد وصلت للمستوى ${levelUpInfo.newLevel}`);
}
```

### تتبع تاريخ النقاط
```typescript
// إضافة سجل في تاريخ النقاط
await db.insert(pointsHistory).values({
  userId: user.id,
  points: pointsToAdd,
  reason: 'MESSAGE_SENT',
  action: 'earn',
});
```

## 🎨 عرض النقاط في الواجهة

### معلومات المستخدم
- النقاط الحالية: `user.points`
- المستوى: `user.level`
- إجمالي النقاط: `user.totalPoints`
- تقدم المستوى: `user.levelProgress%`

### عرض شريط التقدم
```jsx
<div className="level-progress">
  <div 
    className="progress-bar" 
    style={{ width: `${user.levelProgress}%` }}
  />
  <span>المستوى {user.level} - {user.levelProgress}%</span>
</div>
```

## 📈 مراقبة النظام

### إحصائيات النقاط
```sql
-- أعلى المستخدمين نقاطاً
SELECT username, points, level, total_points 
FROM users 
ORDER BY total_points DESC 
LIMIT 10;

-- تاريخ النقاط لمستخدم معين
SELECT * FROM points_history 
WHERE user_id = ? 
ORDER BY created_at DESC;
```

## 🔄 الصيانة

### إعادة حساب النقاط
```typescript
import { recalculateUserStats } from './shared/points-system';

// إعادة حساب إحصائيات مستخدم
const stats = recalculateUserStats(user.totalPoints);
await db.update(users)
  .set({
    level: stats.level,
    levelProgress: stats.levelProgress
  })
  .where(eq(users.id, user.id));
```

## 🎯 الخطوات التالية

1. تشغيل سكريبت الإعداد المناسب
2. تحديث منطق الخادم لإضافة النقاط
3. تحديث الواجهة لعرض النقاط والمستويات
4. إضافة إشعارات ترقية المستوى
5. إضافة صفحة لوحة الصدارة

---

**ملاحظة:** النظام مصمم ليكون قابل للتخصيص بسهولة. يمكن تعديل قيم النقاط والمستويات في ملف `points-system.ts`.
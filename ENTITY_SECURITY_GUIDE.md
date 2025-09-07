# 🛡️ دليل نظام أمان الكيانات الجديد

## 📋 نظرة عامة

تم تطبيق نظام أمان جديد لحل مشكلة تداخل الهويات بين المستخدمين والبوتات. النظام الجديد يضمن:

- ✅ فصل كامل بين معرفات المستخدمين والبوتات
- ✅ Type Safety للتمييز بين الأنواع
- ✅ Middleware للتحقق من صحة العمليات
- ✅ حماية من انتحال الشخصيات

---

## 🔢 نظام المعرفات الجديد

### قواعد المعرفات:
```
المستخدمون الحقيقيون: 1 - 999,999
البوتات:             1,000,000 - ∞
```

### أمثلة:
```typescript
// مستخدمون حقيقيون
const userId1 = 1;      // ✅ صالح
const userId2 = 50000;  // ✅ صالح
const userId3 = 999999; // ✅ صالح

// بوتات
const botId1 = 1000000; // ✅ صالح
const botId2 = 1000001; // ✅ صالح
const botId3 = 2000000; // ✅ صالح

// غير صالح
const invalidId = 1000000; // ❌ لا يمكن أن يكون مستخدم
```

---

## 🔧 استخدام النظام الجديد

### 1. التحقق من نوع الكيان

```typescript
import { isBotId, isUserId, isUser, isBot } from './server/types/entities';

// التحقق من المعرف
if (isBotId(entityId)) {
  console.log('هذا بوت');
} else if (isUserId(entityId)) {
  console.log('هذا مستخدم حقيقي');
}

// التحقق من الكائن
const entity = await storage.getUser(entityId);
if (isUser(entity)) {
  // التعامل مع المستخدم
  console.log('اسم المستخدم:', entity.username);
} else if (isBot(entity)) {
  // التعامل مع البوت
  console.log('نوع البوت:', entity.botType);
}
```

### 2. استخدام Middleware

```typescript
import { requireUser, requireBotOperation, validateEntityType } from './server/middleware/entityValidation';

// للعمليات التي تتطلب مستخدم حقيقي
app.post('/api/messages', requireUser, (req, res) => {
  // req.entityId سيكون معرف المستخدم الحقيقي
  // req.entityType سيكون 'user'
});

// للعمليات على البوتات
app.post('/api/bots/:id/move', requireBotOperation, (req, res) => {
  // req.entityId = معرف المستخدم الذي يقوم بالعملية
  // req.targetBotId = معرف البوت المستهدف
});

// للتحقق من نوع معين
app.get('/api/user-profile/:id', validateEntityType('user'), (req, res) => {
  // يضمن أن المعرف في المعاملات للمستخدم الحقيقي
});
```

### 3. جلب الكيانات

```typescript
import { storage } from './server/storage';

// الطريقة الجديدة - آمنة
const entity = await storage.getUser(entityId);
if (entity) {
  console.log('نوع الكيان:', entity.entityType); // 'user' أو 'bot'
  
  if (entity.entityType === 'user') {
    // خصائص المستخدم
    console.log('تاريخ الانضمام:', entity.joinDate);
  } else if (entity.entityType === 'bot') {
    // خصائص البوت
    console.log('نوع البوت:', entity.botType);
    console.log('نشط:', entity.isActive);
  }
}
```

---

## 🚨 قواعد الأمان

### ✅ مسموح:
- مستخدم حقيقي يدير البوتات
- بوت يرسل رسائل في الغرف
- جلب معلومات أي كيان بالمعرف الصحيح

### ❌ ممنوع:
- بوت يحاول تسجيل الدخول كمستخدم
- مستخدم يحاول انتحال شخصية بوت
- استخدام معرفات خارج النطاق المحدد

### 🔒 محمي تلقائياً:
- جميع API endpoints الحساسة
- عمليات إدارة البوتات
- تسجيل الدخول والمصادقة

---

## 🛠️ للمطورين

### إضافة endpoint جديد:

```typescript
// للمستخدمين الحقيقيين فقط
app.post('/api/new-feature', requireUser, (req, res) => {
  const userId = req.entityId; // مضمون أنه مستخدم حقيقي
  // ... منطق العملية
});

// للتحقق من معرف في المعاملات
app.get('/api/profile/:userId', 
  validateEntityIdParam('userId', 'user'), 
  (req, res) => {
    const userId = req.validatedEntityId; // مضمون أنه معرف مستخدم صالح
    // ... منطق العملية
  }
);

// للعمليات المختلطة
app.post('/api/interaction/:targetId', requireUser, (req, res) => {
  const currentUserId = req.entityId; // المستخدم الحالي
  const targetId = parseInt(req.params.targetId);
  
  if (isBotId(targetId)) {
    // التفاعل مع بوت
  } else if (isUserId(targetId)) {
    // التفاعل مع مستخدم آخر
  } else {
    return res.status(400).json({ error: 'معرف غير صالح' });
  }
});
```

### إضافة فحوصات مخصصة:

```typescript
import { validateEntityType, InvalidEntityTypeError } from './server/types/entities';

function customValidation(entityId: number, operation: string) {
  // فحوصات مخصصة حسب العملية
  if (operation === 'admin' && !isUserId(entityId)) {
    throw new InvalidEntityTypeError(entityId, 'user');
  }
  
  if (operation === 'bot-control' && !isBotId(entityId)) {
    throw new InvalidEntityTypeError(entityId, 'bot');
  }
}
```

---

## 🧪 اختبار النظام

### اختبارات أساسية:

```bash
# تطبيق الإصلاح
node apply-entity-security-fix.js

# اختبار دوال التحقق
node -e "
const { isBotId, isUserId } = require('./server/types/entities');
console.log('User ID 1:', isUserId(1));
console.log('Bot ID 1000000:', isBotId(1000000));
"

# فحص قاعدة البيانات
psql -d your_database -c "
SELECT 'Users' as type, COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM users
UNION ALL
SELECT 'Bots' as type, COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM bots;
"
```

---

## 🚨 استكشاف الأخطاء

### أخطاء شائعة:

1. **"Invalid entity type"**
   - السبب: محاولة استخدام معرف بوت كمستخدم أو العكس
   - الحل: تحقق من نوع المعرف باستخدام `isBotId()` أو `isUserId()`

2. **"Entity not found"**
   - السبب: المعرف غير موجود في قاعدة البيانات
   - الحل: تحقق من وجود الكيان قبل العملية

3. **"Wrong entity ID type"**
   - السبب: معرف في النطاق الخاطئ
   - الحل: استخدم النطاق الصحيح للمعرفات

### سجلات مفيدة:

```typescript
// تفعيل السجلات المفصلة
console.log(`[ENTITY] Accessing entity ${entityId} of type ${isBotId(entityId) ? 'bot' : 'user'}`);
```

---

## 📊 مراقبة النظام

### مؤشرات مهمة:
- عدد محاولات الوصول بمعرفات خاطئة
- عدد العمليات المرفوضة بسبب نوع الكيان
- تداخل المعرفات (يجب أن يكون صفر)

### استعلامات مراقبة:

```sql
-- فحص تداخل المعرفات (يجب أن يكون النتيجة فارغة)
SELECT u.id, u.username as user_name, b.username as bot_name
FROM users u
INNER JOIN bots b ON u.id = b.id;

-- إحصائيات المعرفات
SELECT 
  'Users' as type, 
  COUNT(*) as count, 
  MIN(id) as min_id, 
  MAX(id) as max_id 
FROM users
WHERE id < 1000000
UNION ALL
SELECT 
  'Bots' as type, 
  COUNT(*) as count, 
  MIN(id) as min_id, 
  MAX(id) as max_id 
FROM bots
WHERE id >= 1000000;
```

---

## ✅ قائمة التحقق

قبل النشر في الإنتاج:

- [ ] تم تطبيق migration معرفات البوتات
- [ ] لا توجد معرفات متداخلة
- [ ] جميع API endpoints تستخدم middleware الصحيح
- [ ] تم اختبار جلب المستخدمين والبوتات
- [ ] تم اختبار عمليات المصادقة
- [ ] تم تفعيل المراقبة والسجلات

---

*آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}*
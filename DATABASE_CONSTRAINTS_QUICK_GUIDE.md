# دليل الاستخدام السريع - نظام فحص محددات قاعدة البيانات

## 🚀 البدء السريع

### 1. تشغيل الاختبار
```bash
npm run test:constraints
```

### 2. الوصول إلى الواجهة الإدارية
```
http://localhost:3000/admin/database-constraints
```

### 3. استخدام API مباشرة
```bash
# فحص جميع المحددات
curl http://localhost:3000/api/database/constraints

# فحص صحة قاعدة البيانات
curl http://localhost:3000/api/database/health

# فحص المفاتيح الخارجية
curl http://localhost:3000/api/database/constraints/foreign-keys
```

## 📊 المسارات المتاحة

| المسار | الوصف |
|--------|--------|
| `/api/database/constraints` | فحص جميع المحددات |
| `/api/database/constraints/table/:tableName` | فحص محددات جدول محدد |
| `/api/database/constraints/foreign-keys` | فحص المفاتيح الخارجية |
| `/api/database/constraints/unique` | فحص محددات التكرار |
| `/api/database/constraints/check` | فحص محددات التحقق |
| `/api/database/constraints/validate` | فحص سلامة البيانات |
| `/api/database/health` | تقرير شامل عن الصحة |
| `/api/database/tables` | معلومات الجداول والأعمدة |
| `/api/database/indexes` | معلومات الفهارس |
| `/api/database/summary` | ملخص سريع |

## 🔧 الاستخدام في الكود

```typescript
import { databaseConstraintsService } from '../services/databaseConstraintsService';

// فحص جميع المحددات
const report = await databaseConstraintsService.checkAllConstraints();

// فحص سلامة البيانات
const validation = await databaseConstraintsService.validateConstraints();

// إنشاء تقرير الصحة
const healthReport = await databaseConstraintsService.generateHealthReport();
```

## 📈 فهم النتائج

### حالة الصحة
- **سليم (healthy)**: جميع المحددات تعمل بشكل صحيح
- **تحذير (warning)**: يوجد مشاكل بسيطة تحتاج انتباه
- **خطأ (error)**: يوجد مشاكل خطيرة تحتاج إصلاح فوري

### أنواع المحددات
- **PRIMARY KEY**: المفتاح الأساسي
- **FOREIGN KEY**: المفتاح الخارجي
- **UNIQUE**: محدد التكرار
- **CHECK**: محدد التحقق
- **NOT NULL**: محدد عدم القيم الفارغة

## ⚠️ استكشاف الأخطاء

### مشاكل شائعة:
1. **قاعدة البيانات غير متصلة**: تحقق من `DATABASE_URL`
2. **صلاحيات غير كافية**: تأكد من صلاحيات قاعدة البيانات
3. **جداول غير موجودة**: تحقق من وجود الجداول المطلوبة

### رسائل الخطأ:
- `قاعدة البيانات غير متصلة`: تحقق من الاتصال
- `فشل في فحص محددات قاعدة البيانات`: تحقق من الصلاحيات
- `خطأ في الاتصال بالخادم`: تحقق من حالة الخادم

## 🎯 نصائح للاستخدام الأمثل

1. **فحص دوري**: قم بفحص محددات قاعدة البيانات بانتظام
2. **مراقبة الأداء**: راقب عدد الفهارس والأداء
3. **إصلاح فوري**: أصلح انتهاكات المفاتيح الخارجية فوراً
4. **نسخ احتياطية**: احتفظ بنسخ احتياطية قبل إجراء تغييرات كبيرة

## 📞 الدعم

في حالة وجود مشاكل:
1. راجع ملفات السجل
2. تحقق من اتصال قاعدة البيانات
3. تأكد من صحة الإعدادات
4. استخدم أداة الاختبار: `npm run test:constraints`
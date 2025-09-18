# نظام فحص محددات قاعدة البيانات

## نظرة عامة

تم إنشاء نظام شامل لفحص ومراقبة محددات قاعدة البيانات في التطبيق. يوفر هذا النظام إمكانيات متقدمة لفحص سلامة البيانات والعلاقات بين الجداول.

## المكونات الرئيسية

### 1. خدمة فحص المحددات (`DatabaseConstraintsService`)

**الملف:** `/server/services/databaseConstraintsService.ts`

**الوظائف الرئيسية:**
- `checkAllConstraints()` - فحص جميع محددات قاعدة البيانات
- `checkTableConstraints(tableName)` - فحص محددات جدول محدد
- `checkForeignKeys()` - فحص المفاتيح الخارجية
- `checkUniqueConstraints()` - فحص محددات التكرار
- `checkCheckConstraints()` - فحص محددات التحقق
- `validateConstraints()` - فحص سلامة البيانات
- `generateHealthReport()` - إنشاء تقرير شامل عن صحة قاعدة البيانات

### 2. API Endpoints

**الملف:** `/server/routes/databaseConstraints.ts`

**المسارات المتاحة:**
- `GET /api/database/constraints` - فحص جميع المحددات
- `GET /api/database/constraints/table/:tableName` - فحص محددات جدول محدد
- `GET /api/database/constraints/foreign-keys` - فحص المفاتيح الخارجية
- `GET /api/database/constraints/unique` - فحص محددات التكرار
- `GET /api/database/constraints/check` - فحص محددات التحقق
- `GET /api/database/constraints/validate` - فحص سلامة البيانات
- `GET /api/database/health` - تقرير شامل عن الصحة
- `GET /api/database/tables` - معلومات الجداول والأعمدة
- `GET /api/database/indexes` - معلومات الفهارس
- `GET /api/database/summary` - ملخص سريع

### 3. واجهة المستخدم

**الملف:** `/client/src/components/admin/DatabaseConstraintsChecker.tsx`

**الميزات:**
- عرض تقرير الصحة مع حالة قاعدة البيانات
- فحص المحددات مع تفاصيل مفصلة
- عرض معلومات الجداول والأعمدة
- عرض معلومات الفهارس
- تحديث البيانات في الوقت الفعلي
- واجهة مستخدم تفاعلية مع تبويبات

## أنواع البيانات المدعومة

### ConstraintInfo
```typescript
interface ConstraintInfo {
  constraintName: string;
  tableName: string;
  constraintType: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columnName?: string;
  referencedTable?: string;
  referencedColumn?: string;
  definition?: string;
  isDeferrable?: boolean;
  initiallyDeferred?: boolean;
}
```

### TableInfo
```typescript
interface TableInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string;
  characterMaximumLength?: number;
}
```

### IndexInfo
```typescript
interface IndexInfo {
  indexName: string;
  tableName: string;
  columnName: string;
  isUnique: boolean;
  isPrimary: boolean;
}
```

## كيفية الاستخدام

### 1. الوصول إلى الواجهة الإدارية

قم بزيارة الصفحة الإدارية لفحص محددات قاعدة البيانات:
```
/admin/database-constraints
```

### 2. استخدام API مباشرة

```javascript
// فحص جميع المحددات
const response = await fetch('/api/database/constraints');
const data = await response.json();

// فحص صحة قاعدة البيانات
const healthResponse = await fetch('/api/database/health');
const healthData = await healthResponse.json();

// فحص محددات جدول محدد
const tableResponse = await fetch('/api/database/constraints/table/users');
const tableData = await tableResponse.json();
```

### 3. استخدام الخدمة في الكود

```typescript
import { databaseConstraintsService } from '../services/databaseConstraintsService';

// فحص جميع المحددات
const report = await databaseConstraintsService.checkAllConstraints();

// فحص سلامة البيانات
const validation = await databaseConstraintsService.validateConstraints();

// إنشاء تقرير الصحة
const healthReport = await databaseConstraintsService.generateHealthReport();
```

## الميزات المتقدمة

### 1. فحص سلامة البيانات
- فحص المفاتيح الخارجية المكسورة
- التحقق من انتهاكات المحددات
- تقرير مفصل عن المشاكل

### 2. تحليل الأداء
- فحص وجود الفهارس المطلوبة
- تحليل العلاقات بين الجداول
- توصيات لتحسين الأداء

### 3. المراقبة المستمرة
- إمكانية تحديث البيانات في الوقت الفعلي
- تقارير دورية عن حالة قاعدة البيانات
- تنبيهات عند وجود مشاكل

## الأمان

- جميع المسارات محمية ومتاحة للمدراء فقط
- فحص شامل للأخطاء مع رسائل واضحة
- عدم كشف معلومات حساسة في الاستجابات

## التطوير المستقبلي

### ميزات مقترحة:
1. **تنبيهات تلقائية** عند اكتشاف مشاكل
2. **إصلاح تلقائي** للمشاكل البسيطة
3. **تقارير مجدولة** عن حالة قاعدة البيانات
4. **مقارنة بين الإصدارات** لتتبع التغييرات
5. **تحليل الأداء المتقدم** مع اقتراحات التحسين

### تحسينات مقترحة:
1. **تخزين مؤقت** للنتائج لتحسين الأداء
2. **تصدير التقارير** بصيغ مختلفة (PDF, Excel)
3. **واجهة برمجة متقدمة** مع المزيد من الخيارات
4. **تكامل مع أنظمة المراقبة** الخارجية

## الدعم والمساعدة

في حالة وجود مشاكل أو استفسارات حول نظام فحص محددات قاعدة البيانات، يرجى:

1. مراجعة ملفات السجل للبحث عن أخطاء
2. التحقق من اتصال قاعدة البيانات
3. التأكد من صحة إعدادات البيئة
4. مراجعة هذا الدليل للحصول على معلومات إضافية

---

**ملاحظة:** هذا النظام مصمم خصيصاً لقاعدة بيانات PostgreSQL ويستخدم Drizzle ORM. قد تحتاج إلى تعديلات للعمل مع قواعد بيانات أخرى.
# إصلاح مشكلة انقطاع قاعدة البيانات

## المشكلة
كانت قاعدة البيانات تنقطع باستمرار بسبب:
1. إعدادات الاتصال غير المناسبة
2. عدم وجود آلية إعادة الاتصال التلقائي
3. timeout قصير جداً
4. عدد اتصالات كبير يتجاوز حدود الخطة

## الحلول المطبقة

### 1. تحسين إعدادات الاتصال
```typescript
const client = postgres(connectionString, {
  ssl: sslRequired ? 'require' : undefined,
  max: 10, // تقليل عدد الاتصالات
  idle_timeout: 60, // زيادة timeout إلى 60 ثانية
  connect_timeout: 60, // زيادة timeout الاتصال
  max_lifetime: 60 * 30, // إعادة تدوير كل 30 دقيقة
  prepare: false, // تعطيل prepared statements
  connection: {
    keep_alive: true, // تفعيل keep-alive
    keep_alive_initial_delay_ms: 10000,
  },
  retry_delay: 1000, // تأخير إعادة المحاولة
  max_retries: 3, // عدد محاولات إعادة الاتصال
});
```

### 2. نظام المراقبة الدورية
- فحص صحة الاتصال كل 30 ثانية
- إعادة الاتصال التلقائي عند انقطاع الاتصال
- تسجيل مفصل للأخطاء

### 3. دالة إعادة المحاولة التلقائية
```typescript
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries?: number
): Promise<T>
```

### 4. متغيرات البيئة الجديدة
```env
DB_MAX_CONNECTIONS=5
DB_HEALTH_CHECK_INTERVAL=30000
DB_RETRY_ATTEMPTS=3
```

## النتيجة
- ✅ منع انقطاع الاتصال بقاعدة البيانات
- ✅ إعادة الاتصال التلقائي عند الانقطاع
- ✅ استقرار أفضل للخادم
- ✅ تسجيل مفصل للمشاكل

## الاستخدام
الآن يمكن استخدام `executeWithRetry` للاستعلامات المهمة:

```typescript
import { executeWithRetry } from './database-adapter';

const result = await executeWithRetry(async () => {
  return await db.select().from(users);
});
```

## المراقبة
النظام يراقب قاعدة البيانات تلقائياً ويسجل:
- ✅ حالات الاتصال الناجحة
- ⚠️ محاولات إعادة الاتصال
- ❌ أخطاء الاتصال مع التفاصيل
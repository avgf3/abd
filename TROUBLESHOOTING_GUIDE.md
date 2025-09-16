# دليل تشخيص المشاكل - Troubleshooting Guide

## المشاكل الشائعة والحلول

### 1. مشاكل الملف الشخصي

#### المشكلة: الملف الشخصي لا يظهر
**الأعراض:**
- الملف الشخصي فارغ أو لا يظهر
- رسائل خطأ في وحدة التحكم

**الحلول:**
```typescript
// 1. التحقق من الكاش
import { getCachedProfile } from '@/utils/profileOptimizer';
const profile = getCachedProfile(userId);
console.log('الملف الشخصي في الكاش:', profile);

// 2. إعادة تحميل الملف الشخصي
import { safeProfileFetch } from '@/utils/profileOptimizer';
const freshProfile = await safeProfileFetch(userId);
console.log('الملف الشخصي الجديد:', freshProfile);

// 3. مسح الكاش وإعادة المحاولة
localStorage.removeItem('profileCache');
```

#### المشكلة: الملف الشخصي يتحدث باستمرار
**الأعراض:**
- الملف الشخصي يعيد التحميل باستمرار
- استهلاك عالي للذاكرة

**الحلول:**
```typescript
// 1. التحقق من التحديثات المتكررة
import { safeProfileUpdate } from '@/utils/profileOptimizer';
// استخدام safeProfileUpdate بدلاً من التحديث المباشر

// 2. التحقق من التوقيت
const lastUpdate = getCachedProfile(userId)?.lastUpdated;
if (lastUpdate && Date.now() - lastUpdate < 5000) {
  // لا تحديث إذا كان آخر تحديث قبل 5 ثوان
  return;
}
```

### 2. مشاكل آخر تواجد

#### المشكلة: آخر تواجد لا يتحدث
**الأعراض:**
- وقت آخر تواجد لا يتحدث
- يظهر "غير متصل" دائماً

**الحلول:**
```typescript
// 1. التحقق من الكاش
import { getCachedLastSeen } from '@/utils/lastSeenOptimizer';
const lastSeen = getCachedLastSeen(userId);
console.log('آخر تواجد في الكاش:', lastSeen);

// 2. إعادة تحديث آخر تواجد
import { safeLastSeenUpdate } from '@/utils/lastSeenOptimizer';
await safeLastSeenUpdate(userId);

// 3. التحقق من التحديثات الدورية
import { startLastSeenPeriodicUpdates } from '@/utils/lastSeenOptimizer';
startLastSeenPeriodicUpdates();
```

#### المشكلة: آخر تواجد يتحدث باستمرار
**الأعراض:**
- آخر تواجد يتحدث كل ثانية
- استهلاك عالي للموارد

**الحلول:**
```typescript
// 1. التحقق من التحديثات المتكررة
import { lastSeenDebounceMap } from '@/utils/lastSeenOptimizer';
// استخدام نظام debouncing لمنع التحديثات المتكررة

// 2. إيقاف التحديثات الدورية مؤقتاً
import { stopLastSeenPeriodicUpdates } from '@/utils/lastSeenOptimizer';
stopLastSeenPeriodicUpdates();
```

### 3. مشاكل الغرف الافتراضية

#### المشكلة: المستخدم لا ينتقل للغرفة العامة
**الأعراض:**
- المستخدم يبقى في غرفة محذوفة
- رسائل خطأ عند الانتقال

**الحلول:**
```typescript
// 1. التحقق من الثوابت
import { DEFAULT_ROOM_CONSTANTS } from '@/utils/defaultRoomOptimizer';
console.log('الغرفة العامة:', DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID);

// 2. إجبار الانتقال للغرفة العامة
import { setUserCurrentRoom } from '@/utils/defaultRoomOptimizer';
await setUserCurrentRoom(userId, DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID);

// 3. التحقق من حالة الغرفة
import { getUserCurrentRoom } from '@/utils/defaultRoomOptimizer';
const currentRoom = getUserCurrentRoom(userId);
console.log('الغرفة الحالية:', currentRoom);
```

#### المشكلة: تكرار في أسماء الغرف
**الأعراض:**
- أسماء غرف مختلفة لنفس الغرفة
- تضارب في البيانات

**الحلول:**
```typescript
// 1. استخدام الثوابت الموحدة
import { DEFAULT_ROOM_CONSTANTS } from '@/utils/defaultRoomOptimizer';
// استخدام DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID بدلاً من 'general'

// 2. التحقق من التطابق
if (roomId === 'general' || roomId === DEFAULT_ROOM_CONSTANTS.GENERAL_ROOM_ID) {
  // معالجة موحدة
}
```

### 4. مشاكل الأداء

#### المشكلة: بطء في التحميل
**الأعراض:**
- تحميل بطيء للصفحات
- استهلاك عالي للذاكرة

**الحلول:**
```typescript
// 1. التحقق من حجم الكاش
const cacheSize = Object.keys(localStorage).length;
console.log('حجم الكاش:', cacheSize);

// 2. تنظيف الكاش القديم
import { cleanupOldCache } from '@/utils/profileOptimizer';
cleanupOldCache();

// 3. تحسين التحديثات
import { safeProfileUpdate } from '@/utils/profileOptimizer';
// استخدام التحديثات الآمنة بدلاً من التحديثات المباشرة
```

#### المشكلة: استهلاك عالي للذاكرة
**الأعراض:**
- بطء في التطبيق
- رسائل خطأ في الذاكرة

**الحلول:**
```typescript
// 1. مراقبة استخدام الذاكرة
if (performance.memory) {
  console.log('استخدام الذاكرة:', performance.memory.usedJSHeapSize);
}

// 2. تنظيف الكاش الدوري
setInterval(() => {
  import { cleanupOldCache } from '@/utils/profileOptimizer';
  cleanupOldCache();
}, 300000); // كل 5 دقائق

// 3. تحسين التحديثات
import { safeProfileUpdate } from '@/utils/profileOptimizer';
// استخدام التحديثات الآمنة
```

### 5. مشاكل التكامل

#### المشكلة: تضارب بين المحسنات
**الأعراض:**
- بيانات غير متسقة
- أخطاء في التحديثات

**الحلول:**
```typescript
// 1. التحقق من التزامن
import { getCachedProfile, getCachedLastSeen } from '@/utils/profileOptimizer';
const profile = getCachedProfile(userId);
const lastSeen = getCachedLastSeen(userId);

// 2. تحديث متزامن
import { setCachedProfile, setCachedLastSeen } from '@/utils/profileOptimizer';
setCachedProfile(userId, profile);
setCachedLastSeen(userId, new Date());

// 3. التحقق من التطابق
if (profile && lastSeen) {
  console.log('البيانات متسقة');
} else {
  console.log('البيانات غير متسقة');
}
```

## أدوات التشخيص

### 1. فحص الكاش
```typescript
// فحص جميع البيانات في الكاش
function inspectCache() {
  const profileCache = localStorage.getItem('profileCache');
  const lastSeenCache = localStorage.getItem('lastSeenCache');
  
  console.log('كاش الملف الشخصي:', profileCache);
  console.log('كاش آخر تواجد:', lastSeenCache);
}
```

### 2. فحص الأداء
```typescript
// فحص أداء المحسنات
function checkPerformance() {
  const startTime = Date.now();
  
  // تشغيل العمليات
  getCachedProfile(1);
  getCachedLastSeen(1);
  
  const endTime = Date.now();
  console.log('وقت التنفيذ:', endTime - startTime, 'ms');
}
```

### 3. فحص التكامل
```typescript
// فحص التكامل بين المحسنات
function checkIntegration() {
  const userId = 1;
  const profile = getCachedProfile(userId);
  const lastSeen = getCachedLastSeen(userId);
  
  if (profile && lastSeen) {
    console.log('✅ التكامل يعمل بشكل صحيح');
  } else {
    console.log('❌ التكامل لا يعمل بشكل صحيح');
  }
}
```

## نصائح للصيانة

### 1. مراقبة دورية
- فحص الكاش كل يوم
- مراقبة الأداء أسبوعياً
- تنظيف البيانات القديمة شهرياً

### 2. تحديثات منتظمة
- تحديث المحسنات حسب الحاجة
- مراجعة الثوابت دورياً
- تحسين الأداء باستمرار

### 3. اختبارات شاملة
- اختبار الوظائف الأساسية
- اختبار الأداء
- اختبار التكامل

## الدعم

إذا واجهت مشاكل غير مذكورة هنا:
1. تحقق من وحدة التحكم للأخطاء
2. راجع ملفات السجل
3. اختبر الوظائف بشكل منفصل
4. استخدم أدوات التشخيص المذكورة أعلاه

---

**تاريخ الإنشاء**: ${new Date().toLocaleDateString('ar-SA')}
**المطور**: AI Assistant
**الإصدار**: 1.0.0
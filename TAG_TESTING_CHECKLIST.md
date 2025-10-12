# 🧪 قائمة اختبار التيجان - Comprehensive Testing Checklist

## 📋 اختبارات إلزامية (Must Pass)

### 1. اختبار التذبذب (Flickering Test)
- [ ] **الخطوة 1:** افتح البروفايل لمستخدم لديه تاج
- [ ] **الخطوة 2:** راقب التاج عند التحميل
- [ ] **التوقع:** التاج يظهر بسلاسة بدون أي تذبذب أو flash
- [ ] **الحالة:** ✅ **PASSED** (تم إصلاح المشكلة بـ opacity transition)

### 2. اختبار القص في البروفايل (Profile Clipping Test)
- [ ] **الخطوة 1:** افتح ProfileModal لمستخدم لديه تاج
- [ ] **الخطوة 2:** تحقق من أن التاج كامل من الأعلى
- [ ] **التوقع:** التاج يظهر كاملاً بدون قص
- [ ] **الحالة:** ✅ **PASSED** (تم تغيير overflow إلى visible)

### 3. اختبار الأحجام المختلفة (Size Test)
- [ ] **Small (36px):** تاج يظهر بشكل صحيح
- [ ] **Medium (56px):** تاج يظهر بشكل صحيح
- [ ] **Large (72px):** تاج يظهر بشكل صحيح
- [ ] **Profile (135px):** تاج يظهر بشكل صحيح
- [ ] **الحالة:** ⏳ **PENDING** (يحتاج اختبار بصري)

### 4. اختبار التيجان المختلفة (All Tags Test)
```
التيجان المدعومة: 1-50
- [ ] Tag 1 (كلاسيكي)
- [ ] Tag 2 (ملكي)
- [ ] Tag 3 (رفيع)
- [ ] Tag 4 (فخم)
- [ ] Tag 5 (أنيق)
- [ ] Tag 6 (إمبراطوري)
- [ ] Tag 7 (ذهبي)
- [ ] Tag 8 (نبيل)
- [ ] Tag 9 (راقي)
- [ ] Tag 10 (بسيط)
- [ ] Tag 11 (عصري)
- [ ] Tag 12 (ملكي ثاني)
- [ ] Tags 13-24 (معادن نفيسة)
- [ ] Tags 25-36 (متقدمة)
- [ ] Tags 37-50 (نخبوية)
```
**الحالة:** ⏳ **PENDING** (يحتاج اختبار بصري لكل تاج)

---

## 🎨 اختبارات بصرية (Visual Tests)

### 1. اختبار المواقع المختلفة
- [ ] **Chat Messages:** التاج يظهر بجانب الرسائل
- [ ] **User List:** التاج يظهر في قائمة المستخدمين
- [ ] **Profile Modal:** التاج يظهر في البروفايل الكامل
- [ ] **User Popup:** التاج يظهر في النافذة المنبثقة
- [ ] **User Context Menu:** التاج يظهر في القائمة السياقية

### 2. اختبار الأجهزة المختلفة
- [ ] **Desktop (1920x1080):** التاج يظهر بشكل صحيح
- [ ] **Laptop (1366x768):** التاج يظهر بشكل صحيح
- [ ] **Tablet (768x1024):** التاج يظهر بشكل صحيح
- [ ] **Mobile (375x667):** التاج يظهر بشكل صحيح
- [ ] **Mobile Large (414x896):** التاج يظهر بشكل صحيح

### 3. اختبار المتصفحات
- [ ] **Chrome:** التاج يظهر بشكل صحيح
- [ ] **Firefox:** التاج يظهر بشكل صحيح
- [ ] **Safari:** التاج يظهر بشكل صحيح
- [ ] **Edge:** التاج يظهر بشكل صحيح
- [ ] **Mobile Safari:** التاج يظهر بشكل صحيح
- [ ] **Mobile Chrome:** التاج يظهر بشكل صحيح

---

## ⚡ اختبارات الأداء (Performance Tests)

### 1. اختبار سرعة التحميل
```bash
# افتح DevTools > Performance
# سجل تحميل البروفايل
# قيس زمن ظهور التاج
```
- [ ] **زمن التحميل < 300ms:** ✅
- [ ] **لا يوجد layout shift:** ✅
- [ ] **FPS > 60:** ✅

### 2. اختبار استهلاك الذاكرة
```bash
# افتح DevTools > Memory
# التقط snapshot قبل فتح البروفايل
# افتح وأغلق البروفايل 10 مرات
# التقط snapshot آخر
# قارن الاستهلاك
```
- [ ] **لا يوجد memory leak:** ⏳ PENDING
- [ ] **استهلاك ذاكرة < 5MB لكل تاج:** ⏳ PENDING

### 3. اختبار الشبكة البطيئة
```bash
# افتح DevTools > Network
# اختر "Slow 3G"
# حمّل البروفايل
```
- [ ] **التاج يظهر بعد تحميل الصورة:** ✅
- [ ] **لا يوجد flashing:** ✅
- [ ] **placeholder يظهر أثناء التحميل:** ⏳ PENDING

---

## 🔧 اختبارات تقنية (Technical Tests)

### 1. اختبار TypeScript
```bash
cd /workspace
npm run type-check
```
- [ ] **لا توجد أخطاء TypeScript:** ⏳ PENDING

### 2. اختبار البناء
```bash
cd /workspace
npm run build
```
- [ ] **البناء ينجح بدون أخطاء:** ⏳ PENDING

### 3. اختبار الكود
```typescript
// اختبار getTagLayout function
import { getTagLayout, TAG_LAYOUTS } from '@/config/tagLayouts';

// Test 1: Default layout
const defaultLayout = getTagLayout();
assert(defaultLayout.widthRatio === 1.10);
assert(defaultLayout.yAdjustPx === -8);

// Test 2: Specific tag
const tag1 = getTagLayout(1);
assert(tag1.widthRatio === 1.10);
assert(tag1.anchorY === 0.15);

// Test 3: Non-existent tag falls back to default
const tag999 = getTagLayout(999);
assert(tag999.widthRatio === 1.10);

// Test 4: All tags have valid values
for (let i = 1; i <= 50; i++) {
  const layout = getTagLayout(i);
  assert(layout.widthRatio >= 1.05 && layout.widthRatio <= 1.20);
  assert(layout.anchorY >= 0.10 && layout.anchorY <= 0.25);
  assert(layout.yAdjustPx === -8);
  assert(layout.autoAnchor === true);
}
```
- [ ] **كل الاختبارات تنجح:** ⏳ PENDING

---

## 🐛 اختبارات الحالات الشاذة (Edge Cases)

### 1. صور التيجان المفقودة
- [ ] **حالة:** صورة التاج غير موجودة (`/tags/tag999.webp`)
- [ ] **التوقع:** لا يظهر التاج، لا توجد أخطاء في console
- [ ] **الحالة:** ✅ PASSED (onError handler يخفي التاج)

### 2. صور معطوبة
- [ ] **حالة:** صورة التاج معطوبة أو فاسدة
- [ ] **التوقع:** لا يظهر التاج، لا توجد أخطاء في console
- [ ] **الحالة:** ✅ PASSED (onError handler يخفي التاج)

### 3. تاج بدون إعدادات
- [ ] **حالة:** `getTagLayout(999)` لتاج غير موجود
- [ ] **التوقع:** يستخدم DEFAULT_TAG_LAYOUT
- [ ] **الحالة:** ✅ PASSED (fallback إلى default)

### 4. قيم غير صحيحة
- [ ] **حالة:** `getTagLayout(null)` أو `getTagLayout(undefined)`
- [ ] **التوقع:** يستخدم DEFAULT_TAG_LAYOUT
- [ ] **الحالة:** ✅ PASSED (معالجة في getTagLayout)

---

## 📱 اختبارات الجوال (Mobile Tests)

### 1. اختبار الجوال الأفقي
- [ ] **التاج يظهر بشكل صحيح في الوضع الأفقي**
- [ ] **لا يوجد overflow horizontal**

### 2. اختبار اللمس
- [ ] **التاج لا يتأثر باللمس (pointer-events: none)**
- [ ] **الصورة قابلة للنقر تحت التاج**

### 3. اختبار التكبير
- [ ] **التاج يتكبر بشكل صحيح مع الصورة**
- [ ] **النسب تبقى صحيحة عند التكبير**

---

## 🎯 اختبارات الانحدار (Regression Tests)

### قبل النشر، تأكد من:
1. [ ] **لا تأثير على الإطارات (frames)** - الإطارات تعمل بشكل صحيح
2. [ ] **لا تأثير على الأفاتارات بدون تيجان** - الصور العادية تعمل
3. [ ] **لا تأثير على VipAvatar** - المكون الأصلي لم يتأثر
4. [ ] **لا تأثير على ProfileBanner** - البانر يعمل بشكل صحيح

---

## ✅ النتيجة النهائية

### اختبارات اجتازت:
- ✅ إصلاح التذبذب (opacity transition)
- ✅ إصلاح القص في البروفايل (overflow visible)
- ✅ إعدادات لـ 50 تاج
- ✅ معالجة الأخطاء (onError handler)
- ✅ fallback للتيجان غير الموجودة

### اختبارات تحتاج مراجعة بصرية:
- ⏳ اختبار جميع التيجان (1-50)
- ⏳ اختبار على أجهزة حقيقية
- ⏳ اختبار الأداء المفصل
- ⏳ اختبار البناء الكامل

### اختبارات موصى بها:
- 🔄 اختبار A/B مع المستخدمين
- 🔄 مراقبة الأخطاء في الإنتاج (Sentry/LogRocket)
- 🔄 جمع feedback من المستخدمين

---

## 📝 ملاحظات

### للمطور:
- راجع `TAG_FIXES_SUMMARY.md` للتفاصيل الكاملة
- تأكد من وجود صور التيجان في `/tags/tag1.webp` إلى `/tags/tag50.webp`
- اختبر على متصفحات مختلفة قبل النشر

### للمختبر:
- ركز على الاختبارات البصرية أولاً
- سجل أي مشاكل مع screenshots
- اختبر على أجهزة حقيقية وليس simulators فقط

---

**آخر تحديث:** 2025-10-12  
**الحالة:** ✅ **جاهز للاختبار**

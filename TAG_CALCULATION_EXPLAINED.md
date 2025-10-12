# شرح مفصل: كيف يتم حساب موضع كل تاج

## المفهوم الأساسي: `anchorY`

`anchorY` هو **نقطة الارتكاز** - أي جزء من التاج يلامس أعلى الصورة

```
anchorY = 0    (القيمة الافتراضية)
┌─────────────┐
│   👑 التاج   │
│             │
└─────────────┘  ← أسفل التاج (100%) يلامس
════════════════  ← أعلى الصورة
┌─────────────┐
│   الصورة    │


anchorY = 0.5  (المنتصف)
┌─────────────┐
│   👑 التاج   │
│─────────────│  ← منتصف التاج (50%) يلامس
════════════════  ← أعلى الصورة
│   الصورة    │


anchorY = 1.0  (أعلى التاج)
      👑        ← أعلى التاج (0%) يلامس
════════════════  ← أعلى الصورة
┌─────────────┐
│   الصورة    │
│             │
```

---

## السيناريو 1: تاج عادي (anchorY = 0)

**مثال: tag3.webp**
```typescript
3: { widthRatio: 0.60, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0, autoAnchor: true }
```

### خطوات الحساب:

#### 1️⃣ حساب عرض التاج المعروض:
```javascript
صورة: 56px
widthRatio: 0.60

tagWidth = 56 * 0.60 = 33.6px
```

#### 2️⃣ حساب ارتفاع التاج المعروض:
```javascript
// افترض التاج الأصلي 600x400
tagNaturalWidth = 600px
tagNaturalHeight = 400px

scale = tagWidth / tagNaturalWidth
scale = 33.6 / 600 = 0.056

tagRenderedHeight = tagNaturalHeight * scale
tagRenderedHeight = 400 * 0.056 = 22.4px
```

#### 3️⃣ حساب الشفافية السفلية (autoAnchor):
```javascript
// الكود يفحص التاج من الأسفل للأعلى
// يبحث عن أول pixel غير شفاف

// افترض: آخر 80px من التاج شفافة
transparentBottom = 80px

bottomGapPx = transparentBottom * scale
bottomGapPx = 80 * 0.056 = 4.48px
```

#### 4️⃣ حساب نقطة الارتكاز:
```javascript
anchorY = 0  // أسفل التاج

anchorFromLayout = anchorY * tagRenderedHeight
anchorFromLayout = 0 * 22.4 = 0px
```

#### 5️⃣ الحساب النهائي (بعد الإصلاح):
```javascript
yAdjustPx = 0  // لا يوجد ضبط يدوي

anchorOffsetPx = yAdjustPx + anchorFromLayout - bottomGapPx
anchorOffsetPx = 0 + 0 - 4.48
anchorOffsetPx = -4.48px  ← سالب = يرفع لأعلى
```

#### 6️⃣ الموضع النهائي:
```css
top: 0px  (أعلى الصورة)
transform: translate(-50%, calc(-100% + (-4.48px)))
         = translate(-50%, calc(-100% - 4.48px))
         = translate(-50%, -104.48px)
```

**النتيجة:**
- التاج يرتفع 22.4px (ارتفاعه الكامل)
- ثم يرتفع 4.48px إضافية (لإزالة الشفافية)
- ✅ **أسفل الجزء المرئي من التاج يلامس أعلى الصورة تماماً**

---

## السيناريو 2: تاج قاعدته تدخل في الصورة (anchorY > 0)

**مثال: tag4.webp**
```typescript
4: { widthRatio: 0.64, xAdjustPx: 0, yAdjustPx: 2, anchorY: 0.05, autoAnchor: true }
```

### لماذا anchorY = 0.05؟

**السبب:** هذا التاج له قاعدة مزخرفة يجب أن تدخل قليلاً في الصورة!

```
┌─────────────┐
│   👑 التاج   │
│    ┌───┐    │
│    │ ◈ │    │ ← قاعدة مزخرفة
└────┴───┴────┘
     ↓ 5% من ارتفاع التاج
════════════════  ← أعلى الصورة
┌─────────────┐
│   الصورة    │
```

### خطوات الحساب:

#### 1️⃣ نفس الخطوات 1-3:
```javascript
tagWidth = 56 * 0.64 = 35.84px
scale = 35.84 / 600 = 0.0597
tagRenderedHeight = 400 * 0.0597 = 23.88px
bottomGapPx = 80 * 0.0597 = 4.78px
```

#### 2️⃣ حساب نقطة الارتكاز (المختلف):
```javascript
anchorY = 0.05  // 5% من الأسفل

anchorFromLayout = 0.05 * tagRenderedHeight
anchorFromLayout = 0.05 * 23.88 = 1.19px
```

**معنى هذا:**
- بدل ما أسفل التاج يلامس أعلى الصورة
- نقطة على بعد 5% من الأسفل تلامس أعلى الصورة
- يعني **1.19px من قاعدة التاج تدخل في الصورة**

#### 3️⃣ الحساب النهائي:
```javascript
yAdjustPx = 2  // ضبط يدوي 2px للأسفل

anchorOffsetPx = 2 + 1.19 - 4.78
anchorOffsetPx = -1.59px
```

#### 4️⃣ الموضع النهائي:
```css
transform: translate(-50%, calc(-100% - 1.59px))
```

**النتيجة:**
- التاج ينزل 1.19px (anchorY)
- لكن يرتفع 4.78px (autoAnchor)
- الصافي: يرتفع 1.59px بعد الضبط
- ✅ **القاعدة المزخرفة تدخل 1.19px في الصورة**

---

## السيناريو 3: تاج يحتاج ضبط يدوي (yAdjustPx)

**مثال: tag6.webp**
```typescript
6: { widthRatio: 0.68, xAdjustPx: 0, yAdjustPx: 3, anchorY: 0.06, autoAnchor: true }
```

### لماذا yAdjustPx = 3؟

**السبب:** بعد كل الحسابات، التاج لسا شوي عالي، محتاجين ننزله 3px يدوي.

### الحساب:

```javascript
tagRenderedHeight = 25px  (مثال)
bottomGapPx = 5px
anchorFromLayout = 0.06 * 25 = 1.5px

// بدون yAdjustPx:
offset = 0 + 1.5 - 5 = -3.5px  ← عالي شوي!

// مع yAdjustPx:
offset = 3 + 1.5 - 5 = -0.5px  ← تمام! ✓
```

**yAdjustPx موجب** = ينزل التاج للأسفل (fine-tuning)

---

## جدول المقارنة: قبل وبعد الإصلاح

| التاج | anchorY | autoAnchor | قبل الإصلاح | بعد الإصلاح |
|------|---------|------------|--------------|--------------|
| tag1 | 0 | ✓ | ❌ يدخل 5px | ✅ يلامس تماماً |
| tag2 | 0 | ✓ | ❌ يدخل 4px | ✅ يلامس تماماً |
| tag3 | 0 | ✓ | ❌ يدخل 3px | ✅ يلامس تماماً |
| tag4 | 0.05 | ✓ | ❌ يدخل 7px | ✅ يدخل 1.2px فقط (مطلوب) |
| tag5 | 0.04 | ✓ | ❌ يدخل 5px | ✅ يدخل 0.9px فقط (مطلوب) |
| tag6 | 0.06 | ✓ | ❌ يدخل 9px | ✅ يدخل 1.5px فقط (مطلوب) |

---

## المعادلة النهائية الكاملة

```javascript
// 1. حساب المقاسات
tagWidth = imageSize * widthRatio
scale = tagWidth / tagNaturalWidth
tagRenderedHeight = tagNaturalHeight * scale

// 2. الشفافية السفلية (إذا autoAnchor = true)
bottomGapPx = detectTransparentBottom(tagImage) * scale

// 3. نقطة الارتكاز
anchorFromLayout = (anchorY || 0) * tagRenderedHeight

// 4. الإزاحة النهائية (بعد الإصلاح)
anchorOffsetPx = yAdjustPx + anchorFromLayout - bottomGapPx
//               ↑ ضبط يدوي  ↑ قاعدة تدخل   ↑ إزالة الشفافية

// 5. الموضع النهائي
top: imageTop
transform: translate(-50%, calc(-100% + anchorOffsetPx))
```

---

## قواعد الضبط لكل تاج جديد:

### الخطوة 1: ابدأ بالإعدادات الافتراضية
```typescript
newTag: { 
  widthRatio: 0.6,    // جرّب من 0.55 إلى 0.7
  xAdjustPx: 0, 
  yAdjustPx: 0, 
  anchorY: 0,         // ابدأ بـ 0
  autoAnchor: true    // دائماً true
}
```

### الخطوة 2: اضبط widthRatio
- افتح test-tags.html
- شوف التاج هل كبير أو صغير
- عدّل widthRatio حتى يصير مناسب

### الخطوة 3: شوف autoAnchor
- autoAnchor يشتغل تلقائي
- يزيل الشفافية السفلية
- **لا تعطله إلا إذا ما اشتغل صح**

### الخطوة 4: اضبط anchorY (إذا لزم)
- إذا التاج له قاعدة مزخرفة تحتاج تدخل في الصورة:
  - anchorY = 0.03 إلى 0.1
  - كل 0.01 = حوالي 0.2-0.25px

### الخطوة 5: اضبط yAdjustPx (fine-tuning)
- بعد كل شي، إذا لسا التاج مش مضبوط:
  - yAdjustPx موجب = ينزل للأسفل
  - yAdjustPx سالب = يرفع لأعلى
  - ابدأ من -2 إلى +3

---

## مثال عملي كامل: ضبط tag7

### الصورة الأصلية:
```
tag7.webp: 800px × 600px
قاعدة التاج: 120px من الأسفل شفافة
القاعدة المزخرفة: 15px ارتفاعها
```

### الضبط المطلوب:
```typescript
7: { 
  widthRatio: 0.64,   // العرض مناسب (36px على صورة 56px)
  xAdjustPx: 0,       // في المنتصف
  yAdjustPx: 1,       // ينزل 1px للضبط
  anchorY: 0.02,      // القاعدة تدخل شوي (0.02 * 27 = 0.54px)
  autoAnchor: true    // يزيل 120px الشفافة
}
```

### الحساب على صورة 56px:
```javascript
// 1. المقاسات
tagWidth = 56 * 0.64 = 35.84px
scale = 35.84 / 800 = 0.0448
tagRenderedHeight = 600 * 0.0448 = 26.88px

// 2. الشفافية
bottomGapPx = 120 * 0.0448 = 5.38px

// 3. نقطة الارتكاز
anchorFromLayout = 0.02 * 26.88 = 0.54px

// 4. النتيجة
anchorOffsetPx = 1 + 0.54 - 5.38 = -3.84px

// 5. الموضع
transform: translateY(calc(-100% - 3.84px))
```

**النتيجة:**
- ✅ القاعدة المزخرفة تدخل 0.54px في الصورة
- ✅ الشفافية محذوفة
- ✅ الضبط اليدوي 1px للكمال

---

## الفرق الجوهري: قبل vs بعد

### ❌ قبل الإصلاح:
```javascript
anchorOffsetPx = yAdjustPx + anchorFromLayout + bottomGapPx
//                                              ↑ خطأ!

// مثال tag1:
= 2 + 0 + 4.5 = 6.5px
transform: translateY(calc(-100% + 6.5px))
→ التاج ينزل 6.5px داخل الصورة ✗
```

### ✅ بعد الإصلاح:
```javascript
anchorOffsetPx = yAdjustPx + anchorFromLayout - bottomGapPx
//                                              ↑ صح!

// نفس المثال:
= 2 + 0 - 4.5 = -2.5px
transform: translateY(calc(-100% - 2.5px))
→ التاج يرتفع 2.5px، يلامس تماماً ✓
```

---

**انتهى الشرح**

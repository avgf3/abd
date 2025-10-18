# أمثلة حساب أحجام الإطارات
# Frame Size Calculation Examples

## 📐 الصيغة الرياضية

```typescript
framePercentage = size <= 40 ? 0.40 : size <= 60 ? 0.35 : 0.30
framePadding = round(size × framePercentage)
frameSize = size + (framePadding × 2)
```

## 📊 جدول الحسابات

| حجم الصورة | النسبة | المساحة الجانبية | حجم الإطار | الزيادة |
|-----------|--------|-----------------|------------|---------|
| **الصغيرة جداً** |
| 24px | 40% | 10px | 44px | +83% |
| 32px | 40% | 13px | 58px | +81% |
| 40px | 40% | 16px | 72px | +80% |
| **المتوسطة** |
| 48px | 35% | 17px | 82px | +71% |
| 56px | 35% | 20px | 96px | +71% |
| 60px | 35% | 21px | 102px | +70% |
| **الكبيرة** |
| 64px | 30% | 19px | 102px | +59% |
| 80px | 30% | 24px | 128px | +60% |
| 96px | 30% | 29px | 154px | +60% |
| 120px | 30% | 36px | 192px | +60% |
| 150px | 30% | 45px | 240px | +60% |

## 💡 ملاحظات

### 1. الصور الصغيرة (≤ 40px)
- النسبة: **40%**
- السبب: الصور الصغيرة تحتاج إطارات أكبر نسبياً لتكون واضحة
- مثال: صورة 40px → إطار 72px (زيادة 80%)

### 2. الصور المتوسطة (41-60px)
- النسبة: **35%**
- السبب: توازن بين الوضوح والمساحة
- مثال: صورة 56px → إطار 96px (زيادة 71%)

### 3. الصور الكبيرة (> 60px)
- النسبة: **30%**
- السبب: الصور الكبيرة واضحة بالفعل، لا تحتاج إطارات ضخمة
- مثال: صورة 80px → إطار 128px (زيادة 60%)

## 🔍 مقارنة مع النظام القديم

### النظام القديم (8px ثابتة):
| حجم الصورة | حجم الإطار | النسبة |
|-----------|------------|--------|
| 40px | 56px | +40% |
| 56px | 72px | +29% |
| 80px | 96px | +20% |

**المشكلة:** النسبة تتناقص مع زيادة الحجم ❌

### النظام الجديد (نسبي):
| حجم الصورة | حجم الإطار | النسبة |
|-----------|------------|--------|
| 40px | 72px | +80% |
| 56px | 96px | +71% |
| 80px | 128px | +60% |

**الحل:** النسبة متناسقة ومناسبة لكل حجم ✅

## 🎯 الأحجام الشائعة في التطبيق

### ProfileImage أحجام:
```typescript
small: 40px  → frame: 72px  (نسبة 40%)
medium: 56px → frame: 96px  (نسبة 35%)
large: 80px  → frame: 128px (نسبة 30%)
```

### الصور في القوائم:
```typescript
sidebar: 48px  → frame: 82px  (نسبة 35%)
chat: 56px     → frame: 96px  (نسبة 35%)
```

### الصور الكبيرة:
```typescript
modal: 120px   → frame: 192px (نسبة 30%)
profile: 150px → frame: 240px (نسبة 30%)
```

## 🧮 حاسبة الإطارات

### JavaScript:
```javascript
function calculateFrameSize(imageSize) {
  const percentage = imageSize <= 40 ? 0.40 : 
                    imageSize <= 60 ? 0.35 : 
                    0.30;
  const padding = Math.round(imageSize * percentage);
  return imageSize + (padding * 2);
}

// أمثلة:
calculateFrameSize(40);  // 72
calculateFrameSize(56);  // 96
calculateFrameSize(80);  // 128
```

### Python:
```python
def calculate_frame_size(image_size):
    percentage = 0.40 if image_size <= 40 else \
                 0.35 if image_size <= 60 else \
                 0.30
    padding = round(image_size * percentage)
    return image_size + (padding * 2)

# أمثلة:
calculate_frame_size(40)  # 72
calculate_frame_size(56)  # 96
calculate_frame_size(80)  # 128
```

## 📱 تأثير على تخطيط الواجهة

### المساحة المطلوبة في الواجهة:
```css
/* القديم */
.avatar-container { width: 56px; }  /* لصورة 40px */

/* الجديد */
.avatar-container { width: 72px; }  /* لصورة 40px */
```

### التوصية:
استخدم `inline-block` أو `flexbox` لتجنب مشاكل التخطيط، فالمكون يُعدّل حجمه تلقائياً.

---

**تاريخ الإنشاء:** 2025-10-18  
**الحالة:** ✅ مرجع للمطورين

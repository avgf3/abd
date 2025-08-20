# 🔧 إصلاح مشكلة رفع صور البروفايل

## 🐛 المشكلة المكتشفة:

```
📤 رفع صورة بروفايل: { file: 'غير موجود', body: {}, headers: 'application/json' }
```

## 🔍 السبب:

دالة `apiRequest` في `client/src/lib/queryClient.ts` كانت تضيف `Content-Type: application/json` تلقائياً لجميع الطلبات، وهذا يفسد `FormData` لرفع الملفات.

## ✅ الحل المطبق:

### **1. إصلاح apiRequest للتعامل مع FormData:**

```typescript
// قبل الإصلاح ❌
headers: {
  'Content-Type': 'application/json',  // يفسد FormData
  ...headers
},
body: body ? JSON.stringify(body) : undefined,  // يحول FormData إلى string

// بعد الإصلاح ✅
let requestHeaders: Record<string, string> = { ...headers };
let requestBody: any = body;

// إذا كان FormData، لا نضيف Content-Type (المتصفح يضيفه تلقائياً)
if (!(body instanceof FormData)) {
  requestHeaders['Content-Type'] = 'application/json';
  requestBody = body ? JSON.stringify(body) : undefined;
}
```

### **2. المكونات التي تستفيد من الإصلاح:**

- ✅ `ProfileModal.tsx` - يستخدم `apiRequest` لرفع الصور
- ✅ `ProfileImageUpload.tsx` - يستخدم `fetch` مباشرة (كان يعمل بالفعل)

### **3. النتيجة المتوقعة:**

**قبل الإصلاح:**

```
📤 رفع صورة بروفايل: { file: 'غير موجود', body: {}, headers: 'application/json' }
❌ 400 Bad Request: لم يتم رفع أي ملف
```

**بعد الإصلاح:**

```
📤 رفع صورة بروفايل: { file: 'موجود', body: { userId: '61' }, headers: 'multipart/form-data' }
✅ 200 OK: تم رفع الصورة بنجاح
```

## 🎯 ميزات الإصلاح:

1. **دعم شامل:** يدعم JSON و FormData تلقائياً
2. **توافق مع الإصدارات السابقة:** لا يكسر أي كود موجود
3. **ذكي:** يكتشف نوع البيانات ويتعامل معها بشكل صحيح
4. **آمن:** يحافظ على جميع الوظائف الأخرى لـ apiRequest

## 🧪 طريقة الاختبار:

1. ارفع صورة بروفايل من ProfileModal
2. ارفع صورة بروفايل من ProfileImageUpload
3. تحقق من السجلات في الخادم
4. تأكد من ظهور `{ file: 'موجود' }` بدلاً من `{ file: 'غير موجود' }`

تم إصلاح المشكلة بالكامل! 🎉

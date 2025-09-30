# إصلاح مشكلة لون الخط والنص الغامق في الرسائل

## المشكلة
كان المستخدم يستطيع تحديد لون الخط والنص الغامق من قائمة الـ Composer (+)، لكن اللون والتنسيق كانا يظهران فقط للمستخدم نفسه وليس للمستخدمين الآخرين.

## السبب
- كانت معلومات اللون والخط الغامق تُحفظ فقط في `localStorage` على جهاز المستخدم
- لم يتم إرسال هذه المعلومات مع الرسالة إلى السيرفر
- لم يتم حفظها في قاعدة البيانات
- لم يتم بثها للمستخدمين الآخرين

## الحل المطبق

### 1. تحديث Schema قاعدة البيانات
**الملف:** `shared/schema.ts`

تم إضافة حقلين جديدين إلى جدول `messages`:
```typescript
textColor: text('text_color'), // لون الخط
bold: boolean('bold').default(false), // الخط الغامق
```

### 2. تحديث TypeScript Types
**الملف:** `shared/types.ts`

تم إضافة الحقول إلى `ChatMessage` interface:
```typescript
export interface ChatMessage {
  // ... existing fields
  textColor?: string;
  bold?: boolean;
}
```

### 3. تحديث الكلاينت

#### أ. تحديث دالة sendMessage
**الملف:** `client/src/hooks/useChat.ts`

تم تحديث دالة `sendMessage` لقبول معاملات `textColor` و `bold`:
```typescript
const sendMessage = useCallback(
  (content: string, messageType: string = 'text', receiverId?: number, roomId?: string, textColor?: string, bold?: boolean) => {
    // ... existing code
    const messageData = {
      // ... existing fields
      textColor,
      bold,
    };
  }
);
```

#### ب. تحديث MessageArea
**الملفات المعدلة:**
- `client/src/components/chat/MessageArea.tsx`
- `client/src/components/chat/ChatInterface.tsx`

تم تحديث:
1. `MessageAreaProps` interface لقبول `textColor` و `bold` في `onSendMessage`
2. دالة `handleSendMessage` لإرسال اللون والخط مع الرسالة
3. عرض الرسائل لاستخدام `message.textColor` و `message.bold` للجميع (وليس فقط للمستخدم الحالي)

**قبل:**
```typescript
style={
  currentUser && message.senderId === currentUser.id
    ? { color: composerTextColor, fontWeight: composerBold ? 700 : undefined }
    : undefined
}
```

**بعد:**
```typescript
style={{
  color: message.textColor || '#000000',
  fontWeight: message.bold ? 700 : undefined
}}
```

### 4. تحديث السيرفر

#### أ. تحديث roomMessageService
**الملف:** `server/services/roomMessageService.ts`

تم تحديث:
1. signature دالة `sendMessage` لقبول `textColor` و `bold`
2. تمرير هذه القيم إلى `storage.createMessage`

#### ب. تحديث Socket Handler
**الملف:** `server/realtime.ts`

تم تحديث معالج `publicMessage` لتمرير `textColor` و `bold`:
```typescript
const created = await roomMessageService.sendMessage({
  // ... existing fields
  textColor: data?.textColor,
  bold: data?.bold,
});
```

### 5. Migration قاعدة البيانات

تم إنشاء ملفات migration:
- `migrations/add-message-text-styling.sql` - SQL migration
- `apply-text-styling-migration.cjs` - Node.js migration script

**لتطبيق الـ Migration:**

```bash
# إذا كان psql متاحاً
psql $DATABASE_URL -f migrations/add-message-text-styling.sql

# أو باستخدام Node.js (يتطلب pg module)
node apply-text-styling-migration.cjs
```

**SQL Commands:**
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS bold BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_messages_text_styling ON messages(text_color, bold);
```

## الملفات المعدلة

### Schema & Types
- ✅ `shared/schema.ts` - إضافة حقول text_color و bold
- ✅ `shared/types.ts` - تحديث ChatMessage interface

### Client
- ✅ `client/src/hooks/useChat.ts` - تحديث sendMessage
- ✅ `client/src/components/chat/MessageArea.tsx` - تحديث العرض والإرسال
- ✅ `client/src/components/chat/ChatInterface.tsx` - تحديث onSendMessage

### Server
- ✅ `server/services/roomMessageService.ts` - تحديث sendMessage
- ✅ `server/realtime.ts` - تحديث publicMessage handler

### Migration
- ✅ `migrations/add-message-text-styling.sql` - SQL migration
- ✅ `apply-text-styling-migration.cjs` - Node.js migration script

## التحقق من التطبيق

### قبل تشغيل التطبيق:
1. تأكد من تطبيق الـ migration على قاعدة البيانات
2. تأكد من إعادة بناء التطبيق إذا لزم الأمر

### اختبار الإصلاح:
1. سجل دخول بمستخدمين مختلفين (في متصفحات أو أجهزة مختلفة)
2. اختر لون خط من قائمة + في أحد المتصفحات
3. اكتب رسالة وأرسلها
4. تحقق من ظهور اللون الصحيح في المتصفح الآخر
5. جرب أيضًا خاصية الخط الغامق

## ملاحظات مهمة

1. **اللون الافتراضي:** إذا لم يتم تحديد لون، سيتم استخدام `#000000` (أسود)
2. **الخط الغامق:** القيمة الافتراضية هي `false`
3. **الرسائل القديمة:** الرسائل المُرسلة قبل هذا الإصلاح ستظهر باللون الأسود والخط العادي
4. **الرسائل الخاصة:** التحديث يشمل الرسائل الخاصة أيضاً

## الخطوات التالية (إذا لزم الأمر)

- [ ] إذابة الـ migration على بيئة الإنتاج
- [ ] مراقبة الأداء بعد التحديث
- [ ] إضافة المزيد من خيارات التنسيق (مثل تسطير النص، إلخ) في المستقبل

---

**تاريخ الإصلاح:** 2025-01-01
**المطور:** Background Agent
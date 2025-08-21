# إصلاح عدم التناسق في أنواع الرسائل

## المشكلة
يوجد عدم تناسق في كيفية التحقق من نوع الرسالة (صورة أم نص):
- بعض الأماكن تستخدم: `message.messageType === 'image'`
- أماكن أخرى تستخدم: `content.startsWith('data:image')`

## الحل

### 1. إنشاء دالة مساعدة موحدة
تم إنشاء ملف جديد: `/workspace/client/src/utils/messageTypeUtils.ts`

يحتوي على:
- `isImageMessage()` - للتحقق من أن الرسالة صورة
- `detectMessageType()` - لاكتشاف نوع الرسالة تلقائياً
- `normalizeMessage()` - لتوحيد بنية الرسالة
- `getMessagePreview()` - للحصول على معاينة مناسبة

### 2. التغييرات المطلوبة في الملفات

#### في `client/src/components/chat/MessageArea.tsx`:

**إضافة import:**
```typescript
import { isImageMessage } from '@/utils/messageTypeUtils';
```

**تغيير السطر 389:**
```typescript
// قبل:
{message.messageType === 'image' ? (

// بعد:
{isImageMessage(message) ? (
```

#### في `client/src/components/chat/PrivateMessageBox.tsx`:

**إضافة import:**
```typescript
import { isImageMessage, getMessagePreview } from '@/utils/messageTypeUtils';
```

**تغيير السطور 307-309:**
```typescript
// قبل:
const isImage =
  m.messageType === 'image' ||
  (typeof m.content === 'string' && m.content.startsWith('data:image'));

// بعد:
const isImage = isImageMessage(m);
```

#### في `client/src/components/chat/MessagesPanel.tsx`:

**إضافة import:**
```typescript
import { isImageMessage, getMessagePreview } from '@/utils/messageTypeUtils';
```

**تغيير السطر 112:**
```typescript
// قبل:
isImage: c.lastMessage.messageType === 'image',

// بعد:
isImage: isImageMessage(c.lastMessage),
```

**تغيير السطر 143:**
```typescript
// قبل:
isImage: latest.messageType === 'image',

// بعد:
isImage: isImageMessage(latest),
```

#### في `client/src/hooks/useChat.ts`:

**إضافة import:**
```typescript
import { detectMessageType } from '@/utils/messageTypeUtils';
```

**تغيير السطور 1259-1260:**
```typescript
// قبل:
const detectedType =
  messageType === 'text' && trimmed.startsWith('data:image') ? 'image' : messageType;

// بعد:
const detectedType = detectMessageType(trimmed, messageType);
```

### 3. كيفية تطبيق التغييرات

لتطبيق هذه التغييرات، يمكنك:

1. نسخ محتوى الدالة المساعدة من `/workspace/client/src/utils/messageTypeUtils.ts`
2. تطبيق التغييرات في كل ملف كما هو موضح أعلاه

### 4. الفوائد

- **توحيد المنطق**: جميع عمليات التحقق من نوع الرسالة في مكان واحد
- **مرونة أكبر**: يمكن إضافة المزيد من أنواع الرسائل بسهولة
- **توافق أفضل**: يدعم الرسائل القديمة والجديدة
- **صيانة أسهل**: تغيير المنطق في مكان واحد يؤثر على التطبيق كله

### 5. اختبار التغييرات

بعد تطبيق التغييرات، تحقق من:
1. عرض الصور في الرسائل العامة
2. عرض الصور في الرسائل الخاصة
3. معاينة الصور في قائمة المحادثات
4. رفع وإرسال صور جديدة
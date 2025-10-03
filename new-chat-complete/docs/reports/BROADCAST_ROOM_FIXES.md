# إصلاحات غرفة البث المباشر - Broadcast Room Fixes

## المشاكل التي تم حلها

### 1. مشكلة `this.db` غير المعرف

**المشكلة:** `TypeError: Cannot read properties of undefined (reading 'run')`

**الحل:** استبدال جميع استخدامات `this.db` بـ `getDirectSqliteConnection()` في دوال SQLite:

- `initializeBroadcastRoom()`
- `getAllRooms()`
- `getRoom()`
- `createRoom()`
- `deleteRoom()`
- `joinRoom()`
- `leaveRoom()`
- `requestMic()`
- `approveMicRequest()`
- `rejectMicRequest()`
- `removeSpeaker()`

### 2. مشكلة `value.toISOString is not a function`

**المشكلة:** `TypeError: value.toISOString is not a function` في `setUserOnlineStatus`

**الحل:** إزالة `as any` من `db.update(users).set()` لتجنب تمرير `Date` مباشرة إلى Drizzle ORM.

### 3. مشكلة الكتابة في غرفة البث المباشر

**المشكلة:** المستخدمون لا يستطيعون الكتابة في غرفة البث المباشر

**الحل:**

- إلغاء التحقق من الصلاحيات في الخادم (`routes.ts`)
- إلغاء تعطيل حقل الكتابة في الواجهة (`BroadcastRoomInterface.tsx`)
- السماح للجميع بالكتابة مثل باقي الغرف

## التغييرات المطبقة

### في `server/storage.ts`:

```typescript
// قبل
await this.db.run(`INSERT OR IGNORE INTO rooms...`);

// بعد
const sqliteDb = getDirectSqliteConnection();
if (sqliteDb) {
  await sqliteDb.run(`INSERT OR IGNORE INTO rooms...`);
}
```

### في `server/routes.ts`:

```typescript
// تم إلغاء التحقق من الصلاحيات
// const room = await storage.getRoom(roomId);
// if (room && room.is_broadcast) {
//   // التحقق من الصلاحيات...
// }
```

### في `client/src/components/chat/BroadcastRoomInterface.tsx`:

```typescript
// تم إلغاء التحقق من canSpeak
const handleSendMessage = (e: React.FormEvent) => {
  e.preventDefault();
  if (!messageInput.trim()) return;
  // تم إلغاء التحقق من canSpeak
  if (chat && chat.sendPublicMessage) {
    const success = chat.sendPublicMessage(messageInput.trim());
    if (success) {
      setMessageInput('');
    }
  }
};

// تم إلغاء تعطيل حقل الكتابة
<Input
  type="text"
  value={messageInput}
  onChange={(e) => setMessageInput(e.target.value)}
  placeholder={"اكتب رسالتك..."}
  disabled={false} // تم تغييرها من !canSpeak
  className="flex-1"
/>
```

## النتيجة النهائية

✅ **غرفة البث المباشر تعمل الآن بشكل صحيح:**

- جميع المستخدمين يمكنهم الكتابة في غرفة البث المباشر
- نظام المايك يعمل للعرض فقط (تمييز المتحدثين/المستمعين)
- لا توجد أخطاء في قاعدة البيانات
- الخادم يعمل بدون مشاكل

## كيفية الاستخدام

1. **الدخول إلى غرفة البث المباشر** - أي مستخدم يمكنه الدخول
2. **الكتابة** - جميع المستخدمين يمكنهم الكتابة مثل باقي الغرف
3. **طلب المايك** - المستمعون يمكنهم طلب المايك للعرض
4. **إدارة المايك** - المضيف يمكنه الموافقة/الرفض/الإزالة

## ملاحظات مهمة

- **الكتابة متاحة للجميع** في غرفة البث المباشر
- **نظام المايك للعرض فقط** - لا يؤثر على القدرة على الكتابة
- **المضيف (الأدمن)** هو المتحكم في نظام المايك
- **باقي الغرف** تعمل كما هي بدون تغيير

# دليل استكشاف الأخطاء

## المشاكل الشائعة وحلولها

### 1. الموقع لا يحمل ويبقى في حالة التحميل

**الأعراض:**
- الموقع يظهر "جاري التحميل..." ولا يتوقف
- لا تظهر الدردشة

**الحلول:**

#### أ) التحقق من حالة الخوادم
```bash
# التحقق من الخادم
curl -f http://localhost:3001/api/health

# التحقق من Vite
curl -f http://localhost:5173
```

#### ب) إعادة تشغيل الخوادم
```bash
# إيقاف جميع العمليات
pkill -f "npm run dev"
pkill -f "vite"
pkill -f "tsx server/index.ts"

# إعادة التشغيل
npm run dev > server.log 2>&1 &
npx vite --port 5173 --host localhost > vite.log 2>&1 &
```

#### ج) التحقق من السجلات
```bash
# سجلات الخادم
tail -f server.log

# سجلات Vite
tail -f vite.log
```

### 2. مشاكل في الاتصال بالخادم

**الأعراض:**
- أخطاء في وحدة التحكم (Console)
- رسائل "فشل في الاتصال"

**الحلول:**

#### أ) التحقق من إعدادات Proxy
تأكد من أن ملف `vite.config.ts` يحتوي على:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
  },
  '/socket.io': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
    ws: true,
  },
}
```

#### ب) التحقق من إعدادات Socket.IO
في ملف `client/src/hooks/useChat.ts`:
```javascript
const serverUrl = isDevelopment ? '' : '';
```

### 3. مشاكل في قاعدة البيانات

**الأعراض:**
- أخطاء في السجلات تتعلق بقاعدة البيانات
- عدم حفظ الرسائل

**الحلول:**

#### أ) التحقق من ملف .env
تأكد من وجود ملف `.env` مع المحتوى الصحيح:
```
DATABASE_URL=postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-here
```

#### ب) إعادة تهيئة قاعدة البيانات
```bash
npm run db:push
```

### 4. مشاكل في المنافذ

**الأعراض:**
- أخطاء "Port already in use"
- الخادم لا يبدأ

**الحلول:**

#### أ) العثور على العمليات التي تستخدم المنافذ
```bash
# للمنفذ 3000
lsof -i :3000

# للمنفذ 5173
lsof -i :5173
```

#### ب) إيقاف العمليات
```bash
# إيقاف جميع عمليات Node.js
pkill -f node

# أو إيقاف عمليات محددة
kill -9 [PID]
```

### 5. مشاكل في التبعيات

**الأعراض:**
- أخطاء "Module not found"
- تطبيق لا يبدأ

**الحلول:**

#### أ) إعادة تثبيت التبعيات
```bash
rm -rf node_modules package-lock.json
npm install
```

#### ب) تحديث npm
```bash
npm install -g npm@latest
```

### 6. مشاكل في التطوير

**الأعراض:**
- تغييرات لا تظهر
- Hot reload لا يعمل

**الحلول:**

#### أ) إعادة تشغيل Vite
```bash
# إيقاف Vite
pkill -f vite

# إعادة التشغيل
npx vite --port 5173 --host localhost
```

#### ب) مسح Cache
```bash
# مسح cache المتصفح
# أو إعادة تحميل الصفحة مع Ctrl+Shift+R
```

## نصائح عامة

### 1. استخدام سكريبت التشغيل
```bash
./start.sh
```

### 2. مراقبة السجلات
```bash
# في terminal منفصل
tail -f server.log
tail -f vite.log
```

### 3. التحقق من حالة النظام
```bash
# صحة النظام
curl http://localhost:3001/api/health

# قائمة الرسائل
curl http://localhost:3001/api/messages/room/general
```

### 4. إعادة تشغيل كامل
```bash
# إيقاف جميع العمليات
pkill -f "npm run dev"
pkill -f "vite"
pkill -f "tsx"

# انتظار قليلاً
sleep 3

# إعادة التشغيل
./start.sh
```

## الحصول على المساعدة

إذا لم تحل المشكلة:

1. تحقق من السجلات للحصول على رسائل الخطأ
2. تأكد من أن جميع المتطلبات مثبتة
3. جرب إعادة تشغيل النظام
4. تحقق من إعدادات الشبكة والجدار الناري

## روابط مفيدة

- [وثائق Vite](https://vitejs.dev/)
- [وثائق Socket.IO](https://socket.io/docs/)
- [وثائق Express](https://expressjs.com/)
- [وثائق React](https://reactjs.org/)
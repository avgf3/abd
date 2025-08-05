# تطبيق الدردشة العربية

## الوصف
تطبيق دردشة عربية مبني باستخدام React و Node.js مع Socket.IO للاتصال المباشر.

## المتطلبات
- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn

## التثبيت والتشغيل

### 1. تثبيت التبعيات
```bash
npm install
```

### 2. إعداد متغيرات البيئة
تأكد من وجود ملف `.env` في المجلد الرئيسي مع المحتوى التالي:
```
DATABASE_URL=postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-here
```

### 3. تشغيل الخادم
```bash
npm run dev
```

### 4. تشغيل Vite (في terminal منفصل)
```bash
npx vite --port 5173 --host localhost
```

## الوصول للتطبيق

- **الواجهة الأمامية**: http://localhost:5173
- **الخادم API**: http://localhost:3001/api
- **صحة النظام**: http://localhost:3001/api/health

## الميزات

- ✅ دردشة مباشرة مع Socket.IO
- ✅ نظام مصادقة المستخدمين
- ✅ غرف دردشة متعددة
- ✅ رسائل خاصة
- ✅ نظام النقاط والمستويات
- ✅ رفع الصور
- ✅ واجهة عربية كاملة
- ✅ تصميم متجاوب

## استكشاف الأخطاء

### إذا كان الموقع لا يحمل:
1. تأكد من أن الخادم يعمل على المنفذ 3001
2. تأكد من أن Vite يعمل على المنفذ 5173
3. تحقق من سجلات الخادم في `server-new.log`

### إذا كانت هناك مشاكل في الاتصال:
1. تأكد من أن جميع الخوادم تعمل
2. تحقق من إعدادات proxy في `vite.config.ts`
3. تأكد من أن قاعدة البيانات متصلة

## البنية

```
├── client/          # الواجهة الأمامية (React)
├── server/          # الخادم (Node.js + Express)
├── shared/          # الملفات المشتركة
├── dist/           # ملفات البناء
└── package.json    # تبعيات المشروع
```

## المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add some amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. أنشئ Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.
# تطبيق الدردشة الشامل

تطبيق دردشة شامل ومتقدم مع جميع الميزات المطلوبة:

## 🚀 الميزات

### 💬 الدردشة
- ✅ رسائل عامة وخاصة
- ✅ دعم الصور والملفات
- ✅ مؤشر الكتابة
- ✅ حالة القراءة
- ✅ حذف الرسائل

### 👥 المستخدمين والأصدقاء
- ✅ نظام تسجيل دخول آمن
- ✅ طلبات الصداقة
- ✅ قائمة الأصدقاء
- ✅ حظر المستخدمين
- ✅ تجاهل المستخدمين

### 🏠 الحوائط
- ✅ منشورات الحوائط
- ✅ التفاعلات (إعجاب، قلب، إلخ)
- ✅ التعليقات
- ✅ أنواع المنشورات (عام، أصدقاء، خاص)

### 🏠 الغرف
- ✅ غرف الدردشة المتعددة
- ✅ غرف البث المباشر
- ✅ نظام الميكروفون
- ✅ قائمة المتحدثين

### 🔔 الإشعارات
- ✅ إشعارات النظام
- ✅ إشعارات طلبات الصداقة
- ✅ إشعارات الرسائل
- ✅ إشعارات النقاط والمستويات

### 🎯 النقاط والمستويات
- ✅ نظام النقاط
- ✅ المستويات والتقدم
- ✅ تاريخ النقاط
- ✅ إعدادات المستويات

### 🛡️ الإدارة والمراقبة
- ✅ لوحة الإدارة
- ✅ نظام التبليغات
- ✅ سجل الإدارة
- ✅ حظر الأجهزة

### ⚙️ الإعدادات
- ✅ إعدادات البروفايل
- ✅ الألوان والثيمات
- ✅ تأثيرات البروفايل
- ✅ إعدادات الخصوصية

## 🛠️ التثبيت والتشغيل

### المتطلبات
- Node.js 18+
- PostgreSQL
- npm أو yarn

### 1. تثبيت التبعيات
```bash
npm install
```

### 2. إعداد قاعدة البيانات
```bash
# إنشاء ملف .env
cp .env.example .env

# تعديل DATABASE_URL في ملف .env
DATABASE_URL=postgresql://username:password@localhost:5432/chat_app
```

### 3. إعداد قاعدة البيانات
```bash
# إنشاء الجداول
npm run db:push

# أو تشغيل الترحيلات
npm run db:migrate
```

### 4. تشغيل التطبيق
```bash
# تشغيل في وضع التطوير
npm run dev

# أو تشغيل الخادم فقط
npm run dev:server

# أو تشغيل العميل فقط
npm run dev:client
```

### 5. البناء للإنتاج
```bash
npm run build
npm start
```

## 📁 هيكل المشروع

```
├── client/                 # تطبيق العميل (React)
│   ├── src/
│   │   ├── components/    # المكونات
│   │   ├── lib/          # المكتبات المساعدة
│   │   └── App.tsx       # التطبيق الرئيسي
│   └── index.html
├── server/                # خادم Express
│   ├── index.ts          # نقطة الدخول
│   ├── storage.ts        # نظام التخزين
│   └── database-adapter.ts
├── shared/               # الملفات المشتركة
│   └── schema.ts        # مخطط قاعدة البيانات
├── package.json
└── README.md
```

## 🔧 API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول

### المستخدمين
- `GET /api/users` - جميع المستخدمين
- `GET /api/users/online` - المستخدمين المتصلين
- `GET /api/users/:id` - مستخدم محدد
- `PUT /api/users/:id` - تحديث المستخدم

### الرسائل
- `GET /api/messages` - الرسائل العامة
- `POST /api/messages` - إرسال رسالة
- `GET /api/messages/private/:userId` - الرسائل الخاصة

### الأصدقاء
- `GET /api/friends` - قائمة الأصدقاء
- `POST /api/friends` - إضافة صديق
- `DELETE /api/friends/:friendId` - حذف صديق

### طلبات الصداقة
- `GET /api/friend-requests/incoming` - الطلبات الواردة
- `GET /api/friend-requests/outgoing` - الطلبات الصادرة
- `POST /api/friend-requests` - إرسال طلب صداقة
- `PUT /api/friend-requests/:requestId/accept` - قبول طلب
- `PUT /api/friend-requests/:requestId/decline` - رفض طلب

### الغرف
- `GET /api/rooms` - جميع الغرف
- `GET /api/rooms/:roomId` - غرفة محددة

### الحوائط
- `GET /api/wall-posts` - منشورات الحائط
- `POST /api/wall-posts` - إنشاء منشور
- `DELETE /api/wall-posts/:postId` - حذف منشور

### الإشعارات
- `GET /api/notifications` - إشعارات المستخدم
- `PUT /api/notifications/:notificationId/read` - تحديد كمقروء
- `PUT /api/notifications/read-all` - تحديد جميعها كمقروءة

### النقاط والمستويات
- `GET /api/points/history` - تاريخ النقاط
- `GET /api/levels/settings` - إعدادات المستويات

### التبليغات
- `POST /api/reports` - إنشاء تبليغ

## 🔌 Socket.IO Events

### العميل إلى الخادم
- `join` - الانضمام لغرفة المستخدم
- `join_room` - الانضمام لغرفة
- `leave_room` - مغادرة غرفة
- `send_message` - إرسال رسالة
- `update_status` - تحديث حالة المستخدم
- `typing` - مؤشر الكتابة

### الخادم إلى العميل
- `new_message` - رسالة جديدة
- `user_status_update` - تحديث حالة مستخدم
- `user_typing` - مؤشر كتابة مستخدم

## 🛡️ الأمان

- ✅ مصادقة JWT
- ✅ تشفير كلمات المرور
- ✅ حماية من CSRF
- ✅ التحقق من المدخلات
- ✅ حظر الأجهزة المشبوهة

## 📊 قاعدة البيانات

### الجداول الرئيسية
- `users` - المستخدمين
- `messages` - الرسائل
- `friends` - الأصدقاء
- `friend_requests` - طلبات الصداقة
- `notifications` - الإشعارات
- `rooms` - الغرف
- `wall_posts` - منشورات الحوائط
- `wall_reactions` - تفاعلات الحوائط
- `wall_comments` - تعليقات الحوائط
- `points_history` - تاريخ النقاط
- `level_settings` - إعدادات المستويات
- `moderation_log` - سجل الإدارة
- `reports` - التبليغات
- `blocked_devices` - الأجهزة المحجوبة

## 🚀 النشر

### Render
```bash
# إعداد متغيرات البيئة في Render
DATABASE_URL=your-postgresql-url
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

### Railway
```bash
# إعداد متغيرات البيئة في Railway
DATABASE_URL=your-postgresql-url
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء branch جديد
3. إجراء التغييرات
4. إرسال Pull Request

## 📄 الرخصة

MIT License

## 📞 الدعم

إذا واجهت أي مشاكل، يرجى فتح issue في GitHub.
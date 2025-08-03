# Arabic Chat Application

تطبيق دردشة عربي متطور مبني بـ React و Node.js و Socket.IO

## المميزات

- 💬 دردشة فورية مع Socket.IO
- 👥 نظام مستخدمين متقدم
- 🎨 واجهة مستخدم جميلة ومتجاوبة
- 🔒 نظام أمان متطور
- 📱 متوافق مع جميع الأجهزة
- 🎯 نظام نقاط ومستويات
- 👫 نظام أصدقاء وطلبات صداقة
- 🛡️ نظام إشراف وإدارة
- 📸 رفع الصور والملفات
- 🌐 دعم كامل للغة العربية

## التقنيات المستخدمة

### Frontend
- React 18
- TypeScript
- Vite
- Socket.IO Client
- Tailwind CSS

### Backend
- Node.js
- Express.js
- TypeScript
- Socket.IO
- PostgreSQL (Drizzle ORM)
- bcrypt للتعمية

## متطلبات النظام

- Node.js 18+
- npm 8+
- PostgreSQL

## التثبيت والتشغيل

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd arabic-chat
```

### 2. تثبيت المتطلبات
```bash
npm install
```

### 3. إعداد المتغيرات البيئية
```bash
cp .env.example .env
```

قم بتعديل ملف `.env` وأضف:
- `DATABASE_URL`: رابط قاعدة البيانات PostgreSQL
- `JWT_SECRET`: مفتاح JWT سري
- `SESSION_SECRET`: مفتاح الجلسة السري

### 4. إعداد قاعدة البيانات
```bash
npm run db:push
```

### 5. تشغيل التطبيق

#### للتطوير
```bash
npm run dev
```

#### للإنتاج
```bash
npm run build
npm start
```

## هيكل المشروع

```
arabic-chat/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # مكونات React
│   │   ├── hooks/         # Custom Hooks
│   │   ├── context/       # React Context
│   │   └── utils/         # أدوات مساعدة
│   └── public/            # الملفات الثابتة
├── server/                # Backend Node.js
│   ├── routes/            # مسارات API
│   ├── services/          # خدمات الأعمال
│   ├── middleware/        # Middleware
│   └── utils/             # أدوات مساعدة
├── shared/                # الكود المشترك
│   ├── schema.ts          # مخطط قاعدة البيانات
│   └── types.ts           # أنواع TypeScript
└── dist/                  # ملفات البناء
```

## API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول

### المستخدمين
- `GET /api/users` - جلب جميع المستخدمين
- `GET /api/users/online` - جلب المستخدمين المتصلين
- `PUT /api/users/:id` - تحديث بيانات المستخدم

### الرسائل
- `GET /api/messages/public` - جلب الرسائل العامة
- `POST /api/messages` - إرسال رسالة جديدة

### الأصدقاء
- `GET /api/friends/:userId` - جلب أصدقاء المستخدم
- `POST /api/friend-requests` - إرسال طلب صداقة

### رفع الملفات
- `POST /api/upload/profile-image` - رفع صورة البروفايل
- `POST /api/upload/wall-image` - رفع صورة للحائط

## WebSocket Events

### Client to Server
- `auth` - مصادقة المستخدم
- `publicMessage` - إرسال رسالة عامة
- `privateMessage` - إرسال رسالة خاصة
- `friendRequest` - إرسال طلب صداقة

### Server to Client
- `userJoined` - انضمام مستخدم جديد
- `userLeft` - مغادرة مستخدم
- `newMessage` - رسالة جديدة
- `friendRequest` - طلب صداقة جديد

## النشر على Render

1. اربط مستودع GitHub بـ Render
2. أضف متغيرات البيئة المطلوبة
3. Render سيقوم بالبناء والتشغيل تلقائياً

## المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. أنشئ Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم

إذا واجهت أي مشاكل أو لديك أسئلة، يرجى فتح issue في GitHub.
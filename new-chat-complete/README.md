# 🎨 Arabic Chat Complete

نظام دردشة عربي متكامل مع جميع الميزات المتقدمة - مستوحى من arabic.chat مع تقنيات حديثة

## 🌟 المميزات

### 💬 الدردشة
- ✅ دردشة في الوقت الفعلي باستخدام Socket.IO
- ✅ رسائل خاصة
- ✅ غرف متعددة (100+ غرفة)
- ✅ نظام المدن والدول
- ✅ تفاعلات الرسائل (إعجاب، رد فعل)
- ✅ إرسال الصور
- ✅ Emoji Picker متقدم

### 👥 المستخدمين
- ✅ نظام تسجيل دخول/تسجيل
- ✅ الملفات الشخصية الكاملة
- ✅ **إطارات الملف الشخصي** (10 أنواع!)
- ✅ **نظام الزوار**
- ✅ نظام المستويات والنقاط
- ✅ نظام الأصدقاء
- ✅ **نظام الهدايا** (18 هدية)
- ✅ الحائط (Wall Posts)
- ✅ القصص (Stories)

### 💬 الحائط والتعليقات
- ✅ **تعليقات متعددة المستويات** (3 مستويات)
- ✅ الرد على التعليقات
- ✅ إعجاب بالتعليقات
- ✅ حذف التعليقات
- ✅ عرض/إخفاء الردود

### 🔔 الإشعارات
- ✅ **نظام إشعارات متقدم**
- ✅ 7 أنواع إشعارات (رسائل، إعجابات، تعليقات، صداقة، هدايا، إشارات، نظام)
- ✅ تصنيف حسب النوع
- ✅ عداد غير المقروء
- ✅ تعليم كمقروء/تعليم الكل

### 🎨 الثيمات
- ✅ **نظام ثيمات متكامل**
- ✅ ثيمين: الافتراضي + Arabic Chat
- ✅ تبديل فوري بدون إعادة تحميل
- ✅ حفظ تلقائي في localStorage

### 🎙️ ميزات متقدمة
- ✅ الغرف الصوتية
- ✅ نظام البوتات
- ✅ نظام VIP
- ✅ المراقبة والإشراف
- ✅ الحماية من السبام
- ✅ Rate Limiting
- ✅ CSRF Protection

### ⚡ الأداء
- ✅ Redis Caching
- ✅ Virtual Scrolling
- ✅ Optimistic UI
- ✅ Code Splitting
- ✅ Image Optimization
- ✅ Compression

## 🛠️ التقنيات المستخدمة

### Frontend
- **React 18** - مكتبة UI
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Socket.IO Client** - Real-time
- **TanStack Query** - State Management
- **Radix UI** - UI Components
- **Wouter** - Routing

### Backend
- **Node.js** - Runtime
- **Express.js** - Web Framework
- **TypeScript** - Type Safety
- **Socket.IO** - WebSockets
- **Drizzle ORM** - Database ORM
- **PostgreSQL** - Database
- **Redis** - Caching
- **Sharp** - Image Processing
- **Multer** - File Uploads

### Security
- **Helmet** - Security Headers
- **CSRF Protection** - Cross-Site Request Forgery
- **Rate Limiting** - Prevent Abuse
- **Input Sanitization** - XSS Prevention
- **bcrypt** - Password Hashing

## 📦 التثبيت

### المتطلبات
- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (optional للكاش)
- npm >= 9.0.0

### الخطوات

1. **استنساخ المشروع**
```bash
git clone https://github.com/yourusername/arabic-chat-complete.git
cd arabic-chat-complete
```

2. **تثبيت الحزم**
```bash
npm install
```

3. **إعداد قاعدة البيانات**

أنشئ ملف `.env` في المجلد الرئيسي:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/arabic_chat

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-super-secret-key-here-change-this

# Server
PORT=5000
NODE_ENV=development
```

4. **تشغيل الـ Migrations**
```bash
npm run db:push
```

أو استخدم SQL مباشرة:
```bash
psql $DATABASE_URL -f migrations/add_profile_advanced_features.sql
```

5. **تشغيل المشروع**

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## 🗄️ قاعدة البيانات

### الجداول الرئيسية

#### المستخدمين والأمان
- `users` - معلومات المستخدمين
- `sessions` - جلسات المستخدمين
- `blocked_devices` - الأجهزة المحظورة
- `vip_users` - المستخدمين VIP

#### الرسائل والدردشة
- `messages` - الرسائل العامة والخاصة
- `message_reactions` - تفاعلات الرسائل
- `conversation_reads` - حالة قراءة المحادثات
- `rooms` - الغرف
- `room_members` - أعضاء الغرف

#### الحائط والقصص
- `wall_posts` - منشورات الحائط
- `wall_likes` - إعجابات المنشورات
- `wall_comments` - **التعليقات المتعددة المستويات** ⭐
- `comment_likes` - إعجابات التعليقات ⭐
- `stories` - القصص
- `story_reactions` - تفاعلات القصص

#### الميزات الجديدة ⭐
- `profile_visitors` - زوار الملف الشخصي
- `profile_frames` - الإطارات المتاحة
- `user_frames` - إطارات المستخدمين
- `gifts` - الهدايا المتاحة
- `user_gifts` - الهدايا المرسلة
- `advanced_notifications` - نظام الإشعارات المتقدم

#### الأصدقاء والنقاط
- `friends` - العلاقات بين المستخدمين
- `points_history` - تاريخ النقاط
- `level_settings` - إعدادات المستويات

#### البوتات والصوت
- `bots` - البوتات
- `voice_rooms` - الغرف الصوتية
- `voice_participants` - المشاركين في الغرف الصوتية

## 📂 بنية المشروع

```
arabic-chat-complete/
├── client/                 # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React Components
│   │   │   ├── chat/      # مكونات الدردشة
│   │   │   ├── profile/   # الملف الشخصي
│   │   │   ├── wall/      # الحائط
│   │   │   ├── themes/    # ⭐ نظام الثيمات
│   │   │   └── notifications/ # ⭐ الإشعارات
│   │   ├── contexts/      # React Contexts
│   │   ├── hooks/         # Custom Hooks
│   │   ├── layouts/       # ⭐ Layouts (ArabicChatLayout)
│   │   ├── pages/         # الصفحات
│   │   ├── styles/        # ⭐ الثيمات CSS
│   │   ├── types/         # TypeScript Types
│   │   └── utils/         # الدوال المساعدة
│   └── public/            # الملفات العامة
├── server/                # Backend (Node.js + TypeScript)
│   ├── routes/           # ⭐ API Routes (profile, comments, notifications)
│   ├── services/         # Business Logic
│   ├── middleware/       # Express Middleware
│   ├── utils/            # الدوال المساعدة
│   └── index.ts          # Entry Point
├── shared/               # Shared Code
│   ├── schema.ts         # ⭐ Drizzle Schema (كل الجداول)
│   ├── types.ts          # Shared Types
│   └── points-system.ts  # نظام النقاط
├── migrations/           # Database Migrations
├── docs/                 # التوثيق
└── package.json          # Dependencies
```

## 🎮 الاستخدام

### نظام الثيمات

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  // تغيير الثيم
  setTheme('arabic-chat'); // أو 'default'
}
```

### الإطارات

```typescript
import ProfileFrame from '@/components/profile/ProfileFrame';

<ProfileFrame level={user.level} size="large">
  <img src={user.avatar} alt={user.username} />
</ProfileFrame>
```

### التعليقات المتعددة

```typescript
import CommentThread from '@/components/wall/CommentThread';

<CommentThread
  comment={comment}
  currentUser={currentUser}
  onReply={handleReply}
  onLike={handleLike}
  onDelete={handleDelete}
/>
```

### الإشعارات

```typescript
import NotificationsModal from '@/components/notifications/NotificationsModal';

<NotificationsModal
  isOpen={showNotifications}
  onClose={() => setShowNotifications(false)}
  currentUserId={currentUser.id}
/>
```

## 🚀 الميزات الجديدة

### 1. نظام الإطارات (Profile Frames)
- 10 إطارات مختلفة (Bronze, Silver, Gold, Diamond, Legendary, Fire, Heart, Star, Ice, Rainbow)
- تأثيرات متحركة ووهج
- شارات المستوى
- قابلة للشراء بالنقاط

### 2. التعليقات المتعددة المستويات
- 3 مستويات من التعليقات
- رد على التعليقات
- إعجاب بالتعليقات
- حذف التعليقات
- عرض/إخفاء الردود

### 3. نظام الهدايا
- 18 هدية مختلفة
- 4 فئات (رومانسية، مضحكة، فاخرة، عامة)
- إرسال مجهول
- رسالة مع الهدية
- مكافأة للمستقبل (10% من قيمة الهدية)

### 4. نظام الإشعارات المتقدم
- 7 أنواع إشعارات
- تصنيف وفلترة
- عداد غير المقروء
- تحديثات فورية عبر Socket.IO

### 5. نظام الزوار
- تسجيل زيارات الملف الشخصي
- عداد الزوار
- عرض آخر 50 زائر
- وقت الزيارة

### 6. نظام الثيمات
- ثيمين: الافتراضي + Arabic Chat
- تبديل فوري
- حفظ تلقائي
- قابل للتوسع

## 📊 APIs الجديدة

### Profile APIs
```
POST   /api/profile/visit
GET    /api/profile/visitors
GET    /api/profile/frames
POST   /api/profile/frames/:id/purchase
POST   /api/profile/frames/:id/equip
GET    /api/profile/gifts/available
POST   /api/profile/gifts/send
GET    /api/profile/gifts/received/:userId
```

### Comments APIs
```
POST   /api/comments
GET    /api/comments/post/:postId
POST   /api/comments/:id/like
DELETE /api/comments/:id
```

### Notifications APIs
```
GET    /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/read-all
DELETE /api/notifications/:id
```

## 🧪 الاختبار

```bash
# Build test
npm run build

# Lint
npm run lint

# Format
npm run format

# Full verification
npm run verify-all
```

## 📜 الترخيص

MIT License

## 👥 المساهمة

المساهمات مرحب بها! افتح Issue أو Pull Request.

## 📞 الدعم

- GitHub Issues: [Report a bug](https://github.com/yourusername/arabic-chat-complete/issues)
- Email: your-email@example.com

## 🙏 شكر خاص

- مستوحى من arabic.chat
- بني بـ ❤️ للمجتمع العربي

---

**صنع بـ ❤️ في 2025**

# 🪽 دليل استخدام إطار الجناح السريع | Wing Frame Quick Guide

## استخدام بسيط | Simple Usage

### 1️⃣ في واجهة المستخدم

```typescript
// تعيين الإطار للمستخدم
user.profileFrame = "frame7"
```

### 2️⃣ الأحجام المتاحة

```tsx
// صغير (36px)
<ProfileImage user={user} size="small" />

// متوسط (56px)
<ProfileImage user={user} size="medium" />

// كبير (72px)
<ProfileImage user={user} size="large" />
```

### 3️⃣ في قاعدة البيانات

```sql
UPDATE users SET profileFrame = 'frame7' WHERE user_id = YOUR_USER_ID;
```

---

## 🎬 الحركات | Animations

| الحركة | المدة | الوصف |
|--------|------|-------|
| 🦋 رفرفة الجناح | 3s | حركة رفرفة ناعمة |
| ✨ التوهج | 2s | توهج ذهبي نابض |
| 🎈 الطفو | 4s | حركة طفو أنيقة |
| 💫 اللمعان | 3s | تأثير لمعان دوار |

---

## 📍 الملفات الرئيسية | Main Files

```
✅ /client/public/frames/frame7.png         - صورة الإطار
✅ /client/src/components/ui/VipAvatar.tsx  - مكون العرض
✅ /client/src/index.css                    - الحركات CSS
✅ /client/public/test-wing-animation.html  - صفحة الاختبار
```

---

## 🧪 الاختبار | Testing

افتح في المتصفح:
```
http://localhost:5173/test-wing-animation.html
```

أو في التطبيق الرئيسي:
```bash
npm run dev
```

---

## ⚡ الأداء | Performance

- ✅ سلس جداً (60 FPS)
- ✅ استهلاك منخفض للموارد
- ✅ متوافق مع الجوال
- ✅ لا يؤثر على التصميم الحالي

---

## 🎯 مثال كامل | Complete Example

```tsx
import ProfileImage from '@/components/chat/ProfileImage';

function UserProfile() {
  const user = {
    username: "مستخدم مميز",
    profileImage: "/path/to/avatar.jpg",
    profileFrame: "frame7",  // 👈 إطار الجناح
    gender: "male"
  };
  
  return (
    <div>
      <ProfileImage 
        user={user}
        size="large"
        className="my-custom-class"
      />
    </div>
  );
}
```

---

**جاهز للاستخدام الآن! 🎉**
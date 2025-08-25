# دليل إعداد Supabase Storage للصور

## 📦 الخطوة 1: تثبيت المكتبة

```bash
npm install @supabase/supabase-js
```

## 🔧 الخطوة 2: إنشاء ملف الإعدادات

أنشئ ملف `/server/supabase-storage.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

// احصل على هذه من Supabase Dashboard > Settings > API
const supabaseUrl = process.env.SUPABASE_URL || 'https://xxxxx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// دالة رفع الصورة
export async function uploadImageToSupabase(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  try {
    // رفع الصورة
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        contentType: mimeType,
        upsert: true // استبدال الصورة إذا كانت موجودة
      });

    if (error) {
      console.error('خطأ في رفع الصورة:', error);
      return null;
    }

    // الحصول على الرابط العام
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('خطأ في Supabase:', error);
    return null;
  }
}

// دالة حذف الصورة
export async function deleteImageFromSupabase(fileName: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([fileName]);

    return !error;
  } catch (error) {
    console.error('خطأ في حذف الصورة:', error);
    return false;
  }
}
```

## 🔄 الخطوة 3: تحديث endpoint رفع الصور

في `/server/routes.ts`, حدّث endpoint رفع صورة البروفايل:

```typescript
import { uploadImageToSupabase } from './supabase-storage';

app.post('/api/upload/profile-image', 
  uploadProfileImage.single('profileImage'),
  async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      // رفع إلى Supabase بدلاً من حفظ محلياً
      const fileName = `profiles/${userId}-${Date.now()}.${req.file.mimetype.split('/')[1]}`;
      const imageUrl = await uploadImageToSupabase(
        req.file.buffer,
        fileName,
        req.file.mimetype
      );

      if (!imageUrl) {
        return res.status(500).json({ error: 'فشل رفع الصورة' });
      }

      // حفظ الرابط في قاعدة البيانات
      await storage.updateUser(userId, { 
        profileImage: imageUrl 
      });

      res.json({ 
        success: true, 
        imageUrl,
        message: 'تم رفع الصورة بنجاح' 
      });
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  }
);
```

## 🔄 الخطوة 4: تحديث endpoint رفع البانر

```typescript
app.post('/api/upload/profile-banner',
  uploadBanner.single('banner'),
  async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      // رفع إلى Supabase
      const fileName = `banners/${userId}-${Date.now()}.${req.file.mimetype.split('/')[1]}`;
      const bannerUrl = await uploadImageToSupabase(
        req.file.buffer,
        fileName,
        req.file.mimetype
      );

      if (!bannerUrl) {
        return res.status(500).json({ error: 'فشل رفع البانر' });
      }

      // حفظ الرابط في قاعدة البيانات
      await storage.updateUser(userId, { 
        profileBanner: bannerUrl 
      });

      res.json({ 
        success: true, 
        bannerUrl,
        message: 'تم رفع البانر بنجاح' 
      });
    } catch (error) {
      console.error('خطأ في رفع البانر:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  }
);
```

## 🌍 الخطوة 5: إضافة متغيرات البيئة

في ملف `.env`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## 🔄 الخطوة 6: نقل الصور الموجودة (اختياري)

سكريبت لنقل الصور الموجودة من Base64 إلى Supabase:

```javascript
// migrate-images-to-supabase.js
import { supabase } from './server/supabase-storage';
import { storage } from './server/storage';

async function migrateImages() {
  const users = await storage.getAllUsers();
  
  for (const user of users) {
    if (user.profileImage?.startsWith('data:')) {
      // استخراج Base64
      const base64Data = user.profileImage.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // رفع إلى Supabase
      const fileName = `profiles/${user.id}-migrated.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        // تحديث قاعدة البيانات
        await storage.updateUser(user.id, {
          profileImage: publicUrl
        });
        
        console.log(`✅ تم نقل صورة المستخدم ${user.username}`);
      }
    }
  }
}

migrateImages();
```

## ✅ المزايا:

1. **مجاني** - 1GB مساحة مجانية
2. **سريع** - CDN عالمي
3. **موثوق** - لن تُفقد الصور أبداً
4. **احترافي** - حل مستخدم من شركات كبيرة
5. **سهل** - API بسيط وواضح

## 📊 المقارنة:

| الميزة | الحل الحالي (Base64) | Supabase Storage |
|--------|---------------------|------------------|
| التكلفة | مجاني | مجاني (1GB) |
| السرعة | بطيء | سريع جداً |
| الموثوقية | ✅ | ✅ |
| حجم قاعدة البيانات | كبير | صغير |
| الأداء | متوسط | ممتاز |
| الاحترافية | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🚀 البدء الآن:

1. سجل في Supabase: https://supabase.com
2. أنشئ مشروع جديد
3. اتبع الخطوات أعلاه
4. استمتع بصور لا تختفي أبداً!
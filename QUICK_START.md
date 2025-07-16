# 🚀 البدء السريع - رفع الملفات

## ⚡ **أسرع طريقة لرفع الملفات:**

```bash
npm run push
```

### 🎯 **الخطوات:**

1. **شغل السكريبت:**
   ```bash
   npm run push
   ```

2. **اختر الخيار:**
   - `1` للرفع السريع (رسالة تلقائية)
   - `2` للرفع مع رسالة مخصصة

3. **انتظر النتيجة:**
   - ✅ نجح الرفع = جاهز للنشر
   - ❌ فشل = راجع الخطأ

## 🔧 **أوامر إضافية:**

```bash
# للمساعدة
npm run help

# لاختبار البناء
npm run test:build  

# للرفع بـ Bash
npm run push:quick
```

## 📦 **بعد الرفع - النشر على Render:**

**انسخ هذه الإعدادات:**

```
Build Command: npm install --legacy-peer-deps && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

Start Command: npm start

Environment Variables:
NODE_ENV=production
DATABASE_URL=your_postgres_url_here
```

## ✅ **إذا نجح الرفع:**

🎉 **الملفات رُفعت بنجاح!**  
🔗 **اذهب لـ Render وانشر المشروع**  
📋 **استخدم الإعدادات أعلاه**

---

**جاهز؟ شغل الأمر وارفع ملفاتك! 🚀**

```bash
npm run push
```
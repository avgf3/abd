# دليل النشر على Render - محدث 2025

## 🚀 إعداد الخادم الموحد للنشر على Render

تم تحسين الخادم للعمل بكفاءة على منصة Render مع الميزات التالية:

### ✅ التحسينات المطبقة

1. **كشف بيئة Render التلقائي**
   - متغير `RENDER=true` للتحكم في الإعدادات
   - إعدادات proxy محسنة للمنصة

2. **نقاط فحص الصحة المحسنة**
   - `/api/health` - فحص شامل للنظام
   - `/api/keep-alive` - منع cold starts

3. **إدارة المنافذ الذكية**
   - استخدام تلقائي للمنفذ المحدد في الإنتاج
   - بحث ديناميكي في بيئة التطوير

4. **نظام Keep-Alive محسن**
   - ping كل 10 دقائق في Render
   - إدارة أخطاء محسنة
   - تنظيف تلقائي عند الإغلاق

### 🔧 متطلبات البيئة

```bash
# المتغيرات المطلوبة في Render
NODE_ENV=production
PORT=10000
RENDER=true
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
CORS_ORIGIN=https://your-app.onrender.com
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

### 📦 أوامر النشر

```bash
# البناء للإنتاج
npm run build:render

# تشغيل الخادم على Render
npm run start:render

# فحص الصحة
npm run render-health
```

### 🔍 فحص الحالة

بعد النشر، يمكنك فحص حالة الخادم:

```bash
curl https://your-app.onrender.com/api/health
curl https://your-app.onrender.com/api/keep-alive
```

### 🛠️ استكشاف الأخطاء

1. **مشاكل الاتصال**: تحقق من إعدادات CORS
2. **مشاكل قاعدة البيانات**: تأكد من DATABASE_URL
3. **مشاكل Socket.IO**: تحقق من إعدادات WebSocket

### 📊 مراقبة الأداء

- **Memory Usage**: مراقبة استخدام الذاكرة
- **Response Times**: مراقبة أوقات الاستجابة
- **Keep-Alive Status**: تتبع حالة keep-alive

### 🔄 التحديثات التلقائية

الخادم يدعم:
- إعادة التشغيل التلقائي
- Hot reload في التطوير
- Graceful shutdown في الإنتاج

---

## 🎯 خطوات النشر السريع

1. **ربط المستودع بـ Render**
2. **تحديد متغيرات البيئة**
3. **تشغيل البناء التلقائي**
4. **فحص الصحة والتأكد من العمل**

✅ **الخادم جاهز للنشر على Render!**
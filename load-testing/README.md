# 🚀 Load Testing Suite - Chat Application

مجموعة شاملة لاختبار الضغط والأداء لتطبيق الدردشة

## 📋 المحتويات

- [نظرة عامة](#نظرة-عامة)
- [المميزات](#المميزات)
- [التثبيت](#التثبيت)
- [الاستخدام](#الاستخدام)
- [السيناريوهات](#السيناريوهات)
- [التقارير](#التقارير)
- [المراقبة](#المراقبة)

## 🎯 نظرة عامة

هذه المجموعة توفر اختبارات شاملة للضغط والأداء باستخدام أفضل الأدوات المتاحة:
- **K6**: اختبارات HTTP وWebSocket المتقدمة
- **Artillery**: اختبارات Socket.IO والوقت الفعلي
- **Autocannon**: اختبارات HTTP السريعة

## ✨ المميزات

- 🔥 اختبارات HTTP شاملة (REST API)
- 🌐 اختبارات WebSocket وSocket.IO
- 📊 تقارير مفصلة بصيغ متعددة (JSON, HTML, PDF)
- 📈 مراقبة النظام في الوقت الفعلي
- 🎯 سيناريوهات متعددة (Ramp-up, Spike, Stress, Endurance)
- 💡 تحليل الاختناقات والتوصيات
- 🌍 دعم اللغة العربية والإنجليزية

## 🛠️ التثبيت

### 1. تثبيت الأدوات الأساسية

```bash
# تشغيل سكريبت التثبيت التلقائي
./scripts/install-tools.sh

# أو التثبيت اليدوي
npm install -g k6 artillery autocannon
```

### 2. تثبيت التبعيات المحلية

```bash
cd load-testing
npm install
```

## 🚀 الاستخدام

### تشغيل جميع الاختبارات

```bash
# من مجلد load-testing
node scripts/run-all-tests.js

# أو باستخدام npm
npm run test:all
```

### تشغيل اختبارات محددة

#### K6 HTTP Test
```bash
k6 run -e BASE_URL=http://localhost:5000 scenarios/k6-http-test.js
```

#### K6 WebSocket Test
```bash
k6 run -e WS_URL=ws://localhost:5000 scenarios/k6-websocket-test.js
```

#### Artillery Socket.IO Test
```bash
artillery run --target http://localhost:5000 scenarios/artillery-socketio.yml
```

#### Autocannon HTTP Test
```bash
node scenarios/autocannon-http.js spike
```

### مراقبة النظام

```bash
# تشغيل مراقب النظام
node scripts/monitor-system.js

# أو
npm run monitor
```

### تحليل النتائج

```bash
# تحليل جميع النتائج
node scripts/analyze-results.js

# أو
npm run analyze
```

## 📊 السيناريوهات

### 1. Ramp-up Test (اختبار التدرج)
- **المدة**: 30 دقيقة
- **المستخدمون**: 0 → 1000
- **الهدف**: قياس الأداء مع زيادة تدريجية

### 2. Spike Test (اختبار الذروة)
- **المدة**: 15 دقيقة
- **المستخدمون**: 100 → 2000 → 100
- **الهدف**: اختبار الاستجابة للزيادات المفاجئة

### 3. Stress Test (اختبار الإجهاد)
- **المدة**: حتى الفشل
- **المستخدمون**: زيادة مستمرة
- **الهدف**: تحديد نقطة الانهيار

### 4. Endurance Test (اختبار التحمل)
- **المدة**: 4 ساعات
- **المستخدمون**: 200 ثابت
- **الهدف**: اكتشاف تسريبات الذاكرة

## 📈 التقارير

### أنواع التقارير

1. **JSON Reports**: بيانات خام للتحليل المتقدم
2. **HTML Reports**: تقارير تفاعلية بواجهة جميلة
3. **Console Output**: نتائج فورية في Terminal
4. **PDF Reports**: تقارير رسمية للتوثيق

### موقع التقارير

جميع التقارير يتم حفظها في مجلد `results/`:
```
load-testing/results/
├── k6-http-*.json
├── k6-websocket-*.json
├── artillery-*.json
├── autocannon-*.json
├── system-metrics-*.json
├── analysis-*.json
└── analysis-report-*.html
```

## 🔍 المراقبة

### المقاييس المراقبة

- **CPU**: الاستخدام، درجة الحرارة، توزيع الأنوية
- **Memory**: RAM، Swap، التوزيع
- **Network**: معدل النقل، إجمالي البيانات
- **Disk I/O**: القراءة، الكتابة
- **Processes**: العمليات النشطة، أعلى استهلاك

### التنبيهات

- CPU > 90%
- Memory > 90%
- Swap > 50%
- Error Rate > 5%

## 📝 التكوين

### ملف التكوين الرئيسي

```json
// config/test-config.json
{
  "environments": {
    "local": {
      "baseURL": "http://localhost:5000",
      "wsURL": "ws://localhost:5000"
    },
    "production": {
      "baseURL": "https://your-app.com",
      "wsURL": "wss://your-app.com"
    }
  }
}
```

### متغيرات البيئة

```bash
export TEST_ENV=local        # أو staging, production
export BASE_URL=http://localhost:5000
export WS_URL=ws://localhost:5000
export DURATION=60           # بالثواني
export CONNECTIONS=100       # عدد الاتصالات
```

## 🎯 معايير النجاح

### الأداء
- P50 Latency < 100ms
- P95 Latency < 500ms
- P99 Latency < 1000ms

### الموثوقية
- Error Rate < 1%
- Success Rate > 99%
- Uptime > 99.9%

### القابلية للتوسع
- 1000+ concurrent users
- 500+ messages/second
- 1000+ requests/second

## 🚨 استكشاف الأخطاء

### المشكلة: الأدوات غير مثبتة
```bash
./scripts/install-tools.sh
```

### المشكلة: الخادم غير متاح
```bash
# تأكد من تشغيل الخادم
npm run dev
```

### المشكلة: نفاد الذاكرة
```bash
# زيادة حد الذاكرة لـ Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 📚 الموارد

- [K6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://artillery.io/docs/)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)

## 🤝 المساهمة

نرحب بالمساهمات! يرجى فتح Issue أو Pull Request.

## 📄 الترخيص

MIT License

---

صُنع بـ ❤️ لاختبار الأداء الشامل
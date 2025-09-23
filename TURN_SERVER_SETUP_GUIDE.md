# 🔧 دليل إعداد خادم TURN/STUN المخصص لنظام الغرف الصوتية

## 📌 لماذا تحتاج خادم TURN/STUN مخصص؟

### المشاكل الحالية:
- **الخوادم المجانية غير موثوقة** - قد تتوقف في أي وقت
- **محدودية الاتصالات** - حد أقصى للمستخدمين المتزامنين
- **بطء الاتصال** - خوادم بعيدة جغرافياً
- **مشاكل الأمان** - بيانات تمر عبر خوادم غير موثوقة
- **عدم العمل خلف جدران الحماية** - كثير من الشركات تحجب الخوادم المجانية

### فوائد الخادم المخصص:
✅ **موثوقية 100%** - تحكم كامل بالخادم
✅ **سرعة فائقة** - يمكن وضعه قريباً من المستخدمين
✅ **أمان محسّن** - البيانات تمر عبر خوادمك فقط
✅ **لا حدود للاستخدام** - عدد غير محدود من الاتصالات
✅ **إحصائيات مفصلة** - مراقبة كاملة للاستخدام

---

## 🚀 الخيار 1: استخدام Coturn (الأفضل والمجاني)

### المتطلبات:
- خادم Linux (Ubuntu/Debian موصى به)
- عنوان IP عام ثابت
- منافذ مفتوحة: 3478 (TCP/UDP), 5349 (TCP/UDP), 49152-65535 (UDP)
- ذاكرة RAM: 2GB كحد أدنى
- معالج: 1 vCPU كحد أدنى

### خطوات التثبيت:

#### 1. تثبيت Coturn على Ubuntu/Debian:
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Coturn
sudo apt install coturn -y

# تفعيل Coturn
sudo systemctl enable coturn
```

#### 2. إعداد الشهادات SSL (مهم للأمان):
```bash
# تثبيت Certbot
sudo apt install certbot -y

# الحصول على شهادة SSL (استبدل turn.yourdomain.com بنطاقك)
sudo certbot certonly --standalone -d turn.yourdomain.com

# إنشاء مجلد للشهادات
sudo mkdir -p /etc/coturn/certs

# نسخ الشهادات
sudo cp /etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem /etc/coturn/certs/
sudo cp /etc/letsencrypt/live/turn.yourdomain.com/privkey.pem /etc/coturn/certs/

# تعيين الصلاحيات
sudo chown -R turnserver:turnserver /etc/coturn/certs
sudo chmod 600 /etc/coturn/certs/*
```

#### 3. إعداد ملف التكوين:
```bash
# نسخ احتياطي للملف الأصلي
sudo cp /etc/turnserver.conf /etc/turnserver.conf.backup

# تحرير ملف التكوين
sudo nano /etc/turnserver.conf
```

محتوى الملف:
```ini
# إعدادات الشبكة
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=YOUR_SERVER_IP
external-ip=YOUR_PUBLIC_IP/YOUR_SERVER_IP

# نطاق المنافذ للـ relay
min-port=49152
max-port=65535

# إعدادات الأمان
fingerprint
use-auth-secret
static-auth-secret=YOUR_SUPER_SECRET_KEY_HERE

# اسم النطاق
realm=turn.yourdomain.com
server-name=turn.yourdomain.com

# شهادات SSL
cert=/etc/coturn/certs/fullchain.pem
pkey=/etc/coturn/certs/privkey.pem

# إعدادات الأداء
total-quota=100
max-bps=1000000
bps-capacity=0
stale-nonce=600

# السجلات
log-file=/var/log/turnserver/turnserver.log
verbose
simple-log

# إعدادات إضافية
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1
```

#### 4. إنشاء مستخدم وكلمة مرور:
```bash
# توليد كلمة سر قوية
openssl rand -hex 32

# حفظ الكلمة في ملف التكوين كـ static-auth-secret
```

#### 5. تشغيل الخادم:
```bash
# إعادة تشغيل Coturn
sudo systemctl restart coturn

# التحقق من الحالة
sudo systemctl status coturn

# مشاهدة السجلات
sudo tail -f /var/log/turnserver/turnserver.log
```

---

## 🐳 الخيار 2: استخدام Docker (الأسهل)

### إنشاء docker-compose.yml:
```yaml
version: '3.8'

services:
  coturn:
    image: coturn/coturn:latest
    container_name: voice-turn-server
    restart: always
    network_mode: host
    volumes:
      - ./coturn.conf:/etc/coturn/turnserver.conf:ro
      - ./certs:/etc/coturn/certs:ro
      - ./logs:/var/log/coturn
    environment:
      - DETECT_EXTERNAL_IP=yes
      - DETECT_RELAY_IP=yes
    command: ["-c", "/etc/coturn/turnserver.conf"]
```

### إنشاء ملف coturn.conf:
```ini
# نفس الإعدادات السابقة ولكن مع تعديلات Docker
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535

fingerprint
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY

realm=turn.yourdomain.com
server-name=turn.yourdomain.com

cert=/etc/coturn/certs/fullchain.pem
pkey=/etc/coturn/certs/privkey.pem

verbose
log-file=stdout
```

### تشغيل Docker:
```bash
# إنشاء المجلدات
mkdir -p certs logs

# نسخ الشهادات
cp /path/to/fullchain.pem certs/
cp /path/to/privkey.pem certs/

# تشغيل الحاوية
docker-compose up -d

# مشاهدة السجلات
docker-compose logs -f
```

---

## ☁️ الخيار 3: خدمات سحابية جاهزة (مدفوعة)

### 1. **Twilio TURN** (الأفضل للإنتاج):
- **السعر**: $0.40 لكل GB
- **الموثوقية**: 99.95% uptime
- **المميزات**: خوادم في جميع أنحاء العالم
- **الإعداد**: 5 دقائق فقط

### 2. **Xirsys**:
- **السعر**: يبدأ من $9/شهر
- **المميزات**: لوحة تحكم متقدمة
- **API**: سهل التكامل

### 3. **Metered TURN**:
- **السعر**: 50GB مجاناً شهرياً
- **المميزات**: إحصائيات مفصلة

---

## 🔌 تكامل الخادم مع التطبيق

### تحديث إعدادات العميل:

#### 1. إنشاء ملف البيئة:
```env
# .env.local
VITE_TURN_URL=turn:turn.yourdomain.com:3478
VITE_TURN_USERNAME=1735920000:myuser
VITE_TURN_CREDENTIAL=YOUR_GENERATED_CREDENTIAL
VITE_STUN_URL=stun:turn.yourdomain.com:3478
```

#### 2. تحديث VoiceManager.ts:
```typescript
private rtcConfig: RTCConfig = {
  iceServers: [
    // خادمك المخصص أولاً
    {
      urls: import.meta.env.VITE_STUN_URL || 'stun:turn.yourdomain.com:3478'
    },
    {
      urls: import.meta.env.VITE_TURN_URL || 'turn:turn.yourdomain.com:3478',
      username: this.generateTurnUsername(),
      credential: this.generateTurnCredential()
    },
    // خوادم احتياطية
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// توليد بيانات TURN ديناميكياً
private generateTurnUsername(): string {
  const timestamp = Math.floor(Date.now() / 1000) + 86400; // صالح لـ 24 ساعة
  return `${timestamp}:user${this.currentUserId}`;
}

private generateTurnCredential(): string {
  const secret = import.meta.env.VITE_TURN_SECRET;
  const username = this.generateTurnUsername();
  // استخدام HMAC-SHA1 لتوليد كلمة المرور
  return this.generateHMAC(username, secret);
}
```

---

## 🧪 اختبار الخادم

### سكريبت اختبار Node.js:
```javascript
const stun = require('stun');

// اختبار STUN
stun.request('turn.yourdomain.com:3478', (err, res) => {
  if (err) {
    console.error('❌ فشل اختبار STUN:', err);
  } else {
    console.log('✅ STUN يعمل!');
    console.log('عنوان IP العام:', res.getXorAddress().address);
  }
});

// اختبار TURN باستخدام WebRTC
async function testTURN() {
  const pc = new RTCPeerConnection({
    iceServers: [{
      urls: 'turn:turn.yourdomain.com:3478',
      username: '1735920000:testuser',
      credential: 'your-credential'
    }]
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      if (e.candidate.type === 'relay') {
        console.log('✅ TURN يعمل! Relay candidate:', e.candidate.address);
      }
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
}

testTURN();
```

---

## 📊 مراقبة الأداء

### أدوات المراقبة:
1. **Prometheus + Grafana** - للإحصائيات المتقدمة
2. **ELK Stack** - لتحليل السجلات
3. **Zabbix** - للتنبيهات

### إحصائيات مهمة:
- عدد الاتصالات النشطة
- استهلاك bandwidth
- نسبة نجاح الاتصالات
- متوسط زمن الاستجابة

---

## 🔒 نصائح الأمان

1. **استخدم دائماً SSL/TLS**
2. **قم بتحديث كلمة السر الثابتة شهرياً**
3. **قيّد عناوين IP المسموحة إن أمكن**
4. **فعّل rate limiting**
5. **راقب السجلات بانتظام**
6. **احتفظ بنسخ احتياطية من الإعدادات**

---

## 💰 تقدير التكاليف

### خادم VPS:
- **DigitalOcean**: $12/شهر (2GB RAM, 2TB bandwidth)
- **Linode**: $10/شهر (2GB RAM, 2TB bandwidth)
- **AWS EC2**: ~$15/شهر (t3.small)

### استهلاك Bandwidth:
- **صوت عادي**: ~40 kbps لكل مستخدم
- **صوت عالي الجودة**: ~128 kbps لكل مستخدم
- **100 مستخدم متزامن**: ~12.8 Mbps

---

## 🆘 حل المشاكل الشائعة

### المشكلة 1: Connection timeout
**الحل**: تأكد من فتح جميع المنافذ المطلوبة في الجدار الناري

### المشكلة 2: Authentication failed
**الحل**: تحقق من صحة static-auth-secret وطريقة توليد الـ credentials

### المشكلة 3: No relay candidates
**الحل**: تحقق من إعدادات relay-ip و external-ip

---

## 📚 مصادر إضافية

- [Coturn Documentation](https://github.com/coturn/coturn)
- [WebRTC Security](https://webrtc-security.github.io/)
- [TURN Server Setup Guide](https://www.metered.ca/tools/openrelay/)

---

تم إنشاء هذا الدليل لمساعدتك في إعداد خادم TURN/STUN احترافي لنظام الغرف الصوتية.
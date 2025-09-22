# دليل إعداد TURN Server للبث الصوتي

## ما هو TURN Server؟

TURN (Traversal Using Relays around NAT) هو بروتوكول يساعد في إنشاء اتصالات WebRTC عندما تفشل اتصالات peer-to-peer المباشرة بسبب جدران الحماية أو NAT.

## خيارات TURN Server المجانية

### 1. Twilio TURN (مجاني مع حدود)

1. أنشئ حساب على [Twilio](https://www.twilio.com/)
2. اذهب إلى Console > Programmable Video > Tools > Network Traversal Service
3. احصل على:
   - STUN/TURN URLs
   - Username
   - Password

### 2. Xirsys (مجاني للتجربة)

1. سجل على [Xirsys](https://xirsys.com/)
2. أنشئ channel جديد
3. استخدم API للحصول على ICE servers

### 3. استضافة CoTURN الخاص بك (مجاني)

```bash
# على Ubuntu/Debian
sudo apt-get update
sudo apt-get install coturn

# تكوين /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
realm=yourdomain.com
server-name=yourdomain.com
lt-cred-mech
userdb=/etc/turnuserdb.conf
cert=/path/to/cert.pem
pkey=/path/to/privkey.pem
```

## إعداد TURN في المشروع

### 1. أنشئ ملف `.env.local` في المجلد الرئيسي:

```env
# TURN Server Configuration
VITE_TURN_URL=turn:your-turn-server.com:3478
VITE_TURN_USERNAME=your-username
VITE_TURN_CREDENTIAL=your-password

# Alternative TURN URLs (optional)
VITE_TURN_URL_TLS=turns:your-turn-server.com:5349
```

### 2. استخدام خدمة Twilio المجانية (مثال):

```env
# ملاحظة مهمة: استخدم استعلام transport مع TURN فقط، وليس مع STUN
VITE_TURN_URL=turn:global.turn.twilio.com:3478?transport=udp
VITE_TURN_URL_TLS=turns:global.turn.twilio.com:5349?transport=tcp
VITE_TURN_USERNAME=your-twilio-username
VITE_TURN_CREDENTIAL=your-twilio-password
```

### 3. تحديث كود ICE Servers:

الكود موجود بالفعل في `BroadcastRoomInterface.tsx`:

```typescript
const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  // TURN server من متغيرات البيئة
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
};
```

## اختبار TURN Server

### 1. فحص الاتصال:

```javascript
// في Console المتصفح
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-server:3478',
      username: 'username',
      credential: 'password',
    },
  ],
});

pc.onicecandidate = (e) => {
  if (e.candidate) {
    console.log('ICE Candidate:', e.candidate);
    // ابحث عن "typ relay" للتأكد من عمل TURN
  }
};

pc.createOffer({ offerToReceiveAudio: true }).then((offer) => pc.setLocalDescription(offer));
```

### 2. مراقبة الإحصائيات:

```javascript
// بعد إنشاء الاتصال
const stats = await pc.getStats();
stats.forEach((report) => {
  if (report.type === 'candidate-pair' && report.state === 'succeeded') {
    console.log('Connected via:', report.remoteCandidateType);
    // "relay" يعني استخدام TURN
  }
});
```

## نصائح مهمة

1. **HTTPS مطلوب**: WebRTC يتطلب HTTPS في الإنتاج
2. **Bandwidth**: TURN servers تستهلك bandwidth عالي
3. **موقع الخادم**: اختر TURN server قريب جغرافياً
4. **المراقبة**: راقب استخدام TURN للتكاليف

## حل المشاكل الشائعة

### 1. "ICE gathering state: failed"

- تحقق من صحة بيانات TURN
- تأكد من فتح المنافذ (3478 UDP/TCP)

### 2. "No audio on remote side"

- تحقق من إعدادات جدار الحماية
- جرب TURN عبر TCP بدلاً من UDP

### 3. "Connection state: failed"

- قد تحتاج TURN server
- تحقق من إعدادات NAT

## الخلاصة

لحل مشكلة البث الصوتي:

1. أضف ملف `.env.local` مع بيانات TURN
2. أعد تشغيل الخادم
3. اختبر من شبكات مختلفة
4. راقب Console للأخطاء

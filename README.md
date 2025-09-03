# دليل إعداد موقع على سيرفر Contabo

## 📋 المحتويات

1. [البداية السريعة](#البداية-السريعة)
2. [الأوامر الأساسية](#الأوامر-الأساسية)
3. [خيارات التثبيت](#خيارات-التثبيت)
4. [الأمان](#الأمان)
5. [حل المشاكل](#حل-المشاكل)

## 🚀 البداية السريعة

### 1. الاتصال بالسيرفر
```bash
ssh root@your-server-ip
```

### 2. تشغيل السكريبت الأساسي
```bash
# تحميل السكريبت
wget https://raw.githubusercontent.com/yourusername/contabo-setup/main/contabo-setup-commands.sh
chmod +x contabo-setup-commands.sh
./contabo-setup-commands.sh
```

## 📝 الأوامر الأساسية

### إعداد السيرفر الأساسي
```bash
# 1. تحديث النظام
sudo apt update && sudo apt upgrade -y

# 2. تثبيت البرمجيات الأساسية
sudo apt install -y nginx mysql-server php8.1-fpm php8.1-mysql git curl wget unzip

# 3. إعداد جدار الحماية
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 4. تأمين MySQL
sudo mysql_secure_installation
```

### إنشاء قاعدة بيانات
```sql
# الدخول إلى MySQL
sudo mysql -u root -p

# إنشاء قاعدة بيانات
CREATE DATABASE mysite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mysite_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON mysite_db.* TO 'mysite_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### إعداد Nginx
```bash
# إنشاء ملف إعداد الموقع
sudo nano /etc/nginx/sites-available/mysite

# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔧 خيارات التثبيت

### 1. موقع PHP عادي
```bash
./contabo-setup-commands.sh
```

### 2. WordPress
```bash
./wordpress-setup.sh
```

### 3. تطبيق Node.js
```bash
./nodejs-app-setup.sh
```

### 4. شهادة SSL
```bash
./ssl-setup.sh
```

## 🔒 الأمان

### تأمين السيرفر
```bash
./security-hardening.sh
```

### نصائح أمنية مهمة:
- ✅ استخدم كلمات مرور قوية
- ✅ فعّل المصادقة الثنائية
- ✅ احتفظ بنسخ احتياطية منتظمة
- ✅ راقب السجلات بانتظام
- ✅ حدّث البرمجيات دورياً

## 🔍 حل المشاكل

### مشكلة في Nginx
```bash
# التحقق من الإعدادات
sudo nginx -t

# عرض السجلات
sudo tail -f /var/log/nginx/error.log
```

### مشكلة في PHP
```bash
# التحقق من حالة PHP-FPM
sudo systemctl status php8.1-fpm

# عرض سجلات PHP
sudo tail -f /var/log/php8.1-fpm.log
```

### مشكلة في MySQL
```bash
# التحقق من حالة MySQL
sudo systemctl status mysql

# عرض السجلات
sudo tail -f /var/log/mysql/error.log
```

### مشكلة في الاتصال
```bash
# التحقق من جدار الحماية
sudo ufw status

# التحقق من المنافذ المفتوحة
sudo netstat -tlnp
```

## 📊 مراقبة الأداء

### استخدام الموارد
```bash
# عرض استخدام CPU والذاكرة
htop

# عرض استخدام القرص
df -h

# عرض العمليات النشطة
ps aux | grep -E 'nginx|php|mysql'
```

### مراقبة حركة المرور
```bash
# تثبيت أداة المراقبة
sudo apt install vnstat

# عرض الإحصائيات
vnstat -h  # بالساعة
vnstat -d  # باليوم
vnstat -m  # بالشهر
```

## 📞 الدعم

في حال واجهت أي مشكلة:
1. تحقق من السجلات أولاً
2. ابحث عن رسائل الخطأ في Google
3. اسأل في منتديات Contabo
4. تواصل مع دعم Contabo الفني

---

**ملاحظة:** تذكر دائماً تغيير كلمات المرور الافتراضية وتحديث النظام بانتظام للحفاظ على أمان موقعك.
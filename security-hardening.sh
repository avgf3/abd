#!/bin/bash

# ==========================================
# سكريبت تأمين السيرفر
# ==========================================

echo "بدء تأمين السيرفر..."

# 1. إنشاء مستخدم جديد (بدلاً من root)
echo "1. إنشاء مستخدم جديد..."
read -p "أدخل اسم المستخدم الجديد: " NEW_USER
sudo adduser $NEW_USER
sudo usermod -aG sudo $NEW_USER

# 2. تعطيل تسجيل الدخول بـ root عبر SSH
echo "2. تأمين SSH..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 3. تغيير منفذ SSH (اختياري)
echo "3. تغيير منفذ SSH..."
read -p "هل تريد تغيير منفذ SSH؟ (y/n): " CHANGE_PORT
if [ "$CHANGE_PORT" = "y" ]; then
    read -p "أدخل رقم المنفذ الجديد (مثال: 2222): " NEW_PORT
    sudo sed -i "s/#Port 22/Port $NEW_PORT/" /etc/ssh/sshd_config
    sudo ufw allow $NEW_PORT/tcp
fi

# 4. تثبيت Fail2ban
echo "4. تثبيت Fail2ban..."
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# إعداد Fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# 5. تحديثات الأمان التلقائية
echo "5. تفعيل التحديثات التلقائية..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# 6. إعداد جدار الحماية المتقدم
echo "6. إعداد جدار الحماية..."
# حظر ping (اختياري)
sudo tee -a /etc/ufw/before.rules > /dev/null << 'EOF'
# Block ping requests
-A ufw-before-input -p icmp --icmp-type echo-request -j DROP
EOF

# قواعد إضافية
sudo ufw limit ssh/tcp
sudo ufw logging on

# 7. تأمين Nginx
echo "7. تأمين Nginx..."
# إخفاء إصدار Nginx
sudo sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# إضافة headers أمنية
sudo tee /etc/nginx/snippets/security-headers.conf > /dev/null << 'EOF'
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF

# 8. تأمين PHP
echo "8. تأمين PHP..."
sudo sed -i 's/expose_php = On/expose_php = Off/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/allow_url_fopen = On/allow_url_fopen = Off/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/display_errors = On/display_errors = Off/' /etc/php/8.1/fpm/php.ini

# 9. إعداد نسخ احتياطية تلقائية
echo "9. إعداد النسخ الاحتياطية..."
sudo mkdir -p /backup
cat > /home/$USER/backup.sh << 'EOF'
#!/bin/bash
# نسخ احتياطي يومي
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup"

# نسخ قواعد البيانات
mysqldump --all-databases > $BACKUP_DIR/mysql_backup_$DATE.sql

# نسخ ملفات الموقع
tar -czf $BACKUP_DIR/website_backup_$DATE.tar.gz /var/www/

# حذف النسخ القديمة (أكثر من 7 أيام)
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /home/$USER/backup.sh

# إضافة إلى crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup.sh") | crontab -

# 10. إعادة تشغيل الخدمات
echo "10. إعادة تشغيل الخدمات..."
sudo systemctl restart ssh
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm
sudo systemctl restart fail2ban

echo "==========================================
تم تأمين السيرفر بنجاح!

⚠️ تنبيهات مهمة:
1. احفظ مفتاح SSH الخاص بك قبل تسجيل الخروج
2. تأكد من إمكانية الدخول بالمستخدم الجديد: $NEW_USER
3. لا تغلق الجلسة الحالية حتى تختبر الدخول بجلسة جديدة

معلومات الأمان:
- تم تعطيل دخول root عبر SSH
- تم تثبيت Fail2ban للحماية من الهجمات
- تم إعداد نسخ احتياطية يومية
- تم تفعيل التحديثات التلقائية

للتحقق من حالة الأمان:
sudo ufw status
sudo fail2ban-client status
=========================================="
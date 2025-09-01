#!/bin/bash

# ==========================================
# سكريبت تثبيت WordPress على Contabo
# ==========================================

echo "بدء تثبيت WordPress..."

# 1. تحميل WordPress
echo "1. تحميل WordPress..."
cd /tmp
wget https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz

# 2. نقل الملفات
echo "2. نقل ملفات WordPress..."
sudo rm -rf /var/www/mysite/*
sudo mv wordpress/* /var/www/mysite/
sudo chown -R www-data:www-data /var/www/mysite/
sudo chmod -R 755 /var/www/mysite/

# 3. إعداد ملف wp-config.php
echo "3. إعداد ملف الإعدادات..."
cd /var/www/mysite/
sudo cp wp-config-sample.php wp-config.php

# تحديث معلومات قاعدة البيانات
sudo sed -i "s/database_name_here/mysite_db/" wp-config.php
sudo sed -i "s/username_here/mysite_user/" wp-config.php
sudo sed -i "s/password_here/StrongPassword123!/" wp-config.php

# 4. إضافة مفاتيح الأمان
echo "4. إضافة مفاتيح الأمان..."
SALT=$(curl -s https://api.wordpress.org/secret-key/1.1/salt/)
STRING='put your unique phrase here'
printf '%s\n' "g/$STRING/d" a "$SALT" . w | ed -s wp-config.php

# 5. تثبيت حزم PHP إضافية لـ WordPress
echo "5. تثبيت حزم PHP إضافية..."
sudo apt install -y \
    php8.1-imagick \
    php8.1-intl \
    php8.1-bcmath \
    php8.1-soap

# 6. زيادة حدود PHP
echo "6. تحسين إعدادات PHP..."
sudo sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 64M/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/post_max_size = 8M/post_max_size = 64M/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/memory_limit = 128M/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
sudo sed -i 's/max_execution_time = 30/max_execution_time = 300/' /etc/php/8.1/fpm/php.ini

# 7. إعادة تشغيل الخدمات
echo "7. إعادة تشغيل الخدمات..."
sudo systemctl restart php8.1-fpm
sudo systemctl restart nginx

echo "==========================================
تم تثبيت WordPress بنجاح!

يمكنك الآن:
1. زيارة http://your-domain.com لإكمال التثبيت
2. اتباع معالج WordPress لإعداد الموقع

معلومات قاعدة البيانات:
- اسم قاعدة البيانات: mysite_db
- اسم المستخدم: mysite_user
- كلمة المرور: StrongPassword123!

⚠️ تذكر تغيير كلمة المرور!
=========================================="
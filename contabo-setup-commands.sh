#!/bin/bash

# ==========================================
# سكريبت إعداد سيرفر Contabo لموقع ويب
# ==========================================

echo "بدء إعداد السيرفر..."

# 1. تحديث النظام
echo "1. تحديث النظام..."
sudo apt update && sudo apt upgrade -y

# 2. تثبيت البرمجيات الأساسية
echo "2. تثبيت البرمجيات الأساسية..."
sudo apt install -y \
    nginx \
    mysql-server \
    php8.1-fpm \
    php8.1-mysql \
    php8.1-mbstring \
    php8.1-xml \
    php8.1-curl \
    php8.1-gd \
    php8.1-zip \
    git \
    curl \
    wget \
    unzip \
    nano \
    ufw

# 3. إعداد جدار الحماية
echo "3. إعداد جدار الحماية..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 4. إعداد MySQL
echo "4. إعداد MySQL..."
sudo mysql_secure_installation

# 5. إنشاء مجلد الموقع
echo "5. إنشاء مجلد الموقع..."
sudo mkdir -p /var/www/mysite
sudo chown -R $USER:$USER /var/www/mysite
sudo chmod -R 755 /var/www/mysite

# 6. إنشاء صفحة اختبار
echo "6. إنشاء صفحة اختبار..."
cat > /var/www/mysite/index.php << 'EOF'
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مرحباً بك في موقعي</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .info {
            background: #e9ecef;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .info p {
            margin: 10px 0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>مرحباً بك في موقعك الجديد!</h1>
        <p>تم إعداد السيرفر بنجاح على Contabo</p>
        <div class="info">
            <h3>معلومات النظام:</h3>
            <?php
            echo "<p>إصدار PHP: " . phpversion() . "</p>";
            echo "<p>نظام التشغيل: " . php_uname() . "</p>";
            echo "<p>التاريخ والوقت: " . date("Y-m-d H:i:s") . "</p>";
            ?>
        </div>
    </div>
</body>
</html>
EOF

# 7. إعداد Nginx
echo "7. إعداد Nginx..."
sudo tee /etc/nginx/sites-available/mysite > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    # ضع اسم النطاق الخاص بك هنا
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/mysite;
    index index.php index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }
    
    location ~ /\.ht {
        deny all;
    }
    
    # تفعيل Gzip للأداء
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml;
}
EOF

# 8. تفعيل الموقع
echo "8. تفعيل الموقع..."
sudo ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm

# 9. إنشاء قاعدة بيانات
echo "9. إنشاء قاعدة بيانات..."
sudo mysql << EOF
CREATE DATABASE IF NOT EXISTS mysite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mysite_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON mysite_db.* TO 'mysite_user'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "==========================================
تم الانتهاء من الإعداد الأساسي!

الخطوات التالية:
1. غيّر 'your-domain.com' في ملف Nginx إلى اسم النطاق الخاص بك
2. غيّر كلمة مرور قاعدة البيانات 'StrongPassword123!' إلى كلمة مرور قوية
3. ثبّت شهادة SSL باستخدام Let's Encrypt

لتثبيت Let's Encrypt SSL:
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

للوصول إلى الموقع:
http://your-server-ip/
=========================================="
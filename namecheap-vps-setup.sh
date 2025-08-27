#!/bin/bash
# سكريبت تثبيت موقعك على Namecheap VPS
# يعمل على Ubuntu 22.04

echo "🚀 بدء تثبيت موقع الدردشة العربية على Namecheap VPS"

# 1. تحديث النظام
echo "📦 تحديث النظام..."
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js 20
echo "📦 تثبيت Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. تثبيت PostgreSQL
echo "🗄️ تثبيت PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. إعداد قاعدة البيانات
echo "🗄️ إعداد قاعدة البيانات..."
sudo -u postgres psql <<EOF
CREATE DATABASE chatapp;
CREATE USER chatuser WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatuser;
EOF

# 5. تثبيت PM2 لإدارة التطبيق
echo "⚙️ تثبيت PM2..."
sudo npm install -g pm2

# 6. تثبيت Nginx
echo "🌐 تثبيت Nginx..."
sudo apt install -y nginx

# 7. إعداد جدار الحماية
echo "🔒 إعداد جدار الحماية..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000
sudo ufw --force enable

# 8. استنساخ المشروع
echo "📂 استنساخ المشروع..."
cd /var/www
sudo git clone https://github.com/yourusername/your-repo.git arab-chat
cd arab-chat

# 9. تثبيت التبعيات
echo "📦 تثبيت التبعيات..."
npm install

# 10. إنشاء ملف البيئة
echo "⚙️ إعداد متغيرات البيئة..."
cat > .env <<EOL
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://chatuser:your_secure_password@localhost:5432/chatapp
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
EOL

# 11. بناء التطبيق
echo "🔨 بناء التطبيق..."
npm run build

# 12. إعداد PM2
echo "🚀 تشغيل التطبيق مع PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 13. إعداد Nginx
echo "🌐 إعداد Nginx..."
sudo tee /etc/nginx/sites-available/arab-chat <<EOF
server {
    listen 80;
    server_name your-domain.com;

    # رفع حجم الملفات المسموح
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # دعم Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/arab-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 14. تثبيت SSL مع Let's Encrypt
echo "🔒 تثبيت SSL..."
sudo apt install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d your-domain.com

echo "✅ التثبيت مكتمل!"
echo "📝 الخطوات التالية:"
echo "1. قم بتحديث DNS في Namecheap ليشير إلى IP الخادم"
echo "2. شغّل: sudo certbot --nginx -d your-domain.com لتثبيت SSL"
echo "3. تحقق من التطبيق: pm2 status"
echo "4. شاهد السجلات: pm2 logs"
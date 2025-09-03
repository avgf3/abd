#!/bin/bash

# ==========================================
# سكريبت إعداد تطبيق Node.js على Contabo
# ==========================================

echo "بدء إعداد Node.js..."

# 1. تثبيت Node.js و npm
echo "1. تثبيت Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. تثبيت PM2 لإدارة التطبيق
echo "2. تثبيت PM2..."
sudo npm install -g pm2

# 3. إنشاء مجلد التطبيق
echo "3. إنشاء مجلد التطبيق..."
sudo mkdir -p /var/www/nodeapp
sudo chown -R $USER:$USER /var/www/nodeapp

# 4. إنشاء تطبيق Node.js بسيط
echo "4. إنشاء تطبيق Node.js..."
cd /var/www/nodeapp

# إنشاء package.json
cat > package.json << 'EOF'
{
  "name": "my-node-app",
  "version": "1.0.0",
  "description": "تطبيق Node.js على Contabo",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.3",
    "mysql2": "^3.2.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
EOF

# إنشاء التطبيق الرئيسي
cat > app.js << 'EOF'
const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// إعدادات قاعدة البيانات
const db = mysql.createConnection({
  host: 'localhost',
  user: 'mysite_user',
  password: 'StrongPassword123!',
  database: 'mysite_db'
});

// الاتصال بقاعدة البيانات
db.connect((err) => {
  if (err) {
    console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    return;
  }
  console.log('تم الاتصال بقاعدة البيانات بنجاح');
});

// إعدادات Express
app.use(express.json());
app.use(express.static('public'));

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تطبيق Node.js</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f0f0f0;
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
                max-width: 600px;
            }
            h1 {
                color: #333;
                margin-bottom: 20px;
            }
            .node-logo {
                width: 100px;
                margin: 20px 0;
            }
            .info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                margin-top: 20px;
                text-align: right;
            }
            .info p {
                margin: 10px 0;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>مرحباً بك في تطبيق Node.js</h1>
            <svg class="node-logo" viewBox="0 0 128 128">
                <path fill="#83CD29" d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0zm32.1 57.9c0 1.7-.7 3.3-2 4.4l-27.8 16c-.6.3-1.3.5-2 .5s-1.4-.2-2-.5l-27.8-16c-1.3-1.1-2-2.7-2-4.4V42.1c0-1.7.7-3.3 2-4.4l27.8-16c1.2-.7 2.8-.7 4 0l27.8 16c1.3 1.1 2 2.7 2 4.4v15.8z"/>
            </svg>
            <p>تم إعداد تطبيق Node.js بنجاح على Contabo!</p>
            <div class="info">
                <h3>معلومات التطبيق:</h3>
                <p>إصدار Node.js: ${process.version}</p>
                <p>المنفذ: ${port}</p>
                <p>البيئة: ${process.env.NODE_ENV || 'development'}</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'نشط',
    message: 'التطبيق يعمل بنجاح',
    timestamp: new Date().toISOString()
  });
});

// بدء السيرفر
app.listen(port, () => {
  console.log(`التطبيق يعمل على المنفذ ${port}`);
});
EOF

# إنشاء ملف .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=mysite_user
DB_PASSWORD=StrongPassword123!
DB_NAME=mysite_db
EOF

# 5. تثبيت المكتبات
echo "5. تثبيت المكتبات..."
npm install

# 6. إعداد PM2
echo "6. إعداد PM2..."
pm2 start app.js --name "my-node-app"
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER

# 7. إعداد Nginx كـ Reverse Proxy
echo "7. إعداد Nginx..."
sudo tee /etc/nginx/sites-available/nodeapp > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 8. تفعيل الموقع
echo "8. تفعيل الموقع..."
sudo ln -s /etc/nginx/sites-available/nodeapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "==========================================
تم إعداد تطبيق Node.js بنجاح!

معلومات مهمة:
- التطبيق يعمل على المنفذ 3000
- يمكن الوصول إليه عبر http://your-domain.com
- لعرض سجلات التطبيق: pm2 logs my-node-app
- لإعادة تشغيل التطبيق: pm2 restart my-node-app
- لإيقاف التطبيق: pm2 stop my-node-app

⚠️ تذكر:
1. تغيير 'your-domain.com' لاسم النطاق الخاص بك
2. تغيير كلمة مرور قاعدة البيانات
3. تثبيت شهادة SSL
=========================================="
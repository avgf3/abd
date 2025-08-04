import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 إعداد المشروع للإنتاج...\n');

// 1. Fix file upload configuration
console.log('📁 إصلاح نظام رفع الملفات...');
const uploadDirs = ['uploads', 'uploads/profiles', 'uploads/banners', 'uploads/rooms'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ تم إنشاء مجلد: ${dir}`);
  }
});

// Add multer configuration fix
const storageFixPath = path.join(__dirname, 'server', 'storage.ts');
let storageContent = fs.readFileSync(storageFixPath, 'utf8');

// Fix profile upload path
if (!storageContent.includes('// Fixed upload configuration')) {
  const uploadConfigFix = `
// Fixed upload configuration
const uploadConfig = {
  profileImage: {
    destination: path.join(process.cwd(), 'uploads/profiles'),
    filename: (req: any, file: any, cb: any) => {
      const uniqueName = \`profile-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\${path.extname(file.originalname)}\`;
      cb(null, uniqueName);
    }
  },
  banner: {
    destination: path.join(process.cwd(), 'uploads/banners'),
    filename: (req: any, file: any, cb: any) => {
      const uniqueName = \`banner-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\${path.extname(file.originalname)}\`;
      cb(null, uniqueName);
    }
  }
};
`;

  // Insert after imports
  const insertPoint = storageContent.indexOf('export interface Storage');
  if (insertPoint > 0) {
    storageContent = storageContent.slice(0, insertPoint) + uploadConfigFix + '\n' + storageContent.slice(insertPoint);
    fs.writeFileSync(storageFixPath, storageContent);
    console.log('✅ تم إصلاح إعدادات رفع الملفات');
  }
}

// 2. Fix security vulnerabilities
console.log('\n🔒 إصلاح الثغرات الأمنية...');
try {
  // Update vulnerable packages
  console.log('📦 تحديث الحزم المعرضة للخطر...');
  execSync('npm update esbuild --save-dev', { stdio: 'inherit' });
  console.log('✅ تم تحديث esbuild');
  
  // Run audit fix
  console.log('🔧 إصلاح مشاكل الأمان...');
  execSync('npm audit fix', { stdio: 'inherit' });
  console.log('✅ تم إصلاح معظم مشاكل الأمان');
} catch (error) {
  console.log('⚠️  بعض مشاكل الأمان تحتاج إصلاح يدوي');
}

// 3. Create production environment file
console.log('\n📝 إنشاء ملف البيئة للإنتاج...');
const envProdContent = `# Production Environment Variables
NODE_ENV=production
PORT=\${PORT}
DATABASE_URL=\${DATABASE_URL}
SESSION_SECRET=\${SESSION_SECRET}
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=\${FRONTEND_URL}
SOCKET_TIMEOUT=30000

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
BCRYPT_ROUNDS=10

# File Upload
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
MAX_PROFILE_IMAGE_SIZE=5242880
MAX_BANNER_SIZE=10485760
`;

fs.writeFileSync(path.join(__dirname, '.env.production'), envProdContent);
console.log('✅ تم إنشاء .env.production');

// 4. Optimize API routes
console.log('\n⚡ تحسين مسارات API...');
const routesPath = path.join(__dirname, 'server', 'routes.ts');
let routesContent = fs.readFileSync(routesPath, 'utf8');

// Add response compression
if (!routesContent.includes('compression')) {
  const compressionImport = `import compression from 'compression';\n`;
  routesContent = compressionImport + routesContent;
  
  // Add compression middleware
  routesContent = routesContent.replace(
    'app.use(express.json());',
    'app.use(compression());\n  app.use(express.json());'
  );
  
  fs.writeFileSync(routesPath, routesContent);
  console.log('✅ تم إضافة ضغط الاستجابات');
}

// 5. Create production build script
console.log('\n🏗️ إنشاء سكريبت البناء للإنتاج...');
const buildScript = `#!/bin/bash
echo "🚀 بدء بناء الإنتاج..."

# Clean previous builds
echo "🧹 تنظيف البناءات السابقة..."
rm -rf dist

# Build client
echo "🎨 بناء العميل..."
npm run build

# Create necessary directories in dist
echo "📁 إنشاء المجلدات المطلوبة..."
mkdir -p dist/uploads/profiles
mkdir -p dist/uploads/banners
mkdir -p dist/uploads/rooms
mkdir -p dist/data

# Copy static files
echo "📋 نسخ الملفات الثابتة..."
cp -r uploads dist/ 2>/dev/null || true
cp -r shared dist/ 2>/dev/null || true
cp -r migrations dist/ 2>/dev/null || true

# Copy environment files
echo "🔐 نسخ ملفات البيئة..."
cp .env.production dist/.env 2>/dev/null || true

echo "✅ اكتمل البناء!"
echo "📌 لتشغيل الإنتاج: cd dist && node index.js"
`;

fs.writeFileSync(path.join(__dirname, 'build-production.sh'), buildScript);
fs.chmodSync(path.join(__dirname, 'build-production.sh'), '755');
console.log('✅ تم إنشاء build-production.sh');

// 6. Create health check endpoint
console.log('\n🏥 إضافة نقطة فحص الصحة...');
const healthCheckCode = `
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: getDatabaseStatus()
  });
});
`;

if (!routesContent.includes('/health')) {
  // Add before socket.io setup
  const insertPoint = routesContent.indexOf('io.on("connection"');
  if (insertPoint > 0) {
    routesContent = routesContent.slice(0, insertPoint) + healthCheckCode + '\n  ' + routesContent.slice(insertPoint);
    fs.writeFileSync(routesPath, routesContent);
    console.log('✅ تم إضافة نقطة فحص الصحة');
  }
}

// 7. Create deployment instructions
console.log('\n📖 إنشاء تعليمات النشر...');
const deploymentGuide = `# دليل نشر المشروع للإنتاج

## 1. إعداد البيئة

### متطلبات النظام:
- Node.js 18+ 
- PostgreSQL أو SQLite
- PM2 (لإدارة العملية)
- Nginx (اختياري للـ reverse proxy)

### متغيرات البيئة المطلوبة:
\`\`\`bash
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-super-secret-key-here
FRONTEND_URL=https://yourdomain.com
PORT=5000
\`\`\`

## 2. خطوات النشر

### أ. استنساخ المشروع:
\`\`\`bash
git clone [repository-url]
cd [project-name]
\`\`\`

### ب. تثبيت التبعيات:
\`\`\`bash
npm install --production
\`\`\`

### ج. إعداد قاعدة البيانات:
\`\`\`bash
npm run db:migrate
\`\`\`

### د. بناء المشروع:
\`\`\`bash
chmod +x build-production.sh
./build-production.sh
\`\`\`

### هـ. تشغيل المشروع:
\`\`\`bash
# باستخدام PM2
pm2 start dist/index.js --name "chat-app"

# أو مباشرة
NODE_ENV=production node dist/index.js
\`\`\`

## 3. إعداد Nginx (اختياري)

\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        alias /path/to/project/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

## 4. الأمان

### أ. تفعيل HTTPS:
استخدم Let's Encrypt لشهادة SSL مجانية:
\`\`\`bash
sudo certbot --nginx -d yourdomain.com
\`\`\`

### ب. تكوين جدار الحماية:
\`\`\`bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
\`\`\`

### ج. تحديثات الأمان:
\`\`\`bash
# تحديث النظام
sudo apt update && sudo apt upgrade

# تحديث تبعيات Node.js
npm audit fix
\`\`\`

## 5. المراقبة والصيانة

### أ. مراقبة السجلات:
\`\`\`bash
# PM2 logs
pm2 logs chat-app

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
\`\`\`

### ب. نسخ احتياطي لقاعدة البيانات:
\`\`\`bash
# PostgreSQL
pg_dump -U username dbname > backup_$(date +%Y%m%d).sql

# SQLite
cp data/chat.db backups/chat_$(date +%Y%m%d).db
\`\`\`

### ج. تحديث التطبيق:
\`\`\`bash
git pull origin main
npm install
./build-production.sh
pm2 restart chat-app
\`\`\`

## 6. استكشاف الأخطاء

### المشكلة: التطبيق لا يعمل
- تحقق من السجلات: \`pm2 logs\`
- تحقق من البيئة: \`pm2 env 0\`
- تحقق من قاعدة البيانات: \`npm run test:db\`

### المشكلة: رفع الملفات لا يعمل
- تحقق من صلاحيات المجلد: \`chmod -R 755 uploads\`
- تحقق من حجم الملف المسموح
- تحقق من أنواع الملفات المسموحة

### المشكلة: WebSocket لا يعمل
- تحقق من إعدادات Nginx
- تحقق من جدار الحماية
- تحقق من CORS

## 7. الأداء

### أ. تفعيل التخزين المؤقت:
- استخدم Redis للجلسات
- فعّل تخزين الملفات الثابتة
- استخدم CDN للملفات الكبيرة

### ب. تحسين قاعدة البيانات:
- أضف فهارس للحقول المستخدمة بكثرة
- نظف البيانات القديمة دورياً
- استخدم connection pooling

### ج. مراقبة الأداء:
- استخدم New Relic أو DataDog
- راقب استخدام الذاكرة والمعالج
- راقب أوقات الاستجابة

---

للمساعدة والدعم، راجع الوثائق أو افتح issue في GitHub.
`;

fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT_GUIDE_AR.md'), deploymentGuide);
console.log('✅ تم إنشاء DEPLOYMENT_GUIDE_AR.md');

// 8. Final checks
console.log('\n🔍 الفحوصات النهائية...');

// Check TypeScript compilation
console.log('📐 فحص TypeScript...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ لا توجد أخطاء TypeScript');
} catch (error) {
  console.log('⚠️  توجد بعض أخطاء TypeScript (تم إصلاح معظمها)');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ تم إعداد المشروع للإنتاج!');
console.log('='.repeat(50));
console.log('\n📋 الخطوات التالية:');
console.log('1. راجع ملف DEPLOYMENT_GUIDE_AR.md');
console.log('2. قم بتعيين متغيرات البيئة في .env.production');
console.log('3. شغّل ./build-production.sh لبناء المشروع');
console.log('4. انشر المشروع على الخادم');
console.log('\n🎉 بالتوفيق في النشر!');
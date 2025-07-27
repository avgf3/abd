import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 بدء تشغيل الخادم...');

// التأكد من وجود مجلدات الرفع
const uploadDirs = [
  'client/public/uploads/profiles',
  'client/public/uploads/banners', 
  'client/public/uploads/wall'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('✅ تم إنشاء مجلد:', dir);
  }
});

// تشغيل الخادم
const server = spawn('node', ['node_modules/.bin/tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

server.on('error', (error) => {
  console.error('❌ خطأ في تشغيل الخادم:', error);
});

server.on('exit', (code) => {
  console.log(`📊 الخادم توقف بكود: ${code}`);
});

// إيقاف الخادم عند الخروج
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف الخادم...');
  server.kill();
  process.exit(0);
});

console.log('⏳ انتظار بدء الخادم...');
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 بدء اختبار نظام الغرف...\n');

// تشغيل الخادم في الخلفية
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📤 خادم:', output.trim());
  
  if (output.includes('Server running') || output.includes('🚀')) {
    serverReady = true;
    console.log('\n✅ الخادم جاهز! يمكنك الآن اختبار النظام:\n');
    console.log('🌐 افتح المتصفح على: http://localhost:5000');
    console.log('📋 اختبارات موصى بها:');
    console.log('   1. تسجيل الدخول كمدير');
    console.log('   2. عرض قائمة الغرف');
    console.log('   3. إنشاء غرفة جديدة');
    console.log('   4. الانضمام للغرف المختلفة');
    console.log('   5. اختبار غرفة البث الصوتي');
    console.log('\n⌨️  اضغط Ctrl+C لإيقاف الاختبار\n');
  }
  
  if (output.includes('تهيئة الغرف الافتراضية')) {
    console.log('🏠 جاري تهيئة الغرف الافتراضية...');
  }
  
  if (output.includes('تم إنشاء الغرفة') || output.includes('الغرفة موجودة مسبقاً')) {
    console.log('✅ الغرف الافتراضية جاهزة');
  }
});

serverProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('Warning') && !error.includes('deprecated')) {
    console.error('❌ خطأ:', error.trim());
  }
});

serverProcess.on('close', (code) => {
  console.log(`\n🔚 انتهى الاختبار مع كود: ${code}`);
  process.exit(code);
});

// إنهاء الاختبار عند الضغط على Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  إيقاف الاختبار...');
  serverProcess.kill('SIGTERM');
  setTimeout(() => {
    serverProcess.kill('SIGKILL');
  }, 5000);
});

// تنظيف عند الانتهاء
process.on('exit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});

console.log('⏳ انتظار تشغيل الخادم...');
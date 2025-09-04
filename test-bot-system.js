#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { config } from 'dotenv';

// تحميل متغيرات البيئة
config();

console.log(chalk.cyan.bold('\n🤖 اختبار نظام البوتات\n'));

// تعيين متغيرات البيئة للاختبار
process.env.NODE_ENV = 'development';
process.env.BOT_TOTAL = '10'; // 10 بوتات للاختبار
process.env.BOT_OWNER_COUNT = '2'; // 2 أونر
process.env.BOT_USE_PROXIES = 'false';
process.env.BOT_BATCH_SIZE = '2';
process.env.BOT_BATCH_DELAY_MS = '2000';

// بدء الخادم
const spinner = ora('بدء تشغيل الخادم...').start();

try {
  // استيراد وتشغيل الخادم
  await import('./server/index.js');
  
  spinner.succeed(chalk.green('✅ الخادم يعمل بنجاح'));
  
  // انتظار حتى يبدأ نظام البوتات (10 ثواني حسب التأخير المحدد)
  console.log(chalk.yellow('\n⏳ انتظار 12 ثانية حتى يبدأ نظام البوتات...'));
  
  setTimeout(() => {
    console.log(chalk.green('\n✨ النظام جاهز للاختبار!'));
    console.log(chalk.cyan('\nللوصول لواجهة التحكم:'));
    console.log(chalk.white('1. افتح المتصفح على: http://localhost:5000'));
    console.log(chalk.white('2. سجل دخول كأونر'));
    console.log(chalk.white('3. اضغط Ctrl+Shift+B لإظهار واجهة التحكم'));
    console.log(chalk.white('4. أدخل رمز الوصول: owner2024$control'));
    
    console.log(chalk.yellow('\n📊 معلومات النظام:'));
    console.log(chalk.white(`- عدد البوتات: ${process.env.BOT_TOTAL}`));
    console.log(chalk.white(`- بوتات الأونر: ${process.env.BOT_OWNER_COUNT}`));
    console.log(chalk.white(`- البيئة: ${process.env.NODE_ENV}`));
    
    console.log(chalk.gray('\n🔧 للإيقاف: اضغط Ctrl+C'));
  }, 12000);
  
} catch (error) {
  spinner.fail(chalk.red('❌ فشل تشغيل الخادم'));
  console.error(chalk.red(error));
  process.exit(1);
}

// معالج إيقاف النظام
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 إيقاف النظام...'));
  process.exit(0);
});
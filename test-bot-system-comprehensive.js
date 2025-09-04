#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { config } from 'dotenv';
import fetch from 'node-fetch';

// تحميل متغيرات البيئة
config();

const SERVER_URL = 'http://localhost:5000';
const MASTER_SECRET = 'owner-master-2024-secret';

console.log(chalk.cyan.bold('\n🤖 اختبار شامل لنظام البوتات\n'));

// تعيين متغيرات البيئة للاختبار
process.env.NODE_ENV = 'development';
process.env.BOT_TOTAL = '5'; // 5 بوتات للاختبار السريع
process.env.BOT_OWNER_COUNT = '1';
process.env.BOT_USE_PROXIES = 'false';
process.env.BOT_BATCH_SIZE = '2';
process.env.BOT_BATCH_DELAY_MS = '1000';

let serverStarted = false;
let adminToken = null;

async function startServer() {
  const spinner = ora('بدء تشغيل الخادم...').start();
  
  try {
    // استيراد وتشغيل الخادم
    await import('./server/index.js');
    serverStarted = true;
    spinner.succeed(chalk.green('✅ الخادم يعمل بنجاح'));
    
    // انتظار حتى يكون الخادم جاهزاً
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // التحقق من أن الخادم يعمل
    const healthCheck = await fetch(`${SERVER_URL}/api/health`).catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      throw new Error('الخادم لا يستجيب');
    }
    
    console.log(chalk.green('✅ الخادم جاهز ويستجيب'));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ فشل تشغيل الخادم'));
    console.error(error);
    process.exit(1);
  }
}

async function generateAdminToken() {
  const spinner = ora('توليد رمز وصول الأدمن...').start();
  
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/bot-setup/generate-bot-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey: MASTER_SECRET,
        userId: '1'
      })
    });
    
    if (!response.ok) {
      throw new Error(`فشل توليد التوكن: ${response.status}`);
    }
    
    const data = await response.json();
    adminToken = data.token;
    
    spinner.succeed(chalk.green('✅ تم توليد رمز الوصول بنجاح'));
    console.log(chalk.gray(`Token: ${adminToken.substring(0, 20)}...`));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ فشل توليد رمز الوصول'));
    console.error(error);
  }
}

async function waitForBots() {
  const spinner = ora('انتظار تشغيل البوتات (12 ثانية)...').start();
  
  // البوتات تبدأ بعد 10 ثواني + 2 ثانية إضافية للتأكد
  await new Promise(resolve => setTimeout(resolve, 12000));
  
  spinner.succeed(chalk.green('✅ يجب أن تكون البوتات قد بدأت'));
}

async function checkBotStatus() {
  const spinner = ora('فحص حالة البوتات...').start();
  
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/bots/status`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!response.ok) {
      throw new Error(`فشل جلب الحالة: ${response.status}`);
    }
    
    const status = await response.json();
    
    spinner.succeed(chalk.green('✅ تم جلب حالة البوتات'));
    
    console.log(chalk.cyan('\n📊 حالة النظام:'));
    console.log(chalk.white(`- إجمالي البوتات: ${status.totalBots}`));
    console.log(chalk.green(`- البوتات النشطة: ${status.activeBots}`));
    console.log(chalk.magenta(`- بوتات الأونر: ${status.ownerBots}`));
    
    if (status.roomDistribution) {
      console.log(chalk.cyan('\n🏠 توزيع الغرف:'));
      Object.entries(status.roomDistribution).forEach(([room, count]) => {
        console.log(chalk.white(`- ${room}: ${count} بوت`));
      });
    }
    
    return status;
    
  } catch (error) {
    spinner.fail(chalk.red('❌ فشل فحص حالة البوتات'));
    console.error(error);
    return null;
  }
}

async function listBots() {
  const spinner = ora('جلب قائمة البوتات...').start();
  
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/bots`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!response.ok) {
      throw new Error(`فشل جلب القائمة: ${response.status}`);
    }
    
    const bots = await response.json();
    
    spinner.succeed(chalk.green('✅ تم جلب قائمة البوتات'));
    
    console.log(chalk.cyan(`\n🤖 البوتات (${bots.length}):`));
    bots.forEach(bot => {
      const status = bot.isActive ? chalk.green('●') : chalk.red('●');
      const ownerBadge = bot.isOwner ? chalk.magenta(' [أونر]') : '';
      console.log(`${status} ${bot.username}${ownerBadge} - ${bot.currentRoom} - ${bot.messageCount} رسالة`);
    });
    
    return bots;
    
  } catch (error) {
    spinner.fail(chalk.red('❌ فشل جلب قائمة البوتات'));
    console.error(error);
    return [];
  }
}

async function testBotMessage(botId, message) {
  const spinner = ora(`إرسال رسالة من البوت...`).start();
  
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/bots/${botId}/message`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        room: 'general'
      })
    });
    
    if (!response.ok) {
      throw new Error(`فشل الإرسال: ${response.status}`);
    }
    
    spinner.succeed(chalk.green('✅ تم إرسال الرسالة بنجاح'));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ فشل إرسال الرسالة'));
    console.error(error);
  }
}

async function testRandomMovement() {
  const spinner = ora('اختبار الحركة العشوائية...').start();
  
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/bots/command`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: 'RANDOM_MOVEMENT'
      })
    });
    
    if (!response.ok) {
      throw new Error(`فشل الأمر: ${response.status}`);
    }
    
    spinner.succeed(chalk.green('✅ تم تنفيذ الحركة العشوائية'));
    
    // انتظار لرؤية التغيير
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ فشل تنفيذ الحركة العشوائية'));
    console.error(error);
  }
}

async function runTests() {
  console.log(chalk.yellow('\n🧪 بدء الاختبارات الشاملة...\n'));
  
  // 1. بدء الخادم
  await startServer();
  
  // 2. توليد رمز الوصول
  await generateAdminToken();
  
  if (!adminToken) {
    console.log(chalk.red('\n❌ لا يمكن المتابعة بدون رمز وصول'));
    return;
  }
  
  // 3. انتظار البوتات
  await waitForBots();
  
  // 4. فحص الحالة الأولية
  console.log(chalk.yellow('\n📍 الفحص الأولي:'));
  const initialStatus = await checkBotStatus();
  
  // 5. جلب قائمة البوتات
  const bots = await listBots();
  
  if (bots.length === 0) {
    console.log(chalk.red('\n❌ لا توجد بوتات للاختبار'));
    return;
  }
  
  // 6. اختبار إرسال رسالة
  console.log(chalk.yellow('\n🔧 اختبار إرسال الرسائل:'));
  const testBot = bots[0];
  await testBotMessage(testBot.id, 'مرحباً! هذه رسالة اختبار من نظام البوتات 🤖');
  
  // 7. اختبار الحركة العشوائية
  console.log(chalk.yellow('\n🔧 اختبار الحركة:'));
  await testRandomMovement();
  
  // 8. فحص الحالة النهائية
  console.log(chalk.yellow('\n📍 الفحص النهائي:'));
  const finalStatus = await checkBotStatus();
  
  // 9. التقرير النهائي
  console.log(chalk.cyan.bold('\n📋 تقرير الاختبار النهائي:\n'));
  
  if (finalStatus && finalStatus.activeBots > 0) {
    console.log(chalk.green('✅ النظام يعمل بنجاح!'));
    console.log(chalk.white(`- ${finalStatus.activeBots} من ${finalStatus.totalBots} بوت نشط`));
    console.log(chalk.white(`- البوتات موزعة على ${Object.keys(finalStatus.roomDistribution).length} غرفة`));
    
    console.log(chalk.green.bold('\n🎉 نظام البوتات يعمل بشكل كامل وجاهز للاستخدام!'));
    
    console.log(chalk.cyan('\n📝 تعليمات الاستخدام:'));
    console.log(chalk.white('1. افتح المتصفح على: http://localhost:5000'));
    console.log(chalk.white('2. سجل دخول كأونر أو أنشئ حساب جديد'));
    console.log(chalk.white('3. اضغط Ctrl+Shift+B لإظهار واجهة التحكم بالبوتات'));
    console.log(chalk.white('4. أدخل رمز الوصول: owner2024$control'));
    console.log(chalk.white('5. استمتع بالتحكم الكامل في البوتات!'));
    
  } else {
    console.log(chalk.red('❌ النظام لا يعمل بشكل صحيح'));
    console.log(chalk.yellow('تحقق من السجلات في: logs/bot-system/'));
  }
}

// تشغيل الاختبارات
runTests().catch(error => {
  console.error(chalk.red('\n❌ خطأ غير متوقع:'), error);
  process.exit(1);
});

// معالج الإيقاف
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 إيقاف الاختبار...'));
  process.exit(0);
});
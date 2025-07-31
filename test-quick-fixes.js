#!/usr/bin/env node

/**
 * اختبار سريع للإصلاحات الأساسية
 * يناير 2025
 */

const axios = require('axios');
const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

console.log('⚡ اختبار سريع للإصلاحات');
console.log(`📡 عنوان الخادم: ${SERVER_URL}`);

let results = [];

async function quickTest(name, testFn) {
  try {
    console.log(`\n🔍 ${name}...`);
    const result = await testFn();
    console.log(`✅ ${name} - نجح`);
    if (result) console.log(`   ${result}`);
    results.push({ name, status: 'نجح', details: result });
  } catch (error) {
    console.log(`❌ ${name} - فشل: ${error.message}`);
    results.push({ name, status: 'فشل', error: error.message });
  }
}

async function runQuickTests() {
  console.log('\n' + '='.repeat(40));
  console.log('🚀 بدء الاختبار السريع');
  console.log('='.repeat(40));

  // 1. اختبار صحة الخادم
  await quickTest('صحة الخادم', async () => {
    const response = await axios.get(`${SERVER_URL}/api/health`);
    return `حالة: ${response.status}`;
  });

  // 2. اختبار جلب المستخدمين
  await quickTest('جلب المستخدمين', async () => {
    const response = await axios.get(`${SERVER_URL}/api/users`);
    return `عدد المستخدمين: ${response.data.users.length}`;
  });

  // 3. اختبار المستخدمين المتصلين
  await quickTest('المستخدمين المتصلين', async () => {
    const response = await axios.get(`${SERVER_URL}/api/users/online`);
    return `متصلين: ${response.data.users.length}`;
  });

  // 4. اختبار جلب الغرف
  await quickTest('جلب الغرف', async () => {
    const response = await axios.get(`${SERVER_URL}/api/rooms`);
    return `عدد الغرف: ${response.data.rooms.length}`;
  });

  // 5. اختبار Socket.IO
  await quickTest('اتصال Socket.IO', async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('انتهت المهلة')), 5000);
      
      const socket = io(SERVER_URL);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(`معرف الاتصال: ${socket.id}`);
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  // 6. اختبار تحديث الملف الشخصي
  await quickTest('تحديث الملف الشخصي', async () => {
    const data = {
      userId: 1,
      status: `اختبار سريع ${Date.now()}`
    };
    
    const response = await axios.post(`${SERVER_URL}/api/users/update-profile`, data);
    return response.data.success ? 'تم التحديث' : 'فشل التحديث';
  });

  // النتائج النهائية
  console.log('\n' + '='.repeat(40));
  console.log('📊 نتائج الاختبار السريع');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.status === 'نجح').length;
  const failed = results.filter(r => r.status === 'فشل').length;
  
  console.log(`✅ نجح: ${passed}`);
  console.log(`❌ فشل: ${failed}`);
  console.log(`📈 معدل النجاح: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 جميع الاختبارات السريعة نجحت!');
    console.log('✅ النظام يعمل بشكل صحيح');
  } else {
    console.log('\n⚠️ بعض الاختبارات فشلت:');
    results.filter(r => r.status === 'فشل').forEach(r => {
      console.log(`   • ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n📝 للاختبار الشامل، استخدم:');
  console.log('   node test-all-fixes-comprehensive.js');
}

runQuickTests().catch(console.error);
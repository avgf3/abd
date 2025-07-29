import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = 'http://localhost:5000';

async function testGeneralChat() {
  console.log('🧪 بدء اختبار الدردشة العامة...');
  
  try {
    // إنشاء اتصال Socket.IO
    const socket = io(SERVER_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    // انتظار الاتصال
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('انتهت مهلة الاتصال'));
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ تم الاتصال بنجاح');
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ خطأ في الاتصال:', error.message);
        reject(error);
      });
    });

    // اختبار المصادقة
    console.log('🔐 اختبار المصادقة...');
    socket.emit('auth', { userId: 1, username: 'test_user', userType: 'member' });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('انتهت مهلة المصادقة'));
      }, 10000);

      socket.on('connected', (data) => {
        clearTimeout(timeout);
        console.log('✅ تمت المصادقة بنجاح:', data.message);
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ خطأ في المصادقة:', error.message);
        reject(error);
      });
    });

    // اختبار إرسال رسالة عامة
    console.log('📤 اختبار إرسال رسالة عامة...');
    const testMessage = {
      content: 'مرحباً بالجميع! هذه رسالة اختبار للدردشة العامة',
      roomId: 'general',
      messageType: 'text'
    };

    socket.emit('publicMessage', testMessage);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('انتهت مهلة إرسال الرسالة'));
      }, 10000);

      socket.on('message', (data) => {
        if (data.type === 'newMessage') {
          clearTimeout(timeout);
          console.log('✅ تم إرسال الرسالة بنجاح:', data.message.content);
          resolve();
        } else if (data.type === 'error') {
          clearTimeout(timeout);
          console.error('❌ خطأ في إرسال الرسالة:', data.message);
          reject(new Error(data.message));
        }
      });
    });

    // اختبار استقبال الرسائل
    console.log('📥 اختبار استقبال الرسائل...');
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ تم اختبار استقبال الرسائل');
        resolve();
      }, 2000);
    });

    console.log('🎉 جميع الاختبارات نجحت!');
    
  } catch (error) {
    console.error('❌ فشل في الاختبار:', error.message);
    
    // تحليل المشكلة
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 المشكلة: الخادم غير مشغل');
      console.log('🔧 الحل: شغل الخادم أولاً بـ npm run dev');
    } else if (error.message.includes('المصادقة')) {
      console.log('💡 المشكلة: مشكلة في المصادقة');
      console.log('🔧 الحل: تحقق من قاعدة البيانات والمستخدمين');
    } else if (error.message.includes('الرسالة')) {
      console.log('💡 المشكلة: مشكلة في إرسال الرسائل');
      console.log('🔧 الحل: تحقق من إعدادات الأمان والسبام');
    }
  } finally {
    process.exit(0);
  }
}

testGeneralChat();
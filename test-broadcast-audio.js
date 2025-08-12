#!/usr/bin/env node

const io = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// تحميل متغيرات البيئة
const envPath = path.join(__dirname, '.env');
console.log('📁 تحميل ملف البيئة من:', envPath);
dotenv.config({ path: envPath });

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
console.log('🌐 رابط API:', API_URL);

// معلومات المستخدمين للاختبار
const speaker = {
  username: 'speaker_test',
  email: 'speaker@test.com',
  password: 'Test123456',
  token: null,
  socket: null,
  userId: null
};

const listener = {
  username: 'listener_test',
  email: 'listener@test.com',
  password: 'Test123456',
  token: null,
  socket: null,
  userId: null
};

// دالة تسجيل الدخول
async function login(user) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        password: user.password
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل تسجيل الدخول');
    }

    user.token = data.token;
    user.userId = data.user.id;
    console.log(`✅ تم تسجيل دخول ${user.username}`);
    return true;
  } catch (error) {
    console.error(`❌ خطأ في تسجيل دخول ${user.username}:`, error.message);
    return false;
  }
}

// دالة الاتصال بـ Socket.IO
function connectSocket(user) {
  return new Promise((resolve) => {
    user.socket = io(API_URL, {
      auth: { token: user.token },
      transports: ['websocket']
    });

    user.socket.on('connect', () => {
      console.log(`🔌 ${user.username} متصل بـ Socket.IO`);
      resolve();
    });

    user.socket.on('error', (error) => {
      console.error(`❌ خطأ Socket.IO لـ ${user.username}:`, error);
    });

    // مراقبة أحداث WebRTC
    user.socket.on('webrtc-offer', (data) => {
      console.log(`📨 ${user.username} استقبل عرض WebRTC من:`, data.from);
    });

    user.socket.on('webrtc-answer', (data) => {
      console.log(`📨 ${user.username} استقبل إجابة WebRTC من:`, data.from);
    });

    user.socket.on('webrtc-ice-candidate', (data) => {
      console.log(`🧊 ${user.username} استقبل ICE candidate من:`, data.from);
    });

    user.socket.on('listener-joined', (data) => {
      console.log(`👂 ${user.username} تم إشعاره بانضمام مستمع:`, data.listenerId);
    });

    user.socket.on('listeners-list', (data) => {
      console.log(`📋 ${user.username} استقبل قائمة المستمعين:`, data.listeners);
    });

    user.socket.on('speaker-started', (data) => {
      console.log(`🎙️ ${user.username} تم إشعاره ببدء البث من:`, data.speakerId);
    });
  });
}

// دالة الانضمام لغرفة البث
async function joinBroadcastRoom(user, roomId) {
  return new Promise((resolve) => {
    user.socket.emit('joinRoom', { roomId });
    
    user.socket.once('roomJoined', (data) => {
      console.log(`✅ ${user.username} انضم لغرفة البث`);
      resolve();
    });
  });
}

// دالة بدء البث الصوتي
function startBroadcasting(user, roomId) {
  console.log(`🎤 ${user.username} يبدأ البث الصوتي...`);
  user.socket.emit('start-broadcasting', { roomId });
}

// دالة إيقاف البث
function stopBroadcasting(user, roomId) {
  console.log(`🛑 ${user.username} يوقف البث الصوتي...`);
  user.socket.emit('stop-broadcasting', { roomId });
}

// تشغيل الاختبار
async function runTest() {
  console.log('🧪 بدء اختبار البث الصوتي...\n');

  // 1. تسجيل الدخول
  console.log('📝 تسجيل دخول المستخدمين...');
  const speakerLoggedIn = await login(speaker);
  const listenerLoggedIn = await login(listener);

  if (!speakerLoggedIn || !listenerLoggedIn) {
    console.error('❌ فشل تسجيل الدخول. تأكد من وجود المستخدمين في قاعدة البيانات.');
    process.exit(1);
  }

  // 2. الاتصال بـ Socket.IO
  console.log('\n🔌 الاتصال بـ Socket.IO...');
  await connectSocket(speaker);
  await connectSocket(listener);

  // 3. الانضمام لغرفة البث
  const broadcastRoomId = 'broadcast';
  console.log('\n🚪 الانضمام لغرفة البث...');
  await joinBroadcastRoom(speaker, broadcastRoomId);
  await joinBroadcastRoom(listener, broadcastRoomId);

  // 4. بدء البث الصوتي
  console.log('\n🎙️ بدء البث الصوتي...');
  setTimeout(() => {
    startBroadcasting(speaker, broadcastRoomId);
  }, 2000);

  // 5. إيقاف البث بعد 10 ثواني
  setTimeout(() => {
    stopBroadcasting(speaker, broadcastRoomId);
  }, 12000);

  // 6. قطع الاتصال بعد 15 ثانية
  setTimeout(() => {
    console.log('\n👋 إنهاء الاختبار...');
    speaker.socket.disconnect();
    listener.socket.disconnect();
    process.exit(0);
  }, 15000);
}

// معالجة الأخطاء
process.on('unhandledRejection', (error) => {
  console.error('❌ خطأ غير معالج:', error);
  process.exit(1);
});

// تشغيل الاختبار
runTest();
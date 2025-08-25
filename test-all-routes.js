#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// قائمة جميع المسارات API
const routes = {
  // Auth Routes
  auth: [
    { method: 'POST', path: '/api/auth/guest', name: 'Guest Login' },
    { method: 'POST', path: '/api/auth/register', name: 'Register' },
    { method: 'POST', path: '/api/auth/member', name: 'Member Login' },
    { method: 'POST', path: '/api/auth/logout', name: 'Logout' }
  ],
  
  // User Routes
  users: [
    { method: 'GET', path: '/api/users', name: 'Get All Users' },
    { method: 'GET', path: '/api/users/online', name: 'Get Online Users' },
    { method: 'GET', path: '/api/users/search?q=test', name: 'Search Users' },
    { method: 'GET', path: '/api/users/1', name: 'Get User by ID' },
    { method: 'GET', path: '/api/user-status/1', name: 'Get User Status' },
    { method: 'POST', path: '/api/users/update-profile', name: 'Update Profile' },
    { method: 'PUT', path: '/api/users/1', name: 'Update User' },
    { method: 'PATCH', path: '/api/users/1', name: 'Patch User' }
  ],
  
  // Messaging Routes
  messages: [
    { method: 'GET', path: '/api/messages/public', name: 'Get Public Messages' },
    { method: 'POST', path: '/api/messages', name: 'Send Message' },
    { method: 'GET', path: '/api/messages/room/main/latest', name: 'Get Latest Messages' },
    { method: 'GET', path: '/api/messages/room/main', name: 'Get Room Messages' },
    { method: 'GET', path: '/api/messages/room/main/search?q=test', name: 'Search Messages' },
    { method: 'GET', path: '/api/messages/room/main/stats', name: 'Get Message Stats' }
  ],
  
  // Room Routes
  rooms: [
    { method: 'GET', path: '/api/rooms', name: 'Get All Rooms' },
    { method: 'GET', path: '/api/rooms/main', name: 'Get Room by ID' },
    { method: 'POST', path: '/api/rooms', name: 'Create Room' },
    { method: 'POST', path: '/api/rooms/main/join', name: 'Join Room' },
    { method: 'POST', path: '/api/rooms/main/leave', name: 'Leave Room' },
    { method: 'GET', path: '/api/rooms/main/users', name: 'Get Room Users' },
    { method: 'GET', path: '/api/rooms/stats', name: 'Get Room Stats' }
  ],
  
  // Private Messages
  privateMessages: [
    { method: 'POST', path: '/api/private-messages/send', name: 'Send Private Message' },
    { method: 'GET', path: '/api/private-messages/1/2', name: 'Get Private Messages' },
    { method: 'GET', path: '/api/private-messages/conversations/1', name: 'Get Conversations' }
  ],
  
  // Friend Routes
  friends: [
    { method: 'GET', path: '/api/friends/1', name: 'Get Friends' },
    { method: 'POST', path: '/api/friend-requests', name: 'Send Friend Request' },
    { method: 'POST', path: '/api/friend-requests/by-username', name: 'Friend Request by Username' },
    { method: 'GET', path: '/api/friend-requests/1', name: 'Get Friend Requests' },
    { method: 'GET', path: '/api/friend-requests/incoming/1', name: 'Get Incoming Requests' },
    { method: 'GET', path: '/api/friend-requests/outgoing/1', name: 'Get Outgoing Requests' }
  ],
  
  // Notification Routes
  notifications: [
    { method: 'GET', path: '/api/notifications', name: 'Get All Notifications' },
    { method: 'GET', path: '/api/notifications/1', name: 'Get User Notifications' },
    { method: 'GET', path: '/api/notifications/unread-count', name: 'Get Unread Count' },
    { method: 'POST', path: '/api/notifications', name: 'Create Notification' },
    { method: 'PUT', path: '/api/notifications/1/read', name: 'Mark as Read' }
  ],
  
  // Points System Routes
  points: [
    { method: 'GET', path: '/api/points/user/1', name: 'Get User Points' },
    { method: 'GET', path: '/api/points/history/1', name: 'Get Points History' },
    { method: 'GET', path: '/api/points/leaderboard', name: 'Get Leaderboard' },
    { method: 'POST', path: '/api/points/add', name: 'Add Points' },
    { method: 'POST', path: '/api/points/send', name: 'Send Points' }
  ],
  
  // Wall Posts Routes
  wall: [
    { method: 'GET', path: '/api/wall/posts/user', name: 'Get User Wall Posts' },
    { method: 'GET', path: '/api/wall/posts/global', name: 'Get Global Wall Posts' },
    { method: 'POST', path: '/api/wall/posts', name: 'Create Wall Post' },
    { method: 'POST', path: '/api/wall/react', name: 'React to Post' },
    { method: 'DELETE', path: '/api/wall/posts/1', name: 'Delete Post' }
  ],
  
  // Moderation Routes
  moderation: [
    { method: 'GET', path: '/api/moderation/reports', name: 'Get Reports' },
    { method: 'POST', path: '/api/moderation/report', name: 'Create Report' },
    { method: 'POST', path: '/api/moderation/mute', name: 'Mute User' },
    { method: 'POST', path: '/api/moderation/unmute', name: 'Unmute User' },
    { method: 'POST', path: '/api/moderation/ban', name: 'Ban User' },
    { method: 'POST', path: '/api/moderation/block', name: 'Block User' },
    { method: 'POST', path: '/api/moderation/unblock', name: 'Unblock User' },
    { method: 'GET', path: '/api/moderation/log', name: 'Get Moderation Log' },
    { method: 'GET', path: '/api/moderation/actions', name: 'Get Moderation Actions' }
  ],
  
  // VIP Routes
  vip: [
    { method: 'GET', path: '/api/vip', name: 'Get VIP Users' },
    { method: 'GET', path: '/api/vip/candidates', name: 'Get VIP Candidates' },
    { method: 'POST', path: '/api/vip', name: 'Add VIP User' },
    { method: 'DELETE', path: '/api/vip/1', name: 'Remove VIP User' }
  ],
  
  // System Routes
  system: [
    { method: 'GET', path: '/api/health', name: 'Health Check' },
    { method: 'GET', path: '/api/ping', name: 'Ping' },
    { method: 'GET', path: '/api/socket-status', name: 'Socket Status' },
    { method: 'GET', path: '/api/spam-stats', name: 'Spam Stats' }
  ],
  
  // Upload Routes
  uploads: [
    { method: 'POST', path: '/api/upload/profile-image', name: 'Upload Profile Image' },
    { method: 'POST', path: '/api/upload/profile-banner', name: 'Upload Profile Banner' },
    { method: 'POST', path: '/api/upload/message-image', name: 'Upload Message Image' }
  ]
};

// ألوان للنتائج
const statusColors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.gray
};

// اختبار مسار واحد
async function testRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  
  try {
    const options = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000
    };
    
    // إضافة body للطلبات POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      options.body = JSON.stringify({});
    }
    
    const response = await fetch(url, options);
    
    return {
      route,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      route,
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

// عرض النتيجة
function displayResult(result) {
  const { route, status, ok, error } = result;
  
  let statusColor;
  let statusText;
  
  if (error) {
    statusColor = statusColors.error;
    statusText = `ERROR: ${error}`;
  } else if (ok) {
    statusColor = statusColors.success;
    statusText = `${status} OK`;
  } else if (status === 401 || status === 403) {
    statusColor = statusColors.warning;
    statusText = `${status} AUTH REQUIRED`;
  } else if (status === 404) {
    statusColor = statusColors.error;
    statusText = `${status} NOT FOUND`;
  } else {
    statusColor = statusColors.error;
    statusText = `${status} ${result.statusText || 'ERROR'}`;
  }
  
  console.log(
    `${statusColors.dim(route.method.padEnd(6))} ${route.path.padEnd(45)} ${route.name.padEnd(30)} ${statusColor(statusText)}`
  );
}

// اختبار جميع المسارات
async function testAllRoutes() {
  console.log(chalk.bold.blue('\n🧪 اختبار جميع مسارات API...\n'));
  console.log(chalk.dim(`Base URL: ${BASE_URL}\n`));
  
  let totalRoutes = 0;
  let successCount = 0;
  let authRequiredCount = 0;
  let errorCount = 0;
  
  for (const [category, categoryRoutes] of Object.entries(routes)) {
    console.log(chalk.bold.cyan(`\n📁 ${category.toUpperCase()}\n`));
    
    for (const route of categoryRoutes) {
      const result = await testRoute(route);
      displayResult(result);
      
      totalRoutes++;
      
      if (result.error || (!result.ok && result.status !== 401 && result.status !== 403)) {
        errorCount++;
      } else if (result.status === 401 || result.status === 403) {
        authRequiredCount++;
      } else {
        successCount++;
      }
      
      // تأخير بسيط لتجنب إرهاق الخادم
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // عرض الملخص
  console.log(chalk.bold.blue('\n📊 ملخص النتائج:\n'));
  console.log(chalk.white(`إجمالي المسارات: ${totalRoutes}`));
  console.log(statusColors.success(`✅ نجحت: ${successCount}`));
  console.log(statusColors.warning(`🔒 تحتاج مصادقة: ${authRequiredCount}`));
  console.log(statusColors.error(`❌ فشلت: ${errorCount}`));
  
  const successRate = ((successCount + authRequiredCount) / totalRoutes * 100).toFixed(1);
  console.log(chalk.bold.white(`\n📈 معدل النجاح: ${successRate}%`));
  
  if (errorCount > 0) {
    console.log(chalk.red('\n⚠️  توجد مسارات معطلة تحتاج إلى إصلاح!'));
  } else {
    console.log(chalk.green('\n✨ جميع المسارات تعمل بشكل صحيح!'));
  }
}

// التحقق من اتصال الخادم أولاً
async function checkServerConnection() {
  try {
    console.log(chalk.blue('🔍 التحقق من اتصال الخادم...'));
    const response = await fetch(`${BASE_URL}/api/ping`, { timeout: 5000 });
    
    if (response.ok) {
      console.log(chalk.green('✅ الخادم متصل ويعمل!\n'));
      return true;
    } else {
      console.log(chalk.red('❌ الخادم يستجيب ولكن بخطأ\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`❌ لا يمكن الاتصال بالخادم: ${error.message}\n`));
    console.log(chalk.yellow('تأكد من أن الخادم يعمل على:', BASE_URL));
    return false;
  }
}

// التشغيل الرئيسي
async function main() {
  console.log(chalk.bold.magenta('🚀 أداة اختبار مسارات API الشاملة\n'));
  
  const isConnected = await checkServerConnection();
  
  if (!isConnected) {
    console.log(chalk.yellow('\nيمكنك تشغيل الخادم باستخدام: npm run dev'));
    process.exit(1);
  }
  
  await testAllRoutes();
}

// معالجة الأخطاء
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ خطأ غير متوقع:'), error);
  process.exit(1);
});

// تشغيل البرنامج
main().catch(console.error);
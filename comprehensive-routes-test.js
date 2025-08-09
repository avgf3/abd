import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// قائمة بجميع مسارات API المتعلقة بجداول البيانات
const DATABASE_ROUTES = {
  // مسارات المصادقة
  auth: [
    { method: 'POST', path: '/api/auth/register', table: 'users' },
    { method: 'POST', path: '/api/auth/guest', table: 'users' },
    { method: 'POST', path: '/api/auth/member', table: 'users' }
  ],
  
  // مسارات المستخدمين
  users: [
    { method: 'GET', path: '/api/users', table: 'users' },
    { method: 'GET', path: '/api/users/online', table: 'users' },
    { method: 'PUT', path: '/api/users/:id', table: 'users' },
    { method: 'PATCH', path: '/api/users/:userId', table: 'users' },
    { method: 'GET', path: '/api/users/search', table: 'users' },
    { method: 'GET', path: '/api/users/:id', table: 'users' },
    { method: 'POST', path: '/api/users/:userId/toggle-hidden', table: 'users' },
    { method: 'POST', path: '/api/users/:userId/stealth', table: 'users' },
    { method: 'POST', path: '/api/users/:userId/username-color', table: 'users' },
    { method: 'POST', path: '/api/users/:userId/color', table: 'users' },
    { method: 'POST', path: '/api/users/update-background-color', table: 'users' }
  ],

  // مسارات الرسائل
  messages: [
    { method: 'GET', path: '/api/messages/public', table: 'messages' },
    { method: 'GET', path: '/api/messages/room/:roomId', table: 'messages' },
    { method: 'GET', path: '/api/messages/private/:userId1/:userId2', table: 'messages' },
    { method: 'POST', path: '/api/messages', table: 'messages' }
  ],

  // مسارات الأصدقاء
  friends: [
    { method: 'GET', path: '/api/friends/:userId', table: 'friends' },
    { method: 'POST', path: '/api/friends', table: 'friends' },
    { method: 'DELETE', path: '/api/friends/:userId/:friendId', table: 'friends' },
    { method: 'POST', path: '/api/friend-requests', table: 'friends' },
    { method: 'POST', path: '/api/friend-requests/by-username', table: 'friends' },
    { method: 'GET', path: '/api/friend-requests/:userId', table: 'friends' },
    { method: 'GET', path: '/api/friend-requests/incoming/:userId', table: 'friends' },
    { method: 'GET', path: '/api/friend-requests/outgoing/:userId', table: 'friends' },
    { method: 'POST', path: '/api/friend-requests/:requestId/accept', table: 'friends' },
    { method: 'POST', path: '/api/friend-requests/:requestId/decline', table: 'friends' },
    { method: 'POST', path: '/api/friend-requests/:requestId/cancel', table: 'friends' }
  ],

  // مسارات الإشعارات
  notifications: [
    { method: 'GET', path: '/api/notifications/:userId', table: 'notifications' },
    { method: 'GET', path: '/api/notifications', table: 'notifications' },
    { method: 'POST', path: '/api/notifications', table: 'notifications' },
    { method: 'PUT', path: '/api/notifications/:id/read', table: 'notifications' },
    { method: 'PUT', path: '/api/notifications/user/:userId/read-all', table: 'notifications' },
    { method: 'DELETE', path: '/api/notifications/:id', table: 'notifications' },
    { method: 'GET', path: '/api/notifications/:userId/unread-count', table: 'notifications' }
  ],

  // مسارات النقاط
  points: [
    { method: 'GET', path: '/api/points/user/:userId', table: 'points_history' },
    { method: 'GET', path: '/api/points/history/:userId', table: 'points_history' },
    { method: 'GET', path: '/api/points/leaderboard', table: 'users' },
    { method: 'POST', path: '/api/points/add', table: 'points_history' },
    { method: 'POST', path: '/api/points/send', table: 'points_history' },
    { method: 'POST', path: '/api/points/recalculate/:userId', table: 'points_history' }
  ],

  // مسارات الغرف
  rooms: [
    { method: 'GET', path: '/api/rooms', table: 'rooms' },
    { method: 'POST', path: '/api/rooms', table: 'rooms' },
    { method: 'DELETE', path: '/api/rooms/:roomId', table: 'rooms' },
    { method: 'POST', path: '/api/rooms/:roomId/join', table: 'room_users' },
    { method: 'POST', path: '/api/rooms/:roomId/leave', table: 'room_users' },
    { method: 'GET', path: '/api/rooms/:roomId', table: 'rooms' },
    { method: 'GET', path: '/api/rooms/:roomId/broadcast-info', table: 'rooms' }
  ],

  // مسارات التحكم والإشراف
  moderation: [
    { method: 'GET', path: '/api/moderation/reports', table: 'users' },
    { method: 'POST', path: '/api/moderation/report', table: 'users' },
    { method: 'POST', path: '/api/moderation/mute', table: 'users' },
    { method: 'POST', path: '/api/moderation/unmute', table: 'users' },
    { method: 'POST', path: '/api/moderation/ban', table: 'users' },
    { method: 'POST', path: '/api/moderation/block', table: 'blocked_devices' },
    { method: 'POST', path: '/api/moderation/unblock', table: 'blocked_devices' },
    { method: 'POST', path: '/api/moderation/promote', table: 'users' },
    { method: 'GET', path: '/api/moderation/log', table: 'users' },
    { method: 'GET', path: '/api/moderation/actions', table: 'users' }
  ],

  // مسارات رفع الملفات
  uploads: [
    { method: 'POST', path: '/api/upload/profile-image', table: 'users' },
    { method: 'POST', path: '/api/upload/profile-banner', table: 'users' }
  ],

  // مسارات الحائط
  wall: [
    { method: 'GET', path: '/api/wall/posts/:type', table: 'wall_posts' },
    { method: 'POST', path: '/api/wall/posts', table: 'wall_posts' },
    { method: 'POST', path: '/api/wall/react', table: 'wall_reactions' },
    { method: 'DELETE', path: '/api/wall/posts/:postId', table: 'wall_posts' }
  ]
};

// مسارات الصحة والحالة
const HEALTH_ROUTES = [
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/ping' },
  { method: 'GET', path: '/api/socket-status' },
  { method: 'GET', path: '/api/debug/images' }
];

async function checkDatabaseConnection() {
  console.log('🔍 فحص الاتصال بقاعدة البيانات...\n');
  
  try {
    const db = new Database('./chat.db');
    
    // فحص الجداول الموجودة
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();
    
    console.log('📋 الجداول الموجودة في قاعدة البيانات:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });
    
    // فحص عدد السجلات في كل جدول
    console.log('\n📊 إحصائيات الجداول:');
    const stats = {};
    
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        stats[table.name] = count.count;
        console.log(`  ${table.name}: ${count.count} سجل`);
      } catch (error) {
        console.log(`  ${table.name}: خطأ في القراءة - ${error.message}`);
        stats[table.name] = 'خطأ';
      }
    }
    
    db.close();
    return { success: true, tables: tables.map(t => t.name), stats };
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    return { success: false, error: error.message };
  }
}

async function startServer() {
  console.log('🚀 بدء تشغيل الخادم...');
  
  try {
    // قم بتشغيل الخادم في الخلفية
    const { spawn } = await import('child_process');
    const serverProcess = spawn('node', ['server/index.ts'], {
      stdio: 'pipe',
      detached: false
    });
    
    // انتظار لبدء تشغيل الخادم
    await setTimeout(3000);
    
    return serverProcess;
  } catch (error) {
    console.error('❌ فشل في تشغيل الخادم:', error.message);
    return null;
  }
}

async function testRoute(baseUrl, route, category) {
  const url = `${baseUrl}${route.path.replace(/:[\w]+/g, '1')}`;
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const options = {
        method: route.method,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Route-Tester/1.0'
        }
      };

      // إضافة بيانات للطلبات POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        options.body = JSON.stringify({
          test: true,
          userId: 1,
          username: 'test_user',
          content: 'test content'
        });
      }

      const response = await fetch(url, options);
      const status = response.status;
      
      // تجاهل أخطاء البيانات المفقودة (400) والمصادقة (401/403) لأنها تدل على أن المسار يعمل
      const workingStatuses = [200, 201, 400, 401, 403, 404, 422];
      const isWorking = workingStatuses.includes(status);
      
      return {
        success: isWorking,
        status: status,
        method: route.method,
        path: route.path,
        table: route.table,
        category: category,
        url: url,
        attempt: attempt,
        responseOk: response.ok
      };
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await setTimeout(1000); // انتظار ثانية واحدة قبل المحاولة التالية
      }
    }
  }

  return {
    success: false,
    status: 'CONNECTION_ERROR',
    method: route.method,
    path: route.path,
    table: route.table,
    category: category,
    url: url,
    error: lastError?.message || 'فشل في الاتصال',
    attempt: maxRetries
  };
}

async function testAllRoutes() {
  const baseUrl = 'http://localhost:3000';
  console.log(`\n🧪 اختبار جميع مسارات قاعدة البيانات على ${baseUrl}...\n`);

  const results = {
    working: [],
    failing: [],
    byCategory: {},
    byTable: {}
  };

  let totalRoutes = 0;
  let workingRoutes = 0;

  // اختبار مسارات قاعدة البيانات
  for (const [category, routes] of Object.entries(DATABASE_ROUTES)) {
    console.log(`\n📂 اختبار فئة: ${category}`);
    results.byCategory[category] = { working: 0, total: routes.length, routes: [] };

    for (const route of routes) {
      totalRoutes++;
      const result = await testRoute(baseUrl, route, category);
      
      results.byCategory[category].routes.push(result);
      
      // تجميع النتائج حسب الجدول
      if (!results.byTable[route.table]) {
        results.byTable[route.table] = { working: 0, total: 0, routes: [] };
      }
      results.byTable[route.table].total++;
      results.byTable[route.table].routes.push(result);

      if (result.success) {
        workingRoutes++;
        results.working.push(result);
        results.byCategory[category].working++;
        results.byTable[route.table].working++;
        console.log(`  ✅ ${result.method} ${result.path} (${result.status})`);
      } else {
        results.failing.push(result);
        console.log(`  ❌ ${result.method} ${result.path} (${result.status || result.error})`);
      }
      
      // انتظار قصير بين الطلبات
      await setTimeout(100);
    }
  }

  // اختبار مسارات الصحة
  console.log(`\n📂 اختبار مسارات الصحة والحالة`);
  for (const route of HEALTH_ROUTES) {
    totalRoutes++;
    const result = await testRoute(baseUrl, route, 'health');
    
    if (result.success) {
      workingRoutes++;
      results.working.push(result);
      console.log(`  ✅ ${result.method} ${result.path} (${result.status})`);
    } else {
      results.failing.push(result);
      console.log(`  ❌ ${result.method} ${result.path} (${result.status || result.error})`);
    }
  }

  // طباعة التقرير النهائي
  console.log('\n' + '='.repeat(80));
  console.log('📊 تقرير شامل لحالة مسارات قاعدة البيانات');
  console.log('='.repeat(80));
  
  console.log(`\n📈 إحصائيات عامة:`);
  console.log(`  المسارات الكلية: ${totalRoutes}`);
  console.log(`  المسارات العاملة: ${workingRoutes} (${((workingRoutes/totalRoutes)*100).toFixed(1)}%)`);
  console.log(`  المسارات المتعطلة: ${totalRoutes - workingRoutes} (${(((totalRoutes - workingRoutes)/totalRoutes)*100).toFixed(1)}%)`);

  console.log(`\n📂 إحصائيات حسب الفئة:`);
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const percentage = ((stats.working / stats.total) * 100).toFixed(1);
    console.log(`  ${category}: ${stats.working}/${stats.total} (${percentage}%)`);
  }

  console.log(`\n🗃️ إحصائيات حسب جداول البيانات:`);
  for (const [table, stats] of Object.entries(results.byTable)) {
    const percentage = ((stats.working / stats.total) * 100).toFixed(1);
    console.log(`  ${table}: ${stats.working}/${stats.total} (${percentage}%)`);
  }

  if (results.failing.length > 0) {
    console.log(`\n❌ المسارات المتعطلة (${results.failing.length}):`);
    results.failing.forEach(route => {
      console.log(`  ${route.method} ${route.path} - ${route.status || route.error} (جدول: ${route.table})`);
    });
  }

  console.log('\n' + '='.repeat(80));
  
  return results;
}

async function main() {
  console.log('🔍 فحص شامل لجميع مسارات جداول البيانات');
  console.log('=' .repeat(60));

  // فحص قاعدة البيانات أولاً
  const dbStatus = await checkDatabaseConnection();
  
  if (!dbStatus.success) {
    console.error('❌ فشل في الاتصال بقاعدة البيانات. توقف الاختبار.');
    process.exit(1);
  }

  // اختبار الاتصال بالخادم أولاً
  console.log('\n🔗 اختبار الاتصال بالخادم...');
  try {
    const response = await fetch('http://localhost:3000/api/health', { timeout: 5000 });
    console.log(`✅ الخادم يعمل على المنفذ 3000 (${response.status})`);
  } catch (error) {
    console.log('❌ الخادم غير متاح على المنفذ 3000');
    console.log('💡 تأكد من تشغيل الخادم بأمر: npm run dev');
    process.exit(1);
  }

  // تشغيل اختبار المسارات
  const testResults = await testAllRoutes();
  
  // إنشاء تقرير مفصل
  const reportData = {
    timestamp: new Date().toISOString(),
    database: dbStatus,
    routes: testResults,
    summary: {
      totalRoutes: Object.values(DATABASE_ROUTES).flat().length + HEALTH_ROUTES.length,
      workingRoutes: testResults.working.length,
      failingRoutes: testResults.failing.length,
      successRate: ((testResults.working.length / (Object.values(DATABASE_ROUTES).flat().length + HEALTH_ROUTES.length)) * 100).toFixed(2)
    }
  };

  console.log(`\n💾 حفظ التقرير المفصل...`);
  
  try {
    const fs = await import('fs');
    await fs.promises.writeFile(
      'database-routes-test-report.json', 
      JSON.stringify(reportData, null, 2)
    );
    console.log('✅ تم حفظ التقرير في: database-routes-test-report.json');
  } catch (error) {
    console.error('❌ فشل في حفظ التقرير:', error.message);
  }

  console.log('\n🎉 انتهى الفحص الشامل!');
  
  if (testResults.failing.length === 0) {
    console.log('✅ جميع مسارات قاعدة البيانات تعمل بشكل صحيح!');
  } else {
    console.log(`⚠️ هناك ${testResults.failing.length} مسار يحتاج إلى إصلاح.`);
  }
}

// تشغيل الاختبار
main().catch(console.error);
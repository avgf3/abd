#!/usr/bin/env node

/**
 * سكريبت اختبار خادم TURN/STUN
 * يختبر جميع جوانب الخادم للتأكد من عمله بشكل صحيح
 */

const stun = require('stun');
const { RTCPeerConnection } = require('wrtc');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

// ========================================
// التكوين - قم بتحديث هذه القيم
// ========================================

const CONFIG = {
  // خادمك المخصص
  customServer: {
    stun: 'stun:turn.yourdomain.com:3478',
    turn: 'turn:turn.yourdomain.com:3478',
    turns: 'turns:turn.yourdomain.com:5349',
    username: '', // سيتم توليده
    credential: '', // سيتم توليده
    secret: process.env.TURN_SECRET || 'a3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4'
  },
  
  // خوادم للمقارنة
  publicServers: [
    { urls: 'stun:stun.l.google.com:19302', name: 'Google STUN' },
    { urls: 'stun:stun1.l.google.com:19302', name: 'Google STUN 2' }
  ]
};

// ========================================
// الدوال المساعدة
// ========================================

/**
 * توليد بيانات اعتماد TURN
 */
function generateTurnCredentials(secret) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000) + 86400; // 24 ساعة
  const username = `${timestamp}:testuser`;
  
  // توليد HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(username);
  const credential = hmac.digest('base64');
  
  return { username, credential };
}

/**
 * اختبار STUN
 */
async function testSTUN(serverUrl) {
  return new Promise((resolve, reject) => {
    const spinner = ora(`اختبار ${serverUrl}...`).start();
    
    // استخراج المضيف والمنفذ
    const urlParts = serverUrl.replace('stun:', '').split(':');
    const host = urlParts[0];
    const port = urlParts[1] || 3478;
    
    const startTime = Date.now();
    
    stun.request(`${host}:${port}`, (err, res) => {
      const latency = Date.now() - startTime;
      
      if (err) {
        spinner.fail(`فشل: ${err.message}`);
        resolve({
          success: false,
          server: serverUrl,
          error: err.message,
          latency: null
        });
      } else {
        const address = res.getXorAddress();
        spinner.succeed(`نجح - IP: ${address.address}:${address.port} (${latency}ms)`);
        resolve({
          success: true,
          server: serverUrl,
          publicIP: address.address,
          publicPort: address.port,
          latency: latency
        });
      }
    });
  });
}

/**
 * اختبار TURN باستخدام WebRTC
 */
async function testTURN(serverUrl, username, credential) {
  return new Promise(async (resolve) => {
    const spinner = ora(`اختبار TURN ${serverUrl}...`).start();
    const startTime = Date.now();
    
    const results = {
      server: serverUrl,
      success: false,
      relayFound: false,
      candidates: [],
      error: null,
      latency: null
    };
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{
          urls: serverUrl,
          username: username,
          credential: credential
        }],
        iceTransportPolicy: 'relay' // إجبار استخدام TURN
      });
      
      let candidateTimeout;
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          results.candidates.push({
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port
          });
          
          if (event.candidate.type === 'relay') {
            results.relayFound = true;
            results.success = true;
            results.latency = Date.now() - startTime;
            spinner.succeed(`نجح - وجد Relay candidate (${results.latency}ms)`);
            clearTimeout(candidateTimeout);
            pc.close();
            resolve(results);
          }
        }
      };
      
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          if (!results.relayFound) {
            spinner.fail('لم يتم العثور على relay candidates');
            results.error = 'No relay candidates found';
          }
          clearTimeout(candidateTimeout);
          pc.close();
          resolve(results);
        }
      };
      
      // إنشاء قناة بيانات لبدء ICE gathering
      pc.createDataChannel('test');
      
      // إنشاء offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // timeout بعد 10 ثواني
      candidateTimeout = setTimeout(() => {
        spinner.fail('انتهت مهلة الاختبار');
        results.error = 'Timeout';
        pc.close();
        resolve(results);
      }, 10000);
      
    } catch (error) {
      spinner.fail(`خطأ: ${error.message}`);
      results.error = error.message;
      resolve(results);
    }
  });
}

/**
 * اختبار الاتصال P2P الكامل
 */
async function testP2PConnection(iceServers) {
  const spinner = ora('اختبار اتصال P2P كامل...').start();
  
  try {
    // إنشاء peer connections
    const pc1 = new RTCPeerConnection({ iceServers });
    const pc2 = new RTCPeerConnection({ iceServers });
    
    const results = {
      success: false,
      connectionState: null,
      iceConnectionState: null,
      candidates: {
        pc1: [],
        pc2: []
      },
      time: 0
    };
    
    const startTime = Date.now();
    
    // تبادل ICE candidates
    pc1.onicecandidate = (e) => {
      if (e.candidate) {
        results.candidates.pc1.push(e.candidate.type);
        pc2.addIceCandidate(e.candidate);
      }
    };
    
    pc2.onicecandidate = (e) => {
      if (e.candidate) {
        results.candidates.pc2.push(e.candidate.type);
        pc1.addIceCandidate(e.candidate);
      }
    };
    
    // مراقبة حالة الاتصال
    pc1.onconnectionstatechange = () => {
      results.connectionState = pc1.connectionState;
      if (pc1.connectionState === 'connected') {
        results.success = true;
        results.time = Date.now() - startTime;
        spinner.succeed(`اتصال P2P ناجح (${results.time}ms)`);
      }
    };
    
    // إنشاء قناة بيانات
    const channel = pc1.createDataChannel('test');
    
    // إنشاء وتبادل offer/answer
    const offer = await pc1.createOffer();
    await pc1.setLocalDescription(offer);
    await pc2.setRemoteDescription(offer);
    
    const answer = await pc2.createAnswer();
    await pc2.setLocalDescription(answer);
    await pc1.setRemoteDescription(answer);
    
    // انتظار الاتصال أو timeout
    await new Promise((resolve) => {
      setTimeout(() => {
        if (!results.success) {
          spinner.fail('فشل اتصال P2P');
        }
        pc1.close();
        pc2.close();
        resolve();
      }, 15000);
    });
    
    return results;
    
  } catch (error) {
    spinner.fail(`خطأ في P2P: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * اختبار الأداء
 */
async function testPerformance(serverUrl) {
  const spinner = ora('اختبار الأداء...').start();
  
  const iterations = 10;
  const latencies = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      // اختبار STUN بسيط للأداء
      const urlParts = serverUrl.replace('stun:', '').split(':');
      const host = urlParts[0];
      const port = urlParts[1] || 3478;
      
      await new Promise((resolve, reject) => {
        stun.request(`${host}:${port}`, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      
      const latency = Date.now() - startTime;
      latencies.push(latency);
      
    } catch (error) {
      // تجاهل الأخطاء في اختبار الأداء
    }
  }
  
  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    
    spinner.succeed('اختبار الأداء اكتمل');
    
    return {
      iterations: iterations,
      successful: latencies.length,
      avgLatency: avg.toFixed(2),
      minLatency: min,
      maxLatency: max
    };
  } else {
    spinner.fail('فشل اختبار الأداء');
    return null;
  }
}

/**
 * عرض النتائج في جدول
 */
function displayResults(results) {
  console.log('\n' + chalk.bold.cyan('📊 نتائج الاختبار'));
  console.log('═'.repeat(60));
  
  // جدول STUN
  if (results.stun.length > 0) {
    console.log('\n' + chalk.bold.yellow('🔍 اختبارات STUN:'));
    const stunTable = new Table({
      head: ['الخادم', 'الحالة', 'IP العام', 'الزمن (ms)'],
      style: { head: ['cyan'] }
    });
    
    results.stun.forEach(test => {
      stunTable.push([
        test.server,
        test.success ? chalk.green('✓ نجح') : chalk.red('✗ فشل'),
        test.publicIP || '-',
        test.latency || '-'
      ]);
    });
    
    console.log(stunTable.toString());
  }
  
  // جدول TURN
  if (results.turn.length > 0) {
    console.log('\n' + chalk.bold.yellow('🔄 اختبارات TURN:'));
    const turnTable = new Table({
      head: ['الخادم', 'الحالة', 'Relay', 'المرشحين', 'الزمن (ms)'],
      style: { head: ['cyan'] }
    });
    
    results.turn.forEach(test => {
      turnTable.push([
        test.server,
        test.success ? chalk.green('✓ نجح') : chalk.red('✗ فشل'),
        test.relayFound ? chalk.green('✓') : chalk.red('✗'),
        test.candidates.length,
        test.latency || '-'
      ]);
    });
    
    console.log(turnTable.toString());
  }
  
  // نتائج P2P
  if (results.p2p) {
    console.log('\n' + chalk.bold.yellow('🔗 اختبار P2P:'));
    console.log(`  الحالة: ${results.p2p.success ? chalk.green('✓ ناجح') : chalk.red('✗ فشل')}`);
    if (results.p2p.success) {
      console.log(`  الوقت: ${results.p2p.time}ms`);
      console.log(`  مرشحين PC1: ${results.p2p.candidates.pc1.join(', ')}`);
      console.log(`  مرشحين PC2: ${results.p2p.candidates.pc2.join(', ')}`);
    }
  }
  
  // نتائج الأداء
  if (results.performance) {
    console.log('\n' + chalk.bold.yellow('⚡ اختبار الأداء:'));
    console.log(`  التكرارات: ${results.performance.successful}/${results.performance.iterations}`);
    console.log(`  متوسط الزمن: ${results.performance.avgLatency}ms`);
    console.log(`  أقل زمن: ${results.performance.minLatency}ms`);
    console.log(`  أعلى زمن: ${results.performance.maxLatency}ms`);
  }
  
  // الخلاصة
  console.log('\n' + '═'.repeat(60));
  const totalTests = results.stun.length + results.turn.length;
  const successfulTests = results.stun.filter(t => t.success).length + 
                         results.turn.filter(t => t.success).length;
  
  if (successfulTests === totalTests) {
    console.log(chalk.bold.green('✅ جميع الاختبارات نجحت! الخادم جاهز للإنتاج.'));
  } else if (successfulTests > 0) {
    console.log(chalk.bold.yellow(`⚠️  ${successfulTests}/${totalTests} اختبارات نجحت. تحقق من الإعدادات.`));
  } else {
    console.log(chalk.bold.red('❌ جميع الاختبارات فشلت. تحقق من إعدادات الخادم.'));
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  console.log(chalk.bold.cyan('\n🔧 اختبار خادم TURN/STUN\n'));
  console.log('═'.repeat(60));
  
  // توليد بيانات الاعتماد
  const credentials = generateTurnCredentials(CONFIG.customServer.secret);
  CONFIG.customServer.username = credentials.username;
  CONFIG.customServer.credential = credentials.credential;
  
  console.log(chalk.gray('معلومات الاعتماد:'));
  console.log(chalk.gray(`  Username: ${credentials.username}`));
  console.log(chalk.gray(`  Secret: ${CONFIG.customServer.secret.substring(0, 10)}...`));
  console.log();
  
  const results = {
    stun: [],
    turn: [],
    p2p: null,
    performance: null
  };
  
  // اختبار STUN
  console.log(chalk.bold('\n1️⃣  اختبار STUN'));
  console.log('─'.repeat(40));
  
  // اختبار الخادم المخصص
  const customStunResult = await testSTUN(CONFIG.customServer.stun);
  results.stun.push(customStunResult);
  
  // اختبار خوادم عامة للمقارنة
  for (const server of CONFIG.publicServers) {
    const result = await testSTUN(server.urls);
    result.server = server.name;
    results.stun.push(result);
  }
  
  // اختبار TURN
  console.log(chalk.bold('\n2️⃣  اختبار TURN'));
  console.log('─'.repeat(40));
  
  const turnResult = await testTURN(
    CONFIG.customServer.turn,
    CONFIG.customServer.username,
    CONFIG.customServer.credential
  );
  results.turn.push(turnResult);
  
  // اختبار TURNS (TLS)
  if (CONFIG.customServer.turns) {
    const turnsResult = await testTURN(
      CONFIG.customServer.turns,
      CONFIG.customServer.username,
      CONFIG.customServer.credential
    );
    results.turn.push(turnsResult);
  }
  
  // اختبار P2P
  console.log(chalk.bold('\n3️⃣  اختبار الاتصال P2P'));
  console.log('─'.repeat(40));
  
  const iceServers = [
    { urls: CONFIG.customServer.stun },
    {
      urls: CONFIG.customServer.turn,
      username: CONFIG.customServer.username,
      credential: CONFIG.customServer.credential
    }
  ];
  
  results.p2p = await testP2PConnection(iceServers);
  
  // اختبار الأداء
  console.log(chalk.bold('\n4️⃣  اختبار الأداء'));
  console.log('─'.repeat(40));
  
  results.performance = await testPerformance(CONFIG.customServer.stun);
  
  // عرض النتائج
  displayResults(results);
  
  // حفظ النتائج في ملف
  const fs = require('fs');
  const reportFile = `turn-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 تم حفظ التقرير في: ${chalk.cyan(reportFile)}\n`);
}

// التعامل مع الأخطاء
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ خطأ غير متوقع:'), error);
  process.exit(1);
});

// تشغيل الاختبار
main().catch(error => {
  console.error(chalk.red('\n❌ خطأ:'), error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * اختبار بسيط وسريع لخادم TURN/STUN
 * لا يحتاج مكتبات خارجية معقدة
 */

const dgram = require('dgram');
const crypto = require('crypto');

// التكوين
const SERVER_HOST = process.env.TURN_HOST || 'turn.yourdomain.com';
const SERVER_PORT = process.env.TURN_PORT || 3478;
const SECRET = process.env.TURN_SECRET || 'a3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4';

console.log('🔧 اختبار بسيط لخادم TURN/STUN');
console.log('================================\n');
console.log(`الخادم: ${SERVER_HOST}:${SERVER_PORT}`);

/**
 * إنشاء رسالة STUN Binding Request
 */
function createStunRequest() {
  // STUN header: 20 bytes
  const header = Buffer.alloc(20);
  
  // Message Type: Binding Request (0x0001)
  header.writeUInt16BE(0x0001, 0);
  
  // Message Length: 0 (no attributes)
  header.writeUInt16BE(0x0000, 2);
  
  // Magic Cookie: 0x2112A442
  header.writeUInt32BE(0x2112A442, 4);
  
  // Transaction ID: 12 random bytes
  crypto.randomBytes(12).copy(header, 8);
  
  return header;
}

/**
 * تحليل رد STUN
 */
function parseStunResponse(buffer) {
  if (buffer.length < 20) {
    throw new Error('رد قصير جداً');
  }
  
  const messageType = buffer.readUInt16BE(0);
  const messageLength = buffer.readUInt16BE(2);
  const magicCookie = buffer.readUInt32BE(4);
  
  if (magicCookie !== 0x2112A442) {
    throw new Error('Magic cookie غير صحيح');
  }
  
  // Binding Response Success
  if (messageType === 0x0101) {
    console.log('✅ استجابة STUN ناجحة!');
    
    // محاولة استخراج XOR-MAPPED-ADDRESS
    let offset = 20;
    while (offset < buffer.length) {
      const attrType = buffer.readUInt16BE(offset);
      const attrLength = buffer.readUInt16BE(offset + 2);
      
      // XOR-MAPPED-ADDRESS (0x0020)
      if (attrType === 0x0020) {
        const family = buffer.readUInt8(offset + 5);
        const xorPort = buffer.readUInt16BE(offset + 6);
        const xorAddress = buffer.readUInt32BE(offset + 8);
        
        // فك تشفير XOR
        const port = xorPort ^ (0x2112A442 >>> 16);
        const ipBytes = [
          (xorAddress >>> 24) ^ 0x21,
          (xorAddress >>> 16) ^ 0x12,
          (xorAddress >>> 8) ^ 0xA4,
          (xorAddress) ^ 0x42
        ];
        
        const ip = ipBytes.join('.');
        console.log(`📍 عنوان IP العام: ${ip}:${port}`);
        return { success: true, ip, port };
      }
      
      offset += 4 + attrLength;
      // Padding alignment
      if (attrLength % 4 !== 0) {
        offset += 4 - (attrLength % 4);
      }
    }
  }
  
  return { success: true };
}

/**
 * اختبار STUN
 */
function testStun() {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const request = createStunRequest();
    let timeout;
    
    console.log('\n📡 إرسال طلب STUN...');
    
    client.on('message', (msg) => {
      clearTimeout(timeout);
      console.log(`📨 استلام رد (${msg.length} bytes)`);
      
      try {
        const result = parseStunResponse(msg);
        client.close();
        resolve(result);
      } catch (error) {
        console.error('❌ خطأ في تحليل الرد:', error.message);
        client.close();
        reject(error);
      }
    });
    
    client.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ خطأ في الاتصال:', err.message);
      client.close();
      reject(err);
    });
    
    // إرسال الطلب
    client.send(request, SERVER_PORT, SERVER_HOST, (err) => {
      if (err) {
        console.error('❌ خطأ في الإرسال:', err.message);
        client.close();
        reject(err);
      } else {
        console.log('✉️  تم إرسال الطلب');
      }
    });
    
    // Timeout بعد 5 ثواني
    timeout = setTimeout(() => {
      console.error('⏱️  انتهت مهلة الانتظار');
      client.close();
      reject(new Error('Timeout'));
    }, 5000);
  });
}

/**
 * توليد بيانات اعتماد TURN
 */
function generateTurnCredentials() {
  const timestamp = Math.floor(Date.now() / 1000) + 86400;
  const username = `${timestamp}:testuser`;
  
  const hmac = crypto.createHmac('sha1', SECRET);
  hmac.update(username);
  const credential = hmac.digest('base64');
  
  return { username, credential };
}

/**
 * اختبار الاتصال TCP
 */
function testTcpConnection() {
  return new Promise((resolve) => {
    const net = require('net');
    const client = new net.Socket();
    
    console.log('\n🔌 اختبار اتصال TCP...');
    
    const timeout = setTimeout(() => {
      console.log('⏱️  انتهت مهلة TCP');
      client.destroy();
      resolve({ tcp: false });
    }, 3000);
    
    client.connect(SERVER_PORT, SERVER_HOST, () => {
      clearTimeout(timeout);
      console.log('✅ اتصال TCP ناجح');
      client.destroy();
      resolve({ tcp: true });
    });
    
    client.on('error', (err) => {
      clearTimeout(timeout);
      console.log('❌ فشل اتصال TCP:', err.message);
      resolve({ tcp: false });
    });
  });
}

/**
 * فحص المنافذ
 */
async function checkPorts() {
  console.log('\n🔍 فحص المنافذ...');
  
  const ports = [
    { port: 3478, protocol: 'UDP/TCP', name: 'STUN/TURN' },
    { port: 5349, protocol: 'TCP/TLS', name: 'TURNS' },
    { port: 80, protocol: 'TCP', name: 'HTTP (اختياري)' },
    { port: 443, protocol: 'TCP', name: 'HTTPS (اختياري)' }
  ];
  
  for (const portInfo of ports) {
    process.stdout.write(`  المنفذ ${portInfo.port} (${portInfo.name}): `);
    
    // اختبار بسيط للاتصال
    const isOpen = await new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(portInfo.port, SERVER_HOST);
    });
    
    console.log(isOpen ? '✅ مفتوح' : '⚠️  مغلق أو غير متاح');
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  try {
    // اختبار STUN
    const stunResult = await testStun();
    
    // اختبار TCP
    const tcpResult = await testTcpConnection();
    
    // فحص المنافذ
    await checkPorts();
    
    // توليد بيانات TURN
    console.log('\n🔑 بيانات اعتماد TURN:');
    const creds = generateTurnCredentials();
    console.log(`  Username: ${creds.username}`);
    console.log(`  Credential: ${creds.credential}`);
    
    // الخلاصة
    console.log('\n' + '='.repeat(40));
    console.log('📊 الخلاصة:');
    
    if (stunResult.success) {
      console.log('  ✅ STUN يعمل بشكل صحيح');
      if (stunResult.ip) {
        console.log(`  📍 IP العام: ${stunResult.ip}`);
      }
    } else {
      console.log('  ❌ STUN لا يعمل');
    }
    
    if (tcpResult.tcp) {
      console.log('  ✅ اتصال TCP متاح');
    } else {
      console.log('  ⚠️  اتصال TCP غير متاح');
    }
    
    console.log('\n💡 نصائح:');
    console.log('  1. تأكد من فتح المنافذ في الجدار الناري');
    console.log('  2. تأكد من صحة إعدادات DNS');
    console.log('  3. استخدم البيانات أعلاه في إعدادات التطبيق');
    
  } catch (error) {
    console.error('\n❌ خطأ عام:', error.message);
    process.exit(1);
  }
}

// تشغيل الاختبار
console.log(`التوقيت: ${new Date().toLocaleString('ar-SA')}\n`);
main();
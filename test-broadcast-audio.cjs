#!/usr/bin/env node

/**
 * اختبار نظام البث الصوتي
 * يتحقق من وجود جميع المكونات المطلوبة للبث الصوتي
 */

const fs = require('fs');
const path = require('path');

class BroadcastAudioTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    
    this.results.push({
      timestamp,
      type,
      message
    });
  }

  error(message) {
    this.log(message, 'error');
    this.errors.push(message);
  }

  success(message) {
    this.log(message, 'success');
  }

  warn(message) {
    this.log(message, 'warn');
  }

  // فحص وجود الملفات المطلوبة
  checkRequiredFiles() {
    this.log('فحص الملفات المطلوبة...');
    
    const requiredFiles = [
      'client/src/components/chat/BroadcastRoomInterface.tsx',
      'client/src/lib/voice/VoiceManager.ts',
      'client/src/hooks/useVoice.ts',
      'server/services/voiceService.ts',
      'server/routes/voice.ts',
      'server/realtime.ts'
    ];

    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.success(`✅ ${file} موجود`);
      } else {
        this.error(`❌ ${file} غير موجود`);
      }
    });
  }

  // فحص محتوى ملف البث المباشر
  checkBroadcastInterface() {
    this.log('فحص محتوى BroadcastRoomInterface...');
    
    const filePath = 'client/src/components/chat/BroadcastRoomInterface.tsx';
    if (!fs.existsSync(filePath)) {
      this.error('ملف BroadcastRoomInterface غير موجود');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // فحص المكونات الأساسية
    const checks = [
      { pattern: 'getUserMedia', name: 'الحصول على الميكروفون' },
      { pattern: 'RTCPeerConnection', name: 'اتصال WebRTC' },
      { pattern: 'addTrack', name: 'إضافة مسار الصوت' },
      { pattern: 'createOffer', name: 'إنشاء عرض الاتصال' },
      { pattern: 'ontrack', name: 'استقبال الصوت' },
      { pattern: 'srcObject', name: 'تعيين مصدر الصوت' },
      { pattern: 'audioRef', name: 'مرجع العنصر الصوتي' },
      { pattern: 'iceServers', name: 'خوادم ICE' },
      { pattern: 'webrtc-offer', name: 'إرسال عرض WebRTC' },
      { pattern: 'webrtc-answer', name: 'إرسال إجابة WebRTC' },
      { pattern: 'webrtc-ice-candidate', name: 'إرسال ICE candidate' }
    ];

    checks.forEach(check => {
      if (content.includes(check.pattern)) {
        this.success(`✅ ${check.name} موجود`);
      } else {
        this.error(`❌ ${check.name} غير موجود`);
      }
    });

    // فحص مشاكل محتملة
    if (content.includes('audioRef.current.muted = isMuted')) {
      this.warn('⚠️ قد يكون الصوت مكتوماً افتراضياً');
    }

    if (!content.includes('TURN') && !content.includes('turn:')) {
      this.warn('⚠️ لا يوجد TURN server - قد يفشل في الشبكات المحمية');
    }

    if (content.includes('catch') && content.includes('play()')) {
      this.success('✅ معالجة أخطاء تشغيل الصوت موجودة');
    } else {
      this.error('❌ معالجة أخطاء تشغيل الصوت غير كافية');
    }
  }

  // فحص خدمة الصوت في الخادم
  checkVoiceService() {
    this.log('فحص خدمة الصوت في الخادم...');
    
    const filePath = 'server/services/voiceService.ts';
    if (!fs.existsSync(filePath)) {
      this.error('ملف voiceService غير موجود');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    const checks = [
      { pattern: 'handleSignalingMessage', name: 'معالجة إشارات WebRTC' },
      { pattern: 'handleJoinRoom', name: 'الانضمام للغرفة الصوتية' },
      { pattern: 'handleMicRequest', name: 'طلب الميكروفون' },
      { pattern: 'handleSpeakerManagement', name: 'إدارة المتحدثين' },
      { pattern: 'voice:signal', name: 'معالجة إشارات الصوت' },
      { pattern: 'voice:join-room', name: 'انضمام للغرفة الصوتية' }
    ];

    checks.forEach(check => {
      if (content.includes(check.pattern)) {
        this.success(`✅ ${check.name} موجود`);
      } else {
        this.error(`❌ ${check.name} غير موجود`);
      }
    });
  }

  // فحص مسارات API
  checkAPIRoutes() {
    this.log('فحص مسارات API...');
    
    const files = [
      'server/routes/voice.ts',
      'server/routes/rooms.ts'
    ];

    files.forEach(file => {
      if (!fs.existsSync(file)) {
        this.error(`❌ ${file} غير موجود`);
        return;
      }

      const content = fs.readFileSync(file, 'utf8');
      
      if (file.includes('voice.ts')) {
        const voiceChecks = [
          'request-mic',
          'manage-speaker',
          'join-room',
          'leave-room'
        ];
        
        voiceChecks.forEach(check => {
          if (content.includes(check)) {
            this.success(`✅ مسار ${check} موجود`);
          } else {
            this.error(`❌ مسار ${check} غير موجود`);
          }
        });
      }

      if (file.includes('rooms.ts')) {
        const roomChecks = [
          'broadcast-info',
          'request-mic',
          'approve-mic',
          'reject-mic',
          'remove-speaker'
        ];
        
        roomChecks.forEach(check => {
          if (content.includes(check)) {
            this.success(`✅ مسار ${check} موجود`);
          } else {
            this.error(`❌ مسار ${check} غير موجود`);
          }
        });
      }
    });
  }

  // فحص تكامل Socket.IO
  checkSocketIntegration() {
    this.log('فحص تكامل Socket.IO...');
    
    const filePath = 'server/realtime.ts';
    if (!fs.existsSync(filePath)) {
      this.error('ملف realtime غير موجود');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    const checks = [
      { pattern: 'webrtc-offer', name: 'معالجة عرض WebRTC' },
      { pattern: 'webrtc-answer', name: 'معالجة إجابة WebRTC' },
      { pattern: 'webrtc-ice-candidate', name: 'معالجة ICE candidate' },
      { pattern: 'socket.currentRoom', name: 'التحقق من الغرفة الحالية' }
    ];

    checks.forEach(check => {
      if (content.includes(check.pattern)) {
        this.success(`✅ ${check.name} موجود`);
      } else {
        this.error(`❌ ${check.name} غير موجود`);
      }
    });
  }

  // فحص الخطافات في الواجهة الأمامية
  checkFrontendHooks() {
    this.log('فحص خطافات الواجهة الأمامية...');
    
    const filePath = 'client/src/hooks/useChat.ts';
    if (!fs.existsSync(filePath)) {
      this.error('ملف useChat غير موجود');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    const checks = [
      { pattern: 'sendWebRTCOffer', name: 'إرسال عرض WebRTC' },
      { pattern: 'sendWebRTCAnswer', name: 'إرسال إجابة WebRTC' },
      { pattern: 'sendWebRTCIceCandidate', name: 'إرسال ICE candidate' },
      { pattern: 'onWebRTCOffer', name: 'استقبال عرض WebRTC' },
      { pattern: 'onWebRTCAnswer', name: 'استقبال إجابة WebRTC' },
      { pattern: 'onWebRTCIceCandidate', name: 'استقبال ICE candidate' }
    ];

    checks.forEach(check => {
      if (content.includes(check.pattern)) {
        this.success(`✅ ${check.name} موجود`);
      } else {
        this.error(`❌ ${check.name} غير موجود`);
      }
    });
  }

  // تحليل تدفق البيانات
  analyzeDataFlow() {
    this.log('تحليل تدفق البيانات...');
    
    this.log('1. المستخدم يبدأ البث:');
    this.log('   - getUserMedia() للحصول على الميكروفون');
    this.log('   - إنشاء RTCPeerConnection');
    this.log('   - addTrack() لإضافة مسار الصوت');
    this.log('   - createOffer() لإنشاء عرض الاتصال');
    this.log('   - sendWebRTCOffer() لإرسال العرض للمستمعين');
    
    this.log('2. المستمع يستقبل البث:');
    this.log('   - استقبال webrtc-offer عبر Socket.IO');
    this.log('   - إنشاء RTCPeerConnection');
    this.log('   - setRemoteDescription() لتعيين العرض');
    this.log('   - createAnswer() لإنشاء الإجابة');
    this.log('   - sendWebRTCAnswer() لإرسال الإجابة');
    this.log('   - ontrack() لاستقبال الصوت');
    this.log('   - audioRef.current.srcObject = remoteStream');
    this.log('   - audioRef.current.play() لتشغيل الصوت');
    
    this.log('3. تبادل ICE candidates:');
    this.log('   - إرسال واستقبال webrtc-ice-candidate');
    this.log('   - addIceCandidate() لإضافة المرشحين');
  }

  // تقرير النتائج
  generateReport() {
    this.log('\n=== تقرير اختبار نظام البث الصوتي ===');
    
    const totalChecks = this.results.length;
    const errors = this.errors.length;
    const warnings = this.results.filter(r => r.type === 'warn').length;
    const successes = this.results.filter(r => r.type === 'success').length;
    
    this.log(`إجمالي الفحوصات: ${totalChecks}`);
    this.log(`نجح: ${successes}`);
    this.log(`تحذيرات: ${warnings}`);
    this.log(`أخطاء: ${errors}`);
    
    if (errors === 0) {
      this.success('🎉 النظام جاهز للبث الصوتي!');
    } else {
      this.error(`❌ يوجد ${errors} مشكلة يجب إصلاحها`);
    }
    
    if (warnings > 0) {
      this.warn(`⚠️ يوجد ${warnings} تحذير يجب مراجعته`);
    }
    
    // توصيات
    this.log('\n=== التوصيات ===');
    this.log('1. تأكد من وجود TURN server للشبكات المحمية');
    this.log('2. اختبر الأذونات في المتصفحات المختلفة');
    this.log('3. تأكد من تشغيل الصوت غير مكتوم افتراضياً');
    this.log('4. اختبر الاتصال في بيئات شبكة مختلفة');
    this.log('5. راقب أخطاء WebRTC في console المتصفح');
  }

  // تشغيل جميع الاختبارات
  async runAllTests() {
    this.log('بدء اختبار نظام البث الصوتي...\n');
    
    this.checkRequiredFiles();
    this.checkBroadcastInterface();
    this.checkVoiceService();
    this.checkAPIRoutes();
    this.checkSocketIntegration();
    this.checkFrontendHooks();
    this.analyzeDataFlow();
    this.generateReport();
    
    return {
      success: this.errors.length === 0,
      errors: this.errors,
      results: this.results
    };
  }
}

// تشغيل الاختبار
if (require.main === module) {
  const tester = new BroadcastAudioTester();
  tester.runAllTests().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = BroadcastAudioTester;
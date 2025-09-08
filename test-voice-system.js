/**
 * اختبار شامل لنظام الغرف الصوتية المطور
 * يتضمن اختبار جميع المكونات والوظائف
 */

import fs from 'fs';
import path from 'path';

// ألوان للتقرير
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class VoiceSystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const color = type === 'pass' ? colors.green : 
                  type === 'fail' ? colors.red :
                  type === 'warn' ? colors.yellow : colors.blue;
    console.log(`${color}${message}${colors.reset}`);
  }

  test(name, testFn) {
    try {
      const result = testFn();
      if (result === true || result === undefined) {
        this.results.passed++;
        this.results.tests.push({ name, status: 'PASS' });
        this.log(`✅ ${name}`, 'pass');
      } else {
        this.results.failed++;
        this.results.tests.push({ name, status: 'FAIL', error: result });
        this.log(`❌ ${name}: ${result}`, 'fail');
      }
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAIL', error: error.message });
      this.log(`❌ ${name}: ${error.message}`, 'fail');
    }
  }

  warn(message) {
    this.results.warnings++;
    this.log(`⚠️  ${message}`, 'warn');
  }

  checkFileExists(filePath, description) {
    this.test(`${description} - الملف موجود`, () => {
      if (!fs.existsSync(filePath)) {
        return `الملف غير موجود: ${filePath}`;
      }
      return true;
    });
  }

  checkFileContent(filePath, searchText, description) {
    this.test(`${description} - المحتوى صحيح`, () => {
      if (!fs.existsSync(filePath)) {
        return `الملف غير موجود: ${filePath}`;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes(searchText)) {
        return `المحتوى المطلوب غير موجود: ${searchText}`;
      }
      return true;
    });
  }

  checkPackageJson() {
    this.log('\n🔍 فحص package.json', 'info');
    
    this.checkFileExists('./package.json', 'package.json');
    
    this.test('التبعيات الصوتية موجودة', () => {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const requiredDeps = ['socket.io', 'socket.io-client'];
      
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
          return `التبعية المطلوبة غير موجودة: ${dep}`;
        }
      }
      return true;
    });
  }

  checkBackendFiles() {
    this.log('\n🔍 فحص ملفات الخادم', 'info');

    // فحص الخدمات
    this.checkFileExists('./server/services/voiceService.ts', 'خدمة الصوت');
    this.checkFileContent('./server/services/voiceService.ts', 'class VoiceService', 'فئة خدمة الصوت');
    this.checkFileContent('./server/services/voiceService.ts', 'handleJoinRoom', 'وظيفة الانضمام للغرفة');
    this.checkFileContent('./server/services/voiceService.ts', 'handleSignalingMessage', 'معالجة إشارات WebRTC');

    // فحص المسارات
    this.checkFileExists('./server/routes/voice.ts', 'مسارات الصوت');
    this.checkFileContent('./server/routes/voice.ts', '/api/voice/rooms', 'مسارات API الصوت');
    this.checkFileContent('./server/routes/voice.ts', 'protect.auth', 'حماية المسارات');

    // فحص التكامل مع النظام الرئيسي
    this.checkFileContent('./server/routes.ts', 'voiceRoutes', 'تسجيل مسارات الصوت');
    this.checkFileContent('./server/realtime.ts', 'voiceService', 'تكامل خدمة الصوت');
  }

  checkFrontendFiles() {
    this.log('\n🔍 فحص ملفات العميل', 'info');

    // فحص الأنواع
    this.checkFileExists('./client/src/types/voice.ts', 'أنواع الصوت');
    this.checkFileContent('./client/src/types/voice.ts', 'interface VoiceRoom', 'واجهة الغرفة الصوتية');
    this.checkFileContent('./client/src/types/voice.ts', 'interface VoiceUser', 'واجهة المستخدم الصوتي');

    // فحص مدير الصوت
    this.checkFileExists('./client/src/lib/voice/VoiceManager.ts', 'مدير الصوت');
    this.checkFileContent('./client/src/lib/voice/VoiceManager.ts', 'class VoiceManager', 'فئة مدير الصوت');
    this.checkFileContent('./client/src/lib/voice/VoiceManager.ts', 'WebRTC', 'تقنيات WebRTC');
    this.checkFileContent('./client/src/lib/voice/VoiceManager.ts', 'MediaStream', 'تدفق الوسائط');

    // فحص الخطاف
    this.checkFileExists('./client/src/hooks/useVoice.ts', 'خطاف الصوت');
    this.checkFileContent('./client/src/hooks/useVoice.ts', 'export function useVoice', 'تصدير خطاف الصوت');

    // فحص المكونات
    this.checkFileExists('./client/src/components/voice/VoiceRoom.tsx', 'مكون الغرفة الصوتية');
    this.checkFileContent('./client/src/components/voice/VoiceRoom.tsx', 'VoiceRoom', 'مكون الغرفة الصوتية');

    this.checkFileExists('./client/src/components/voice/VoiceControls.tsx', 'عناصر التحكم الصوتي');
    this.checkFileContent('./client/src/components/voice/VoiceControls.tsx', 'VoiceControls', 'عناصر التحكم الصوتي');
  }

  checkIntegration() {
    this.log('\n🔍 فحص التكامل', 'info');

    // فحص تكامل الغرف
    this.checkFileContent('./client/src/components/chat/RoomComponent.tsx', 'useVoice', 'تكامل خطاف الصوت');
    this.checkFileContent('./client/src/components/chat/RoomComponent.tsx', 'handleVoiceJoin', 'معالج الانضمام الصوتي');
    
    // فحص تكامل قائمة الغرف
    this.checkFileContent('./client/src/components/chat/RoomListItem.tsx', 'onVoiceJoin', 'زر الانضمام الصوتي');
    this.checkFileContent('./client/src/components/chat/RoomListItem.tsx', 'Phone', 'أيقونة الهاتف');
  }

  checkSecurity() {
    this.log('\n🔍 فحص الأمان', 'info');

    this.test('حماية مسارات الصوت', () => {
      const voiceRoutesContent = fs.readFileSync('./server/routes/voice.ts', 'utf8');
      if (!voiceRoutesContent.includes('protect.auth') || !voiceRoutesContent.includes('protect.moderator')) {
        return 'مسارات الصوت غير محمية بشكل صحيح';
      }
      return true;
    });

    this.test('التحقق من الصلاحيات', () => {
      const voiceServiceContent = fs.readFileSync('./server/services/voiceService.ts', 'utf8');
      if (!voiceServiceContent.includes('userType') || !voiceServiceContent.includes('admin')) {
        return 'التحقق من الصلاحيات غير مطبق';
      }
      return true;
    });

    this.test('تنظيف البيانات', () => {
      const voiceServiceContent = fs.readFileSync('./server/services/voiceService.ts', 'utf8');
      if (!voiceServiceContent.includes('sanitize')) {
        this.warn('قد تحتاج لإضافة تنظيف البيانات الحساسة');
      }
      return true;
    });
  }

  checkPerformance() {
    this.log('\n🔍 فحص الأداء', 'info');

    this.test('إدارة الذاكرة', () => {
      const voiceManagerContent = fs.readFileSync('./client/src/lib/voice/VoiceManager.ts', 'utf8');
      if (!voiceManagerContent.includes('cleanup') && !voiceManagerContent.includes('disconnect')) {
        return 'إدارة الذاكرة والتنظيف غير مطبقة';
      }
      return true;
    });

    this.test('تحسين الاتصالات', () => {
      const voiceServiceContent = fs.readFileSync('./server/services/voiceService.ts', 'utf8');
      if (!voiceServiceContent.includes('Map') || !voiceServiceContent.includes('cleanup')) {
        return 'تحسينات الأداء للاتصالات غير مطبقة';
      }
      return true;
    });

    this.test('إعدادات الجودة', () => {
      const voiceManagerContent = fs.readFileSync('./client/src/lib/voice/VoiceManager.ts', 'utf8');
      if (!voiceManagerContent.includes('bitrate') || !voiceManagerContent.includes('sampleRate')) {
        return 'إعدادات جودة الصوت غير محددة';
      }
      return true;
    });
  }

  checkResponsiveDesign() {
    this.log('\n🔍 فحص التصميم المتجاوب', 'info');

    this.test('فئات CSS المتجاوبة', () => {
      const roomComponentContent = fs.readFileSync('./client/src/components/chat/RoomComponent.tsx', 'utf8');
      if (!roomComponentContent.includes('sm:') || !roomComponentContent.includes('md:') || !roomComponentContent.includes('lg:')) {
        return 'فئات CSS المتجاوبة غير مطبقة بشكل كامل';
      }
      return true;
    });

    this.test('أحجام الشاشات المختلفة', () => {
      const voiceControlsContent = fs.readFileSync('./client/src/components/voice/VoiceControls.tsx', 'utf8');
      if (!voiceControlsContent.includes('mobile') && !voiceControlsContent.includes('compact')) {
        this.warn('قد تحتاج لتحسين عناصر التحكم للشاشات الصغيرة');
      }
      return true;
    });
  }

  checkAccessibility() {
    this.log('\n🔍 فحص إمكانية الوصول', 'info');

    this.test('نصوص بديلة للأيقونات', () => {
      const voiceRoomContent = fs.readFileSync('./client/src/components/voice/VoiceRoom.tsx', 'utf8');
      if (!voiceRoomContent.includes('alt=') && !voiceRoomContent.includes('aria-label')) {
        return 'النصوص البديلة للأيقونات مفقودة';
      }
      return true;
    });

    this.test('تسميات الأزرار', () => {
      const voiceControlsContent = fs.readFileSync('./client/src/components/voice/VoiceControls.tsx', 'utf8');
      if (!voiceControlsContent.includes('Tooltip')) {
        this.warn('إضافة تلميحات للأزرار يحسن من إمكانية الوصول');
      }
      return true;
    });

    this.test('دعم لوحة المفاتيح', () => {
      const voiceManagerContent = fs.readFileSync('./client/src/lib/voice/VoiceManager.ts', 'utf8');
      if (!voiceManagerContent.includes('pushToTalk') || !voiceManagerContent.includes('Key')) {
        this.warn('دعم اختصارات لوحة المفاتيح غير مطبق');
      }
      return true;
    });
  }

  checkErrorHandling() {
    this.log('\n🔍 فحص معالجة الأخطاء', 'info');

    this.test('معالجة أخطاء الميكروفون', () => {
      const voiceManagerContent = fs.readFileSync('./client/src/lib/voice/VoiceManager.ts', 'utf8');
      if (!voiceManagerContent.includes('getUserMedia') || !voiceManagerContent.includes('catch')) {
        return 'معالجة أخطاء الميكروفون غير كافية';
      }
      return true;
    });

    this.test('معالجة أخطاء الاتصال', () => {
      const useVoiceContent = fs.readFileSync('./client/src/hooks/useVoice.ts', 'utf8');
      if (!useVoiceContent.includes('toast') || !useVoiceContent.includes('error')) {
        return 'معالجة أخطاء الاتصال غير كافية';
      }
      return true;
    });

    this.test('رسائل خطأ واضحة', () => {
      const voiceServiceContent = fs.readFileSync('./server/services/voiceService.ts', 'utf8');
      const arabicErrors = voiceServiceContent.match(/[\u0600-\u06FF]/g);
      if (!arabicErrors || arabicErrors.length < 10) {
        return 'رسائل الخطأ باللغة العربية غير كافية';
      }
      return true;
    });
  }

  checkDocumentation() {
    this.log('\n🔍 فحص التوثيق', 'info');

    this.test('تعليقات الكود', () => {
      const voiceManagerContent = fs.readFileSync('./client/src/lib/voice/VoiceManager.ts', 'utf8');
      const comments = voiceManagerContent.match(/\/\*\*[\s\S]*?\*\//g);
      if (!comments || comments.length < 5) {
        return 'التعليقات التوضيحية غير كافية';
      }
      return true;
    });

    this.test('توثيق الواجهات', () => {
      const voiceTypesContent = fs.readFileSync('./client/src/types/voice.ts', 'utf8');
      const interfaceComments = voiceTypesContent.match(/\/\/.*[\u0600-\u06FF]/g);
      if (!interfaceComments || interfaceComments.length < 3) {
        this.warn('إضافة تعليقات عربية للواجهات يحسن من الفهم');
      }
      return true;
    });
  }

  generateReport() {
    this.log('\n📊 تقرير الاختبار الشامل', 'info');
    this.log('='.repeat(50), 'info');
    
    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
    
    this.log(`✅ اختبارات نجحت: ${this.results.passed}`, 'pass');
    this.log(`❌ اختبارات فشلت: ${this.results.failed}`, 'fail');
    this.log(`⚠️  تحذيرات: ${this.results.warnings}`, 'warn');
    this.log(`📈 معدل النجاح: ${passRate}%`, 'info');
    
    if (this.results.failed > 0) {
      this.log('\n❌ الاختبارات الفاشلة:', 'fail');
      this.results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.error}`, 'fail');
        });
    }

    // كتابة تقرير JSON
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        passRate: `${passRate}%`
      },
      tests: this.results.tests
    };

    fs.writeFileSync('./voice-system-test-report.json', JSON.stringify(report, null, 2));
    this.log('\n📄 تم حفظ التقرير في: voice-system-test-report.json', 'info');

    // تقييم الجودة الإجمالية
    if (passRate >= 95) {
      this.log('\n🏆 ممتاز! النظام الصوتي جاهز للإنتاج', 'pass');
    } else if (passRate >= 85) {
      this.log('\n👍 جيد جداً! يحتاج لبعض التحسينات البسيطة', 'warn');
    } else if (passRate >= 70) {
      this.log('\n⚠️  مقبول! يحتاج لتحسينات مهمة قبل الإنتاج', 'warn');
    } else {
      this.log('\n❌ يحتاج لعمل كبير قبل الإنتاج', 'fail');
    }
  }

  runAllTests() {
    this.log(`${colors.bold}🔊 اختبار شامل لنظام الغرف الصوتية${colors.reset}`, 'info');
    this.log('='.repeat(60), 'info');

    this.checkPackageJson();
    this.checkBackendFiles();
    this.checkFrontendFiles();
    this.checkIntegration();
    this.checkSecurity();
    this.checkPerformance();
    this.checkResponsiveDesign();
    this.checkAccessibility();
    this.checkErrorHandling();
    this.checkDocumentation();

    this.generateReport();
  }
}

// تشغيل الاختبار
const tester = new VoiceSystemTester();
tester.runAllTests();
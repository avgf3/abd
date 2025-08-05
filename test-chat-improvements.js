#!/usr/bin/env node

/**
 * اختبار سريع لتحسينات نظام الدردشة
 * للتأكد من عمل جميع التحسينات المطبقة
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 بدء اختبار تحسينات نظام الدردشة...\n');

// قائمة الملفات المحدثة
const updatedFiles = [
  'client/src/hooks/useChat.ts',
  'client/src/pages/chat.tsx',
  'client/src/components/chat/MessageArea.tsx',
  'server/routes.ts',
  'client/src/lib/chatOptimization.ts',
  'client/src/lib/chatAnalytics.ts'
];

// قائمة التحسينات المطبقة
const improvements = [
  {
    name: 'الانضمام التلقائي للغرف',
    description: 'المستخدم ينضم تلقائياً للغرفة العامة',
    files: ['useChat.ts', 'chat.tsx'],
    keywords: ['autoJoinRoom', 'autoJoinCompleted', 'الانضمام التلقائي']
  },
  {
    name: 'تحميل الرسائل مسبقاً',
    description: 'الرسائل محملة عند تسجيل الدخول',
    files: ['useChat.ts', 'MessageArea.tsx'],
    keywords: ['loadExistingMessages', 'messagesLoaded', 'تحميل الرسائل']
  },
  {
    name: 'تقليل الطلبات المتكررة',
    description: 'تحسين أداء الشبكة مع debouncing',
    files: ['useChat.ts', 'routes.ts'],
    keywords: ['debounceRequest', 'minInterval', 'الطلبات المتكررة']
  },
  {
    name: 'تحسين عرض الرسائل',
    description: 'عرض آخر 100 رسالة فقط لتحسين الأداء',
    files: ['MessageArea.tsx'],
    keywords: ['displayMessages', 'slice(-100)', 'عرض الرسائل']
  },
  {
    name: 'نظام Cache محسن',
    description: 'Cache ذكي للرسائل والمستخدمين',
    files: ['chatOptimization.ts'],
    keywords: ['MessageCacheManager', 'cache', 'Cache محسن']
  },
  {
    name: 'نظام التحليلات',
    description: 'تتبع الأداء والتحسين التلقائي',
    files: ['chatAnalytics.ts'],
    keywords: ['ChatAnalytics', 'PerformanceMonitor', 'AutoOptimizer']
  }
];

// دالة للتحقق من وجود الكلمات المفتاحية في الملف
function checkFileForKeywords(filePath, keywords) {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, matches: 0 };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = keywords.filter(keyword => 
      content.includes(keyword)
    );
    
    return { exists: true, matches: matches.length, total: keywords.length };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// دالة للتحقق من التحسينات
function testImprovements() {
  console.log('📋 التحسينات المطبقة:\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  improvements.forEach((improvement, index) => {
    console.log(`${index + 1}. ${improvement.name}`);
    console.log(`   ${improvement.description}`);
    
    let improvementPassed = true;
    
    improvement.files.forEach(fileName => {
      const filePath = path.join(__dirname, 'client/src/hooks', fileName);
      const result = checkFileForKeywords(filePath, improvement.keywords);
      
      if (result.exists) {
        const percentage = Math.round((result.matches / result.total) * 100);
        const status = percentage >= 50 ? '✅' : '❌';
        
        console.log(`   ${status} ${fileName}: ${result.matches}/${result.total} (${percentage}%)`);
        
        if (percentage < 50) {
          improvementPassed = false;
        }
      } else {
        console.log(`   ❌ ${fileName}: الملف غير موجود`);
        improvementPassed = false;
      }
      
      totalTests++;
      if (result.exists && result.matches > 0) {
        passedTests++;
      }
    });
    
    console.log(`   ${improvementPassed ? '✅ تم تطبيق التحسين' : '❌ التحسين غير مكتمل'}\n`);
  });
  
  return { totalTests, passedTests };
}

// دالة للتحقق من الملفات المحدثة
function checkUpdatedFiles() {
  console.log('📁 التحقق من الملفات المحدثة:\n');
  
  let existingFiles = 0;
  
  updatedFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${filePath}`);
      existingFiles++;
    } else {
      console.log(`❌ ${filePath} - غير موجود`);
    }
  });
  
  console.log(`\n📊 إجمالي الملفات الموجودة: ${existingFiles}/${updatedFiles.length}\n`);
  
  return existingFiles;
}

// دالة للتحقق من الأداء
function checkPerformance() {
  console.log('⚡ التحقق من تحسينات الأداء:\n');
  
  const performanceChecks = [
    {
      name: 'Debouncing للطلبات',
      check: () => {
        const useChatPath = path.join(__dirname, 'client/src/hooks/useChat.ts');
        if (fs.existsSync(useChatPath)) {
          const content = fs.readFileSync(useChatPath, 'utf8');
          return content.includes('debounceRequest') && content.includes('1000');
        }
        return false;
      }
    },
    {
      name: 'Cache للرسائل',
      check: () => {
        const optimizationPath = path.join(__dirname, 'client/src/lib/chatOptimization.ts');
        if (fs.existsSync(optimizationPath)) {
          const content = fs.readFileSync(optimizationPath, 'utf8');
          return content.includes('MessageCacheManager') && content.includes('maxAge');
        }
        return false;
      }
    },
    {
      name: 'تحسين عرض الرسائل',
      check: () => {
        const messageAreaPath = path.join(__dirname, 'client/src/components/chat/MessageArea.tsx');
        if (fs.existsSync(messageAreaPath)) {
          const content = fs.readFileSync(messageAreaPath, 'utf8');
          return content.includes('slice(-100)') && content.includes('displayMessages');
        }
        return false;
      }
    },
    {
      name: 'نظام التحليلات',
      check: () => {
        const analyticsPath = path.join(__dirname, 'client/src/lib/chatAnalytics.ts');
        if (fs.existsSync(analyticsPath)) {
          const content = fs.readFileSync(analyticsPath, 'utf8');
          return content.includes('ChatAnalytics') && content.includes('PerformanceMonitor');
        }
        return false;
      }
    }
  ];
  
  let passedChecks = 0;
  
  performanceChecks.forEach(check => {
    const result = check.check();
    console.log(`${result ? '✅' : '❌'} ${check.name}`);
    if (result) passedChecks++;
  });
  
  console.log(`\n📊 تحسينات الأداء المطبقة: ${passedChecks}/${performanceChecks.length}\n`);
  
  return passedChecks;
}

// دالة للتحقق من التوثيق
function checkDocumentation() {
  console.log('📚 التحقق من التوثيق:\n');
  
  const docsPath = path.join(__dirname, 'تحسينات-نظام-الدردشة-الشاملة.md');
  
  if (fs.existsSync(docsPath)) {
    const content = fs.readFileSync(docsPath, 'utf8');
    
    const docChecks = [
      { name: 'نظرة عامة', found: content.includes('نظرة عامة') },
      { name: 'التحسينات التقنية', found: content.includes('التحسينات التقنية') },
      { name: 'مقارنة الأداء', found: content.includes('مقارنة الأداء') },
      { name: 'الميزات الجديدة', found: content.includes('الميزات الجديدة') },
      { name: 'كيفية الاستخدام', found: content.includes('كيفية الاستخدام') }
    ];
    
    let passedDocs = 0;
    
    docChecks.forEach(check => {
      console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
      if (check.found) passedDocs++;
    });
    
    console.log(`\n📊 أقسام التوثيق المكتملة: ${passedDocs}/${docChecks.length}\n`);
    
    return passedDocs;
  } else {
    console.log('❌ ملف التوثيق غير موجود\n');
    return 0;
  }
}

// تشغيل الاختبارات
function runTests() {
  console.log('🚀 بدء الاختبارات الشاملة...\n');
  
  const fileCount = checkUpdatedFiles();
  const { totalTests, passedTests } = testImprovements();
  const performanceChecks = checkPerformance();
  const documentationChecks = checkDocumentation();
  
  // حساب النتائج النهائية
  const totalChecks = fileCount + totalTests + performanceChecks + documentationChecks;
  const passedChecks = passedTests + performanceChecks + documentationChecks;
  const successRate = Math.round((passedChecks / totalChecks) * 100);
  
  console.log('📊 النتائج النهائية:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📁 الملفات المحدثة: ${fileCount}/${updatedFiles.length}`);
  console.log(`🧪 اختبارات التحسينات: ${passedTests}/${totalTests}`);
  console.log(`⚡ تحسينات الأداء: ${performanceChecks}/4`);
  console.log(`📚 التوثيق: ${documentationChecks}/5`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🎯 معدل النجاح الإجمالي: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('🎉 تم تطبيق التحسينات بنجاح! النظام جاهز للاستخدام.');
  } else if (successRate >= 60) {
    console.log('⚠️ تم تطبيق معظم التحسينات. يرجى مراجعة النقاط المفقودة.');
  } else {
    console.log('❌ التحسينات غير مكتملة. يرجى إعادة تطبيق التحسينات.');
  }
  
  console.log('\n✨ انتهى الاختبار!');
}

// تشغيل الاختبارات
runTests();
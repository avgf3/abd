#!/usr/bin/env node

/**
 * أداة فحص شاملة لوضعية التيجان على الصور الشخصية
 * تتحقق من:
 * 1. وجود ملفات التيجان
 * 2. أبعاد التيجان
 * 3. دقة الوضعية بناءً على TAG_CONFIG
 * 4. توافق النظام المبسط
 */

const fs = require('fs');
const path = require('path');

const TAGS_DIR = path.join(__dirname, '../client/public/tags');
const TAG_CONFIG_PATH = path.join(__dirname, '../client/src/config/tagLayouts.ts');
const TOTAL_TAGS = 34;

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title) {
  console.log('');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log(`  ${title}`, 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('');
}

// قراءة TAG_CONFIG
function readTagConfig() {
  try {
    const content = fs.readFileSync(TAG_CONFIG_PATH, 'utf8');
    
    const widthMatch = content.match(/widthRatio:\s*([\d.]+)/);
    const topOffsetMatch = content.match(/topOffsetRatio:\s*([-\d.]+)/);
    
    if (!widthMatch || !topOffsetMatch) {
      throw new Error('لم يتم العثور على قيم TAG_CONFIG');
    }
    
    return {
      widthRatio: parseFloat(widthMatch[1]),
      topOffsetRatio: parseFloat(topOffsetMatch[1]),
    };
  } catch (error) {
    log(`❌ خطأ في قراءة TAG_CONFIG: ${error.message}`, 'red');
    return null;
  }
}

// التحقق من وجود ملفات التيجان
function checkTagFiles() {
  header('فحص ملفات التيجان');
  
  const results = {
    total: TOTAL_TAGS,
    found: 0,
    missing: [],
    webp: 0,
    png: 0,
  };
  
  for (let i = 1; i <= TOTAL_TAGS; i++) {
    const extensions = ['webp', 'png'];
    let found = false;
    
    for (const ext of extensions) {
      const tagPath = path.join(TAGS_DIR, `tag${i}.${ext}`);
      if (fs.existsSync(tagPath)) {
        found = true;
        results.found++;
        if (ext === 'webp') results.webp++;
        else results.png++;
        
        const stats = fs.statSync(tagPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        log(`  ✅ tag${i}.${ext} - ${sizeMB} MB`, 'green');
        break;
      }
    }
    
    if (!found) {
      results.missing.push(i);
      log(`  ❌ tag${i} - مفقود`, 'red');
    }
  }
  
  console.log('');
  log(`📊 النتائج:`, 'bright');
  log(`   - الإجمالي: ${results.total}`, 'cyan');
  log(`   - موجود: ${results.found}`, 'green');
  log(`   - WebP: ${results.webp}`, 'blue');
  log(`   - PNG: ${results.png}`, 'blue');
  
  if (results.missing.length > 0) {
    log(`   - مفقود: ${results.missing.length} [${results.missing.join(', ')}]`, 'red');
  } else {
    log(`   ✨ جميع التيجان موجودة!`, 'green');
  }
  
  return results;
}

// حساب الوضعية لأحجام مختلفة
function calculatePositions(config) {
  header('حساب الوضعية لأحجام الصور المختلفة');
  
  const sizes = [36, 56, 72, 100]; // small, medium, large, extra
  
  log(`📐 إعدادات TAG_CONFIG:`, 'bright');
  log(`   - widthRatio: ${config.widthRatio}`, 'cyan');
  log(`   - topOffsetRatio: ${config.topOffsetRatio}`, 'cyan');
  console.log('');
  
  const results = [];
  
  for (const imageSize of sizes) {
    const containerSize = Math.round(imageSize * 1.35);
    const tagWidth = Math.round(imageSize * config.widthRatio);
    const tagTop = Math.round(imageSize * config.topOffsetRatio);
    
    // تحليل الوضعية
    let status = '✅';
    let statusText = 'صحيح';
    
    if (tagTop > 0) {
      status = '❌';
      statusText = 'التاج داخل الصورة!';
    } else if (tagTop > -imageSize * 0.1) {
      status = '✅';
      statusText = 'مثالي';
    } else if (tagTop > -imageSize * 0.3) {
      status = '⚠️';
      statusText = 'بعيد قليلاً';
    } else {
      status = '❌';
      statusText = 'بعيد جداً!';
    }
    
    log(`${status} حجم ${imageSize}px:`, status === '✅' ? 'green' : status === '⚠️' ? 'yellow' : 'red');
    log(`     الحاوية: ${containerSize}px`, 'blue');
    log(`     عرض التاج: ${tagWidth}px (نسبة: ${(tagWidth/imageSize).toFixed(2)})`, 'blue');
    log(`     الموضع العلوي: ${tagTop}px`, 'blue');
    log(`     الحالة: ${statusText}`, status === '✅' ? 'green' : status === '⚠️' ? 'yellow' : 'red');
    console.log('');
    
    results.push({
      imageSize,
      containerSize,
      tagWidth,
      tagTop,
      status,
      statusText,
    });
  }
  
  return results;
}

// التحقق من بساطة النظام
function verifySimplicity(config) {
  header('التحقق من بساطة النظام');
  
  const checks = {
    singleConfig: true,
    noComplexCalculations: true,
    consistentRatios: true,
    simpleTransform: true,
  };
  
  // التحقق من عدد المعاملات
  const configKeys = Object.keys(config);
  if (configKeys.length === 2) {
    log('  ✅ معاملان فقط في TAG_CONFIG (مبسط)', 'green');
  } else {
    log(`  ❌ عدد المعاملات: ${configKeys.length} (يجب أن يكون 2)`, 'red');
    checks.singleConfig = false;
  }
  
  // التحقق من القيم المنطقية
  if (config.widthRatio > 0.8 && config.widthRatio < 1.5) {
    log(`  ✅ widthRatio منطقية: ${config.widthRatio}`, 'green');
  } else {
    log(`  ⚠️ widthRatio قد تكون غير مثالية: ${config.widthRatio}`, 'yellow');
  }
  
  if (config.topOffsetRatio >= -0.2 && config.topOffsetRatio <= 0.1) {
    log(`  ✅ topOffsetRatio منطقية: ${config.topOffsetRatio}`, 'green');
  } else {
    log(`  ⚠️ topOffsetRatio قد تكون غير مثالية: ${config.topOffsetRatio}`, 'yellow');
  }
  
  // قراءة ProfileImage.tsx للتحقق من البساطة
  try {
    const profileImagePath = path.join(__dirname, '../client/src/components/chat/ProfileImage.tsx');
    const content = fs.readFileSync(profileImagePath, 'utf8');
    
    // البحث عن معادلات معقدة
    if (!content.includes('bottomGapPx') && !content.includes('anchorFromLayout')) {
      log('  ✅ لا توجد معادلات معقدة (bottomGapPx, anchorFromLayout)', 'green');
      checks.noComplexCalculations = true;
    } else {
      log('  ❌ توجد معادلات معقدة في الكود', 'red');
      checks.noComplexCalculations = false;
    }
    
    // البحث عن transform بسيط
    if (content.includes('translateX(-50%)') && !content.includes('calc(-100%')) {
      log('  ✅ transform مبسط (translateX فقط)', 'green');
      checks.simpleTransform = true;
    } else {
      log('  ⚠️ transform قد يحتوي على حسابات معقدة', 'yellow');
    }
    
  } catch (error) {
    log(`  ⚠️ تعذر قراءة ProfileImage.tsx: ${error.message}`, 'yellow');
  }
  
  console.log('');
  const allPassed = Object.values(checks).every(v => v);
  if (allPassed) {
    log('  🎉 النظام مبسط بالكامل!', 'green');
  } else {
    log('  ⚠️ النظام يحتاج المزيد من التبسيط', 'yellow');
  }
  
  return checks;
}

// توصيات للتحسين
function provideRecommendations(config, positionResults) {
  header('التوصيات والاقتراحات');
  
  const allPositionsCorrect = positionResults.every(r => r.status === '✅');
  
  if (allPositionsCorrect) {
    log('  🎉 جميع الأوضاع صحيحة! النظام يعمل بشكل مثالي.', 'green');
    log('  ✨ لا حاجة لأي تعديلات.', 'green');
  } else {
    log('  📝 اقتراحات للتحسين:', 'yellow');
    
    const hasPositiveTop = positionResults.some(r => r.tagTop > 0);
    const hasTooFar = positionResults.some(r => r.tagTop < -50);
    
    if (hasPositiveTop) {
      const suggestion = config.topOffsetRatio - 0.1;
      log(`     - topOffsetRatio موجب! جرب: ${suggestion.toFixed(2)}`, 'yellow');
    }
    
    if (hasTooFar) {
      const suggestion = config.topOffsetRatio + 0.05;
      log(`     - بعض التيجان بعيدة جداً. جرب: ${suggestion.toFixed(2)}`, 'yellow');
    }
    
    const avgTagWidth = positionResults.reduce((sum, r) => sum + r.tagWidth / r.imageSize, 0) / positionResults.length;
    if (avgTagWidth < 0.9 || avgTagWidth > 1.3) {
      const suggestion = 1.1;
      log(`     - نسبة العرض قد تحتاج ضبط. جرب: ${suggestion.toFixed(2)}`, 'yellow');
    }
  }
  
  console.log('');
  log('  💡 نصائح إضافية:', 'cyan');
  log('     - استخدم verify-all-tags.html للاختبار البصري', 'cyan');
  log('     - تأكد من أن جميع التيجان لها خلفية شفافة', 'cyan');
  log('     - اختبر على أحجام شاشات مختلفة', 'cyan');
}

// تقرير نهائي
function generateReport(tagFiles, positions, simplicity, config) {
  header('التقرير النهائي');
  
  const score = {
    files: (tagFiles.found / tagFiles.total) * 100,
    positions: (positions.filter(p => p.status === '✅').length / positions.length) * 100,
    simplicity: (Object.values(simplicity).filter(v => v).length / Object.keys(simplicity).length) * 100,
  };
  
  const totalScore = (score.files + score.positions + score.simplicity) / 3;
  
  log(`📊 النتيجة الإجمالية: ${totalScore.toFixed(1)}%`, 'bright');
  console.log('');
  log(`   1️⃣ ملفات التيجان: ${score.files.toFixed(1)}% (${tagFiles.found}/${tagFiles.total})`, 
      score.files === 100 ? 'green' : 'yellow');
  log(`   2️⃣ دقة الوضعية: ${score.positions.toFixed(1)}% (${positions.filter(p => p.status === '✅').length}/${positions.length} أحجام)`,
      score.positions === 100 ? 'green' : 'yellow');
  log(`   3️⃣ بساطة النظام: ${score.simplicity.toFixed(1)}% (${Object.values(simplicity).filter(v => v).length}/${Object.keys(simplicity).length} معايير)`,
      score.simplicity === 100 ? 'green' : 'yellow');
  
  console.log('');
  
  if (totalScore >= 90) {
    log('  ✨ ممتاز! النظام يعمل بشكل مثالي.', 'green');
  } else if (totalScore >= 70) {
    log('  👍 جيد! بعض التحسينات البسيطة قد تكون مفيدة.', 'yellow');
  } else {
    log('  ⚠️ يحتاج تحسينات. راجع التوصيات أعلاه.', 'red');
  }
  
  console.log('');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log(`  TAG_CONFIG الحالي:`, 'bright');
  log(`  {`, 'cyan');
  log(`    widthRatio: ${config.widthRatio},`, 'cyan');
  log(`    topOffsetRatio: ${config.topOffsetRatio},`, 'cyan');
  log(`  }`, 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('');
}

// التنفيذ الرئيسي
async function main() {
  console.clear();
  log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║       🔍 أداة فحص شاملة لوضعية التيجان 🔍              ║
  ║                                                           ║
  ║     نظام مبسط - موثوق - دقيق                            ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `, 'bright');
  
  // 1. قراءة الإعدادات
  const config = readTagConfig();
  if (!config) {
    log('❌ فشل قراءة TAG_CONFIG. يرجى التحقق من الملف.', 'red');
    process.exit(1);
  }
  
  // 2. فحص الملفات
  const tagFiles = checkTagFiles();
  
  // 3. حساب الأوضاع
  const positions = calculatePositions(config);
  
  // 4. التحقق من البساطة
  const simplicity = verifySimplicity(config);
  
  // 5. التوصيات
  provideRecommendations(config, positions);
  
  // 6. التقرير النهائي
  generateReport(tagFiles, positions, simplicity, config);
}

main().catch(error => {
  log(`❌ خطأ غير متوقع: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * تحليل نتائج اختبارات الأداء الحقيقية
 * Real Performance Test Results Analysis
 */

const fs = require('fs');
const path = require('path');

// قراءة نتائج الاختبارات
const basicTest = JSON.parse(fs.readFileSync('./basic-http-test.json', 'utf8'));
const mediumTest = JSON.parse(fs.readFileSync('./medium-load-test.json', 'utf8'));
const highTest = JSON.parse(fs.readFileSync('./high-load-test.json', 'utf8'));
const apiTest = JSON.parse(fs.readFileSync('./api-users-test.json', 'utf8'));

console.log('🔍 تحليل نتائج اختبارات الأداء الحقيقية');
console.log('=======================================\n');

// تحليل الاختبار الأساسي
console.log('✅ اختبار HTTP الأساسي (10 اتصالات):');
console.log(`   📊 إجمالي الطلبات: ${basicTest.requests.total.toLocaleString()}`);
console.log(`   ⚡ الطلبات/ثانية: ${basicTest.requests.average.toFixed(1)}`);
console.log(`   ⏱️  متوسط زمن الاستجابة: ${basicTest.latency.average.toFixed(1)}ms`);
console.log(`   📈 P95: ${basicTest.latency.p95}ms`);
console.log(`   📈 P99: ${basicTest.latency.p99}ms`);
console.log(`   ❌ الأخطاء: ${basicTest.errors}`);
console.log(`   ✅ معدل النجاح: ${((basicTest['2xx'] / (basicTest['2xx'] + basicTest.errors)) * 100).toFixed(2)}%\n`);

// تحليل الاختبار المتوسط
console.log('🔥 اختبار الضغط المتوسط (50 اتصال):');
console.log(`   📊 إجمالي الطلبات: ${mediumTest.requests.total.toLocaleString()}`);
console.log(`   ⚡ الطلبات/ثانية: ${mediumTest.requests.average.toFixed(1)}`);
console.log(`   ⏱️  متوسط زمن الاستجابة: ${mediumTest.latency.average.toFixed(1)}ms`);
console.log(`   📈 P95: ${mediumTest.latency.p95}ms`);
console.log(`   📈 P99: ${mediumTest.latency.p99}ms`);
console.log(`   ❌ الأخطاء: ${mediumTest.errors}`);
console.log(`   ✅ معدل النجاح: ${((mediumTest['2xx'] / (mediumTest['2xx'] + mediumTest.errors)) * 100).toFixed(2)}%\n`);

// تحليل الاختبار عالي الضغط
console.log('⚡ اختبار الضغط العالي (100 اتصال):');
console.log(`   📊 إجمالي الطلبات: ${highTest.requests.total.toLocaleString()}`);
console.log(`   ⚡ الطلبات/ثانية: ${highTest.requests.average.toFixed(1)}`);
console.log(`   ⏱️  متوسط زمن الاستجابة: ${highTest.latency.average.toFixed(1)}ms`);
console.log(`   📈 P95: ${highTest.latency.p95}ms`);
console.log(`   📈 P99: ${highTest.latency.p99}ms`);
console.log(`   ❌ الأخطاء: ${highTest.errors}`);
console.log(`   ✅ معدل النجاح: ${((highTest['2xx'] / (highTest['2xx'] + highTest.errors)) * 100).toFixed(2)}%\n`);

// تحليل اختبار API
console.log('🌡️ اختبار API المستخدمين (20 اتصال):');
console.log(`   📊 إجمالي الطلبات: ${apiTest.requests.total.toLocaleString()}`);
console.log(`   ❌ الأخطاء: ${apiTest.errors}`);
console.log(`   ⏰ انتهاء المهلة: ${apiTest.timeouts}`);
console.log(`   🚨 معدل الفشل: ${((apiTest.errors / apiTest.requests.sent) * 100).toFixed(2)}%\n`);

// تحليل الاختناقات
console.log('🚨 تحليل الاختناقات والمشاكل:');
console.log('==============================');

let issues = [];

// فحص زمن الاستجابة
if (highTest.latency.p99 > 1000) {
    issues.push({
        type: 'High Latency',
        severity: 'Warning',
        description: `P99 latency عالي جداً: ${highTest.latency.p99}ms`,
        threshold: '< 1000ms',
        recommendation: 'تحسين استعلامات قاعدة البيانات وإضافة caching'
    });
}

if (highTest.latency.average > 500) {
    issues.push({
        type: 'Performance Degradation',
        severity: 'Critical',
        description: `متوسط زمن الاستجابة مرتفع جداً: ${highTest.latency.average.toFixed(1)}ms`,
        threshold: '< 200ms',
        recommendation: 'مراجعة شاملة للكود وتحسين الأداء'
    });
}

// فحص معدل الأخطاء
if (apiTest.errors > 0) {
    issues.push({
        type: 'API Failures',
        severity: 'Critical',
        description: `فشل كامل في API المستخدمين: ${apiTest.errors} أخطاء من ${apiTest.requests.sent} طلبات`,
        threshold: '< 1% error rate',
        recommendation: 'إصلاح مشكلة authentication أو database connection'
    });
}

// فحص الإنتاجية
const maxThroughput = Math.max(basicTest.requests.average, mediumTest.requests.average, highTest.requests.average);
if (maxThroughput < 100) {
    issues.push({
        type: 'Low Throughput',
        severity: 'Warning',
        description: `الإنتاجية منخفضة: ${maxThroughput.toFixed(1)} req/sec`,
        threshold: '> 100 req/sec',
        recommendation: 'تحسين performance optimization وإضافة load balancing'
    });
}

// عرض المشاكل
if (issues.length > 0) {
    issues.forEach((issue, index) => {
        console.log(`${index + 1}. ❌ ${issue.type} [${issue.severity}]`);
        console.log(`   📝 الوصف: ${issue.description}`);
        console.log(`   🎯 المطلوب: ${issue.threshold}`);
        console.log(`   💡 التوصية: ${issue.recommendation}\n`);
    });
} else {
    console.log('✅ لم يتم اكتشاف مشاكل حرجة\n');
}

// توصيات عامة
console.log('💡 التوصيات العامة للتحسين:');
console.log('============================');
console.log('1. 🔧 إضافة Redis caching للبيانات المتكررة');
console.log('2. 📊 تحسين استعلامات قاعدة البيانات');
console.log('3. ⚖️  إضافة load balancing');
console.log('4. 🔐 مراجعة نظام authentication');
console.log('5. 📈 إضافة monitoring وlogging محسن');
console.log('6. 🚀 تفعيل compression middleware');
console.log('7. 🛡️  إضافة rate limiting');

// حفظ التقرير
const report = {
    timestamp: new Date().toISOString(),
    tests: {
        basic: basicTest,
        medium: mediumTest,
        high: highTest,
        api: apiTest
    },
    issues: issues,
    summary: {
        totalRequests: basicTest.requests.total + mediumTest.requests.total + highTest.requests.total + apiTest.requests.total,
        totalErrors: basicTest.errors + mediumTest.errors + highTest.errors + apiTest.errors,
        avgLatency: (basicTest.latency.average + mediumTest.latency.average + highTest.latency.average) / 3,
        maxThroughput: maxThroughput
    }
};

fs.writeFileSync('./performance-report.json', JSON.stringify(report, null, 2));
console.log('\n💾 تم حفظ التقرير الكامل في: performance-report.json');
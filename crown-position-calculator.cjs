// 🏆 حاسبة المواضع المثالية للتيجان - تحليل عميق
const fs = require('fs');
const path = require('path');

// معادلة حساب الموضع من الكود الأصلي
function calculateCrownPosition(crownData, settings, profileSize = 56) {
    const { naturalWidth, naturalHeight, transparentBottom } = crownData;
    const { widthRatio, yAdjustPx, anchorY } = settings;
    
    // حساب أبعاد التاج المقيسة
    const basePx = profileSize * widthRatio;
    const scale = basePx / Math.max(1, naturalWidth);
    const heightPx = naturalHeight * scale;
    
    // حساب نقطة الارتكاز
    const anchor = heightPx * anchorY;
    const bottomGapPx = Math.round(transparentBottom * heightPx);
    
    // الموضع النهائي (من الكود الأصلي)
    const anchorFromImagePx = Math.round(anchor + yAdjustPx - bottomGapPx);
    
    return {
        crownWidth: basePx,
        crownHeight: heightPx,
        anchorPoint: anchor,
        bottomGap: bottomGapPx,
        finalPosition: anchorFromImagePx,
        penetrationPx: anchorFromImagePx,
        penetrationPercent: (anchorFromImagePx / heightPx) * 100
    };
}

// بيانات التيجان المُحللة (من فحص الصور)
const crownAnalysisData = {
    1: { naturalWidth: 120, naturalHeight: 85, transparentBottom: 0.15, type: 'curved', style: 'classic' },
    2: { naturalWidth: 135, naturalHeight: 95, transparentBottom: 0.12, type: 'curved', style: 'royal' },
    3: { naturalWidth: 100, naturalHeight: 70, transparentBottom: 0.20, type: 'straight', style: 'thin' },
    4: { naturalWidth: 150, naturalHeight: 110, transparentBottom: 0.10, type: 'curved', style: 'ornate' },
    5: { naturalWidth: 125, naturalHeight: 80, transparentBottom: 0.18, type: 'straight', style: 'smooth' },
    6: { naturalWidth: 140, naturalHeight: 120, transparentBottom: 0.08, type: 'curved', style: 'heavy' },
    7: { naturalWidth: 115, naturalHeight: 75, transparentBottom: 0.22, type: 'straight', style: 'medium' },
    8: { naturalWidth: 110, naturalHeight: 78, transparentBottom: 0.16, type: 'curved', style: 'simple' },
    9: { naturalWidth: 145, naturalHeight: 105, transparentBottom: 0.11, type: 'curved', style: 'refined' },
    10: { naturalWidth: 95, naturalHeight: 65, transparentBottom: 0.25, type: 'straight', style: 'compact' },
    11: { naturalWidth: 130, naturalHeight: 90, transparentBottom: 0.14, type: 'curved', style: 'advanced' },
    12: { naturalWidth: 160, naturalHeight: 130, transparentBottom: 0.06, type: 'curved', style: 'imperial' }
};

// قواعد الضبط المثالي
const POSITIONING_RULES = {
    // التيجان المنحنية: تطابق انحناء الرأس (دخول خفيف 2-5%)
    curved: {
        targetPenetrationPercent: 3, // 3% من ارتفاع التاج
        yAdjustRange: [-3, 1], // نطاق التعديل العمودي
        preferredAnchorY: 0.08 // نقطة ارتكاز مفضلة
    },
    
    // التيجان المستقيمة: دخول واضح في الصورة (8-12%)
    straight: {
        targetPenetrationPercent: 10, // 10% من ارتفاع التاج
        yAdjustRange: [0, 5], // نطاق التعديل العمودي
        preferredAnchorY: 0.15 // نقطة ارتكاز مفضلة
    }
};

// حساب الإعدادات المثلى لتاج واحد
function calculateOptimalSettings(crownNum) {
    const crownData = crownAnalysisData[crownNum];
    if (!crownData) return null;
    
    const rule = POSITIONING_RULES[crownData.type];
    const targetPenetrationPx = (crownData.naturalHeight * rule.targetPenetrationPercent) / 100;
    
    // حساب anchorY المطلوب
    let bestSettings = null;
    let bestScore = Infinity;
    
    // جرب قيم مختلفة للعثور على الأفضل
    for (let anchorY = 0.05; anchorY <= 0.5; anchorY += 0.01) {
        for (let yAdjust = rule.yAdjustRange[0]; yAdjust <= rule.yAdjustRange[1]; yAdjust += 0.5) {
            const settings = {
                widthRatio: 1.10, // ثابت
                yAdjustPx: yAdjust,
                anchorY: anchorY
            };
            
            const result = calculateCrownPosition(crownData, settings);
            const penetrationError = Math.abs(result.penetrationPx - targetPenetrationPx);
            
            if (penetrationError < bestScore) {
                bestScore = penetrationError;
                bestSettings = {
                    ...settings,
                    expectedResult: result,
                    penetrationError: penetrationError
                };
            }
        }
    }
    
    return bestSettings;
}

// حساب جميع التيجان
function calculateAllCrowns() {
    console.log('🏆 بدء التحليل العميق لجميع التيجان...\n');
    
    const results = {};
    let code = '// 👑 إعدادات التيجان المُحسَّنة - تحليل عميق ومواضع مثالية\n\n';
    code += 'const override = (n: number, layout: Partial<TagLayout>) => {\n';
    code += '  map[n] = { ...map[n], ...layout } as TagLayout;\n';
    code += '};\n\n';
    
    for (let i = 1; i <= 12; i++) {
        console.log(`🔍 تحليل تاج ${i}...`);
        
        const crownData = crownAnalysisData[i];
        const optimal = calculateOptimalSettings(i);
        
        if (optimal) {
            results[i] = optimal;
            
            console.log(`✅ تاج ${i} (${crownData.type}):`);
            console.log(`   - الهدف: ${POSITIONING_RULES[crownData.type].targetPenetrationPercent}% دخول`);
            console.log(`   - النتيجة: ${optimal.expectedResult.penetrationPercent.toFixed(1)}% دخول`);
            console.log(`   - الخطأ: ${optimal.penetrationError.toFixed(2)}px`);
            console.log(`   - الإعدادات: yAdjust=${optimal.yAdjustPx}, anchor=${optimal.anchorY.toFixed(3)}\n`);
            
            // إضافة للكود
            const typeComment = crownData.type === 'curved' ? 'منحني - مطابقة الرأس' : 'مستقيم - دخول واضح';
            code += `// تاج ${i}: ${crownData.style} (${typeComment})\n`;
            code += `override(${i}, { widthRatio: ${optimal.widthRatio}, yAdjustPx: ${optimal.yAdjustPx}, anchorY: ${optimal.anchorY.toFixed(3)} });\n\n`;
        }
    }
    
    // إحصائيات
    const curvedCount = Object.values(results).filter(r => crownAnalysisData[Object.keys(results).find(k => results[k] === r)].type === 'curved').length;
    const straightCount = Object.values(results).filter(r => crownAnalysisData[Object.keys(results).find(k => results[k] === r)].type === 'straight').length;
    
    code += `// 📊 الإحصائيات:\n`;
    code += `// - التيجان المنحنية: ${curvedCount} (مطابقة انحناء الرأس)\n`;
    code += `// - التيجان المستقيمة: ${straightCount} (دخول واضح في الصورة)\n`;
    code += `// - إجمالي التيجان المُحسَّنة: ${Object.keys(results).length}\n`;
    
    return { results, code };
}

// تشغيل التحليل
const analysis = calculateAllCrowns();

console.log('🎯 التحليل مكتمل!\n');
console.log('📄 الكود النهائي:\n');
console.log(analysis.code);

// حفظ النتائج
fs.writeFileSync('crown-analysis-results.json', JSON.stringify(analysis.results, null, 2));
fs.writeFileSync('crown-final-code.ts', analysis.code);

console.log('\n💾 تم حفظ النتائج في:');
console.log('- crown-analysis-results.json');
console.log('- crown-final-code.ts');
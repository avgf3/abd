// اختبار جميع روابط المدن
const fs = require('fs');
const path = require('path');

// قراءة ملف App.tsx لاستخراج جميع روابط المدن
const appContent = fs.readFileSync('/workspace/client/src/App.tsx', 'utf8');

// استخراج روابط المدن
const cityRoutes = [];
const lines = appContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.includes('path="/') && line.includes('component={CityChat}')) {
    const match = line.match(/path="([^"]+)"/);
    if (match && match[1].includes('/')) {
      cityRoutes.push(match[1]);
    }
  }
}

console.log('روابط المدن الموجودة في App.tsx:');
cityRoutes.forEach((route, index) => {
  console.log(`${index + 1}. ${route}`);
});

console.log(`\nإجمالي روابط المدن: ${cityRoutes.length}`);

// اختبار بعض الروابط الشائعة
const testRoutes = ['/libya/bayda', '/oman/muscat', '/egypt/cairo', '/saudi/riyadh'];
console.log('\nاختبار بعض الروابط:');
testRoutes.forEach(route => {
  const exists = cityRoutes.includes(route);
  console.log(`${route}: ${exists ? '✅ موجود' : '❌ غير موجود'}`);
});
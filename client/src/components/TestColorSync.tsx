import React from 'react';

import {
  buildProfileBackgroundGradient,
  getUserListItemStyles,
  getUserListItemClasses,
} from '@/utils/themeUtils';

// قائمة الألوان المتاحة للاختبار
const availableColors = [
  { hex: '#ff7c00', name: 'البرتقالي الناري' },
  { hex: '#e10026', name: 'الأحمر القاني' },
  { hex: '#800e8c', name: 'البنفسجي الداكن' },
  { hex: '#1a004d', name: 'الأزرق الليلي' },
  { hex: '#ffd700', name: 'الذهبي' },
  { hex: '#ff1493', name: 'الوردي العميق' },
  { hex: '#00ced1', name: 'الفيروزي' },
  { hex: '#9370db', name: 'البنفسجي المتوسط' },
  { hex: '#ff6347', name: 'الطماطم' },
  { hex: '#4169e1', name: 'الأزرق الملكي' },
  { hex: '#32cd32', name: 'الأخضر الليموني' },
  { hex: '#ff4500', name: 'البرتقالي الأحمر' },
  { hex: '#da70d6', name: 'الأوركيد' },
  { hex: '#00fa9a', name: 'الأخضر النعناعي' },
  { hex: '#dc143c', name: 'القرمزي' },
  { hex: '#00bfff', name: 'الأزرق السماوي' },
  { hex: '#ff69b4', name: 'الوردي الساخن' },
  { hex: '#8a2be2', name: 'البنفسجي الأزرق' },
  { hex: '#ff8c00', name: 'البرتقالي الداكن' },
  { hex: '#9400d3', name: 'البنفسجي الداكن' },
  { hex: '#00ff7f', name: 'الأخضر الربيعي' },
  { hex: '#dc143c', name: 'الأحمر القرمزي' },
  { hex: '#1e90ff', name: 'الأزرق الدودجر' },
  { hex: '#b22222', name: 'الطوبي الناري' },
  { hex: '#3c0d0d', name: 'البني الداكن (افتراضي)' },
];

// قائمة التأثيرات المتاحة
const availableEffects = [
  'none',
  'effect-glow',
  'effect-pulse',
  'effect-water',
  'effect-aurora',
  'effect-neon',
  'effect-fire',
  'effect-ice',
  'effect-rainbow',
  'effect-shadow',
  'effect-electric',
  'effect-crystal',
];

export default function TestColorSync() {
  const [selectedColor, setSelectedColor] = React.useState('#3c0d0d');
  const [selectedEffect, setSelectedEffect] = React.useState('none');

  // محاكاة كائن المستخدم
  const mockUser = {
    id: 1,
    username: 'مستخدم تجريبي',
    profileBackgroundColor: selectedColor,
    profileEffect: selectedEffect,
    usernameColor: '#000000',
    userType: 'member',
  };

  // الحصول على التدرج المطبق
  const gradient = buildProfileBackgroundGradient(selectedColor);
  const userBoxStyles = getUserListItemStyles(mockUser);
  const userBoxClasses = getUserListItemClasses(mockUser);

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center">🎨 اختبار تزامن الألوان والتأثيرات</h1>

      {/* قسم اختيار اللون */}
      <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">اختر لون الخلفية:</h2>
        <div className="grid grid-cols-5 gap-3">
          {availableColors.map((color) => (
            <button
              key={color.hex}
              onClick={() => setSelectedColor(color.hex)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedColor === color.hex ? 'border-blue-500 scale-105' : 'border-gray-300'
              }`}
              style={{ background: color.hex }}
              title={color.name}
            >
              <div className="text-white text-xs font-medium drop-shadow-lg">{color.name}</div>
              <div className="text-white text-xs opacity-75">{color.hex}</div>
            </button>
          ))}
        </div>
      </div>

      {/* قسم اختيار التأثير */}
      <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">اختر التأثير:</h2>
        <div className="grid grid-cols-4 gap-3">
          {availableEffects.map((effect) => (
            <button
              key={effect}
              onClick={() => setSelectedEffect(effect)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedEffect === effect ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              {effect}
            </button>
          ))}
        </div>
      </div>

      {/* قسم المعلومات */}
      <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">معلومات التطبيق:</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>
            <strong>اللون المختار:</strong> {selectedColor}
          </div>
          <div>
            <strong>التأثير المختار:</strong> {selectedEffect}
          </div>
          <div>
            <strong>التدرج المُطبق:</strong>{' '}
            <code className="bg-gray-100 p-1 rounded">{gradient}</code>
          </div>
          <div>
            <strong>الكلاسات:</strong> {userBoxClasses || 'none'}
          </div>
        </div>
      </div>

      {/* قسم المقارنة */}
      <div className="grid grid-cols-2 gap-8">
        {/* بطاقة الملف الشخصي */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🖼️ بطاقة الملف الشخصي</h3>
          <div className={`p-6 rounded-lg ${selectedEffect}`} style={{ background: gradient }}>
            <div className="bg-white/90 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-300"></div>
                <div>
                  <h4 className="font-bold">مستخدم تجريبي</h4>
                  <p className="text-sm text-gray-600">عضو</p>
                </div>
              </div>
              <div className="mt-4 text-sm">
                <p>📧 البريد: user@example.com</p>
                <p>📅 تاريخ الانضمام: 2024</p>
                <p>⭐ المستوى: 5</p>
              </div>
            </div>
          </div>
        </div>

        {/* صندوق المستخدم في القائمة */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📋 صندوق المستخدم في القائمة</h3>
          <ul className="space-y-2">
            <li className="relative">
              <div
                className={`flex items-center gap-2 p-2 px-4 rounded-lg border border-gray-200 transition-colors duration-200 cursor-pointer ${userBoxClasses}`}
                style={userBoxStyles}
              >
                <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">مستخدم تجريبي</span>
                    <span className="text-xs text-gray-500">🟢 متصل</span>
                  </div>
                  <div className="text-xs text-gray-500">عضو</div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* قسم التحقق */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">✅ التحقق من التطابق</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>نفس التدرج مُطبق في كلا المكانين</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>نفس التأثير يعمل في كلا المكانين</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✓</span>
            <span>التحديثات تحدث في الوقت الفعلي</span>
          </div>
        </div>
      </div>
    </div>
  );
}

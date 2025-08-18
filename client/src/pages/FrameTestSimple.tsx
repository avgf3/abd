import React from 'react';
import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';

export default function FrameTestSimple() {
  // صورة تجريبية
  const testImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ccircle cx='100' cy='100' r='100' fill='%234A90E2'/%3E%3Ctext x='100' y='110' text-anchor='middle' font-size='60' fill='white'%3ETest%3C/text%3E%3C/svg%3E";
  
  return (
    <div className="p-8 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold mb-8 text-center">اختبار الإطارات - بسيط</h1>
      
      {/* خط فاصل للقياس */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="text-gray-500">مقارنة الأوضاع</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>
      
      {/* مقارنة جنب بعض */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 gap-8 mb-12">
          {/* الوضع الكامل */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-center">الوضع الكامل (الملف الشخصي)</h2>
            <div className="flex justify-center mb-4">
              <div className="border-2 border-red-500 border-dashed">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame="enhanced-crown-frame"
                  imageSize={130}
                  frameThickness={Math.round(130 * 0.12)}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• حجم الصورة: 130px</p>
              <p>• سُمك الإطار: 8px</p>
              <p>• الحاوية: {130 + (8 * 2)}px = 146px</p>
              <p>• الإطار: كامل (تاج + حلقة)</p>
            </div>
          </div>
          
          {/* الوضع المختصر */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-center">الوضع المختصر (قائمة المتصلين)</h2>
            <div className="flex justify-center mb-4">
              <div className="border-2 border-blue-500 border-dashed">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame="enhanced-crown-frame"
                  imageSize={40}
                  frameThickness={Math.round(40 * 0.12)}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• حجم الصورة: 40px</p>
              <p>• سُمك الإطار: 5px</p>
              <p>• الحاوية: 40px (بدون زيادة)</p>
              <p>• الإطار: مقصوص (حلقة فقط)</p>
            </div>
          </div>
        </div>
        
        {/* اختبار أحجام مختلفة */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">اختبار أحجام مختلفة</h2>
          <div className="flex justify-around items-end">
            {[30, 50, 80, 100, 150].map(size => (
              <div key={size} className="text-center">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="T"
                  frame="enhanced-crown-frame"
                  imageSize={size}
                  frameThickness={Math.round(size * 0.12)}
                />
                <p className="text-xs mt-2">{size}px</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* اختبار بدون إطار */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-center">مقارنة مع وبدون إطار</h2>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="border border-gray-300">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame="none"
                  imageSize={80}
                />
              </div>
              <p className="text-sm mt-2">بدون إطار</p>
            </div>
            <div className="text-center">
              <div className="border border-gray-300">
                <AvatarWithFrame
                  src={testImage}
                  alt="Test"
                  fallback="TE"
                  frame="enhanced-crown-frame"
                  imageSize={80}
                  frameThickness={Math.round(80 * 0.12)}
                />
              </div>
              <p className="text-sm mt-2">مع إطار</p>
            </div>
          </div>
        </div>
        
        {/* ملاحظات مهمة */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-8">
          <h3 className="font-semibold mb-2">المعايير:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>الإطار لا يتجاوز الحاوية أبداً</li>
            <li>الصورة ممتلئة داخل دائرة ثابتة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
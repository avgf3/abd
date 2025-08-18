import React from 'react';

import { AvatarWithFrame, availableFrames } from '@/components/ui/AvatarWithFrame';

export default function FrameTest() {
  const testImage = "https://ui-avatars.com/api/?name=Test+User&background=5865F2&color=fff&size=200";
  
  const sizes = [
    { name: 'Small (40px)', size: 40 },
    { name: 'Medium (80px)', size: 80 },
    { name: 'Large (120px)', size: 120 },
    { name: 'Extra Large (200px)', size: 200 }
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8" dir="rtl">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">اختبار إطارات الصور الشخصية</h1>
        
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-green-800">✅ تم حل المشكلة!</h2>
          <p className="text-gray-700 mb-4">
            تم تحديث مكون AvatarWithFrame بحيث:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mr-4">
            <li>الإطار يحيط بالصورة مباشرة دون تصغيرها</li>
            <li>حجم الصورة يبقى كما هو (imagePixelSize)</li>
            <li>الإطار يأخذ مساحة إضافية حول الصورة (20% إضافية)</li>
            <li>لا يوجد أي تغطية لأجزاء من الصورة</li>
          </ul>
        </div>

        {sizes.map((sizeConfig) => (
          <div key={sizeConfig.size} className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">{sizeConfig.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {availableFrames.map((frame) => (
                <div key={frame.id} className="text-center">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{frame.name}</h3>
                  
                  <div className="space-y-4">
                    {/* عرض الإطار مع الصورة */}
                    <div className="inline-block bg-gray-100 p-4 rounded">
                      <AvatarWithFrame
                        src={testImage}
                        alt="Test User"
                        frame={frame.id}
                        imageSize={sizeConfig.size}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                    <p>قطر الصورة: {sizeConfig.size}px</p>
                    {frame.id !== 'none' && (
                      <p>حجم الحاوية: {Math.round(sizeConfig.size * 1.2)}px</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4 text-blue-800">التفاصيل التقنية</h3>
          <div className="space-y-4 text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">كيف يعمل الحل:</h4>
              <ol className="list-decimal list-inside space-y-2 mr-4">
                <li>الصورة تحتفظ بحجمها الأصلي المحدد (imagePixelSize)</li>
                <li>عند وجود إطار، يتم إنشاء حاوية أكبر بنسبة 20% (frameMultiplier = 1.2)</li>
                <li>الصورة توضع في مركز الحاوية باستخدام position: absolute و transform</li>
                <li>الإطار يأخذ الحجم الكامل للحاوية ويكون فوق الصورة (z-index أعلى)</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">مثال عملي:</h4>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>صورة بحجم 100px ← حاوية 120px ← الإطار يحيط بالصورة دون تغطيتها</li>
                <li>صورة بحجم 40px ← حاوية 48px ← مناسب لقائمة المستخدمين</li>
                <li>صورة بحجم 200px ← حاوية 240px ← مناسب للملف الشخصي</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
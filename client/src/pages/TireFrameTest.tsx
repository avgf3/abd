import React from 'react';
import TireFrameWrapper from '@/components/ui/TireFrameWrapper';
import VipAvatar from '@/components/ui/VipAvatar';

/**
 * صفحة اختبار نظام إطارات الإطارات الجديد
 * Test page for the new tire frame system
 */
export default function TireFrameTest() {
  const testImage = '/default_avatar.svg';
  
  // ✅ اختبار شامل لجميع الأحجام - من الصغيرة جداً إلى الكبيرة جداً
  const sizes = [24, 32, 40, 48, 56, 64, 80, 96, 120, 150];
  const frames = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          🎯 نظام إطارات الإطارات المُحسّن
        </h1>
        <p className="text-center mb-4 text-gray-600">
          ✅ إطارات أكبر تلتف حول الصور بشكل مثالي
        </p>
        <p className="text-center mb-8 text-sm text-gray-500">
          النسب: صغير جداً (40%) | متوسط (35%) | كبير (30%)
        </p>

        {/* اختبار الأحجام المختلفة */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            الأحجام المختلفة (بدون إطار)
          </h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {sizes.map((size) => (
              <div key={size} className="text-center">
                <VipAvatar src={testImage} size={size} />
                <p className="mt-2 text-sm text-gray-600">{size}px</p>
              </div>
            ))}
          </div>
        </div>

        {/* اختبار الإطارات المختلفة */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            الإطارات المختلفة (حجم 80px)
          </h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {frames.map((frame) => (
              <div key={frame} className="text-center">
                <VipAvatar src={testImage} size={80} frame={frame} />
                <p className="mt-2 text-sm text-gray-600">إطار {frame}</p>
              </div>
            ))}
          </div>
        </div>

        {/* اختبار TireFrameWrapper مباشرة */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            TireFrameWrapper مباشرة
          </h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {frames.map((frame) => (
              <div key={frame} className="text-center">
                <TireFrameWrapper size={80} frameNumber={frame}>
                  <img
                    src={testImage}
                    alt="test"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                    }}
                  />
                </TireFrameWrapper>
                <p className="mt-2 text-sm text-gray-600">إطار {frame}</p>
              </div>
            ))}
          </div>
        </div>

        {/* اختبار الأحجام المختلفة مع الإطارات */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            أحجام مختلفة مع إطار رقم 1
          </h2>
          <div className="flex flex-wrap gap-6 justify-center items-end">
            {sizes.map((size) => (
              <div key={size} className="text-center">
                <VipAvatar src={testImage} size={size} frame={1} />
                <p className="mt-2 text-sm text-gray-600">{size}px</p>
              </div>
            ))}
          </div>
        </div>

        {/* اختبار مكثف: جميع الإطارات مع جميع الأحجام */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            🧪 اختبار شامل: كل إطار بجميع الأحجام
          </h2>
          {frames.slice(0, 5).map((frame) => (
            <div key={frame} className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-gray-600 text-center">
                إطار رقم {frame}
              </h3>
              <div className="flex flex-wrap gap-4 justify-center items-end bg-white p-6 rounded-lg shadow">
                {sizes.map((size) => (
                  <div key={size} className="text-center">
                    <TireFrameWrapper size={size} frameNumber={frame}>
                      <img
                        src={testImage}
                        alt="test"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%',
                        }}
                      />
                    </TireFrameWrapper>
                    <p className="mt-2 text-xs text-gray-500">{size}px</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-gray-500 text-sm bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-green-700 mb-4">✅ التحسينات المُطبقة</h3>
          <p className="mb-2">✅ الإطارات أكبر بكثير وأكثر وضوحاً</p>
          <p className="mb-2">✅ الإطار يلتف حول الصورة بشكل مثالي في جميع الأحجام</p>
          <p className="mb-2">✅ نظام نسبي ذكي: يتكيف مع حجم الصورة</p>
          <p className="mb-2">✅ صور صغيرة = إطارات أكبر نسبياً (40%)</p>
          <p className="mb-2">✅ صور متوسطة = إطارات متوازنة (35%)</p>
          <p className="mb-2">✅ صور كبيرة = إطارات متناسبة (30%)</p>
          <p className="mt-4 text-green-600 font-semibold">🎉 الإطارات تعمل بشكل مثالي الآن!</p>
        </div>
      </div>
    </div>
  );
}
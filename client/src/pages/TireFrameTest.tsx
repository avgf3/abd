import React from 'react';
import TireFrameWrapper from '@/components/ui/TireFrameWrapper';
import VipAvatar from '@/components/ui/VipAvatar';

/**
 * صفحة اختبار نظام إطارات الإطارات الجديد
 * Test page for the new tire frame system
 */
export default function TireFrameTest() {
  const testImage = '/default_avatar.svg';
  
  const sizes = [32, 40, 56, 80, 120];
  const frames = [1, 2, 3, 4, 5];

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          نظام إطارات الإطارات الجديد
        </h1>
        <p className="text-center mb-8 text-gray-600">
          نظام بسيط ونظيف لتركيب إطارات الإطارات حول الصور
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

        <div className="text-center text-gray-500 text-sm">
          <p>✅ نظام بسيط ونظيف</p>
          <p>✅ الإطار يلتف حول الصورة تمامًا</p>
          <p>✅ يعمل مع جميع الأحجام</p>
          <p>✅ سهل الاستخدام والصيانة</p>
        </div>
      </div>
    </div>
  );
}
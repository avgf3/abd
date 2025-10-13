import React, { useState } from 'react';
import ProfileImage from './chat/ProfileImage';
import type { ChatUser } from '../types/chat';

const TestCrown11: React.FC = () => {
  // بيانات مستخدم تجريبي لاختبار التاج رقم 11
  const testUser: ChatUser = {
    id: 'test-user-crown-11',
    username: 'مختبر التاج 11',
    gender: 'male',
    level: 25,
    userType: 'member',
    profileImage: '/default_avatar.svg',
    // إضافة التاج رقم 11
    profileTag: 'tag11.webp'
  } as any;

  // بيانات مستخدم أنثى للمقارنة
  const testUserFemale: ChatUser = {
    id: 'test-user-crown-11-female',
    username: 'مختبرة التاج 11',
    gender: 'female',
    level: 25,
    userType: 'member',
    profileImage: '/default_avatar.svg',
    // إضافة التاج رقم 11
    profileTag: 'tag11.webp'
  } as any;

  // مستخدم مع صورة شخصية مخصصة
  const [customImageUser, setCustomImageUser] = useState<ChatUser>({
    id: 'test-user-crown-11-custom',
    username: 'مختبر صورة مخصصة',
    gender: 'male',
    level: 30,
    userType: 'member',
    profileImage: '/default_avatar.svg',
    profileTag: 'tag11.webp'
  } as any);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomImageUser(prev => ({
          ...prev,
          profileImage: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          🔍 اختبار بصري للتاج رقم 11
        </h1>
        
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">معلومات التاج رقم 11</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">إعدادات التاج:</h3>
              <ul className="text-sm space-y-1">
                <li><strong>نسبة العرض:</strong> 1.07 (107% من حجم الصورة)</li>
                <li><strong>الإزاحة العمودية:</strong> -12px (رفع قوي للأعلى)</li>
                <li><strong>نقطة الارتكاز:</strong> 0.08 (8% تداخل متوازن)</li>
                <li><strong>الحساب التلقائي:</strong> مفعل</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">ملف التاج:</h3>
              <p className="text-sm"><strong>المسار:</strong> /tags/tag11.webp</p>
              <p className="text-sm"><strong>النوع:</strong> WebP مضغوط</p>
              <p className="text-sm"><strong>الشفافية:</strong> مدعومة</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* اختبار الأحجام المختلفة */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">الأحجام المختلفة</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">صغير (36px)</span>
                <ProfileImage 
                  user={testUser} 
                  size="small" 
                  context="container"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">متوسط (56px)</span>
                <ProfileImage 
                  user={testUser} 
                  size="medium" 
                  context="container"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">كبير (72px)</span>
                <ProfileImage 
                  user={testUser} 
                  size="large" 
                  context="container"
                />
              </div>
            </div>
          </div>

          {/* اختبار الجنسين */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">اختبار الجنسين</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">ذكر</div>
                  <div className="text-gray-500">إطار أزرق</div>
                </div>
                <ProfileImage 
                  user={testUser} 
                  size="medium" 
                  context="profile"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">أنثى</div>
                  <div className="text-gray-500">إطار وردي</div>
                </div>
                <ProfileImage 
                  user={testUserFemale} 
                  size="medium" 
                  context="profile"
                />
              </div>
            </div>
          </div>
        </div>

        {/* اختبار السياقات */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-700">السياقات المختلفة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-4">سياق الملف الشخصي</h3>
              <div className="flex justify-center">
                <ProfileImage 
                  user={testUser} 
                  size="large" 
                  context="profile"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                إعدادات محسّنة للملف الشخصي
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4">سياق الحاوية</h3>
              <div className="flex justify-center">
                <ProfileImage 
                  user={testUser} 
                  size="large" 
                  context="container"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                إعدادات للدردشة والقوائم
              </p>
            </div>
          </div>
        </div>

        {/* اختبار مع صورة مخصصة */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-700">اختبار مع صورة مخصصة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium mb-2">
                ارفع صورة للاختبار:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                يُفضل الصور المربعة للحصول على أفضل نتيجة
              </p>
            </div>
            <div className="text-center">
              <ProfileImage 
                user={customImageUser} 
                size="large" 
                context="profile"
              />
              <p className="text-sm text-gray-600 mt-2">
                {customImageUser.username}
              </p>
            </div>
          </div>
        </div>

        {/* مقارنة مع تيجان أخرى */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-700">مقارنة مع التيجان الأخرى</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[10, 11, 12, 13].map(tagNum => {
              const comparisonUser = {
                ...testUser,
                id: `test-crown-${tagNum}`,
                username: `التاج ${tagNum}`,
                profileTag: `tag${tagNum}.webp`
              };
              
              return (
                <div key={tagNum} className="text-center">
                  <ProfileImage 
                    user={comparisonUser} 
                    size="medium" 
                    context="profile"
                  />
                  <p className="text-sm font-medium mt-2">التاج {tagNum}</p>
                  <p className="text-xs text-gray-500">
                    {tagNum === 11 ? 'الحالي' : 'للمقارنة'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="bg-gray-100 rounded-xl p-6 text-center">
          <h3 className="font-semibold mb-2">ملاحظات الاختبار</h3>
          <p className="text-sm text-gray-600">
            هذا الاختبار يعرض التاج رقم 11 في سياقات مختلفة للتأكد من صحة العرض والموضع.
            <br />
            يمكنك رفع صور مختلفة لاختبار كيف يبدو التاج مع أنواع مختلفة من الصور الشخصية.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestCrown11;
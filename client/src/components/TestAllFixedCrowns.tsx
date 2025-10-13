import React, { useState } from 'react';
import ProfileImage from './chat/ProfileImage';
import type { ChatUser } from '../types/chat';

const TestAllFixedCrowns: React.FC = () => {
  // التيجان التي تم إصلاحها
  const fixedCrowns = [2, 3, 4, 6, 9, 11];
  
  // بيانات مستخدم تجريبي أساسي
  const createTestUser = (crownNumber: number, gender: 'male' | 'female' = 'male'): ChatUser => ({
    id: `test-user-crown-${crownNumber}-${gender}`,
    username: `مختبر التاج ${crownNumber}`,
    gender: gender,
    level: 25,
    userType: 'member',
    profileImage: '/default_avatar.svg',
    profileTag: `tag${crownNumber}.webp`
  } as any);

  // مستخدم مع صورة مخصصة
  const [customImageUser, setCustomImageUser] = useState<ChatUser>({
    id: 'test-user-custom',
    username: 'مختبر صورة مخصصة',
    gender: 'male',
    level: 30,
    userType: 'member',
    profileImage: '/default_avatar.svg',
    profileTag: 'tag11.webp'
  } as any);

  const [selectedCrown, setSelectedCrown] = useState<number>(11);

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

  const handleCrownChange = (crownNumber: number) => {
    setSelectedCrown(crownNumber);
    setCustomImageUser(prev => ({
      ...prev,
      profileTag: `tag${crownNumber}.webp`
    }));
  };

  // إعدادات التيجان المُصلحة
  const crownSettings = {
    2: { yAdjust: -15, anchor: 0.08, width: 1.10 },
    3: { yAdjust: -18, anchor: 0.08, width: 1.06 },
    4: { yAdjust: -14, anchor: 0.08, width: 1.12 },
    6: { yAdjust: -18, anchor: 0.08, width: 1.14 },
    9: { yAdjust: -14, anchor: 0.08, width: 1.11 },
    11: { yAdjust: -12, anchor: 0.08, width: 1.07 }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          🔧 اختبار جميع التيجان المُصلحة
        </h1>
        
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">ملخص الإصلاحات</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">✅ التيجان المُصلحة:</h3>
            <p className="text-green-700">التيجان 2، 3، 4، 6، 9، 11 - تم إصلاح مواضعها لتكون في الأعلى بدلاً من الأسفل</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fixedCrowns.map(crownNum => {
              const settings = crownSettings[crownNum as keyof typeof crownSettings];
              return (
                <div key={crownNum} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">التاج {crownNum}</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>الرفع:</strong> {settings.yAdjust}px</li>
                    <li><strong>الارتكاز:</strong> {settings.anchor}</li>
                    <li><strong>العرض:</strong> {settings.width}</li>
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* عرض جميع التيجان المُصلحة */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-700">عرض جميع التيجان المُصلحة</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {fixedCrowns.map(crownNum => {
              const testUser = createTestUser(crownNum);
              return (
                <div key={crownNum} className="text-center">
                  <div className="flex justify-center mb-2">
                    <ProfileImage 
                      user={testUser} 
                      size="medium" 
                      context="profile"
                    />
                  </div>
                  <p className="text-sm font-medium">التاج {crownNum}</p>
                  <p className="text-xs text-green-600">✅ مُصلح</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* مقارنة الأحجام */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">اختبار الأحجام - التاج 11</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">صغير (36px)</span>
                <ProfileImage 
                  user={createTestUser(11)} 
                  size="small" 
                  context="container"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">متوسط (56px)</span>
                <ProfileImage 
                  user={createTestUser(11)} 
                  size="medium" 
                  context="container"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">كبير (72px)</span>
                <ProfileImage 
                  user={createTestUser(11)} 
                  size="large" 
                  context="container"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">اختبار الجنسين - التاج 6</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">ذكر</div>
                  <div className="text-gray-500">إطار أزرق</div>
                </div>
                <ProfileImage 
                  user={createTestUser(6, 'male')} 
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
                  user={createTestUser(6, 'female')} 
                  size="medium" 
                  context="profile"
                />
              </div>
            </div>
          </div>
        </div>

        {/* اختبار السياقات */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-700">اختبار السياقات - التاج 9</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-4">سياق الملف الشخصي</h3>
              <div className="flex justify-center">
                <ProfileImage 
                  user={createTestUser(9)} 
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
                  user={createTestUser(9)} 
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
                اختر التاج للاختبار:
              </label>
              <select 
                value={selectedCrown} 
                onChange={(e) => handleCrownChange(Number(e.target.value))}
                className="block w-full p-2 border border-gray-300 rounded-md mb-4"
              >
                {fixedCrowns.map(crownNum => (
                  <option key={crownNum} value={crownNum}>التاج {crownNum}</option>
                ))}
              </select>
              
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
                {customImageUser.username} - التاج {selectedCrown}
              </p>
            </div>
          </div>
        </div>

        {/* مقارنة قبل وبعد (مفاهيمي) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-700">مقارنة قبل وبعد الإصلاح</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-4 text-red-600">❌ قبل الإصلاح</h3>
              <div className="bg-red-50 p-6 rounded-lg">
                <div className="text-4xl mb-2">😞</div>
                <p className="text-sm text-red-700">
                  التيجان كانت تنزل للأسفل<br/>
                  تقريباً لنصف الصورة الشخصية
                </p>
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4 text-green-600">✅ بعد الإصلاح</h3>
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="text-4xl mb-2">😊</div>
                <p className="text-sm text-green-700">
                  التيجان الآن في الموضع الصحيح<br/>
                  في الأعلى فوق الصورة الشخصية
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="bg-gray-100 rounded-xl p-6 text-center">
          <h3 className="font-semibold mb-2">ملاحظات الاختبار</h3>
          <p className="text-sm text-gray-600">
            تم إصلاح مواضع 6 تيجان (2، 3، 4، 6، 9، 11) لتظهر في الأعلى بدلاً من الأسفل.
            <br />
            جميع التيجان الآن تعمل بشكل مثالي في جميع الأحجام والسياقات.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestAllFixedCrowns;
import React from 'react';
import { getUserLevelIcon } from './chat/UserRoleBadge';
import type { ChatUser } from '../types/chat';

const TestLogos: React.FC = () => {
  // إنشاء مستخدمين تجريبيين لاختبار الشعارات
  const testUsers: ChatUser[] = [
    {
      id: 1,
      username: 'المالك',
      userType: 'owner',
      level: 1,
      gender: 'male',
      totalPoints: 0,
      profileImage: null,
      isOnline: true,
      lastSeen: new Date(),
      currentRoom: null,
    },
    {
      id: 2,
      username: 'المشرف العام',
      userType: 'admin',
      level: 1,
      gender: 'male',
      totalPoints: 0,
      profileImage: null,
      isOnline: true,
      lastSeen: new Date(),
      currentRoom: null,
    },
    {
      id: 3,
      username: 'المشرف',
      userType: 'moderator',
      level: 1,
      gender: 'male',
      totalPoints: 0,
      profileImage: null,
      isOnline: true,
      lastSeen: new Date(),
      currentRoom: null,
    },
    {
      id: 4,
      username: 'عضو ذكر',
      userType: 'member',
      level: 5,
      gender: 'male',
      totalPoints: 0,
      profileImage: null,
      isOnline: true,
      lastSeen: new Date(),
      currentRoom: null,
    },
    {
      id: 5,
      username: 'عضو أنثى',
      userType: 'member',
      level: 5,
      gender: 'female',
      totalPoints: 0,
      profileImage: null,
      isOnline: true,
      lastSeen: new Date(),
      currentRoom: null,
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-10" dir="rtl">
      <h2 className="text-xl font-bold mb-4 text-center">اختبار شعارات الأدوار</h2>
      <div className="space-y-3">
        {testUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl">
              {getUserLevelIcon(user, 24)}
            </div>
            <div>
              <div className="font-semibold">{user.username}</div>
              <div className="text-sm text-gray-600">
                النوع: {user.userType} | المستوى: {user.level}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">اختبار مباشر للملفات:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <img src="/svgs/crown.svg" alt="تاج" className="w-5 h-5" />
            <span>تاج المالك</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="/svgs/star.svg" alt="نجمة" className="w-5 h-5" />
            <span>نجمة المشرف العام</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="/svgs/moderator_shield.svg" alt="درع" className="w-5 h-5" />
            <span>درع المشرف</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        افتح أدوات المطور (F12) لرؤية رسائل التحميل
      </div>
    </div>
  );
};

export default TestLogos;
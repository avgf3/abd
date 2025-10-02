import { X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getLevelInfo, getLevelColor } from '@/utils/pointsUtils';

interface LevelUpNotificationProps {
  oldLevel: number;
  newLevel: number;
  user: ChatUser; // إضافة user object للحصول على معلومات المستوى والجنس
  levelInfo?: any;
  onClose: () => void;
}

export function LevelUpNotification({
  oldLevel,
  newLevel,
  user,
  levelInfo,
  onClose,
}: LevelUpNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // إغلاق تلقائي بعد 5 ثوان
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // انتظار انتهاء الأنيميشن
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const newLevelInfo = levelInfo || getLevelInfo(newLevel);
  // إنشاء user object مؤقت بالمستوى الجديد لعرض الأيقونة الصحيحة
  const userWithNewLevel = { ...user, level: newLevel };
  const newLevelIcon = getUserLevelIcon(userWithNewLevel, 32);
  const newLevelColor = getLevelColor(newLevel);

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-lg shadow-lg max-w-sm border-2"
        style={{ borderColor: newLevelColor }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="text-4xl animate-bounce">{newLevelIcon}</div>
            <div className="text-white">
              <h3 className="font-bold text-lg">ترقية مستوى! 🎉</h3>
              <p className="text-sm opacity-90">
                من المستوى {oldLevel} إلى المستوى {newLevel}
              </p>
              <p className="font-semibold" style={{ color: newLevelColor }}>
                {newLevelInfo.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-3 p-2 bg-white/20 rounded text-center text-white text-sm">
          استمر في التفاعل لكسب المزيد من النقاط! 💪
        </div>
      </div>
    </div>
  );
}

interface AchievementNotificationProps {
  message: string;
  onClose: () => void;
}

export function AchievementNotification({ message, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-20 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-lg shadow-lg max-w-sm border-2 border-purple-300">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="text-3xl animate-pulse">🏆</div>
            <div className="text-white">
              <h3 className="font-bold">إنجاز جديد!</h3>
              <p className="text-sm opacity-90">{message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface DailyBonusNotificationProps {
  points: number;
  onClose: () => void;
}

export function DailyBonusNotification({ points, onClose }: DailyBonusNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-36 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-lg shadow-lg max-w-sm border-2 border-green-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-white">
            <div className="text-2xl animate-spin">🎁</div>
            <div>
              <h3 className="font-bold text-sm">مكافأة يومية!</h3>
              <p className="text-xs opacity-90">+{points} نقطة</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

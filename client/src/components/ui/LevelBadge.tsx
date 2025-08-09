/**
 * نظام الشعارات الثاني (المتقدم) - LevelBadge
 * 
 * نظام متقدم يعتمد على:
 * 1. المستويات (1-10) مع ألوان متدرجة
 * 2. النقاط والتقدم في المستوى
 * 3. أسماء مستويات جذابة (مبتدئ، خبير، أسطورة، إمبراطور)
 * 4. أولوية للأدوار الإدارية (مالك، مشرف، مراقب)
 * 5. شريط تقدم ومعلومات تفصيلية
 * 
 * يحل محل نظام UserRoleBadge القديم البسيط
 */

import React from 'react';
import { getLevelInfo, getLevelColor, formatPoints, getPointsToNextLevel } from '@/utils/pointsUtils';
import type { ChatUser } from '@/types/chat';

// دالة لعرض أيقونة المستوى بناءً على مستوى ونوع المستخدم
function getLevelIcon(user: ChatUser, size: number = 20): JSX.Element {
  const level = user.level || 1;
  const userType = user.userType;
  
  // أولويات العرض: نوع المستخدم ثم المستوى
  if (userType === 'owner') {
    return <span style={{fontSize: size}}>👑</span>; // تاج المالك
  }
  if (userType === 'admin') {
    return <span style={{fontSize: size}}>⭐</span>; // نجمة المشرف
  }
  if (userType === 'moderator') {
    return <span style={{fontSize: size}}>🛡️</span>; // درع المراقب
  }
  
  // للأعضاء العاديين - حسب المستوى
  if (level >= 1 && level <= 2) return <span style={{fontSize: size}}>🔰</span>; // مبتدئ
  if (level >= 3 && level <= 4) return <span style={{fontSize: size}}>⭐</span>; // متميز
  if (level >= 5 && level <= 6) return <span style={{fontSize: size}}>🏆</span>; // محترف  
  if (level >= 7 && level <= 8) return <span style={{fontSize: size}}>👑</span>; // أسطورة
  if (level >= 9 && level <= 10) return <span style={{fontSize: size}}>💎</span>; // إمبراطور
  
  return <span style={{fontSize: size}}>🔰</span>; // افتراضي
}

interface LevelBadgeProps {
  user: ChatUser;
  showProgress?: boolean;
  showPoints?: boolean;
  compact?: boolean;
}

export function LevelBadge({ user, showProgress = false, showPoints = false, compact = false }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(user.level || 1);
  const levelIcon = getLevelIcon(user, compact ? 16 : 20);
  const levelColor = getLevelColor(user.level || 1);
  const pointsToNext = getPointsToNextLevel(user.totalPoints || 0);

  if (compact) {
    return (
      <span 
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
        style={{ 
          backgroundColor: `${levelColor}20`,
          color: levelColor,
          border: `1px solid ${levelColor}40`
        }}
      >
        {levelIcon}
        <span>{levelInfo.title}</span>
        {showPoints && (
          <span className="text-xs opacity-80">
            ({formatPoints(user.points || 0)})
          </span>
        )}
      </span>
    );
  }

  return (
          <div className="level-badge-container">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{getLevelIcon(user, 24)}</span>
        <div>
          <div 
            className="font-bold text-sm"
            style={{ color: levelColor }}
          >
            {levelInfo.title} (مستوى {user.level || 1})
          </div>
          {showPoints && (
            <div className="text-xs text-gray-600">
              {formatPoints(user.points || 0)} نقطة
            </div>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{formatPoints(user.totalPoints || 0)} نقطة</span>
            {pointsToNext > 0 && (
              <span>{formatPoints(pointsToNext)} للمستوى التالي</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${user.levelProgress || 0}%`,
                backgroundColor: levelColor
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {user.levelProgress || 0}% مكتمل
          </div>
        </div>
      )}
    </div>
  );
}

interface PointsDisplayProps {
  user: ChatUser;
  type?: 'gift' | 'level' | 'both';
}

export function PointsDisplay({ user, type = 'both' }: PointsDisplayProps) {
  const levelInfo = getLevelInfo(user.level || 1);
  const levelIcon = getLevelIcon(user, 16);
  const levelColor = getLevelColor(user.level || 1);

  if (type === 'gift') {
    return (
      <span style={{ color: levelColor }}>
        {formatPoints(user.points || 0)}
      </span>
    );
  }

  if (type === 'level') {
    return (
      <span style={{ color: levelColor }}>
        {levelIcon} {levelInfo.title} (مستوى {user.level || 1})
      </span>
    );
  }

  return (
    <div className="points-display">
      <div style={{ color: levelColor }}>
        {levelIcon} {levelInfo.title} - {formatPoints(user.points || 0)} نقطة
      </div>
    </div>
  );
}
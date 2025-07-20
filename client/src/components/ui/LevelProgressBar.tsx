import React from 'react';
import { getLevelInfo, getLevelIcon, getLevelColor, formatPoints, getPointsToNextLevel } from '@/utils/pointsUtils';
import type { ChatUser } from '@/types/chat';

interface LevelProgressBarProps {
  user: ChatUser;
  showDetails?: boolean;
  compact?: boolean;
}

export function LevelProgressBar({ user, showDetails = true, compact = false }: LevelProgressBarProps) {
  const levelInfo = getLevelInfo(user.level || 1);
  const levelIcon = getLevelIcon(user.level || 1);
  const levelColor = getLevelColor(user.level || 1);
  const pointsToNext = getPointsToNextLevel(user.totalPoints || 0);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span>{levelIcon}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(user.levelProgress || 0, 100)}%`,
              backgroundColor: levelColor
            }}
          />
        </div>
        <span className="text-gray-600 text-xs">
          {user.levelProgress || 0}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{levelIcon}</span>
          <div>
            <h3 
              className="font-bold text-lg"
              style={{ color: levelColor }}
            >
              {levelInfo.title}
            </h3>
            <p className="text-sm text-gray-600">مستوى {user.level || 1}</p>
          </div>
        </div>
        
        {showDetails && (
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: levelColor }}>
              {formatPoints(user.points || 0)}
            </p>
            <p className="text-xs text-gray-500">نقطة حالية</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{formatPoints(user.totalPoints || 0)} نقطة</span>
          {pointsToNext > 0 ? (
            <span>{formatPoints(pointsToNext)} للمستوى التالي</span>
          ) : (
            <span>🎉 المستوى الأقصى!</span>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500 relative overflow-hidden"
            style={{
              width: `${Math.min(user.levelProgress || 0, 100)}%`,
              backgroundColor: levelColor
            }}
          >
            {/* تأثير التألق */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
        
        <div className="text-center">
          <span 
            className="text-sm font-medium"
            style={{ color: levelColor }}
          >
            {user.levelProgress || 0}% مكتمل
          </span>
        </div>
      </div>

      {showDetails && pointsToNext > 0 && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-center text-xs text-gray-600">
          💪 استمر في التفاعل لكسب {formatPoints(pointsToNext)} نقطة إضافية!
        </div>
      )}
    </div>
  );
}

interface MiniLevelBadgeProps {
  user: ChatUser;
  onClick?: () => void;
}

export function MiniLevelBadge({ user, onClick }: MiniLevelBadgeProps) {
  const levelIcon = getLevelIcon(user.level || 1);
  const levelColor = getLevelColor(user.level || 1);

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
      style={{ 
        backgroundColor: `${levelColor}20`,
        color: levelColor,
        border: `1px solid ${levelColor}40`
      }}
    >
      <span>{levelIcon}</span>
      <span>{user.level || 1}</span>
      <span className="text-xs opacity-80">{formatPoints(user.points || 0)}</span>
    </button>
  );
}
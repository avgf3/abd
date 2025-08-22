import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import {
  getLevelInfo,
  getLevelColor,
  formatPoints,
  getPointsToNextLevel,
} from '@/utils/pointsUtils';

interface LevelBadgeProps {
  user: ChatUser;
  showProgress?: boolean;
  showPoints?: boolean;
  compact?: boolean;
}

export function LevelBadge({
  user,
  showProgress = false,
  showPoints = false,
  compact = false,
}: LevelBadgeProps) {
  const levelInfo = getLevelInfo(user.level || 1);
  const levelIcon = getUserLevelIcon(user, compact ? 16 : 20);
  const levelColor = getLevelColor(user.level || 1);
  const pointsToNext = getPointsToNextLevel(user.totalPoints || 0);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
        style={{
          backgroundColor: `${levelColor}20`,
          color: levelColor,
          border: `1px solid ${levelColor}40`,
        }}
      >
        {levelIcon}
        <span>{levelInfo.title}</span>
        {showPoints && (
          <span className="text-xs opacity-80">({formatPoints(user.points || 0)})</span>
        )}
      </span>
    );
  }

  return (
    <div className="level-badge-container">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{getUserLevelIcon(user, 24)}</span>
        <div>
          <div className="font-bold text-sm" style={{ color: levelColor }}>
            {levelInfo.title} (مستوى {user.level || 1})
          </div>
          {showPoints && (
            <div className="text-xs text-gray-600">{formatPoints(user.points || 0)} نقطة</div>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{formatPoints(user.totalPoints || 0)} نقطة</span>
            {pointsToNext > 0 && <span>{formatPoints(pointsToNext)} للمستوى التالي</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${user.levelProgress || 0}%`,
                backgroundColor: levelColor,
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
  const levelIcon = getUserLevelIcon(user, 16);
  const levelColor = getLevelColor(user.level || 1);

  if (type === 'gift') {
    return <span style={{ color: levelColor }}>{formatPoints(user.points || 0)}</span>;
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

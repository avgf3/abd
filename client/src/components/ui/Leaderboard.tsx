import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { getLevelInfo, getLevelIcon, getLevelColor, formatPoints } from '@/utils/pointsUtils';
import type { ChatUser } from '@/types/chat';
import { apiRequest } from '@/lib/queryClient';

interface LeaderboardProps {
  currentUser?: ChatUser;
  onClose?: () => void;
}

interface LeaderboardUser extends ChatUser {
  rank?: number;
}

export function Leaderboard({ currentUser, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/points/leaderboard?limit=20');
      const rankedData = data.map((user: ChatUser, index: number) => ({
        ...user,
        rank: index + 1
      }));
      
      setLeaderboard(rankedData);
    } catch (err) {
      setError('خطأ في تحميل لوحة الصدارة');
      console.error('خطأ في جلب لوحة الصدارة:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="text-yellow-500" size={24} />;
      case 2: return <Trophy className="text-gray-400" size={22} />;
      case 3: return <Medal className="text-orange-500" size={20} />;
      default: return <Award className="text-blue-500" size={18} />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-orange-400 to-orange-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">🏆 لوحة الصدارة</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3 rtl:space-x-reverse p-3 bg-gray-100 rounded">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg text-center">
        <h2 className="text-xl font-bold mb-4">🏆 لوحة الصدارة</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const currentUserRank = leaderboard.find(user => user.id === currentUser?.id)?.rank;

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🏆 لوحة الصدارة
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        {currentUserRank && (
          <p className="text-sm opacity-90 mt-1">
            ترتيبك: #{currentUserRank}
          </p>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {leaderboard.map((user) => {
          const levelInfo = getLevelInfo(user.level || 1);
          const levelIcon = getLevelIcon(user.level || 1);
          const levelColor = getLevelColor(user.level || 1);
          const isCurrentUser = user.id === currentUser?.id;

          return (
            <div
              key={user.id}
              className={`p-3 border-b border-gray-100 transition-colors ${
                isCurrentUser ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r ${getRankColor(user.rank!)}`}>
                    {user.rank! <= 3 ? (
                      getRankIcon(user.rank!)
                    ) : (
                      <span className="text-white font-bold text-sm">#{user.rank}</span>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {user.username}
                        {isCurrentUser && <span className="text-blue-500 text-xs">(أنت)</span>}
                      </span>
                      <span>{levelIcon}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span style={{ color: levelColor }}>
                        {levelInfo.title}
                      </span>
                      <span>•</span>
                      <span>مستوى {user.level || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm" style={{ color: levelColor }}>
                    {formatPoints(user.totalPoints || 0)}
                  </div>
                  <div className="text-xs text-gray-500">نقطة</div>
                </div>
              </div>

              {user.rank! <= 3 && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(user.levelProgress || 0, 100)}%`,
                      backgroundColor: levelColor
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-gray-50 rounded-b-lg text-center">
        <p className="text-xs text-gray-600">
          استمر في التفاعل لتحسين ترتيبك! 💪
        </p>
        <button
          onClick={fetchLeaderboard}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          🔄 تحديث
        </button>
      </div>
    </div>
  );
}

export function LeaderboardModal({ currentUser, isOpen, onClose }: LeaderboardProps & { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md">
        <Leaderboard currentUser={currentUser} onClose={onClose} />
      </div>
    </div>
  );
}
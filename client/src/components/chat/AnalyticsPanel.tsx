import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useChatAnalytics } from '@/lib/chatAnalytics';
import type { ChatUser } from '@/types/chat';
import { formatTime } from '@/utils/timeUtils';

interface AnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function AnalyticsPanel({ isOpen, onClose, currentUser }: AnalyticsPanelProps) {
  const { analytics, isLoading, refreshAnalytics } = useChatAnalytics();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-secondary rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">📊 تحليلات الشات</h2>
          <div className="flex gap-2">
            <Button
              onClick={refreshAnalytics}
              disabled={isLoading}
              className="glass-effect"
            >
              {isLoading ? '⏳' : '🔄'} تحديث
            </Button>
            <Button onClick={onClose} variant="ghost" className="text-white">
              ✕
            </Button>
          </div>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* إحصائيات عامة */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                📈 إحصائيات عامة
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">المستخدمون النشطون:</span>
                  <span className="text-green-400 font-bold">{analytics.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">متوسط وقت الاستجابة:</span>
                  <span className="text-blue-400 font-bold">{analytics.averageResponseTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">إجمالي الجلسات:</span>
                  <span className="text-purple-400 font-bold">{analytics.userEngagement.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">متوسط مدة الجلسة:</span>
                  <span className="text-yellow-400 font-bold">
                    {Math.round(analytics.userEngagement.averageSessionDuration / 1000 / 60)}د
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">معدل الارتداد:</span>
                  <span className="text-red-400 font-bold">
                    {(analytics.userEngagement.bounceRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* الرسائل حسب الساعة */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                🕐 الرسائل حسب الساعة
              </h3>
              <div className="space-y-1">
                {analytics.messagesPerHour.map((count, hour) => (
                  <div key={hour} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                        style={{ 
                          width: `${Math.max(5, (count / Math.max(...analytics.messagesPerHour)) * 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 w-6">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* أكثر المستخدمين نشاطاً */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                🏆 أكثر المستخدمين نشاطاً
              </h3>
              <div className="space-y-2">
                {analytics.topUsers.slice(0, 10).map((user, index) => (
                  <div key={user.username} className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                    </span>
                    <span className="text-sm text-gray-300 flex-1 truncate">
                      {user.username}
                    </span>
                    <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">
                      {user.messageCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* الكلمات الأكثر استخداماً */}
            <div className="glass-effect p-4 rounded-lg md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                🔤 الكلمات الأكثر استخداماً
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {analytics.popularWords.slice(0, 16).map((word) => (
                  <div key={word.word} className="bg-gray-700 rounded-lg p-2 text-center">
                    <div className="text-sm text-white font-medium truncate">
                      {word.word}
                    </div>
                    <div className="text-xs text-blue-400">{word.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                ℹ️ معلومات إضافية
              </h3>
              <div className="space-y-2 text-sm">
                <div className="text-gray-300">
                  📅 آخر تحديث: {formatTime(new Date())}
                </div>
                <div className="text-gray-300">
                  🎯 فترة التحليل: آخر 24 ساعة
                </div>
                <div className="text-gray-300">
                  🔄 تحديث تلقائي كل 5 دقائق
                </div>
                <div className="text-gray-300">
                  👨‍💼 المحلل: {currentUser?.username || 'غير محدد'}
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <div className="text-white">جاري تحميل التحليلات...</div>
            </div>
          </div>
        )}

        {!analytics && !isLoading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">📊</div>
              <div>لا توجد بيانات تحليلية متاحة</div>
              <Button onClick={refreshAnalytics} className="mt-4">
                تحميل البيانات
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
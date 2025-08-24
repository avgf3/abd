import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import UsernameDisplay from '@/components/common/UsernameDisplay';

export default function AnalyticsPanel() {
  const [analytics, setAnalytics] = useState<{
    totalMessages: number;
    activeUsers: number;
    topUsers: Array<{ username: string; messageCount: number }>;
  }>({ totalMessages: 0, activeUsers: 0, topUsers: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiRequest('/api/analytics');
        setAnalytics(res);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات عامة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">إجمالي الرسائل</div>
              <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">المستخدمون النشطون</div>
              <div className="text-2xl font-bold">{analytics.activeUsers}</div>
            </div>
          </div>

          {/* أكثر المستخدمين نشاطاً */}
          <div className="glass-effect p-4 rounded-lg mt-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              🏆 أكثر المستخدمين نشاطاً
            </h3>
            <div className="space-y-2">
              {analytics.topUsers.slice(0, 10).map((user, index) => (
                <div key={user.username} className="flex items-center gap-2">
                  <span className="text-lg">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                  </span>
                  <UsernameDisplay
                    user={{ id: index + 1, username: user.username, userType: 'member', usernameColor: '#000000', profileImage: '' } as any}
                    className="text-sm text-gray-300 flex-1 truncate"
                  />
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">
                    {user.messageCount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
      </Card>
    </div>
  );
}

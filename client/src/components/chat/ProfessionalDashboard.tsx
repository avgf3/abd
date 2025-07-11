import { useState } from 'react';
import { Button } from '@/components/ui/button';
import AnalyticsPanel from './AnalyticsPanel';
import SecurityPanel from './SecurityPanel';
import PerformanceMonitor from './PerformanceMonitor';
import type { ChatUser } from '@/types/chat';

interface ProfessionalDashboardProps {
  currentUser: ChatUser | null;
  isVisible: boolean;
  onClose: () => void;
}

export default function ProfessionalDashboard({ currentUser, isVisible, onClose }: ProfessionalDashboardProps) {
  const [activePanel, setActivePanel] = useState<'analytics' | 'security' | 'performance' | null>(null);

  if (!isVisible) return null;

  // تحقق من صلاحيات المستخدم
  const isOwner = currentUser?.userType === 'owner';
  const isAdmin = currentUser?.userType === 'admin' || isOwner;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-secondary rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">🎛️ لوحة التحكم الاحترافية</h2>
          <Button onClick={onClose} variant="ghost" className="text-white">
            ✕
          </Button>
        </div>

        {/* معلومات المستخدم */}
        <div className="glass-effect p-4 rounded-lg mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
              {currentUser?.userType === 'owner' ? '👑' : 
               currentUser?.userType === 'admin' ? '🛡️' : '👤'}
            </div>
            <div>
              <div className="text-white font-bold">{currentUser?.username}</div>
              <div className="text-gray-300 text-sm">
                {currentUser?.userType === 'owner' ? 'مالك النظام' :
                 currentUser?.userType === 'admin' ? 'مدير' : 'عضو'}
              </div>
            </div>
            <div className="mr-auto">
              <div className="text-xs text-gray-400">وقت الدخول</div>
              <div className="text-sm text-green-400">{new Date().toLocaleTimeString('ar-SA')}</div>
            </div>
          </div>
        </div>

        {/* أزرار الوصول السريع */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {isAdmin && (
            <Button
              onClick={() => setActivePanel('analytics')}
              className="glass-effect h-20 flex flex-col items-center gap-2 hover:bg-blue-600/20"
            >
              <div className="text-2xl">📊</div>
              <div className="text-sm">تحليلات النظام</div>
            </Button>
          )}

          {isOwner && (
            <Button
              onClick={() => setActivePanel('security')}
              className="glass-effect h-20 flex flex-col items-center gap-2 hover:bg-red-600/20"
            >
              <div className="text-2xl">🛡️</div>
              <div className="text-sm">لوحة الأمان</div>
            </Button>
          )}

          <Button
            onClick={() => setActivePanel('performance')}
            className="glass-effect h-20 flex flex-col items-center gap-2 hover:bg-green-600/20"
          >
            <div className="text-2xl">⚡</div>
            <div className="text-sm">مراقب الأداء</div>
          </Button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-effect p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">✅</div>
            <div className="text-sm text-gray-300">النظام سليم</div>
          </div>
          
          <div className="glass-effect p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">🌐</div>
            <div className="text-sm text-gray-300">متصل</div>
          </div>
          
          <div className="glass-effect p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">⚡</div>
            <div className="text-sm text-gray-300">أداء ممتاز</div>
          </div>
          
          <div className="glass-effect p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-400">🔒</div>
            <div className="text-sm text-gray-300">آمن</div>
          </div>
        </div>

        {/* معلومات النظام */}
        <div className="glass-effect p-4 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-3">ℹ️ معلومات النظام</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-300">🔧 إصدار النظام: v2.0 Professional</div>
              <div className="text-gray-300">📅 تاريخ آخر تحديث: 11 يناير 2025</div>
              <div className="text-gray-300">⏰ وقت التشغيل: {Math.floor(Date.now() / 1000 / 60)} دقيقة</div>
            </div>
            <div>
              <div className="text-gray-300">🌐 البروتوكول: WebSocket Secure</div>
              <div className="text-gray-300">🔐 التشفير: نشط</div>
              <div className="text-gray-300">📊 المراقبة: فعالة</div>
            </div>
          </div>
        </div>

        {/* اللوحات المتخصصة */}
        {activePanel === 'analytics' && (
          <AnalyticsPanel
            isOpen={true}
            onClose={() => setActivePanel(null)}
            currentUser={currentUser}
          />
        )}

        {activePanel === 'security' && (
          <SecurityPanel
            isOpen={true}
            onClose={() => setActivePanel(null)}
            currentUser={currentUser}
          />
        )}

        {activePanel === 'performance' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-secondary rounded-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">⚡ مراقب الأداء التفصيلي</h3>
                <Button onClick={() => setActivePanel(null)} variant="ghost" className="text-white">
                  ✕
                </Button>
              </div>
              <PerformanceMonitor isVisible={true} />
              <div className="mt-4 text-center">
                <div className="text-gray-300 text-sm">مراقبة الأداء في الوقت الفعلي</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
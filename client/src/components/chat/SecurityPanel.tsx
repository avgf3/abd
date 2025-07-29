import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface SecurityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

interface SecurityReport {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  suspiciousIPs: number;
  blockedIPs: number;
  monitoredUsers: number;
}

interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: string;
}

export default function SecurityPanel({ isOpen, onClose, currentUser }: SecurityPanelProps) {
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [newBlockIP, setNewBlockIP] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // تحميل تقرير الأمان
  const loadSecurityReport = async () => {
    setIsLoading(true);
    try {
      const report = await apiRequest('/api/security/report');
      setSecurityReport(report);
      
      const blocked = await apiRequest('/api/security/blocked-ips');
      setBlockedIPs(blocked);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل تقرير الأمان",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // حظر IP
  const blockIP = async () => {
    if (!newBlockIP.trim() || !blockReason.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عنوان IP والسبب",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiRequest('/api/security/block-ip', {
        method: 'POST',
        body: {
          ip: newBlockIP.trim(),
          reason: blockReason.trim()
        }
      });

      toast({
        title: "تم بنجاح",
        description: `تم حظر العنوان ${newBlockIP}`
      });

      setNewBlockIP('');
      setBlockReason('');
      loadSecurityReport();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حظر العنوان",
        variant: "destructive"
      });
    }
  };

  // إلغاء حظر IP
  const unblockIP = async (ip: string) => {
    try {
      await apiRequest('/api/security/unblock-ip', {
        method: 'POST',
        body: { ip }
      });

      toast({
        title: "تم بنجاح",
        description: `تم إلغاء حظر العنوان ${ip}`
      });

      loadSecurityReport();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إلغاء الحظر",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSecurityReport();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-secondary rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">🛡️ لوحة الأمان</h2>
          <div className="flex gap-2">
            <Button
              onClick={loadSecurityReport}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* تقرير الأمان */}
          <div className="space-y-4">
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                📊 ملخص الأمان (24 ساعة)
              </h3>

              {securityReport ? (
                <div className="space-y-3">
                  {/* إحصائيات عامة */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-300">إجمالي الأحداث</div>
                      <div className="text-xl font-bold text-red-400">
                        {securityReport.totalEvents}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-300">عناوين مراقبة</div>
                      <div className="text-xl font-bold text-yellow-400">
                        {securityReport.suspiciousIPs}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-300">عناوين محظورة</div>
                      <div className="text-xl font-bold text-red-400">
                        {securityReport.blockedIPs}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-300">مستخدمين مراقبين</div>
                      <div className="text-xl font-bold text-blue-400">
                        {securityReport.monitoredUsers}
                      </div>
                    </div>
                  </div>

                  {/* الأحداث حسب النوع */}
                  <div>
                    <h4 className="font-bold text-white mb-2">الأحداث حسب النوع</h4>
                    <div className="space-y-1">
                      {Object.entries(securityReport.eventsByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                          <span className="text-gray-300">
                            {type === 'suspicious_login' ? '🔐 دخول مشبوه' :
                             type === 'spam_attempt' ? '📢 محاولة سبام' :
                             type === 'multiple_accounts' ? '👥 حسابات متعددة' :
                             type === 'unusual_activity' ? '⚠️ نشاط غير عادي' : type}
                          </span>
                          <span className="font-bold text-red-400">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* الأحداث حسب الخطورة */}
                  <div>
                    <h4 className="font-bold text-white mb-2">الأحداث حسب الخطورة</h4>
                    <div className="space-y-1">
                      {Object.entries(securityReport.eventsBySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                          <span className="text-gray-300">
                            {severity === 'low' ? '🟢 منخفض' :
                             severity === 'medium' ? '🟡 متوسط' :
                             severity === 'high' ? '🟠 عالي' :
                             severity === 'critical' ? '🔴 حرج' : severity}
                          </span>
                          <span className={`font-bold ${
                            severity === 'critical' ? 'text-red-500' :
                            severity === 'high' ? 'text-orange-500' :
                            severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  {isLoading ? '⏳ جاري التحميل...' : '❌ لا توجد بيانات'}
                </div>
              )}
            </div>
          </div>

          {/* إدارة IP المحظورة */}
          <div className="space-y-4">
            {/* حظر IP جديد */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                🚫 حظر عنوان IP
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="عنوان IP (مثال: 192.168.1.1)"
                  value={newBlockIP}
                  onChange={(e) => setNewBlockIP(e.target.value)}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="سبب الحظر"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500"
                />
                <Button
                  onClick={blockIP}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!newBlockIP.trim() || !blockReason.trim()}
                >
                  🚫 حظر العنوان
                </Button>
              </div>
            </div>

            {/* قائمة العناوين المحظورة */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                📋 العناوين المحظورة
              </h3>
              
              {blockedIPs.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {blockedIPs.map((blocked) => (
                    <div key={blocked.ip} className="bg-gray-700 p-3 rounded flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-white">{blocked.ip}</div>
                        <div className="text-sm text-gray-300 truncate">{blocked.reason}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(blocked.blockedAt).toLocaleString('ar-SA')}
                        </div>
                      </div>
                      <Button
                        onClick={() => unblockIP(blocked.ip)}
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300 shrink-0"
                      >
                        🔓 إلغاء
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  ✅ لا توجد عناوين محظورة
                </div>
              )}
            </div>

            {/* أدوات إضافية */}
            <div className="glass-effect p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                🔧 أدوات إضافية
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    toast({
                      title: "معلومات",
                      description: "سيتم تنفيذ فحص أمني شامل..."
                    });
                  }}
                  className="w-full glass-effect"
                >
                  🔍 فحص أمني شامل
                </Button>
                <Button
                  onClick={() => {
                    toast({
                      title: "معلومات",
                      description: "سيتم تنظيف البيانات القديمة..."
                    });
                  }}
                  className="w-full glass-effect"
                >
                  🧹 تنظيف البيانات
                </Button>
                <Button
                  onClick={() => {
                    const report = JSON.stringify(securityReport, null, 2);
                    navigator.clipboard.writeText(report);
                    toast({
                      title: "تم بنجاح",
                      description: "تم نسخ التقرير إلى الحافظة"
                    });
                  }}
                  className="w-full glass-effect"
                  disabled={!securityReport}
                >
                  📋 نسخ التقرير
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
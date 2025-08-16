import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { formatDate } from '@/utils/timeUtils';

interface Report {
  id: number;
  reporterId: number;
  reportedUserId: number;
  messageId?: number;
  reason: string;
  content: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'dismissed';
}

interface AdminReportsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function AdminReportsPanel({ isOpen, onClose, currentUser }: AdminReportsPanelProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser?.userType === 'owner') {
      loadReports();
      loadStats();
    }
  }, [isOpen, currentUser]);

  const loadReports = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const data = await apiRequest(`/api/moderation/reports?userId=${currentUser.id}`);
      setReports((data as any).reports || []);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: (error as Error)?.message || 'خطأ في تحميل التبليغات',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentUser) return;

    try {
      const data = await apiRequest(`/api/spam-stats?userId=${currentUser.id}`);
      setStats((data as any).stats);
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  const handleReviewReport = async (reportId: number, action: 'approved' | 'dismissed') => {
    if (!currentUser) return;

    try {
      await apiRequest(`/api/reports/${reportId}`, {
        method: 'PATCH',
        body: { action, userId: currentUser.id }
      });
      toast({
        title: 'تم',
        description: `تم ${action === 'approved' ? 'قبول' : 'رفض'} التبليغ`,
        variant: 'default'
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
      loadStats();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: (error as Error)?.message || 'خطأ في مراجعة التبليغ',
        variant: 'destructive'
      });
    }
  };

  // تم نقل دالة formatDate إلى utils/timeUtils.ts

  if (currentUser?.userType !== 'owner') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[600px] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle>لوحة إدارة التبليغات</DialogTitle>
          <DialogDescription>
            مراجعة التبليغات وإدارة نظام مكافحة السبام
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* الإحصائيات */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">إجمالي المستخدمين</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{stats.bannedUsers}</div>
                <div className="text-sm text-gray-600">محظورين</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.restrictedUsers}</div>
                <div className="text-sm text-gray-600">مقيدين</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{stats.pendingReports}</div>
                <div className="text-sm text-gray-600">تبليغات معلقة</div>
              </div>
            </div>
          )}

          {/* قائمة التبليغات */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">لا توجد تبليغات معلقة</div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">التبليغ رقم: {report.id}</div>
                      <div className="text-sm text-gray-600">
                        تاريخ التبليغ: {formatDate(report.timestamp)}
                      </div>
                    </div>
                    <Badge variant="secondary">معلق</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">السبب: </span>
                      <span>{report.reason}</span>
                    </div>
                    <div>
                      <span className="font-medium">المحتوى المبلغ عنه: </span>
                      <div className="bg-gray-100 p-2 rounded text-sm">
                        "{report.content}"
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      المبلغ: المستخدم {report.reporterId} | 
                      المبلغ عنه: المستخدم {report.reportedUserId}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReviewReport(report.id, 'approved')}
                    >
                      قبول التبليغ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewReport(report.id, 'dismissed')}
                    >
                      رفض التبليغ
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          <Button onClick={loadReports}>
            تحديث
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
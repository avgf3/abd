import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

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
      const response = await fetch(`/api/reports/pending?userId=${currentUser.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports);
      } else {
        throw new Error(data.error || 'خطأ في تحميل التبليغات');
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'خطأ في تحميل التبليغات',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/spam-stats?userId=${currentUser.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  const handleReviewReport = async (reportId: number, action: 'approved' | 'dismissed') => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          userId: currentUser.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'تم',
          description: `تم ${action === 'approved' ? 'قبول' : 'رفض'} التبليغ`,
          variant: 'default'
        });
        
        // Remove the reviewed report from the list
        setReports(prev => prev.filter(r => r.id !== reportId));
        loadStats(); // Refresh stats
      } else {
        throw new Error(data.error || 'خطأ في مراجعة التبليغ');
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'خطأ في مراجعة التبليغ',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (currentUser?.userType !== 'owner') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[600px]" dir="rtl">
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
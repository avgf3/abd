import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface Report {
  id: number;
  reporterId: number;
  reportedUserId: number;
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser && (currentUser.userType === 'admin' || currentUser.userType === 'owner')) {
      fetchReports();
    }
  }, [isOpen, currentUser]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/moderation/reports?userId=${currentUser?.id}`);
      setReports(data.reports || []);
    } catch (error) {
      console.error('خطأ في جلب التقارير:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId: number, action: 'approved' | 'dismissed') => {
    try {
      await apiRequest('/api/moderation/report/review', {
        method: 'POST',
        body: { reportId, action }
      });

      toast({
        title: "تم التحديث",
        description: action === 'approved' ? "تم قبول التقرير" : "تم رفض التقرير",
      });

      fetchReports();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ",
        variant: "destructive",
      });
    }
  };

  // فقط للإدمن والمالك
  if (!currentUser || (currentUser.userType !== 'admin' && currentUser.userType !== 'owner')) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">📋 تقارير المستخدمين</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">جاري التحميل...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">لا توجد تقارير جديدة</div>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium">تقرير #{report.id}</div>
                      <div className="text-sm text-gray-400">
                        السبب: {report.reason}
                      </div>
                      <div className="text-sm text-gray-400">
                        التاريخ: {new Date(report.timestamp).toLocaleString('ar-SA')}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      report.status === 'pending' ? 'bg-yellow-600' :
                      report.status === 'reviewed' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {report.status === 'pending' ? 'بانتظار المراجعة' :
                       report.status === 'reviewed' ? 'تمت المراجعة' : 'مرفوض'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-600 p-3 rounded mb-3">
                    <div className="text-sm">{report.content}</div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReportAction(report.id, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        قبول
                      </Button>
                      <Button
                        onClick={() => handleReportAction(report.id, 'dismissed')}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        رفض
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { AlertTriangle, User, FileText, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { formatTimestamp } from '@/utils/timeUtils';

interface ReportData {
  id: number;
  reporterId: number;
  reportedUserId: number;
  messageId?: number;
  reason: string;
  content: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'dismissed';
  reporterName?: string;
  reportedUserName?: string;
}

interface ReportsLogProps {
  currentUser: ChatUser;
  isVisible: boolean;
  onClose: () => void;
}

export default function ReportsLog({ currentUser, isVisible, onClose }: ReportsLogProps) {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && (currentUser.userType === 'admin' || currentUser.userType === 'owner')) {
      loadReports();
    }
  }, [isVisible, currentUser]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/moderation/reports?userId=${currentUser.id}`);
      setReports((data as any).reports || []);
    } catch (error) {
      console.error('خطأ في تحميل البلاغات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId: number, action: 'reviewed' | 'dismissed') => {
    try {
      await apiRequest(`/api/reports/${reportId}/review`, {
        method: 'POST',
        body: { action, moderatorId: currentUser.id }
      });
      await loadReports();
    } catch (error) {
      console.error('خطأ في معالجة البلاغ:', error);
    }
  };

  // تم نقل دالة formatTimestamp إلى utils/timeUtils.ts

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">قيد المراجعة</Badge>;
      case 'reviewed':
        return <Badge variant="default">تمت المراجعة</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">مرفوض</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  if (!isVisible) return null;

  // التحقق من الصلاحيات
  if (currentUser.userType !== 'admin' && currentUser.userType !== 'owner') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-96 bg-gray-900/95 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center text-red-400">
              غير مصرح
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">هذه اللوحة مخصصة للمشرفين فقط</p>
            <Button onClick={onClose} variant="outline">
              إغلاق
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-gray-900/95 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              سجل البلاغات
              {pendingReports.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingReports.length} بلاغ جديد
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                {currentUser.userType === 'owner' ? 'المالك' : 'مشرف'}
              </Badge>
              <Button onClick={onClose} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">
              قائمة البلاغات المُستلمة
            </h3>
            <Button 
              onClick={loadReports} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? 'جاري التحديث...' : 'تحديث'}
            </Button>
          </div>

          <ScrollArea className="h-[50vh]">
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد بلاغات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className={`bg-gray-800/50 border-gray-600 ${
                    report.status === 'pending' ? 'border-red-500/50' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <span className="font-medium text-gray-200">
                              {report.reporterName || 'مجهول'}
                            </span>
                            <span className="text-gray-400">بلّغ عن</span>
                            <span className="font-medium text-red-400">
                              {report.reportedUserName || 'مجهول'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-gray-300">
                              السبب: {report.reason}
                            </span>
                          </div>
                          
                          {report.content && (
                            <div className="bg-gray-700/50 p-2 rounded text-sm text-gray-300 mb-2">
                              "{report.content}"
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(report.timestamp)}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(report.status)}
                          
                          {report.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleReportAction(report.id, 'reviewed')}
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                راجع
                              </Button>
                              <Button
                                onClick={() => handleReportAction(report.id, 'dismissed')}
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-400"
                              >
                                ارفض
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {reports.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-400">بلاغات جديدة</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {reports.filter(r => r.status === 'reviewed').length}
                </div>
                <div className="text-sm text-gray-400">تمت مراجعتها</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {reports.filter(r => r.status === 'dismissed').length}
                </div>
                <div className="text-sm text-gray-400">مرفوضة</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
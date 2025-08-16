import { Shield, Clock, Ban, UserX } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import ModerationList from './ModerationList';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { formatTimestamp } from '@/utils/timeUtils';


interface ModerationAction {
  id: string;
  type: 'mute' | 'ban' | 'block' | 'kick' | 'promote' | 'demote';
  targetUserId: number;
  moderatorId: number;
  moderatorName: string;
  targetName: string;
  reason: string;
  duration?: number;
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
}

interface ModerationPanelProps {
  currentUser: ChatUser;
  isVisible: boolean;
  onClose: () => void;
}

export default function ModerationPanel({ currentUser, isVisible, onClose }: ModerationPanelProps) {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && (currentUser.userType === 'admin' || currentUser.userType === 'owner')) {
      loadModerationActions();
    }
  }, [isVisible, currentUser]);

  const loadModerationActions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/moderation/actions?userId=${currentUser.id}`);
      setActions((data as any).actions || data || []);
    } catch (error) {
      console.error('خطأ في تحميل إجراءات الإدارة:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'mute': return <UserX className="w-4 h-4 text-orange-500" />;
      case 'ban': return <Clock className="w-4 h-4 text-red-500" />;
      case 'block': return <Ban className="w-4 h-4 text-red-700" />;
      case 'kick': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionText = (action: ModerationAction) => {
    switch (action.type) {
      case 'mute': return `كتم ${action.targetName}`;
      case 'ban': return `طرد ${action.targetName}`;
      case 'block': return `حجب ${action.targetName} نهائياً`;
      case 'kick': return `طرد ${action.targetName} مؤقتاً`;
      default: return action.type;
    }
  };

  // تم نقل دالة formatTimestamp إلى utils/timeUtils.ts

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-gray-900/95 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-400" />
              لوحة إجراءات المشرفين
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
              آخر الإجراءات الإدارية
            </h3>
            <Button 
              onClick={loadModerationActions} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? 'جاري التحديث...' : 'تحديث'}
            </Button>
          </div>

          <ModerationList
            items={actions}
            loading={loading}
            emptyText="لا توجد إجراءات إدارية بعد"
            renderItem={(action) => (
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getActionIcon(action.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-200">
                        {action.moderatorName}
                      </span>
                      <span className="text-gray-400">قام بـ</span>
                      <span className="text-orange-400">
                        {getActionText(action as any)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">السبب: {action.reason}</p>
                    {(action as any).duration && (
                      <Badge variant="outline" className="text-xs">
                        المدة: {(action as any).duration} دقيقة
                      </Badge>
                    )}
                    {(action as any).ipAddress && (
                      <div className="mt-2 text-xs text-gray-500">
                        IP: {(action as any).ipAddress.substring(0, 15)}...
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-left">{formatTimestamp((action as any).timestamp)}</div>
              </div>
            )}
          />

          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {actions.filter(a => a.type === 'mute').length}
                </div>
                <div className="text-sm text-gray-400">إجراءات كتم</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">
                  {actions.filter(a => a.type === 'ban' || a.type === 'kick').length}
                </div>
                <div className="text-sm text-gray-400">إجراءات طرد</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {actions.filter(a => a.type === 'block').length}
                </div>
                <div className="text-sm text-gray-400">إجراءات حجب</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
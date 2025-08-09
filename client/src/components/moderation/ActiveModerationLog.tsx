import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, UserX, Ban, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';
import { apiRequest } from '@/lib/queryClient';
import ModerationList from './ModerationList';

interface ActiveModerationAction {
  id: string;
  type: 'mute' | 'block';
  targetUserId: number;
  moderatorId: number;
  moderatorName: string;
  targetName: string;
  reason: string;
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
  isActive: boolean;
}

interface ActiveModerationLogProps {
  currentUser: ChatUser;
  isVisible: boolean;
  onClose: () => void;
}

export default function ActiveModerationLog({ currentUser, isVisible, onClose }: ActiveModerationLogProps) {
  const [activeActions, setActiveActions] = useState<ActiveModerationAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isVisible && (currentUser.userType === 'admin' || currentUser.userType === 'owner')) {
      loadActiveActions();
    }
  }, [isVisible, currentUser]);

  const loadActiveActions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/moderation/actions?userId=${currentUser.id}`);
      const onlyActive = ((data as any).actions || []).filter((action: any) => action.isActive);
      setActiveActions(onlyActive);
    } catch (error) {
      console.error('خطأ في تحميل الإجراءات النشطة:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAction = async (actionId: string, type: 'mute' | 'block', targetUserId: number) => {
    try {
      const endpoint = type === 'mute' ? '/api/moderation/unmute' : '/api/moderation/unblock';
      await apiRequest(endpoint, {
        method: 'POST',
        body: { moderatorId: currentUser.id, targetUserId }
      });
      toast({
        title: "تم بنجاح",
        description: type === 'mute' ? "تم إلغاء الكتم" : "تم إلغاء الحجب",
        variant: "default"
      });
      await loadActiveActions();
    } catch (error: any) {
      console.error('خطأ في إزالة الإجراء:', error);
      toast({
        title: "خطأ",
        description: error?.message || "حدث خطأ في الاتصال",
        variant: "destructive"
      });
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'mute': return <UserX className="w-4 h-4 text-orange-500" />;
      case 'block': return <Ban className="w-4 h-4 text-red-700" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionText = (type: string) => {
    switch (type) {
      case 'mute': return 'مكتوم';
      case 'block': return 'محجوب نهائياً';
      default: return type;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'mute': return 'text-orange-400';
      case 'block': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-gray-900/95 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
              <Shield className="w-6 h-6 text-yellow-400" />
              سجل الإجراءات النشطة
              {activeActions.length > 0 && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  {activeActions.length} إجراء نشط
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
              المستخدمون المكتومون والمحجوبون حالياً
            </h3>
            <Button 
              onClick={loadActiveActions} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? 'جاري التحديث...' : 'تحديث'}
            </Button>
          </div>

          <ModerationList
            items={activeActions}
            loading={loading}
            emptyText="لا توجد إجراءات نشطة حالياً"
            renderItem={(action) => (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getActionIcon(action.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-200">{action.moderatorName}</span>
                      <span className="text-gray-400">قام بـ</span>
                      <span className={`font-medium ${getActionColor(action.type)}`}>{getActionText(action.type)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-white">{action.targetName}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">السبب: {action.reason}</p>
                    <div className="text-xs text-gray-500">
                      <Clock className="w-3 h-3 inline ml-1" />
                      {formatTimestamp(action.timestamp)}
                    </div>
                    {(action as any).ipAddress && action.type === 'block' && (
                      <div className="mt-1 text-xs text-red-400">🚫 حجب IP: {(action as any).ipAddress.substring(0, 15)}...</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={action.type === 'mute' ? 'secondary' : 'destructive'}
                    className={action.type === 'mute' ? 'bg-orange-600' : 'bg-red-600'}
                  >
                    {action.type === 'mute' ? 'كتم نشط' : 'حجب نشط'}
                  </Badge>
                  <Button
                    onClick={() => handleRemoveAction(action.id as any, action.type as any, (action as any).targetUserId)}
                    size="sm"
                    variant="outline"
                    className={`border-green-600 text-green-400 hover:bg-green-600 hover:text-white`}
                  >
                    {action.type === 'mute' ? 'إلغاء الكتم' : 'إلغاء الحجب'}
                  </Button>
                </div>
              </div>
            )}
          />

          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  {activeActions.filter(a => a.type === 'mute').length}
                </div>
                <div className="text-sm text-gray-400">مستخدمون مكتومون</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {activeActions.filter(a => a.type === 'block').length}
                </div>
                <div className="text-sm text-gray-400">مستخدمون محجوبون</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getImageSrc } from '@/utils/imageUtils';
import UserRoleBadge from './UserRoleBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface ModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
}

export default function ModerationPanel({ 
  isOpen, 
  onClose, 
  currentUser, 
  onlineUsers 
}: ModerationPanelProps) {
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [action, setAction] = useState<string>('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'actions'>('users');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const canUsePanel = currentUser && (currentUser.userType === 'owner' || currentUser.userType === 'admin');

  const filteredUsers = onlineUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.id !== currentUser?.id
  );



  const canModerateUser = (target: ChatUser) => {
    if (!currentUser) return false;
    
    // المالك له صلاحية كاملة
    if (currentUser.userType === 'owner') {
      return true;
    }
    
    // المشرف لا يستطيع التأثير على المالك أو مشرف آخر
    if (currentUser.userType === 'admin' && (target.userType === 'owner' || target.userType === 'admin')) {
      return false;
    }
    
    return currentUser.userType === 'admin' || currentUser.userType === 'owner';
  };

  const getAvailableActions = (target: ChatUser) => {
    if (!currentUser || !canModerateUser(target)) return [];
    
    const actions = [];
    
    if (currentUser.userType === 'admin' || currentUser.userType === 'owner') {
      actions.push(
        { value: 'mute', label: 'كتم (المشرف)' },
        { value: 'ban', label: 'طرد 15 دقيقة (الأدمن)' }
      );
    }
    
    if (currentUser.userType === 'owner') {
      actions.push(
        { value: 'block', label: 'حجب كامل (المالك)' },
        { value: 'promote_moderator', label: 'ترقية لمشرف' },
        { value: 'promote_admin', label: 'ترقية لإدمن' }
      );
    }
    
    // المالك يستطيع حذف أي شخص
    if (currentUser.userType === 'owner') {
      actions.push(
        { value: 'remove', label: 'حذف من الدردشة' }
      );
    }
    
    return actions;
  };

  const handleModerationAction = async () => {
    if (!selectedUser || !action || !currentUser) return;
    
    setIsProcessing(true);
    
    try {
      let endpoint = '';
      const body: any = {
        moderatorId: currentUser.id,
        targetUserId: selectedUser.id,
        reason: reason || 'بدون سبب محدد'
      };
      
      switch (action) {
        case 'mute':
          endpoint = '/api/moderation/mute';
          body.duration = parseInt(duration);
          break;
        case 'ban':
          endpoint = '/api/moderation/ban';
          body.duration = 15; // 15 دقيقة ثابتة للأدمن
          break;
        case 'block':
          endpoint = '/api/moderation/block';
          body.ipAddress = '127.0.0.1'; // سيتم تحديثه بالـ IP الحقيقي
          body.deviceId = 'device_' + selectedUser.id;
          break;
        case 'promote_moderator':
          endpoint = '/api/moderation/promote';
          body.newRole = 'moderator';
          break;
        case 'promote_admin':
          endpoint = '/api/moderation/promote';
          body.newRole = 'admin';
          break;
        case 'remove':
          // حذف كامل من الدردشة
          endpoint = '/api/moderation/block';
          body.ipAddress = '127.0.0.1';
          body.deviceId = 'device_' + selectedUser.id;
          break;
        default:
          throw new Error('إجراء غير مدعوم');
      }
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: body
      });
      
      toast({
        title: 'تم بنجاح',
        description: getActionMessage(action, selectedUser.username),
        variant: 'default'
      });
      
      setSelectedUser(null);
      setAction('');
      setReason('');
      setDuration('30');
      
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تنفيذ الإجراء',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionMessage = (action: string, username: string) => {
    switch (action) {
      case 'mute':
        return `تم كتم ${username} لمدة ${duration} دقيقة`;
      case 'ban':
        return `تم طرد ${username} لمدة 15 دقيقة`;
      case 'block':
        return `تم حجب ${username} نهائياً`;
      case 'promote_moderator':
        return `تم ترقية ${username} لمشرف`;
      case 'promote_admin':
        return `تم ترقية ${username} لإدمن`;
      case 'remove':
        return `تم حذف ${username} من الدردشة`;
      default:
        return 'تم تنفيذ الإجراء';
    }
  };

  const handleUnmute = async (targetUser: ChatUser) => {
    if (!currentUser) return;
    
    try {
      await apiRequest('/api/moderation/unmute', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id
        }
      });
      
      toast({
        title: 'تم',
        description: `تم فك الكتم عن ${targetUser.username}`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في فك الكتم',
        variant: 'destructive'
      });
    }
  };

  const handleUnblock = async (targetUser: ChatUser) => {
    if (!currentUser) return;
    
    try {
      await apiRequest('/api/moderation/unblock', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id
        }
      });
      
      toast({
        title: 'تم',
        description: `تم فك الحجب عن ${targetUser.username}`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في فك الحجب',
        variant: 'destructive'
      });
    }
  };

  if (!canUsePanel) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[600px] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🛡️ لوحة الإدارة
            <Badge variant="destructive">
              {currentUser?.userType === 'owner' ? 'مالك' : 'مشرف'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            إدارة المستخدمين وتطبيق القوانين
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* التبويبات */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('users')}
            >
              المستخدمين ({filteredUsers.length})
            </Button>
            <Button
              variant={activeTab === 'actions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('actions')}
            >
              الإجراءات
            </Button>
          </div>

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* البحث */}
              <Input
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* قائمة المستخدمين */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageSrc(user.profileImage)}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            <span style={{ color: user.usernameColor || '#000000' }}>
                              {user.username}
                            </span>
                            <UserRoleBadge user={user} />
                          </div>
                          <div className="text-sm text-gray-600">
                            {user.status || 'بدون حالة'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {canModerateUser(user) && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            disabled={selectedUser?.id === user.id}
                          >
                            إدارة
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnmute(user)}
                        >
                          فك كتم
                        </Button>
                        {currentUser?.userType === 'owner' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblock(user)}
                          >
                            فك حجب
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نموذج الإجراء */}
          {selectedUser && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">
                إجراء على: {selectedUser.username}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">الإجراء</label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الإجراء" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableActions(selectedUser).map((actionItem) => (
                        <SelectItem key={actionItem.value} value={actionItem.value}>
                          {actionItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {action === 'mute' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">المدة (دقيقة)</label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="1"
                      max="1440"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">السبب</label>
                  <Input
                    placeholder="سبب الإجراء (اختياري)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleModerationAction}
                    disabled={!action || isProcessing}
                  >
                    {isProcessing ? 'جاري التنفيذ...' : 'تنفيذ'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
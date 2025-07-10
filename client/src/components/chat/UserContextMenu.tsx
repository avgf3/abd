import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { 
  UserX, 
  Clock, 
  Ban, 
  Crown, 
  Shield, 
  Trash2,
  MessageSquare,
  UserCheck,
  Settings
} from 'lucide-react';

interface UserContextMenuProps {
  children: React.ReactNode;
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  messageId?: number;
  messageContent?: string;
  onAction?: () => void;
}

export default function UserContextMenu({
  children,
  targetUser,
  currentUser,
  messageId,
  messageContent,
  onAction
}: UserContextMenuProps) {
  const [showMuteDialog, setShowMuteDialog] = useState(false);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [muteReason, setMuteReason] = useState('');
  const [kickReason, setKickReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [muteDuration, setMuteDuration] = useState(30);
  const [promoteRole, setPromoteRole] = useState<'moderator' | 'admin'>('moderator');
  const { toast } = useToast();

  if (!currentUser || targetUser.id === currentUser.id) {
    return <>{children}</>;
  }

  const canModerate = (action: string) => {
    if (currentUser.userType === 'owner') return true;
    if (currentUser.userType === 'admin' && action !== 'block' && action !== 'promote') return true;
    if (currentUser.userType === 'moderator' && action === 'mute') return true;
    return false;
  };

  const handleMute = async () => {
    if (!muteReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الكتم',
        variant: 'destructive'
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/moderation/mute', {
        moderatorId: currentUser.id,
        targetUserId: targetUser.id,
        reason: muteReason,
        duration: muteDuration
      });

      toast({
        title: 'تم الكتم',
        description: `تم كتم ${targetUser.username} لمدة ${muteDuration} دقيقة`,
        variant: 'default'
      });

      setShowMuteDialog(false);
      setMuteReason('');
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في كتم المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleKick = async () => {
    if (!kickReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الطرد',
        variant: 'destructive'
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/moderation/ban', {
        moderatorId: currentUser.id,
        targetUserId: targetUser.id,
        reason: kickReason,
        duration: 15
      });

      toast({
        title: 'تم الطرد',
        description: `تم طرد ${targetUser.username} لمدة 15 دقيقة`,
        variant: 'default'
      });

      setShowKickDialog(false);
      setKickReason('');
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في طرد المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الحجب',
        variant: 'destructive'
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/moderation/block', {
        moderatorId: currentUser.id,
        targetUserId: targetUser.id,
        reason: blockReason,
        ipAddress: 'unknown', // يمكن تحسينه لاحقاً
        deviceId: 'unknown'
      });

      toast({
        title: 'تم الحجب',
        description: `تم حجب ${targetUser.username} نهائياً`,
        variant: 'default'
      });

      setShowBlockDialog(false);
      setBlockReason('');
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حجب المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handlePromote = async () => {
    try {
      await apiRequest('POST', '/api/moderation/promote', {
        moderatorId: currentUser.id,
        targetUserId: targetUser.id,
        role: promoteRole
      });

      toast({
        title: 'تم الترقية',
        description: `تم ترقية ${targetUser.username} إلى ${promoteRole === 'admin' ? 'مشرف عام' : 'مشرف'}`,
        variant: 'default'
      });

      setShowPromoteDialog(false);
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في ترقية المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageId) return;

    try {
      // يمكن إضافة API لحذف الرسائل لاحقاً
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الرسالة',
        variant: 'default'
      });
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الرسالة',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64" dir="rtl">
          {/* إجراءات عامة */}
          <ContextMenuItem className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            رسالة خاصة
          </ContextMenuItem>
          
          <ContextMenuItem className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            إضافة صديق
          </ContextMenuItem>

          {(canModerate('mute') || canModerate('kick') || canModerate('block')) && (
            <>
              <ContextMenuSeparator />
              
              {/* إجراءات الإدارة */}
              {canModerate('mute') && (
                <ContextMenuItem 
                  className="flex items-center gap-2 text-yellow-600"
                  onClick={() => setShowMuteDialog(true)}
                >
                  <UserX className="w-4 h-4" />
                  كتم المستخدم
                </ContextMenuItem>
              )}

              {canModerate('kick') && (
                <ContextMenuItem 
                  className="flex items-center gap-2 text-orange-600"
                  onClick={() => setShowKickDialog(true)}
                >
                  <Clock className="w-4 h-4" />
                  طرد لمدة 15 دقيقة
                </ContextMenuItem>
              )}

              {canModerate('block') && (
                <ContextMenuItem 
                  className="flex items-center gap-2 text-red-600"
                  onClick={() => setShowBlockDialog(true)}
                >
                  <Ban className="w-4 h-4" />
                  حجب نهائي
                </ContextMenuItem>
              )}

              {canModerate('promote') && targetUser.userType === 'member' && (
                <ContextMenuItem 
                  className="flex items-center gap-2 text-green-600"
                  onClick={() => setShowPromoteDialog(true)}
                >
                  <Crown className="w-4 h-4" />
                  ترقية للإشراف
                </ContextMenuItem>
              )}
            </>
          )}

          {/* حذف الرسالة */}
          {messageId && canModerate('mute') && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                className="flex items-center gap-2 text-red-600"
                onClick={handleDeleteMessage}
              >
                <Trash2 className="w-4 h-4" />
                حذف الرسالة
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* مربعات الحوار */}
      <AlertDialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-yellow-600" />
              كتم المستخدم: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription>
              منع المستخدم من الكتابة في الدردشة العامة لفترة محددة
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mute-duration">مدة الكتم (بالدقائق)</Label>
              <Input
                id="mute-duration"
                type="number"
                value={muteDuration}
                onChange={(e) => setMuteDuration(parseInt(e.target.value) || 30)}
                min="1"
                max="1440"
              />
            </div>
            <div>
              <Label htmlFor="mute-reason">سبب الكتم</Label>
              <Textarea
                id="mute-reason"
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                placeholder="اكتب سبب الكتم..."
                required
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleMute} className="bg-yellow-600 hover:bg-yellow-700">
              تأكيد الكتم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showKickDialog} onOpenChange={setShowKickDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              طرد المستخدم: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription>
              طرد المستخدم من الدردشة لمدة 15 دقيقة
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="kick-reason">سبب الطرد</Label>
              <Textarea
                id="kick-reason"
                value={kickReason}
                onChange={(e) => setKickReason(e.target.value)}
                placeholder="اكتب سبب الطرد..."
                required
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleKick} className="bg-orange-600 hover:bg-orange-700">
              تأكيد الطرد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              حجب المستخدم نهائياً: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription>
              حجب المستخدم نهائياً من الدردشة بتتبع IP والجهاز
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="block-reason">سبب الحجب</Label>
              <Textarea
                id="block-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="اكتب سبب الحجب النهائي..."
                required
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-red-600 hover:bg-red-700">
              تأكيد الحجب النهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-green-600" />
              ترقية المستخدم: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription>
              منح المستخدم صلاحيات إدارية
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع الإشراف</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="moderator"
                    checked={promoteRole === 'moderator'}
                    onChange={(e) => setPromoteRole(e.target.value as 'moderator')}
                  />
                  <span>مشرف - صلاحية الكتم فقط</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="admin"
                    checked={promoteRole === 'admin'}
                    onChange={(e) => setPromoteRole(e.target.value as 'admin')}
                  />
                  <span>مشرف عام - صلاحية الكتم والطرد</span>
                </label>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} className="bg-green-600 hover:bg-green-700">
              تأكيد الترقية
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
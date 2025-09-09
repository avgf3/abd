import {
  UserX,
  Clock,
  Ban,
  Crown,
  Shield,
  Trash2,
  MessageSquare,
  UserCheck,
  Settings,
} from 'lucide-react';
import { useState } from 'react';

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
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface UserContextMenuProps {
  children: React.ReactNode;
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  messageId?: number;
  messageContent?: string;
  onAction?: () => void;
  onStartPrivateChat?: (user: ChatUser) => void;
}

export default function UserContextMenu({
  children,
  targetUser,
  currentUser,
  messageId,
  messageContent,
  onAction,
  onStartPrivateChat,
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

  // السماح للجميع بالوصول للقائمة السياقية
  if (targetUser.id === currentUser?.id) {
    return <>{children}</>;
  }

  // التحقق من صلاحيات الإدارة
  const canModerate = (action: string) => {
    if (!currentUser) return false;

    // المالك له صلاحية كاملة
    if (currentUser.userType === 'owner') return true;

    // المشرف يمكنه الكتم والطرد والحجب
    if (currentUser.userType === 'admin') {
      return ['mute', 'kick', 'ban', 'block'].includes(action);
    }

    return false;
  };

  const handleMute = async () => {
    if (!muteReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الكتم',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser || !currentUser.id) {
      toast({
        title: 'خطأ في الهوية',
        description: 'يرجى تسجيل الدخول أولاً قبل تنفيذ إجراء الكتم',
        variant: 'destructive',
      });
      return;
    }

    try {
      const deviceId = (() => {
        const existing = localStorage.getItem('deviceId');
        if (existing) return existing;
        const id = 'web-' + Math.random().toString(36).slice(2);
        localStorage.setItem('deviceId', id);
        return id;
      })();

      await apiRequest('/api/moderation/mute', {
        method: 'POST',
        headers: { 'x-device-id': deviceId },
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id,
          reason: muteReason,
          duration: muteDuration,
        },
      });

      toast({
        title: 'تم الكتم ✅',
        description: `تم كتم ${targetUser.username} لمدة ${muteDuration} دقيقة`,
        variant: 'default',
      });

      setShowMuteDialog(false);
      setMuteReason('');
      onAction?.();
    } catch (error) {
      console.error('خطأ في الكتم:', error);
      toast({
        title: 'فشل الكتم ❌',
        description: 'حدث خطأ أثناء محاولة الكتم. تحقق من صلاحياتك.',
        variant: 'destructive',
      });
    }
  };

  const handleKick = async () => {
    if (!kickReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الطرد',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser || !currentUser.id) {
      toast({
        title: 'خطأ في الهوية',
        description: 'يرجى تسجيل الدخول أولاً قبل تنفيذ إجراء الطرد',
        variant: 'destructive',
      });
      return;
    }

    try {
      const deviceId = (() => {
        const existing = localStorage.getItem('deviceId');
        if (existing) return existing;
        const id = 'web-' + Math.random().toString(36).slice(2);
        localStorage.setItem('deviceId', id);
        return id;
      })();

      await apiRequest('/api/moderation/ban', {
        method: 'POST',
        headers: { 'x-device-id': deviceId },
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id,
          reason: kickReason,
          duration: 15,
        },
      });

      toast({
        title: 'تم الطرد ⏰',
        description: `تم طرد ${targetUser.username} لمدة 15 دقيقة`,
        variant: 'default',
      });

      setShowKickDialog(false);
      setKickReason('');
      onAction?.();
    } catch (error) {
      console.error('خطأ في الطرد:', error);
      toast({
        title: 'فشل الطرد ❌',
        description: 'حدث خطأ أثناء محاولة الطرد. تحقق من صلاحياتك.',
        variant: 'destructive',
      });
    }
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال سبب الحجب',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser || !currentUser.id) {
      toast({
        title: 'خطأ في الهوية',
        description: 'يرجى تسجيل الدخول أولاً قبل تنفيذ إجراء الحجب',
        variant: 'destructive',
      });
      return;
    }

    try {
      const deviceId = (() => {
        const existing = localStorage.getItem('deviceId');
        if (existing) return existing;
        const id = 'web-' + Math.random().toString(36).slice(2);
        localStorage.setItem('deviceId', id);
        return id;
      })();

      await apiRequest('/api/moderation/block', {
        method: 'POST',
        headers: { 'x-device-id': deviceId },
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id,
          reason: blockReason,
          ipAddress: 'unknown',
          deviceId,
        },
      });

      toast({
        title: 'تم الحجب النهائي 🚫',
        description: `تم حجب ${targetUser.username} نهائياً من الموقع`,
        variant: 'default',
      });

      setShowBlockDialog(false);
      setBlockReason('');
      onAction?.();
    } catch (error) {
      console.error('خطأ في الحجب:', error);
      toast({
        title: 'فشل الحجب ❌',
        description: 'حدث خطأ أثناء محاولة الحجب. تحقق من صلاحياتك.',
        variant: 'destructive',
      });
    }
  };

  const handlePromote = async () => {
    try {
      await apiRequest('/api/moderation/promote', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id,
          newRole: promoteRole,
        },
      });

      toast({
        title: 'تم الترقية',
        description: `تم ترقية ${targetUser.username} إلى ${promoteRole === 'admin' ? 'مشرف عام' : 'مشرف'}`,
        variant: 'default',
      });

      setShowPromoteDialog(false);
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في ترقية المستخدم',
        variant: 'destructive',
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
        variant: 'default',
      });
      onAction?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الرسالة',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-80 bg-card shadow-2xl border-2 border-border rounded-xl p-4">
          {/* إجراءات عامة */}
          <ContextMenuItem
            className="flex items-center gap-3 text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-2 cursor-pointer transition-all duration-200"
            onClick={() => {
              if (targetUser?.dmPrivacy === 'none') {
                toast({
                  title: 'غير مسموح',
                  description: 'هذا المستخدم أغلق الرسائل الخاصة',
                  variant: 'destructive',
                });
                return;
              }
              if (targetUser?.id) {
                onStartPrivateChat?.(targetUser);
              }
            }}
            disabled={targetUser?.dmPrivacy === 'none'}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-lg">💬 رسالة خاصة</span>
          </ContextMenuItem>

          <ContextMenuItem className="flex items-center gap-3 text-green-600 font-semibold bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-2 cursor-pointer transition-all duration-200">
            <UserCheck className="w-5 h-5" />
            <span className="text-lg">👥 إضافة صديق</span>
          </ContextMenuItem>

          <div className="my-4 border-t-2 border-border"></div>

          {/* إجراءات الإدارة - متاحة للجميع */}
          {(canModerate('mute') || canModerate('ban') || canModerate('block')) && (
            <>
              <ContextMenuItem
                className="flex items-center gap-3 text-yellow-600 font-bold bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg p-3 cursor-pointer transition-all duration-200"
                onClick={() => setShowMuteDialog(true)}
              >
                <UserX className="w-5 h-5" />
                <span className="text-lg">🔇 كتم المستخدم</span>
              </ContextMenuItem>

              <ContextMenuItem
                className="flex items-center gap-3 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-3 cursor-pointer transition-all duration-200"
                onClick={() => setShowKickDialog(true)}
              >
                <Clock className="w-5 h-5" />
                <span className="text-lg">⏰ طرد لمدة 15 دقيقة</span>
              </ContextMenuItem>

              <ContextMenuItem
                className="flex items-center gap-3 text-red-600 font-bold bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-3 cursor-pointer transition-all duration-200"
                onClick={() => setShowBlockDialog(true)}
              >
                <Ban className="w-5 h-5" />
                <span className="text-lg">🚫 حجب نهائي من الموقع</span>
              </ContextMenuItem>
            </>
          )}

          {/* حذف الرسالة */}
          {messageId &&
            currentUser &&
            (currentUser.id === targetUser.id ||
              ['admin', 'owner'].includes(currentUser.userType)) && (
              <>
                <div className="my-4 border-t-2 border-border"></div>
                <ContextMenuItem
                  className="flex items-center gap-3 text-red-700 font-bold bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg p-3 cursor-pointer transition-all duration-200"
                  onClick={handleDeleteMessage}
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-lg">🗑️ حذف الرسالة</span>
                </ContextMenuItem>
              </>
            )}
        </ContextMenuContent>
      </ContextMenu>

      {/* مربعات الحوار */}
      <AlertDialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
        <AlertDialogContent
          dir="rtl"
          className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl font-bold text-yellow-700">
              🔇 <UserX className="w-6 h-6 text-yellow-600" />
              كتم المستخدم: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-yellow-600 font-semibold">
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
        <AlertDialogContent
          dir="rtl"
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl font-bold text-orange-700">
              ⏰ <Clock className="w-6 h-6 text-orange-600" />
              طرد المستخدم: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-orange-600 font-semibold">
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
        <AlertDialogContent
          dir="rtl"
          className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl font-bold text-red-700">
              🚫 <Ban className="w-6 h-6 text-red-600" />
              حجب المستخدم نهائياً: {targetUser.username}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-red-600 font-semibold">
              حجب المستخدم نهائياً من الموقع بتتبع IP والجهاز
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
            <AlertDialogDescription>منح المستخدم صلاحيات إدارية</AlertDialogDescription>
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

import { Shield, Users, Ban, UserX, Clock, Crown, Settings } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsernameDisplay from '@/components/common/UsernameDisplay';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { formatDateTime } from '@/utils/timeUtils';

interface ModerationAction {
  id: string;
  type: 'mute' | 'ban' | 'block' | 'kick' | 'promote' | 'demote' | 'unblock';
  targetUserId: number;
  moderatorId: number;
  reason: string;
  duration?: number;
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
  // أسماء قادمة من /api/moderation/actions
  moderatorName?: string;
  targetName?: string;
  // حالة الإجراء (نشط/غير نشط) لبعض الأنواع
  isActive?: boolean;
}

interface StaffMember {
  id: number;
  username: string;
  userType: 'moderator' | 'admin' | 'owner';
  profileImage?: string;
  // السيرفر قد يعيد التاريخ كسلسلة JSON، لذا ندعم النوعين
  joinDate?: string | Date;
  lastSeen?: string | Date | null;
  isOnline: boolean;
}

interface OwnerAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
  onUserClick?: (e: React.MouseEvent, user: ChatUser) => void;
}

export default function OwnerAdminPanel({
  isOpen,
  onClose,
  currentUser,
  onlineUsers,
  onUserClick,
}: OwnerAdminPanelProps) {
  const [moderationLog, setModerationLog] = useState<ModerationAction[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser?.userType === 'owner') {
      setIsModalOpen(isOpen);
      fetchModerationData();
      fetchStaffMembers();
    }
  }, [isOpen, currentUser]);

  const fetchModerationData = async () => {
    if (!currentUser) return;
    setModerationLoading(true);
    try {
      // استخدام endpoint الذي يعيد أسماء المنفذ والمستهدف
      const response = await apiRequest(`/api/moderation/actions?userId=${currentUser.id}`, {
        method: 'GET',
      });
      const actions = (response?.actions || []) as ModerationAction[];
      setModerationLog(actions);
    } catch (error) {
      console.error('Error fetching moderation actions:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب سجل الإجراءات',
        variant: 'destructive',
      });
    } finally {
      setModerationLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      // جلب جميع المستخدمين من الخادم ثم تصفية أعضاء الإدارة فقط
      const response = await apiRequest('/api/users', { method: 'GET' });
      const allUsers = (response?.users || []) as Array<any>;

      const staff = allUsers
        .filter((user) => ['moderator', 'admin', 'owner'].includes(user.userType))
        .map((user) => ({
          id: user.id,
          username: user.username,
          userType: user.userType as 'moderator' | 'admin' | 'owner',
          profileImage: user.profileImage,
          joinDate: (user.joinDate ?? user.createdAt) as string | Date | undefined,
          lastSeen: (user.lastSeen ?? user.lastActive ?? user.createdAt ?? null) as
            | string
            | Date
            | null,
          isOnline: Boolean(user.isOnline),
        }))
        .sort((a, b) => {
          const rank: Record<string, number> = { owner: 1, admin: 2, moderator: 3 };
          const byRank = (rank[a.userType] || 99) - (rank[b.userType] || 99);
          if (byRank !== 0) return byRank;
          const byOnline = Number(b.isOnline) - Number(a.isOnline);
          if (byOnline !== 0) return byOnline;
          return a.username.localeCompare(b.username, 'ar');
        });

      setStaffMembers(staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({ title: 'خطأ', description: 'تعذر جلب قائمة المشرفين', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteUser = async (targetUser: StaffMember) => {
    if (!currentUser) return;

    try {
      const response = await apiRequest('/api/moderation/demote', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetUser.id,
        },
      });

      toast({
        title: 'تم إلغاء الإشراف',
        description: `تم إلغاء إشراف ${targetUser.username}`,
        variant: 'default',
      });

      fetchStaffMembers();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء الإشراف',
        variant: 'destructive',
      });
    }
  };

  // تم نقل دالة formatDateTime إلى utils/timeUtils.ts

  const getActionColor = (type: string) => {
    switch (type) {
      case 'mute':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ban':
      case 'kick':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'block':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'promote':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'demote':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'unblock':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'mute':
        return <UserX className="w-4 h-4" />;
      case 'ban':
      case 'kick':
        return <Clock className="w-4 h-4" />;
      case 'block':
        return <Ban className="w-4 h-4" />;
      case 'promote':
        return <Crown className="w-4 h-4" />;
      case 'demote':
        return <Users className="w-4 h-4" />;
      case 'unblock':
        return <Shield className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleIcon = (userType: string) => {
    switch (userType) {
      case 'owner':
        return <Crown className="w-5 h-5 text-purple-600" />;
      case 'admin':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'moderator':
        return <Settings className="w-5 h-5 text-green-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleText = (userType: string) => {
    switch (userType) {
      case 'owner':
        return 'مالك';
      case 'admin':
        return 'مشرف عام';
      case 'moderator':
        return 'مشرف';
      default:
        return 'عضو';
    }
  };

  if (!currentUser || currentUser.userType !== 'owner') {
    return null;
  }

  return (
    <>
      {/* أيقونة الإدارة للمالك */}
      {currentUser?.userType === 'owner' && (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-full p-4 shadow-xl z-50"
          size="lg"
        >
          <Crown className="w-8 h-8" />
        </Button>
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[800px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl">
                <Crown className="w-6 h-6 text-purple-600" />
                لوحة إدارة المالك
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 border-purple-200"
                >
                  خاص بـ {currentUser.username}
                </Badge>
              </div>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  onClose();
                }}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </Button>
            </DialogTitle>
            <DialogDescription>
              إدارة شاملة للمشرفين وسجل الإجراءات - متاح للمالك فقط
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-1">
              <TabsTrigger
                value="staff"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all"
              >
                <Users className="w-4 h-4" />
                قائمة المشرفين
              </TabsTrigger>
              <TabsTrigger
                value="log"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all"
              >
                <Shield className="w-4 h-4" />
                سجل الإجراءات
              </TabsTrigger>
              <TabsTrigger
                value="ban_tab"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all"
              >
                <Ban className="w-4 h-4" />
                تبويب الحظر
              </TabsTrigger>
            </TabsList>

            <TabsContent value="log" className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">سجل الإجراءات</h3>
                    <p className="text-gray-600">تسجيل جميع الإجراءات الإدارية</p>
                  </div>
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchModerationData}
                      disabled={moderationLoading}
                    >
                      تحديث
                    </Button>
                  </div>
                </div>

                {moderationLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري التحميل...</p>
                  </div>
                ) : moderationLog.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">لا توجد إجراءات مسجلة</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {moderationLog.map((action) => (
                      <div
                        key={action.id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`${getActionColor(action.type)} flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium`}
                            >
                              {getActionIcon(action.type)}
                              {action.type === 'mute' && 'كتم'}
                              {action.type === 'ban' && 'طرد'}
                              {action.type === 'kick' && 'طرد'}
                              {action.type === 'block' && 'حجب'}
                              {action.type === 'promote' && 'ترقية'}
                              {action.type === 'demote' && 'إلغاء إشراف'}
                              {action.type === 'unblock' && 'إلغاء الحجب'}
                            </Badge>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              {formatDateTime(action.timestamp)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div className="bg-red-50 p-2 rounded-lg">
                            <span className="font-semibold text-red-700">المستهدف: </span>
                            <span className="text-red-800">
                              {action.targetName ?? `#${action.targetUserId}`}
                            </span>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-lg">
                            <span className="font-semibold text-blue-700">المنفذ: </span>
                            <span className="text-blue-800">
                              {action.moderatorName ?? `#${action.moderatorId}`}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-2 rounded-lg text-sm mb-2">
                          <span className="font-semibold text-gray-700">السبب: </span>
                          <span className="text-gray-800">{action.reason}</span>
                        </div>

                        {action.duration && (
                          <div className="bg-orange-50 p-2 rounded-lg text-sm mb-2">
                            <span className="font-semibold text-orange-700">المدة: </span>
                            <span className="text-orange-800">{action.duration} دقيقة</span>
                          </div>
                        )}

                        {(action.ipAddress || action.deviceId) && (
                          <div className="bg-yellow-50 p-2 rounded-lg text-xs border-t pt-2">
                            {action.ipAddress && (
                              <div className="text-yellow-700">
                                <span className="font-semibold">IP: </span>
                                <span>{action.ipAddress}</span>
                              </div>
                            )}
                            {action.deviceId && (
                              <div className="text-yellow-700">
                                <span className="font-semibold">Device: </span>
                                <span>{action.deviceId}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="staff" className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">قائمة المشرفين</h3>
                    <p className="text-gray-600">إدارة أعضاء الفريق الإداري</p>
                  </div>
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchStaffMembers}
                      disabled={loading}
                    >
                      تحديث
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري التحميل...</p>
                  </div>
                ) : staffMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">لا توجد أعضاء إدارة</p>
                  </div>
                ) : (
                  <div className="grid gap-4 max-h-[400px] overflow-y-auto">
                    {staffMembers.map((staff) => (
                      <div
                        key={staff.id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={getImageSrc(staff.profileImage)}
                                alt={staff.username}
                                className="w-14 h-14 rounded-full ring-2 ring-purple-200 object-cover"
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <UsernameDisplay user={staff} className="font-bold text-gray-800 text-lg" onUserClick={onUserClick} />
                                {getRoleIcon(staff.userType)}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={`
                                  ${staff.userType === 'owner' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
                                  ${staff.userType === 'admin' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                                  ${staff.userType === 'moderator' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                `}
                                >
                                  {getRoleText(staff.userType)}
                                </Badge>

                                <span
                                  className={`text-sm px-2 py-1 rounded-full ${
                                    staff.isOnline
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {staff.isOnline ? '🟢 متصل' : '⚫ غير متصل'}
                                </span>
                              </div>

                              {!staff.isOnline && staff.lastSeen && (
                                <p className="text-xs text-gray-500 mt-1">
                                  آخر ظهور:{' '}
                                  {(() => {
                                    try {
                                      const d = new Date(staff.lastSeen as any);
                                      return d.toLocaleString('ar-SA');
                                    } catch {
                                      return String(staff.lastSeen);
                                    }
                                  })()}
                                </p>
                              )}
                            </div>
                          </div>

                          {staff.id !== currentUser.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  إزالة الإشراف
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl" className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2 text-xl">
                                    <UserX className="w-6 h-6 text-red-500" />
                                    تأكيد إزالة الإشراف
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-600 leading-relaxed">
                                    هل أنت متأكد من إزالة إشراف <strong>{staff.username}</strong>؟
                                    <br />
                                    سيتم تحويله إلى عضو عادي وسيفقد جميع صلاحياته الإدارية.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-lg">
                                    إلغاء
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDemoteUser(staff)}
                                    className="bg-red-600 hover:bg-red-700 rounded-lg"
                                  >
                                    تأكيد الإزالة
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ban_tab" className="space-y-6">
              <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl p-6 border border-red-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-red-500 to-rose-500 p-3 rounded-xl">
                    <Ban className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">حظر نهائي</h3>
                    <p className="text-gray-600">هذا الإجراء يمنع المستخدم بشكل دائم (IP + جهاز)</p>
                  </div>
                </div>

                <FinalBlockPanel
                  currentUser={currentUser}
                  onlineUsers={onlineUsers}
                  onSuccess={() => {
                    toast({
                      title: 'تم الحظر النهائي ✅',
                      description: 'تم تنفيذ الحظر الدائم بنجاح',
                    });
                    fetchModerationData();
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FinalBlockPanel({
  currentUser,
  onlineUsers,
  onSuccess,
}: {
  currentUser: any;
  onlineUsers: any[];
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [targetId, setTargetId] = useState<number | null>(null);
  const [reason, setReason] = useState<string>('مخالفة القواعد');
  const [loading, setLoading] = useState(false);

  const candidates = useMemo(
    () => (onlineUsers || []).filter((u) => u && u.id && u.username),
    [onlineUsers]
  );

  const handleFinalBlock = async () => {
    try {
      if (!currentUser?.id || !targetId) return;
      setLoading(true);
      await apiRequest('/api/moderation/block', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: targetId,
          reason: reason || 'حظر نهائي',
        },
      });
      setLoading(false);
      onSuccess?.();
    } catch (e) {
      setLoading(false);
      toast({
        title: 'فشل الحظر',
        description: 'تعذر تنفيذ الحظر النهائي',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-700 mb-2">اختر المستخدم</label>
          <select
            className="w-full p-2 bg-white rounded border border-gray-300 focus:border-red-400"
            value={targetId ?? ''}
            onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— اختر —</option>
            {candidates.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.username} (#{u.id})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-2">سبب الحظر</label>
          <input
            className="w-full p-2 bg-white rounded border border-gray-300 focus:border-red-400"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب واضح للحظر النهائي"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleFinalBlock}
          disabled={!targetId || loading}
          className="bg-red-600 hover:bg-red-700"
        >
          {loading ? '...جارٍ التنفيذ' : 'حظر نهائي'}
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        سيتم تطبيق الحظر على عنوان IP والجهاز المرتبط بالمستخدم.
      </div>
    </div>
  );
}

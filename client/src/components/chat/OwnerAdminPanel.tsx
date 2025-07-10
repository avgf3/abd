import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { Shield, Users, Ban, UserX, Clock, Crown, Settings } from 'lucide-react';

interface ModerationAction {
  id: string;
  type: 'mute' | 'ban' | 'block' | 'kick' | 'promote' | 'demote';
  targetUserId: number;
  targetUsername: string;
  moderatorId: number;
  moderatorUsername: string;
  reason: string;
  duration?: number;
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
}

interface StaffMember {
  id: number;
  username: string;
  userType: 'moderator' | 'admin' | 'owner';
  profileImage?: string;
  joinDate?: Date;
  lastSeen?: Date;
  isOnline: boolean;
}

interface OwnerAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
}

export default function OwnerAdminPanel({ 
  isOpen, 
  onClose, 
  currentUser,
  onlineUsers 
}: OwnerAdminPanelProps) {
  const [moderationLog, setModerationLog] = useState<ModerationAction[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('log');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser?.userType === 'owner') {
      fetchModerationData();
      fetchStaffMembers();
    }
  }, [isOpen, currentUser]);

  const fetchModerationData = async () => {
    if (!currentUser) return;
    
    try {
      const response = await apiRequest('GET', `/api/moderation/log?userId=${currentUser.id}`);
      setModerationLog(response.log || []);
    } catch (error) {
      console.error('Error fetching moderation log:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب سجل الإدارة',
        variant: 'destructive'
      });
    }
  };

  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      // جلب جميع المستخدمين وتصفية الإداريين
      const allUsers = onlineUsers.concat(
        // يمكن إضافة مستخدمين آخرين من قاعدة البيانات
      );
      
      const staff = allUsers.filter(user => 
        user.userType === 'moderator' || 
        user.userType === 'admin' || 
        user.userType === 'owner'
      );
      
      setStaffMembers(staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteUser = async (targetUser: StaffMember) => {
    if (!currentUser) return;
    
    try {
      await apiRequest('POST', '/api/moderation/promote', {
        moderatorId: currentUser.id,
        targetUserId: targetUser.id,
        role: 'member'
      });
      
      toast({
        title: 'تم إلغاء الإشراف',
        description: `تم إلغاء إشراف ${targetUser.username}`,
        variant: 'default'
      });
      
      fetchStaffMembers();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء الإشراف',
        variant: 'destructive'
      });
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'mute': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ban': case 'kick': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'block': return 'bg-red-100 text-red-800 border-red-200';
      case 'promote': return 'bg-green-100 text-green-800 border-green-200';
      case 'demote': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'mute': return <UserX className="w-4 h-4" />;
      case 'ban': case 'kick': return <Clock className="w-4 h-4" />;
      case 'block': return <Ban className="w-4 h-4" />;
      case 'promote': return <Crown className="w-4 h-4" />;
      case 'demote': return <Users className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleIcon = (userType: string) => {
    switch (userType) {
      case 'owner': return <Crown className="w-5 h-5 text-purple-600" />;
      case 'admin': return <Shield className="w-5 h-5 text-blue-600" />;
      case 'moderator': return <Settings className="w-5 h-5 text-green-600" />;
      default: return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleText = (userType: string) => {
    switch (userType) {
      case 'owner': return 'مالك';
      case 'admin': return 'مشرف عام';
      case 'moderator': return 'مشرف';
      default: return 'عضو';
    }
  };

  if (!currentUser || currentUser.userType !== 'owner') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[800px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Crown className="w-6 h-6 text-purple-600" />
            لوحة إدارة المالك
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
              خاص بـ {currentUser.username}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            إدارة شاملة للمشرفين وسجل الإجراءات - متاح للمالك فقط
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="log" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              سجل الإجراءات
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              إدارة المشرفين
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  سجل الإجراءات الإدارية
                </CardTitle>
                <CardDescription>
                  جميع الإجراءات التي تم تنفيذها من قبل المشرفين والإداريين
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {moderationLog.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد إجراءات إدارية مسجلة
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {moderationLog.map((action) => (
                        <div key={action.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge className={`${getActionColor(action.type)} flex items-center gap-1`}>
                                {getActionIcon(action.type)}
                                {action.type === 'mute' && 'كتم'}
                                {action.type === 'ban' && 'طرد'}
                                {action.type === 'kick' && 'طرد'}
                                {action.type === 'block' && 'حجب'}
                                {action.type === 'promote' && 'ترقية'}
                                {action.type === 'demote' && 'إلغاء إشراف'}
                              </Badge>
                              <div className="text-sm text-gray-600">
                                {formatDateTime(action.timestamp)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-semibold">المستهدف: </span>
                              {action.targetUsername}
                            </div>
                            <div>
                              <span className="font-semibold">المنفذ: </span>
                              {action.moderatorUsername}
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm">
                            <span className="font-semibold">السبب: </span>
                            {action.reason}
                          </div>
                          
                          {action.duration && (
                            <div className="mt-2 text-sm">
                              <span className="font-semibold">المدة: </span>
                              {action.duration} دقيقة
                            </div>
                          )}
                          
                          {(action.ipAddress || action.deviceId) && (
                            <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                              {action.ipAddress && <div>IP: {action.ipAddress}</div>}
                              {action.deviceId && <div>Device: {action.deviceId}</div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  إدارة المشرفين والإداريين
                </CardTitle>
                <CardDescription>
                  عرض وإدارة جميع أعضاء الإدارة - إلغاء الإشراف متاح للمالك فقط
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    </div>
                  ) : staffMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد أعضاء إدارة
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {staffMembers.map((staff) => (
                        <div key={staff.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={staff.profileImage || '/default_avatar.svg'}
                                alt={staff.username}
                                className="w-12 h-12 rounded-full"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{staff.username}</span>
                                  {getRoleIcon(staff.userType)}
                                  <Badge variant="outline">
                                    {getRoleText(staff.userType)}
                                  </Badge>
                                  {staff.isOnline && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {staff.isOnline ? 'متصل الآن' : 
                                   staff.lastSeen ? `آخر ظهور: ${new Date(staff.lastSeen).toLocaleDateString('ar-SA')}` : 
                                   'غير متصل'}
                                </div>
                              </div>
                            </div>
                            
                            {staff.id !== currentUser.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    إلغاء الإشراف
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>تأكيد إلغاء الإشراف</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من إلغاء إشراف {staff.username}؟ 
                                      سيتم تحويله إلى عضو عادي وسيفقد جميع صلاحياته الإدارية.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDemoteUser(staff)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      تأكيد الإلغاء
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
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
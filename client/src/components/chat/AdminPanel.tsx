import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProfileImage from './ProfileImage';
import type { ChatUser } from '@/types/chat';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
}

interface ModerationAction {
  id: string;
  type: 'mute' | 'ban' | 'kick' | 'block' | 'promote' | 'demote';
  targetUserId: number;
  targetUsername: string;
  moderatorId: number;
  moderatorUsername: string;
  reason: string;
  duration?: number;
  timestamp: number;
  isActive: boolean;
}

interface UserRole {
  id: number;
  username: string;
  userType: 'guest' | 'member' | 'moderator' | 'admin' | 'owner';
  profileImage?: string;
  isOnline: boolean;
  isMuted: boolean;
  isBanned: boolean;
  isBlocked: boolean;
}

export default function AdminPanel({ 
  isOpen, 
  onClose, 
  currentUser,
  onlineUsers 
}: AdminPanelProps) {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const isOwner = currentUser?.userType === 'owner';
  const isAdmin = currentUser?.userType === 'admin' || isOwner;
  const isModerator = currentUser?.userType === 'moderator' || isAdmin;

  useEffect(() => {
    if (isOpen && currentUser && (isOwner || isAdmin)) {
      fetchUsers();
      fetchModerationActions();
    }
  }, [isOpen, currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await apiRequest('/api/admin/users');
      if (response && Array.isArray(response.users)) {
        const usersWithStatus = response.users.map((user: any) => ({
          ...user,
          isOnline: onlineUsers.some(u => u.id === user.id)
        }));
        setUsers(usersWithStatus);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchModerationActions = async () => {
    try {
      const response = await apiRequest('/api/admin/actions');
      if (response && Array.isArray(response.actions)) {
        setActions(response.actions);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  const handleModerationAction = async (user: UserRole, action: string) => {
    if (!currentUser || !reason.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال سبب الإجراء",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        targetUserId: user.id,
        moderatorId: currentUser.id,
        reason: reason.trim(),
        ...(action === 'mute' || action === 'kick' ? { duration } : {})
      };

      await apiRequest(`/api/admin/${action}`, 'POST', payload);
      
      toast({
        title: "تم بنجاح",
        description: `تم ${getActionName(action)} ${user.username}`,
        variant: "default"
      });

      // Reset form
      setSelectedUser(null);
      setActionType('');
      setReason('');
      setDuration(30);
      
      // Refresh data
      fetchUsers();
      fetchModerationActions();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تنفيذ الإجراء",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (user: UserRole, newRole: string) => {
    if (!currentUser || !isOwner) return;

    setLoading(true);
    try {
      await apiRequest('/api/admin/promote', 'POST', {
        targetUserId: user.id,
        moderatorId: currentUser.id,
        newRole,
        reason: `ترقية إلى ${getRoleName(newRole)}`
      });

      toast({
        title: "تم بنجاح",
        description: `تم ترقية ${user.username} إلى ${getRoleName(newRole)}`,
        variant: "default"
      });

      fetchUsers();
      fetchModerationActions();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في الترقية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnmute = async (userId: number) => {
    if (!currentUser) return;

    try {
      await apiRequest('/api/admin/unmute', 'POST', {
        targetUserId: userId,
        moderatorId: currentUser.id
      });

      toast({
        title: "تم بنجاح",
        description: "تم إلغاء الكتم",
        variant: "default"
      });

      fetchUsers();
      fetchModerationActions();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إلغاء الكتم",
        variant: "destructive"
      });
    }
  };

  const getActionName = (action: string) => {
    const names: Record<string, string> = {
      mute: 'كتم',
      ban: 'حظر',
      kick: 'طرد',
      block: 'حجب',
      promote: 'ترقية',
      demote: 'خفض رتبة'
    };
    return names[action] || action;
  };

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      guest: 'ضيف',
      member: 'عضو',
      moderator: 'مشرف',
      admin: 'مدير',
      owner: 'مالك'
    };
    return names[role] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      owner: '👑',
      admin: '⭐',
      moderator: '🛡️',
      member: '🔵',
      guest: '👤'
    };
    return icons[role] || '👤';
  };

  const canModerate = (targetUser: UserRole) => {
    if (!currentUser) return false;
    if (targetUser.id === currentUser.id) return false;
    
    const hierarchy = ['guest', 'member', 'moderator', 'admin', 'owner'];
    const currentLevel = hierarchy.indexOf(currentUser.userType);
    const targetLevel = hierarchy.indexOf(targetUser.userType);
    
    return currentLevel > targetLevel;
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser || (!isOwner && !isAdmin)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>غير مصرح</DialogTitle>
            <DialogDescription>
              ليس لديك صلاحية للوصول إلى لوحة الإدارة
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚙️ لوحة الإدارة
            <Badge variant="outline">{getRoleIcon(currentUser.userType)} {getRoleName(currentUser.userType)}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">👥 إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="actions">📋 سجل الإجراءات</TabsTrigger>
            <TabsTrigger value="moderation">🛡️ الإشراف السريع</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="🔍 البحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchUsers} variant="outline">تحديث</Button>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ProfileImage
                      src={user.profileImage}
                      alt={user.username}
                      size="sm"
                      isOnline={user.isOnline}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <Badge variant="outline">
                          {getRoleIcon(user.userType)} {getRoleName(user.userType)}
                        </Badge>
                        {user.isOnline && <Badge variant="default">متصل</Badge>}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {user.isMuted && <Badge variant="destructive">مكتوم</Badge>}
                        {user.isBanned && <Badge variant="destructive">محظور</Badge>}
                        {user.isBlocked && <Badge variant="secondary">محجوب</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.isMuted && canModerate(user) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnmute(user.id)}
                      >
                        إلغاء الكتم
                      </Button>
                    )}
                    
                    {canModerate(user) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        إجراءات
                      </Button>
                    )}

                    {isOwner && user.userType !== 'owner' && (
                      <Select onValueChange={(value) => handlePromoteUser(user, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="ترقية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moderator">🛡️ مشرف</SelectItem>
                          <SelectItem value="admin">⭐ مدير</SelectItem>
                          <SelectItem value="member">🔵 عضو</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">سجل الإجراءات الأخيرة</h3>
              <Button onClick={fetchModerationActions} variant="outline">تحديث</Button>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {actions.map((action) => (
                <div key={action.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={action.isActive ? "destructive" : "secondary"}>
                          {getActionName(action.type)}
                        </Badge>
                        <span className="font-medium">{action.targetUsername}</span>
                        <span className="text-sm text-gray-600">
                          بواسطة {action.moderatorUsername}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">السبب: {action.reason}</p>
                      {action.duration && (
                        <p className="text-sm text-gray-600">المدة: {action.duration} دقيقة</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(action.timestamp).toLocaleString('ar')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-4">
            <h3 className="text-lg font-semibold">الإشراف السريع</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">المستخدمون المكتومون</h4>
                {users.filter(u => u.isMuted).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{user.username}</span>
                    <Button size="sm" onClick={() => handleUnmute(user.id)}>
                      إلغاء الكتم
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">المستخدمون المحظورون</h4>
                {users.filter(u => u.isBanned || u.isBlocked).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{user.username}</span>
                    <Badge variant="destructive">
                      {user.isBanned ? 'محظور' : 'محجوب'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal للإجراءات */}
        {selectedUser && (
          <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إجراءات إدارية - {selectedUser.username}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الإجراء" />
                  </SelectTrigger>
                  <SelectContent>
                    {isModerator && <SelectItem value="mute">🔇 كتم</SelectItem>}
                    {isAdmin && <SelectItem value="kick">👋 طرد مؤقت</SelectItem>}
                    {isAdmin && <SelectItem value="ban">🚫 حظر دائم</SelectItem>}
                    {isAdmin && <SelectItem value="block">🔒 حجب</SelectItem>}
                  </SelectContent>
                </Select>

                {(actionType === 'mute' || actionType === 'kick') && (
                  <div>
                    <label className="text-sm font-medium">المدة (بالدقائق)</label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                      min="1"
                      max="10080"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">سبب الإجراء *</label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="أدخل سبب الإجراء..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleModerationAction(selectedUser, actionType)}
                    disabled={!actionType || !reason.trim() || loading}
                    className="flex-1"
                  >
                    {loading ? 'جاري التنفيذ...' : 'تنفيذ الإجراء'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
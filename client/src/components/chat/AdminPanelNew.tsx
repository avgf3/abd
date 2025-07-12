import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onlineUsers: ChatUser[];
}

interface ModerationStats {
  totalUsers: number;
  onlineUsers: number;
  mutedUsers: number;
  bannedUsers: number;
  blockedUsers: number;
  adminUsers: number;
  moderatorUsers: number;
}

interface UserWithStatus extends ChatUser {
  isMuted?: boolean;
  isBanned?: boolean;
  isBlocked?: boolean;
  muteExpiry?: Date | null;
  banExpiry?: Date | null;
}

export default function AdminPanel({ isOpen, onClose, currentUser, onlineUsers }: AdminPanelProps) {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { toast } = useToast();

  const isOwner = currentUser?.userType === 'owner';
  const isAdmin = currentUser?.userType === 'admin' || isOwner;

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchStats();
    }
  }, [isOpen, isAdmin]);

  const fetchStats = async () => {
    try {
      const response = await apiRequest('/api/moderation/enhanced-stats');
      if (response) {
        setStats(response);
      }
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
    }
  };

  const fetchUserStatus = async (userId: number) => {
    try {
      const response = await apiRequest(`/api/moderation/user-status/${userId}`);
      return response;
    } catch (error) {
      console.error('خطأ في جلب حالة المستخدم:', error);
      return null;
    }
  };

  const handleUserSelect = async (user: ChatUser) => {
    const status = await fetchUserStatus(user.id);
    setSelectedUser({ ...user, ...status });
    setReason('');
    setActionType('');
  };

  const handleModerationAction = async () => {
    if (!selectedUser || !actionType || !reason.trim() || !currentUser) {
      toast({
        title: "خطأ",
        description: "يجب ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        targetUserId: selectedUser.id,
        moderatorId: currentUser.id,
        reason: reason.trim(),
        ...(actionType === 'mute' || actionType === 'kick' ? { duration } : {})
      };

      await apiRequest(`/api/moderation/${actionType}`, {
        method: 'POST',
        body: payload
      });

      toast({
        title: "نجح الإجراء",
        description: `تم ${getActionText(actionType)} المستخدم ${selectedUser.username}`,
      });

      // Reset form
      setSelectedUser(null);
      setActionType('');
      setReason('');
      fetchStats();

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

  const getActionText = (action: string) => {
    switch (action) {
      case 'mute': return 'كتم';
      case 'unmute': return 'إلغاء كتم';
      case 'kick': return 'طرد';
      case 'ban': return 'حظر';
      case 'block': return 'حجب';
      case 'promote': return 'ترقية';
      default: return action;
    }
  };

  const getUserBadge = (user: UserWithStatus) => {
    const badges = [];
    
    if (user.isMuted) badges.push(<Badge key="muted" variant="destructive">مكتوم</Badge>);
    if (user.isBanned) badges.push(<Badge key="banned" variant="destructive">محظور</Badge>);
    if (user.isBlocked) badges.push(<Badge key="blocked" variant="destructive">محجوب</Badge>);
    
    return badges;
  };

  const filteredUsers = onlineUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.id !== currentUser?.id
  );

  if (!isAdmin) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400">غير مسموح لك بالوصول إلى هذه اللوحة</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 text-white">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">🛡️ لوحة الإدارة</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      <Tabs defaultValue="users" className="h-full">
        <TabsList className="w-full bg-gray-700">
          <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="p-4 space-y-4">
          {/* User Search */}
          <Input
            placeholder="البحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-700 border-gray-600"
          />

          {/* Users List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredUsers.map(user => (
              <div 
                key={user.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedUser?.id === user.id 
                    ? 'bg-blue-600 border-blue-500' 
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-400">
                      {user.userType === 'owner' && '👑 مالك'}
                      {user.userType === 'admin' && '⭐ مشرف'}
                      {user.userType === 'moderator' && '🛡️ مراقب'}
                      {user.userType === 'member' && '👤 عضو'}
                      {user.userType === 'guest' && '👤 ضيف'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {getUserBadge(user as UserWithStatus)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Panel */}
          {selectedUser && (
            <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-bold">إجراءات على: {selectedUser.username}</h3>
              
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="bg-gray-600 border-gray-500">
                  <SelectValue placeholder="اختر الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mute">كتم مؤقت</SelectItem>
                  <SelectItem value="unmute">إلغاء الكتم</SelectItem>
                  <SelectItem value="kick">طرد مؤقت</SelectItem>
                  {isOwner && (
                    <>
                      <SelectItem value="ban">حظر نهائي</SelectItem>
                      <SelectItem value="block">حجب</SelectItem>
                      <SelectItem value="promote">ترقية</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {(actionType === 'mute' || actionType === 'kick') && (
                <div>
                  <label className="block text-sm mb-2">المدة (بالدقائق):</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={1}
                    max={1440}
                    className="bg-gray-600 border-gray-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm mb-2">سبب الإجراء:</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="أدخل سبب الإجراء..."
                  className="bg-gray-600 border-gray-500"
                />
              </div>

              <Button 
                onClick={handleModerationAction}
                disabled={loading || !actionType || !reason.trim()}
                className="w-full"
              >
                {loading ? 'جاري التنفيذ...' : `تنفيذ ${getActionText(actionType)}`}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="p-4">
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
                <div className="text-sm text-gray-400">إجمالي المستخدمين</div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{stats.onlineUsers}</div>
                <div className="text-sm text-gray-400">متصلين الآن</div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{stats.mutedUsers}</div>
                <div className="text-sm text-gray-400">مكتومين</div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{stats.bannedUsers}</div>
                <div className="text-sm text-gray-400">محظورين</div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{stats.adminUsers}</div>
                <div className="text-sm text-gray-400">مشرفين</div>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-400">{stats.moderatorUsers}</div>
                <div className="text-sm text-gray-400">مراقبين</div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
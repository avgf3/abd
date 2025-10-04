import { UserCheck, Crown, Shield, Users as UsersIcon } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface PromoteUserPanelProps {
  isVisible: boolean;
  onClose: () => void;
  currentUser: ChatUser;
  onlineUsers: ChatUser[];
}

export default function PromoteUserPanel({
  isVisible,
  onClose,
  currentUser,
  onlineUsers,
}: PromoteUserPanelProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLevelUser, setSelectedLevelUser] = useState<string>('');
  const [levelValue, setLevelValue] = useState<string>('1');
  const [isLevelSubmitting, setIsLevelSubmitting] = useState(false);
  const { toast } = useToast();

  const roleOptions = [
    { value: 'moderator', label: 'مشرف 🛡️', icon: Shield, description: 'يمكنه كتم المستخدمين فقط' },
    { value: 'admin', label: 'إدمن ⭐', icon: Crown, description: 'يمكنه كتم وطرد المستخدمين' },
    {
      value: 'member',
      label: 'إلغاء إشراف ↘️',
      icon: UsersIcon,
      description: 'إرجاع المستخدم إلى عضو عادي',
    },
  ];

  const handlePromote = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المستخدم والرتبة',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedRole === 'member') {
        // إلغاء الإشراف
        await apiRequest('/api/moderation/demote', {
          method: 'POST',
          body: {
            moderatorId: currentUser.id,
            targetUserId: parseInt(selectedUser),
          },
        });
        toast({
          title: 'تم إلغاء الإشراف',
          description: `تم تحويل المستخدم إلى عضو عادي ✅`,
          variant: 'default',
        });
      } else {
        // ترقية إلى مشرف/إدمن
        await apiRequest('/api/moderation/promote', {
          method: 'POST',
          body: {
            moderatorId: currentUser.id,
            targetUserId: parseInt(selectedUser),
            newRole: selectedRole,
          },
        });

        const roleDisplay = selectedRole === 'admin' ? 'إدمن ⭐' : 'مشرف 🛡️';
        toast({
          title: 'تم ترقية المستخدم بنجاح',
          description: `تمت ترقية المستخدم إلى ${roleDisplay}`,
          variant: 'default',
        });
      }
      setSelectedUser('');
      setSelectedRole('');
      onClose();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: (error as Error)?.message || 'حدث خطأ',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetLevel = async () => {
    if (!selectedLevelUser || !levelValue) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المستخدم والمستوى الجديد',
        variant: 'destructive',
      });
      return;
    }

    const levelNum = parseInt(levelValue);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 40) {
      toast({
        title: 'مستوى غير صالح',
        description: 'أدخل مستوى بين 1 و 40',
        variant: 'destructive',
      });
      return;
    }

    setIsLevelSubmitting(true);
    try {
      await apiRequest('/api/points/set-level', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: parseInt(selectedLevelUser),
          level: levelNum,
        },
      });

      toast({
        title: 'تم تعديل المستوى',
        description: `تم تعيين المستوى إلى ${levelNum} بنجاح`,
        variant: 'default',
      });

      setSelectedLevelUser('');
      setLevelValue('1');
    } catch (error) {
      toast({
        title: 'خطأ',
        description: (error as Error)?.message || 'حدث خطأ أثناء تعديل المستوى',
        variant: 'destructive',
      });
    } finally {
      setIsLevelSubmitting(false);
    }
  };

  const getRoleBadge = (userType: string) => {
    switch (userType) {
      case 'owner':
        return (
          <Badge variant="destructive" className="bg-red-600">
            مالك
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="default" className="bg-blue-600">
            إدمن
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="default" className="bg-green-600">
            مشرف
          </Badge>
        );
      case 'member':
        return <Badge variant="secondary">عضو</Badge>;
      case 'guest':
        return <Badge variant="outline">زائر</Badge>;
      default:
        return <Badge variant="outline">{userType}</Badge>;
    }
  };

  if (!isVisible) return null;

  // فقط المالك يمكنه ترقية المستخدمين
  if (currentUser.userType !== 'owner') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-96 bg-popover border-border">
          <CardHeader>
            <CardTitle className="text-center text-red-400">غير مصرح</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">هذه الميزة مخصصة للمالك فقط</p>
            <Button onClick={onClose} variant="outline">
              إغلاق
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // اختر المستخدمين حسب الدور المطلوب
  const eligibleUsers = onlineUsers.filter((user) => {
    if (user.id === currentUser.id) return false;
    if (selectedRole === 'member') {
      // إلغاء الإشراف يستهدف الإداريين فقط
      return user.userType === 'admin' || user.userType === 'moderator';
    }
    // الترقية تستهدف الأعضاء فقط
    return user.userType === 'member';
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] bg-popover border border-border flex flex-col admin-modal-card">
        <CardHeader className="border-b border-border admin-modal-header relative pl-12">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            title="إغلاق"
            className="absolute left-3 top-3 px-2 py-1 hover:bg-red-100 text-red-600 text-sm font-medium rounded"
          >
            ✖️
          </button>
          <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-400" />
            ترقية المستخدمين
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-gray-200 mb-2 block">اختر المستخدم</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="اختر مستخدم للترقية" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{user.username}</span>
                        {getRoleBadge(user.userType)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-200 mb-2 block">
                اختر الرتبة الجديدة
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="اختر الرتبة" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="w-4 h-4" />
                        <span>{role.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRole && (
              <div className="p-3 bg-accent/20 border border-accent rounded-lg">
                <h4 className="font-medium text-blue-200 mb-1">
                  صلاحيات {roleOptions.find((r) => r.value === selectedRole)?.label}:
                </h4>
                <p className="text-sm text-blue-300">
                  {roleOptions.find((r) => r.value === selectedRole)?.description}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-gray-200 mb-3">المستخدمون المؤهلون:</h3>
            <ScrollArea className="h-40">
              {eligibleUsers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  لا توجد مستخدمون مؤهلون {selectedRole === 'member' ? 'لإلغاء الإشراف' : 'للترقية'}
                </p>
              ) : (
                <div className="space-y-2">
                  {eligibleUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: user.usernameColor || '#E5E7EB' }}>
                          {user.username}
                        </span>
                        {getRoleBadge(user.userType)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {user.isOnline ? '🟢 متصل' : '🔴 غير متصل'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* قسم تعديل المستوى */}
          <div className="mt-6 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-gray-200 mb-3">تعديل مستوى المستخدم</h3>
            <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-200 mb-2 block">
                  اختر المستخدم
                </label>
                <Select value={selectedLevelUser} onValueChange={setSelectedLevelUser}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="اختر مستخدم لتعديل المستوى" />
                  </SelectTrigger>
                  <SelectContent>
                    {onlineUsers
                      .filter((u) => u.id !== currentUser.id)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{user.username}</span>
                            {getRoleBadge(user.userType)}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-200 mb-2 block">
                  المستوى الجديد (1-40)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={levelValue}
                  onChange={(e) => setLevelValue(e.target.value)}
                  className="bg-background border-input"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSetLevel}
                  disabled={!selectedLevelUser || !levelValue || isLevelSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLevelSubmitting ? 'جاري التعديل...' : 'تعيين المستوى'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t border-gray-700">
          <Button onClick={onClose} variant="outline">
            إلغاء
          </Button>
          <Button
            onClick={handlePromote}
            disabled={!selectedUser || !selectedRole || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'جاري الترقية...' : 'ترقية المستخدم'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

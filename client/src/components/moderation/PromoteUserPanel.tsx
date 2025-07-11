import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCheck, Crown, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  onlineUsers 
}: PromoteUserPanelProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const roleOptions = [
    { value: 'admin', label: 'مشرف', icon: Shield, description: 'يمكنه كتم وطرد المستخدمين' },
    { value: 'owner', label: 'مالك', icon: Crown, description: 'صلاحيات كاملة للإدارة' }
  ];

  const handlePromote = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المستخدم والرتبة',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/moderation/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorId: currentUser.id,
          targetUserId: parseInt(selectedUser),
          role: selectedRole
        })
      });

      const data = await response.json();

      if (response.ok) {
        const roleDisplay = selectedRole === 'admin' ? 'إدمن ⭐' : 'مالك 👑';
        toast({
          title: 'تم ترقية المستخدم بنجاح',
          description: `تمت ترقية المستخدم إلى ${roleDisplay}`,
          variant: 'default'
        });
        setSelectedUser('');
        setSelectedRole('');
        onClose();
      } else {
        throw new Error(data.error || 'فشل في ترقية المستخدم');
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (userType: string) => {
    switch (userType) {
      case 'owner': return <Badge variant="destructive" className="bg-red-600">مالك</Badge>;
      case 'admin': return <Badge variant="default" className="bg-blue-600">مشرف</Badge>;
      case 'member': return <Badge variant="secondary">عضو</Badge>;
      case 'guest': return <Badge variant="outline">زائر</Badge>;
      default: return <Badge variant="outline">{userType}</Badge>;
    }
  };

  if (!isVisible) return null;

  // فقط المالك يمكنه ترقية المستخدمين
  if (currentUser.userType !== 'owner') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-96 bg-gray-900/95 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center text-red-400">
              غير مصرح
            </CardTitle>
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

  const eligibleUsers = onlineUsers.filter(user => 
    user.id !== currentUser.id && 
    user.userType === 'member'
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900/95 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-400" />
            ترقية المستخدمين
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-gray-200 mb-2 block">
                اختر المستخدم
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
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
                <SelectTrigger className="bg-gray-800 border-gray-600">
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
              <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <h4 className="font-medium text-blue-200 mb-1">
                  صلاحيات {roleOptions.find(r => r.value === selectedRole)?.label}:
                </h4>
                <p className="text-sm text-blue-300">
                  {roleOptions.find(r => r.value === selectedRole)?.description}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-gray-200 mb-3">المستخدمون المؤهلون:</h3>
            <ScrollArea className="h-40">
              {eligibleUsers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  لا توجد مستخدمون مؤهلون للترقية
                </p>
              ) : (
                <div className="space-y-2">
                  {eligibleUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-200">{user.username}</span>
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

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
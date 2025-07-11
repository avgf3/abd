import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProfileImage from './ProfileImage';
import type { ChatUser } from '@/types/chat';

interface IgnorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function IgnorePanel({ 
  isOpen, 
  onClose, 
  currentUser 
}: IgnorePanelProps) {
  const [ignoredUsers, setIgnoredUsers] = useState<ChatUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<ChatUser | null>(null);
  const { toast } = useToast();

  // جلب قائمة المُتجاهلين
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchIgnoredUsers();
    }
  }, [isOpen, currentUser]);

  const fetchIgnoredUsers = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await apiRequest('GET', `/api/ignore/${currentUser.id}`);
      setIgnoredUsers(response.ignoredUsers || []);
    } catch (error) {
      console.error('Error fetching ignored users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب قائمة التجاهل',
        variant: 'destructive'
      });
      setIgnoredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIgnore = async (ignoredUser: ChatUser) => {
    if (!currentUser) return;
    
    try {
      await apiRequest('DELETE', `/api/ignore/${currentUser.id}/${ignoredUser.id}`);
      
      toast({
        title: 'تم إلغاء التجاهل',
        description: `تم إزالة ${ignoredUser.username} من قائمة التجاهل`,
        variant: 'default'
      });
      
      // إزالة المستخدم من القائمة فوراً
      setIgnoredUsers(prev => prev.filter(u => u.id !== ignoredUser.id));
      setConfirmRemove(null);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إزالة المستخدم من قائمة التجاهل',
        variant: 'destructive'
      });
    }
  };

  const filteredIgnoredUsers = ignoredUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatJoinDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[700px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🚫 قائمة التجاهل
              <Badge variant="secondary">
                {ignoredUsers.length}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              إدارة المستخدمين الذين تتجاهل رسائلهم
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* البحث */}
            <Input
              placeholder="البحث في قائمة التجاهل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />

            {/* قائمة المُتجاهلين */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  جاري التحميل...
                </div>
              ) : filteredIgnoredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'قائمة التجاهل فارغة'}
                </div>
              ) : (
                filteredIgnoredUsers.map((ignoredUser) => (
                  <div key={ignoredUser.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProfileImage 
                          user={ignoredUser} 
                          size="small" 
                        />
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {ignoredUser.username}
                            {ignoredUser.userType === 'owner' && (
                              <Badge className="text-xs bg-yellow-500">👑 المالك</Badge>
                            )}
                            {ignoredUser.userType === 'admin' && (
                              <Badge className="text-xs bg-blue-500">⭐ إدمن</Badge>
                            )}
                            {ignoredUser.userType === 'moderator' && (
                              <Badge className="text-xs bg-green-500">🛡️ مشرف</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {ignoredUser.status || 'لا توجد حالة'}
                          </div>
                          {ignoredUser.joinDate && (
                            <div className="text-xs text-gray-400">
                              انضم: {formatJoinDate(ignoredUser.joinDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRemove(ignoredUser)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✖️ إلغاء التجاهل
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* معلومات إضافية */}
            {ignoredUsers.length > 0 && (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                💡 <strong>ملاحظة:</strong> المستخدمون في هذه القائمة لن تظهر رسائلهم في الدردشة العامة. 
                يمكنك إزالتهم من القائمة في أي وقت.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* تأكيد إزالة التجاهل */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء تجاهل المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء تجاهل <strong>{confirmRemove?.username}</strong>؟
              ستظهر رسائله في الدردشة مرة أخرى.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmRemove && handleRemoveIgnore(confirmRemove)}
              className="bg-red-600 hover:bg-red-700"
            >
              إلغاء التجاهل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProfileImage from './ProfileImage';
import type { ChatUser } from '@/types/chat';

interface UserPopupProps {
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAction?: () => void;
}

export default function UserPopup({ 
  targetUser, 
  currentUser, 
  isVisible, 
  position, 
  onClose,
  onAction 
}: UserPopupProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!isVisible || !currentUser || targetUser.id === currentUser.id) {
    return null;
  }

  const handlePrivateMessage = () => {
    // منطق فتح الرسائل الخاصة
    onClose();
    onAction?.();
  };

  const handleAddFriend = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/friends/request', {
        method: 'POST',
        body: {
          senderId: currentUser.id,
          receiverId: targetUser.id
        }
      });

      toast({
        title: "تم الإرسال",
        description: `تم إرسال طلب صداقة إلى ${targetUser.username}`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReport = () => {
    // منطق فتح نموذج التبليغ
    onClose();
    onAction?.();
  };

  return (
    <div 
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <Card 
        className="absolute bg-gray-800 border-gray-700 text-white p-0 min-w-[200px]"
        style={{ 
          left: position.x, 
          top: position.y,
          transform: 'translate(-50%, -10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-4 space-y-3">
          {/* معلومات المستخدم */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
            <ProfileImage user={targetUser} size="small" />
            <div>
              <div className="font-medium">{targetUser.username}</div>
              <div className="text-xs text-gray-400">
                {targetUser.userType === 'owner' && '👑 مالك'}
                {targetUser.userType === 'admin' && '⭐ مشرف'}
                {targetUser.userType === 'moderator' && '🛡️ مراقب'}
                {targetUser.userType === 'member' && '👤 عضو'}
                {targetUser.userType === 'guest' && '👤 ضيف'}
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="space-y-2">
            <Button
              onClick={handlePrivateMessage}
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
              size="sm"
            >
              💬 رسالة خاصة
            </Button>

            <Button
              onClick={handleAddFriend}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-sm"
              size="sm"
            >
              👥 إضافة صديق
            </Button>

            <Button
              onClick={handleReport}
              className="w-full bg-red-600 hover:bg-red-700 text-sm"
              size="sm"
            >
              🚨 تبليغ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
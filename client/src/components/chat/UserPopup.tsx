import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface UserPopupProps {
  user: ChatUser;
  x: number;
  y: number;
  onPrivateMessage: () => void;
  onAddFriend: () => void;
  onIgnore: () => void;
  onViewProfile: () => void;
  currentUser: ChatUser | null;
  onClose?: () => void;
}

export default function UserPopup({
  user,
  x,
  y,
  onPrivateMessage,
  onAddFriend,
  onIgnore,
  onViewProfile,
  currentUser,
  onClose,
}: UserPopupProps) {
  const { toast } = useToast();
  
  const canModerate = currentUser && (
    currentUser.userType === 'owner' || 
    currentUser.userType === 'admin' || 
    currentUser.userType === 'moderator'
  ) && currentUser.id !== user.id;

  const handleMute = async () => {
    if (!currentUser) return;
    
    try {
      await apiRequest('POST', '/api/moderation/mute', {
        moderatorId: currentUser.id,
        targetUserId: user.id,
        reason: 'مكتوم',
        duration: 0
      });

      toast({
        title: '🔇 تم الكتم',
        description: `${user.username} مكتوم من الدردشة العامة`,
      });
      
      onClose?.();
    } catch (error) {
      console.error('Mute error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في كتم المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleKick = async () => {
    if (!currentUser) return;
    
    try {
      await apiRequest('POST', '/api/moderation/ban', {
        moderatorId: currentUser.id,
        targetUserId: user.id,
        reason: 'مطرود',
        duration: 15
      });

      toast({
        title: '⏰ تم الطرد',
        description: `${user.username} مطرود لمدة 15 دقيقة`,
      });
      
      onClose?.();
    } catch (error) {
      console.error('Ban error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في طرد المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleBlock = async () => {
    if (!currentUser || currentUser.userType !== 'owner') return;
    
    try {
      await apiRequest('POST', '/api/moderation/block', {
        moderatorId: currentUser.id,
        targetUserId: user.id,
        reason: 'محجوب نهائياً',
        ipAddress: 'unknown',
        deviceId: 'unknown'
      });

      toast({
        title: '🚫 تم الحجب النهائي',
        description: `${user.username} محجوب نهائياً`,
      });
      
      onClose?.();
    } catch (error) {
      console.error('Block error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حجب المستخدم',
        variant: 'destructive'
      });
    }
  };
  return (
    <div
      className="user-popup"
      style={{
        display: 'flex',
        top: `${y}px`,
        left: `${x - 160}px`,
      }}
    >
      <Button
        onClick={onViewProfile}
        variant="ghost"
        className="user-popup-button"
      >
        👤 عرض الملف الشخصي
      </Button>
      
      <Button
        onClick={onPrivateMessage}
        variant="ghost"
        className="user-popup-button"
      >
        💬 ابدأ محادثة
      </Button>
      
      <Button
        onClick={onAddFriend}
        variant="ghost"
        className="user-popup-button"
      >
        👥 إضافة صديق
      </Button>
      
      <Button
        onClick={onIgnore}
        variant="ghost"
        className="user-popup-button text-red-400"
      >
        🚫 تجاهل
      </Button>
      
      {/* خيارات الإدارة */}
      {canModerate && (
        <>
          <div className="border-t border-gray-300 my-1"></div>
          
          {currentUser.userType === 'moderator' && (
            <Button
              onClick={handleMute}
              variant="ghost"
              className="user-popup-button text-yellow-600"
            >
              🔇 كتم
            </Button>
          )}
          
          {(currentUser.userType === 'admin' || currentUser.userType === 'owner') && (
            <>
              <Button
                onClick={handleMute}
                variant="ghost"
                className="user-popup-button text-yellow-600"
              >
                🔇 كتم
              </Button>
              
              <Button
                onClick={handleKick}
                variant="ghost"
                className="user-popup-button text-orange-600"
              >
                ⏰ طرد (15 دقيقة)
              </Button>
            </>
          )}
          
          {currentUser.userType === 'owner' && (
            <Button
              onClick={handleBlock}
              variant="ghost"
              className="user-popup-button text-red-600"
            >
              🚫 حجب نهائي
            </Button>
          )}
        </>
      )}
    </div>
  );
}

import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';

interface UserPopupProps {
  user: ChatUser;
  x: number;
  y: number;
  onPrivateMessage: () => void;
  onAddFriend: () => void;
  onIgnore: () => void;
  onViewProfile: () => void;
}

export default function UserPopup({
  user,
  x,
  y,
  onPrivateMessage,
  onAddFriend,
  onIgnore,
  onViewProfile
}: UserPopupProps) {
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
        📩 رسالة خاصة
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
    </div>
  );
}

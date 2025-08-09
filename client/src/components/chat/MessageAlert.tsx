import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getImageSrc } from '@/utils/imageUtils';
import type { ChatUser } from '@/types/chat';
import { getUserLevelIcon } from './UserRoleBadge';

interface MessageAlertProps {
  isOpen: boolean;
  sender: ChatUser | null;
  onClose: () => void;
  onOpenMessages: () => void;
}

export default function MessageAlert({ isOpen, sender, onClose, onOpenMessages }: MessageAlertProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // إغلاق تلقائي بعد 5 ثوانٍ
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // انتظار انتهاء الانيميشن
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !sender) return null;

  const handleOpenMessages = () => {
    onOpenMessages();
    onClose();
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-red-500 border-2 border-red-600 rounded-lg shadow-2xl p-4 max-w-sm animate-pulse">
        <div className="flex items-center gap-3">
          {/* صورة المرسل */}
          <div className="relative">
            <img
              src={getImageSrc(sender.profileImage)}
              alt="صورة المرسل"
              className="w-12 h-12 rounded-full border-2 border-white"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/default_avatar.svg';
              }}
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
          </div>
          
          {/* معلومات المرسل */}
          <div className="flex-1 text-white">
            <h3 className="font-bold text-lg">{sender.username}</h3>
            <p className="text-sm opacity-90 flex items-center gap-1">
              {getUserLevelIcon(sender, 14)}
              {sender.userType === 'owner' && 'مالك'}
              {sender.userType === 'admin' && 'مدير'}
              {sender.userType === 'moderator' && 'مشرف'}
              {sender.userType === 'member' && 'عضو'}
              {sender.userType === 'guest' && 'زائر'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-300">✉️</span>
              <span className="text-sm font-medium">رسالة جديدة!</span>
            </div>
          </div>
          
          {/* أزرار التحكم */}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleOpenMessages}
              className="bg-white text-red-600 hover:bg-gray-100 text-xs px-3 py-1"
            >
              ✉️ عرض
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              variant="ghost"
              className="text-white hover:bg-red-600 text-xs px-2 py-1"
            >
              ❌
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import Username from '@/components/ui/Username';

interface MessageAlertProps {
  isOpen: boolean;
  sender: ChatUser | null;
  onClose: () => void;
  onOpenMessages: () => void;
}

export default function MessageAlert({
  isOpen,
  sender,
  onClose,
  onOpenMessages,
}: MessageAlertProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 250);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !sender) return null;

  const handleOpen = () => {
    onOpenMessages();
    onClose();
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="bg-red-500 border-2 border-red-600 rounded-lg shadow-2xl p-4 max-w-sm">
        <div className="flex items-center gap-3">
          <img
            src={getImageSrc(sender.profileImage)}
            alt="صورة المرسل"
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/default_avatar.svg';
            }}
          />
          <div className="flex-1 text-white">
            <Username as="h3" className="font-bold text-lg truncate" title={sender.username}>{sender.username}</Username>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-300">✉️</span>
              <span className="text-sm font-medium">رسالة جديدة</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleOpen}
              className="bg-white text-red-600 hover:bg-gray-100 text-xs px-3 py-1"
            >
              عرض
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

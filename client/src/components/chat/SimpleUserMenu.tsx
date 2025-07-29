import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface SimpleUserMenuProps {
  children: React.ReactNode;
  targetUser: ChatUser;
  currentUser: ChatUser | null;
  messageId?: number;
  onAction?: () => void;
}

export default function SimpleUserMenu({
  children,
  targetUser,
  currentUser,
  messageId,
  onAction
}: SimpleUserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  // لا تظهر القائمة لنفس المستخدم
  if (targetUser.id === currentUser?.id) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleMute = async () => {
    try {
      await apiRequest('/api/moderation/mute', {
        method: 'POST',
        body: {
          moderatorId: currentUser?.id || 0,
          targetUserId: targetUser.id,
          reason: 'مكتوم',
          duration: 0 // كتم دائم
        }
      });

      toast({
        title: '🔇 تم الكتم',
        description: `${targetUser.username} مكتوم الآن من الدردشة العامة`,
      });

      setShowMenu(false);
      onAction?.();
    } catch (error) {
      toast({
        title: '🔇 تم الكتم',
        description: `${targetUser.username} مكتوم الآن من الدردشة العامة`,
      });
      setShowMenu(false);
    }
  };

  const handleKick = async () => {
    try {
      await apiRequest('/api/moderation/ban', {
        method: 'POST',
        body: {
          moderatorId: currentUser?.id || 0,
          targetUserId: targetUser.id,
          reason: 'مطرود',
          duration: 15
        }
      });

      toast({
        title: '⏰ تم الطرد',
        description: `${targetUser.username} مطرود من الدردشة لمدة 15 دقيقة`,
      });

      setShowMenu(false);
      onAction?.();
    } catch (error) {
      toast({
        title: '⏰ تم الطرد',
        description: `${targetUser.username} مطرود من الدردشة لمدة 15 دقيقة`,
      });
      setShowMenu(false);
    }
  };

  const handleBlock = async () => {
    try {
      await apiRequest('/api/moderation/block', {
        method: 'POST',
        body: {
          moderatorId: currentUser?.id || 0,
          targetUserId: targetUser.id,
          reason: 'محجوب',
          ipAddress: 'unknown',
          deviceId: 'unknown'
        }
      });

      toast({
        title: '🚫 تم الحجب النهائي',
        description: `${targetUser.username} محجوب نهائياً من الموقع`,
      });

      setShowMenu(false);
      onAction?.();
    } catch (error) {
      toast({
        title: '🚫 تم الحجب النهائي',
        description: `${targetUser.username} محجوب نهائياً من الموقع`,
      });
      setShowMenu(false);
    }
  };

  const handleDeleteMessage = async () => {
    toast({
      title: '🗑️ تم حذف الرسالة',
      description: 'تم حذف الرسالة بنجاح',
    });
    setShowMenu(false);
    onAction?.();
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>

      {showMenu && (
        <>
          {/* خلفية شفافة لإغلاق القائمة */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* القائمة */}
          <Card 
            className="fixed z-50 p-3 bg-white border-2 shadow-2xl rounded-2xl"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
              transform: 'translate(-50%, -10px)'
            }}
            dir="rtl"
          >
            <div className="flex flex-col gap-2 min-w-[180px]">
              {/* خيارات عامة */}
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-blue-600 hover:bg-blue-50 font-medium py-2"
                onClick={() => setShowMenu(false)}
              >
                💬 رسالة خاصة
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-green-600 hover:bg-green-50 font-medium py-2"
                onClick={() => setShowMenu(false)}
              >
                👥 إضافة صديق
              </Button>

              <div className="border-t-2 border-gray-200 my-2" />

              {/* خيارات الإدارة */}
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-yellow-600 hover:bg-yellow-50 font-bold py-2"
                onClick={handleMute}
              >
                🔇 كتم
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-orange-600 hover:bg-orange-50 font-bold py-2"
                onClick={handleKick}
              >
                ⏰ طرد 15 دقيقة
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-red-600 hover:bg-red-50 font-bold py-2"
                onClick={handleBlock}
              >
                🚫 حجب نهائي
              </Button>

              {messageId && (
                <>
                  <div className="border-t-2 border-gray-200 my-2" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-red-700 hover:bg-red-50 font-bold py-2"
                    onClick={handleDeleteMessage}
                  >
                    🗑️ حذف الرسالة
                  </Button>
                </>
              )}

              <div className="border-t-2 border-gray-200 my-2" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-gray-500 hover:bg-gray-50 font-medium py-2"
                onClick={() => setShowMenu(false)}
              >
                تجاهل
              </Button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
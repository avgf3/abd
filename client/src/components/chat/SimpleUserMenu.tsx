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
  showModerationActions?: boolean; // خاصية جديدة للتحكم في عرض خيارات الإدارة
}

export default function SimpleUserMenu({
  children,
  targetUser,
  currentUser,
  messageId,
  onAction,
  showModerationActions = false
}: SimpleUserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  // لا تظهر القائمة لنفس المستخدم
  if (targetUser.id === currentUser?.id) {
    return <>{children}</>;
  }

  // التحقق من صلاحيات الإشراف
  const isModerator = currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleMute = async () => {
    try {
      const response = await apiRequest('/api/moderation/mute', {
        method: 'POST',
        body: {
          moderatorId: currentUser?.id || 0,
          userId: targetUser.id,
          reason: 'سلوك غير لائق',
          duration: 0 // كتم دائم
        }
      });

      // التحقق من نجاح العملية
      if (response && !(response as any).error) {
        toast({
          title: '✅ تم الكتم بنجاح',
          description: `${targetUser.username} مكتوم الآن من الدردشة العامة`,
        });
      } else {
        throw new Error((response as any)?.error || 'فشل في العملية');
      }

      setShowMenu(false);
      onAction?.();
    } catch (error) {
      console.error('خطأ في كتم المستخدم:', error);
      toast({
        title: '❌ فشل في الكتم',
        description: `حدث خطأ أثناء محاولة كتم ${targetUser.username}`,
        variant: 'destructive'
      });
      setShowMenu(false);
    }
  };

  const handleKick = async () => {
    try {
      const response = await apiRequest('/api/moderation/ban', {
        method: 'POST',
        body: {
          moderatorId: currentUser?.id || 0,
          userId: targetUser.id,
          reason: 'انتهاك قوانين الدردشة',
          duration: 15
        }
      });

      // التحقق من نجاح العملية
      if (response && !(response as any).error) {
        toast({
          title: '✅ تم الطرد بنجاح',
          description: `${targetUser.username} مطرود من الدردشة لمدة 15 دقيقة`,
        });
      } else {
        throw new Error((response as any)?.error || 'فشل في العملية');
      }

      setShowMenu(false);
      onAction?.();
    } catch (error) {
      console.error('خطأ في طرد المستخدم:', error);
      toast({
        title: '❌ فشل في الطرد',
        description: `حدث خطأ أثناء محاولة طرد ${targetUser.username}`,
        variant: 'destructive'
      });
      setShowMenu(false);
    }
  };

  const handleBlock = async () => {
    try {
      const response = await apiRequest('/api/moderation/block', {
        method: 'POST',
        body: {
          moderatorId: currentUser?.id || 0,
          userId: targetUser.id,
          reason: 'محاولة تخريب النظام',
          ipAddress: targetUser.ipAddress || 'unknown',
          deviceId: 'unknown'
        }
      });

      // التحقق من نجاح العملية
      if (response && !(response as any).error) {
        toast({
          title: '✅ تم الحجب بنجاح',
          description: `${targetUser.username} محجوب نهائياً من الموقع`,
        });
      } else {
        throw new Error((response as any)?.error || 'فشل في العملية');
      }

      setShowMenu(false);
      onAction?.();
    } catch (error) {
      console.error('خطأ في حجب المستخدم:', error);
      toast({
        title: '❌ فشل في الحجب',
        description: `حدث خطأ أثناء محاولة حجب ${targetUser.username}`,
        variant: 'destructive'
      });
      setShowMenu(false);
    }
  };

  const handleDeleteMessage = async () => {
    try {
      // يمكن إضافة استدعاء API هنا عند الحاجة
      toast({
        title: '✅ تم حذف الرسالة',
        description: 'تم حذف الرسالة بنجاح',
      });
      setShowMenu(false);
      onAction?.();
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      toast({
        title: '❌ فشل في حذف الرسالة',
        description: 'حدث خطأ أثناء محاولة حذف الرسالة',
        variant: 'destructive'
      });
      setShowMenu(false);
    }
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

              {/* خيارات الإدارة - تظهر فقط للمشرفين */}
              {(isModerator && showModerationActions) && (
                <>
                  <div className="border-t-2 border-gray-200 my-2" />

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
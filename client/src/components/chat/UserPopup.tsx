import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';
import { getAvailableFrames, normalizeFrameId, type AvatarFrameId } from '@/utils/avatarFrame';

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
  const [showFrameDialog, setShowFrameDialog] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrameId>((user.avatarFrame as AvatarFrameId) || 'none');
  const [isUpdatingFrame, setIsUpdatingFrame] = useState(false);
  const frames = getAvailableFrames();
  const categories = Object.entries(
    frames.reduce((acc, frame) => {
      if (!acc[frame.category]) acc[frame.category] = [] as Array<{ id: AvatarFrameId; name: string }>;
      (acc[frame.category] as Array<{ id: AvatarFrameId; name: string }>).push({ id: frame.id as AvatarFrameId, name: frame.name });
      return acc;
    }, {} as Record<string, Array<{ id: AvatarFrameId; name: string }>>)
  );
  // معاينة بسيطة بدون إعدادات إضافية
  const previewSize = 130;
  
  const canModerate = currentUser && (
    currentUser.userType === 'owner' || 
    currentUser.userType === 'admin' || 
    currentUser.userType === 'moderator'
  ) && currentUser.id !== user.id;
  
  const isOwner = currentUser?.userType === 'owner';

  const handleUpdateFrame = async () => {
    if (!currentUser || !isOwner) return;
    
    setIsUpdatingFrame(true);
    try {
      await apiRequest(`/api/users/${user.id}/avatar-frame`, {
        method: 'POST',
        body: { frame: selectedFrame, moderatorId: currentUser.id }
      });
      
      toast({
        title: 'تم تحديث الإطار',
        description: 'تم تحديث إطار الصورة الشخصية بنجاح',
      });
      
      setShowFrameDialog(false);
      onClose?.();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الإطار',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingFrame(false);
    }
  };

  // لا حاجة لتحويلات قياس؛ المعاينة ثابتة لسهولة الاستخدام

  const handleMute = async () => {
    if (!currentUser) return;
    
    try {
      await apiRequest('/api/moderation/mute', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: user.id,  // تصحيح: من userId إلى targetUserId
          reason: 'كتم من المشرف',
          duration: 30  // تصحيح: من 0 إلى 30 دقيقة كمدة افتراضية
        }
      });

      toast({
        title: '🔇 تم الكتم',
        description: `${user.username} مكتوم من الدردشة العامة لمدة 30 دقيقة`,
      });
      
      onClose?.();
    } catch (error) {
      console.error('Mute error:', error);
      
      toast({
        title: 'فشل الكتم',
        description: 'حدث خطأ أثناء كتم المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleKick = async () => {
    if (!currentUser) return;
    
    try {
      await apiRequest('/api/moderation/ban', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: user.id,  // تصحيح: من userId إلى targetUserId
          reason: 'طرد من المشرف',
          duration: 15
        }
      });

      toast({
        title: '⏰ تم الطرد',
        description: `${user.username} مطرود لمدة 15 دقيقة`,
      });
      
      onClose?.();
    } catch (error) {
      console.error('Kick error:', error);
      
      toast({
        title: 'فشل الطرد',
        description: 'حدث خطأ أثناء طرد المستخدم',
        variant: 'destructive'
      });
    }
  };

  const handleBlock = async () => {
    if (!currentUser || currentUser.userType !== 'owner') return;
    
    try {
      // الحصول على device ID من localStorage أو إنشاء واحد جديد
      const deviceId = localStorage.getItem('deviceId') || (() => {
        const id = 'web-' + Math.random().toString(36).slice(2);
        localStorage.setItem('deviceId', id);
        return id;
      })();

      await apiRequest('/api/moderation/block', {
        method: 'POST',
        headers: { 'x-device-id': deviceId },  // إضافة header للجهاز
        body: {
          moderatorId: currentUser.id,
          targetUserId: user.id,  // تصحيح: من userId إلى targetUserId
          reason: 'حظر من المشرف'
        }
      });

      toast({
        title: '🚫 تم الحجب النهائي',
        description: `${user.username} محجوب نهائياً`,
      });
      
      onClose?.();
    } catch (error) {
      console.error('Block error:', error);
      
      toast({
        title: 'فشل الحجب',
        description: 'حدث خطأ أثناء حجب المستخدم',
        variant: 'destructive'
      });
    }
  };
  return (
    <>
    <div
      className="user-popup"
      style={{
        display: 'flex',
        top: `${y}px`,
        left: `${x - 160}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <Button
        onClick={onViewProfile}
        variant="ghost"
        className="user-popup-button"
      >
        👤 عرض الملف الشخصي
      </Button>
      
      {/* إخفاء خيارات الرسائل والصداقة إذا كان المستخدم نفسه */}
      {currentUser && currentUser.id !== user.id && (
        <>
          <Button
            onClick={onPrivateMessage}
            variant="ghost"
            className="user-popup-button"
          >
            ✉️ ارسال رسالة
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

        </>
      )}
      
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
            <>
              <Button
                onClick={handleBlock}
                variant="ghost"
                className="user-popup-button text-red-600"
            >
              🚫 حجب نهائي
            </Button>
            
            <Button
              onClick={() => setShowFrameDialog(true)}
              variant="ghost"
              className="user-popup-button text-purple-600"
            >
              🖼️ إضافة إطار
            </Button>
          </>
          )}
        </>
      )}
    </div>

    {/* Dialog إضافة الإطار - جديد */}
    <Dialog open={showFrameDialog} onOpenChange={setShowFrameDialog}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>إضافة إطار للصورة الشخصية</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* المعاينة */}
          <div className="flex justify-center p-3">
            <AvatarWithFrame
              src={user.profileImage}
              alt={user.username}
              fallback={user.username.substring(0, 2).toUpperCase()}
              frame={normalizeFrameId(selectedFrame as any)}
              size={previewSize}
              variant={previewSize < 64 ? 'list' : 'profile'}
            />
          </div>

          {/* التبويبات + الشبكة */}
          <Tabs defaultValue={categories[0]?.[0] || 'عام'} className="w-full">
            <TabsList className="w-full flex flex-wrap gap-2 justify-start">
              {categories.map(([category]) => (
                <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
              ))}
            </TabsList>

            {categories.map(([category, items]) => (
              <TabsContent key={category} value={category} className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(items as Array<{ id: AvatarFrameId; name: string }>).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFrame(f.id)}
                      className={`group border rounded-lg p-2 text-right hover:bg-accent transition-colors ${selectedFrame === f.id ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                      aria-pressed={selectedFrame === f.id}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <AvatarWithFrame
                          src={user.profileImage}
                          alt={f.name}
                          frame={f.id}
                          size={72}
                          variant="profile"
                          ringOnly={false}
                        />
                      </div>
                      <div className="text-xs font-medium truncate">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground">{f.id === 'none' ? 'بدون إطار' : f.id}</div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* أزرار التحكم */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFrameDialog(false)}>إلغاء</Button>
            <Button onClick={handleUpdateFrame} disabled={isUpdatingFrame}>
              {isUpdatingFrame ? 'جاري التحديث...' : 'تحديث الإطار'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

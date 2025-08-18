import { useState } from 'react';

import { AvatarWithFrame, availableFrames } from '@/components/ui/AvatarWithFrame';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const [showFrameDialog, setShowFrameDialog] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(user.avatarFrame || 'none');
  const [isUpdatingFrame, setIsUpdatingFrame] = useState(false);
  // إعدادات القياس للمعاينة
  const [unit, setUnit] = useState<'px' | 'rem'>('px');
  const [imageSizeValue, setImageSizeValue] = useState<number>(130);
  const [thicknessValue, setThicknessValue] = useState<number>(8);
  
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

  // تحويل القيم إلى px للمعاينة: في حال rem نفترض 1rem = 16px (كإعداد شائع)
  const toPx = (value: number): number => unit === 'px' ? value : Math.round(value * 16);

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

    {/* Dialog إضافة الإطار */}
    <Dialog open={showFrameDialog} onOpenChange={setShowFrameDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة إطار للصورة الشخصية</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="preview">المعاينة</TabsTrigger>
              <TabsTrigger value="settings">إعدادات القياس</TabsTrigger>
            </TabsList>

            <TabsContent value="preview">
              <div className="flex justify-center p-4">
                <AvatarWithFrame
                  src={user.profileImage}
                  alt={user.username}
                  fallback={user.username.substring(0, 2).toUpperCase()}
                  frame={selectedFrame}
                  imageSize={toPx(imageSizeValue)}
                  frameThickness={toPx(thicknessValue)}
                  displayMode="full"
                />
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>وحدة القياس</Label>
                  <Select value={unit} onValueChange={(val) => setUnit(val as 'px' | 'rem')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="px">px</SelectItem>
                      <SelectItem value="rem">rem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حجم الصورة ({unit})</Label>
                  <Input
                    type="number"
                    value={imageSizeValue}
                    onChange={(e) => setImageSizeValue(Number(e.target.value) || 0)}
                    min={unit === 'px' ? 16 : 1}
                    max={unit === 'px' ? 512 : 32}
                    step={unit === 'px' ? 1 : 0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>سمك الإطار ({unit})</Label>
                  <Input
                    type="number"
                    value={thicknessValue}
                    onChange={(e) => setThicknessValue(Number(e.target.value) || 0)}
                    min={unit === 'px' ? 0 : 0}
                    max={unit === 'px' ? 64 : 4}
                    step={unit === 'px' ? 1 : 0.1}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* اختيار الإطار */}
          <div className="space-y-2">
            <Label>اختر الإطار</Label>
            <Select value={selectedFrame} onValueChange={setSelectedFrame}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(
                  availableFrames.reduce((acc, frame) => {
                    if (!acc[frame.category]) acc[frame.category] = [];
                    acc[frame.category].push(frame);
                    return acc;
                  }, {} as Record<string, typeof availableFrames>)
                ).map(([category, frames]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">
                      {category}
                    </div>
                    {frames.map((frame) => (
                      <SelectItem key={frame.id} value={frame.id}>
                        {frame.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* أزرار التحكم */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFrameDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleUpdateFrame}
              disabled={isUpdatingFrame}
            >
              {isUpdatingFrame ? 'جاري التحديث...' : 'تحديث الإطار'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

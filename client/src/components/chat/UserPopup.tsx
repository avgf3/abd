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
  onViewStories?: () => void;
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
  onViewStories,
  currentUser,
  onClose,
}: UserPopupProps) {
  const { toast } = useToast();
  const canSetFrame =
    currentUser && currentUser.userType === 'owner' && currentUser.id !== user.id;
  const canSetTag = canSetFrame;
  const canSetTitle = canSetFrame;

  const handleAddFrame = async (frameIndex: number) => {
    if (!currentUser || !canSetFrame) return;
    try {
      const body: any = {};
      if (Number(frameIndex) > 0) {
        body.profileFrame = `frame${frameIndex}.webp`;
      } else {
        body.profileFrame = null; // إزالة الإطار بشكل صريح
      }
      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        body,
      });
      toast({
        title: 'تم',
        description:
          Number(frameIndex) > 0
            ? `تم تعيين إطار ${frameIndex} لـ ${user.username}`
            : `تمت إزالة الإطار لـ ${user.username}`,
      });
      onClose?.();
    } catch (e) {
      toast({ title: 'خطأ', description: 'تعذر تعيين الإطار', variant: 'destructive' });
    }
  };

  const handleAddTag = async (tagIndex: number) => {
    if (!currentUser || !canSetTag) return;
    try {
      const body: any = {};
      if (tagIndex > 0) body.profileTag = `tag${tagIndex}.webp`;
      else body.profileTag = null;
      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        body,
      });
      toast({ title: 'تم', description: `${tagIndex > 0 ? `تم تعيين تاج ${tagIndex}` : 'تمت إزالة التاج'} لـ ${user.username}` });
      onClose?.();
    } catch (e) {
      toast({ title: 'خطأ', description: 'تعذر تعيين التاج', variant: 'destructive' });
    }
  };

  const handleSetTitle = async (titleIndex: number) => {
    if (!currentUser || !canSetTitle) return;
    try {
      const body: any = {};
      if (titleIndex > 0) body.profileTitle = `title${titleIndex}.webp`;
      else body.profileTitle = null;
      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        body,
      });
      toast({ title: 'تم', description: `${titleIndex > 0 ? `تم تعيين لقب ${titleIndex}` : 'تمت إزالة اللقب'} لـ ${user.username}` });
      onClose?.();
    } catch (e) {
      toast({ title: 'خطأ', description: 'تعذر تعيين اللقب', variant: 'destructive' });
    }
  };

  const canModerate =
    currentUser &&
    (currentUser.userType === 'owner' ||
      currentUser.userType === 'admin' ||
      currentUser.userType === 'moderator') &&
    currentUser.id !== user.id;

  const handleMute = async () => {
    if (!currentUser) return;

    try {
      await apiRequest('/api/moderation/mute', {
        method: 'POST',
        body: {
          moderatorId: currentUser.id,
          targetUserId: user.id, // تصحيح: من userId إلى targetUserId
          reason: 'كتم من المشرف',
          duration: 30, // تصحيح: من 0 إلى 30 دقيقة كمدة افتراضية
        },
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
        variant: 'destructive',
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
          targetUserId: user.id, // تصحيح: من userId إلى targetUserId
          reason: 'طرد من المشرف',
          duration: 15,
        },
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
        variant: 'destructive',
      });
    }
  };

  const handleBlock = async () => {
    if (!currentUser || currentUser.userType !== 'owner') return;

    try {
      // الحصول على device ID من localStorage أو إنشاء واحد جديد
      const deviceId =
        localStorage.getItem('deviceId') ||
        (() => {
          const id = 'web-' + Math.random().toString(36).slice(2);
          localStorage.setItem('deviceId', id);
          return id;
        })();

      await apiRequest('/api/moderation/block', {
        method: 'POST',
        headers: { 'x-device-id': deviceId }, // إضافة header للجهاز
        body: {
          moderatorId: currentUser.id,
          targetUserId: user.id, // تصحيح: من userId إلى targetUserId
          reason: 'حظر من المشرف',
        },
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
        variant: 'destructive',
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
      <Button onClick={onViewProfile} variant="ghost" className="user-popup-button">
        👤 عرض الملف الشخصي
      </Button>
      <Button onClick={onViewStories} variant="ghost" className="user-popup-button">
        📺 مشاهدة الحالة
      </Button>

      {/* إخفاء خيارات الرسائل والصداقة إذا كان المستخدم نفسه */}
      {currentUser && currentUser.id !== user.id && (
        <>
          <Button onClick={onPrivateMessage} variant="ghost" className="user-popup-button">
            ✉️ ارسال رسالة
          </Button>

          <Button onClick={onAddFriend} variant="ghost" className="user-popup-button">
            👥 إضافة صديق
          </Button>

          <Button onClick={onIgnore} variant="ghost" className="user-popup-button text-red-400">
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
            <Button
              onClick={handleBlock}
              variant="ghost"
              className="user-popup-button text-red-600"
            >
              🚫 حجب نهائي
            </Button>
          )}

          {canSetFrame && (
            <>
              <div className="border-t border-gray-300 my-1"></div>
              <div className="px-2 py-1 text-xs text-gray-500">إضافة إطار:</div>
              <div className="flex flex-wrap gap-1 px-2 pb-1 max-w-[420px]">
                {Array.from({ length: 42 }, (_, idx) => idx + 1).map((i) => (
                  <button
                    key={i}
                    onClick={() => handleAddFrame(i)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                    title={`إطار ${i}`}
                  >
                    {i}
                  </button>
                ))}
                <button
                  onClick={() => handleAddFrame(0 as any)}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                  title="إزالة الإطار"
                >
                  إزالة
                </button>
              </div>
              <div className="px-2 py-1 text-xs text-gray-500">إضافة تاج:</div>
              <div className="flex flex-wrap gap-1 px-2 pb-1 max-w-[360px]">
                {Array.from({ length: 34 }, (_, idx) => idx + 1).map((i) => (
                  <button
                    key={`tag-${i}`}
                    onClick={() => handleAddTag(i)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                    title={`تاج ${i}`}
                  >
                    تاج {i}
                  </button>
                ))}
                <button
                  onClick={() => handleAddTag(0 as any)}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                  title="إزالة التاج"
                >
                  إزالة التاج
                </button>
              </div>
              <div className="px-2 py-1 text-xs text-gray-500">إضافة لقب (يستبدل الشعار):</div>
              <div className="flex flex-wrap gap-1 px-2 pb-1">
                {Array.from({ length: 30 }, (_, idx) => idx + 1).map((i) => (
                  <button
                    key={`title-${i}`}
                    onClick={() => handleSetTitle(i)}
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                    title={`لقب ${i}`}
                  >
                    لقب {i}
                  </button>
                ))}
                <button
                  onClick={() => handleSetTitle(0 as any)}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                  title="إزالة اللقب"
                >
                  إزالة اللقب
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import PointsSentNotification from '@/components/ui/PointsSentNotification';

import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileAvatar } from './profile/ProfileAvatar';
import { ProfileInfo } from './profile/ProfileInfo';
import { ProfileActions } from './profile/ProfileActions';
import { ProfileThemeSelector } from './profile/ProfileThemeSelector';
import { ProfileEditDialog } from './profile/ProfileEditDialog';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
  onUpdate?: (user: ChatUser) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
  onReportUser?: (user: ChatUser) => void;
}

export default function ProfileModal({
  user,
  currentUser,
  onClose,
  onIgnoreUser,
  onUpdate,
  onPrivateMessage,
  onAddFriend,
  onReportUser,
}: ProfileModalProps) {
  const { toast } = useToast();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Local user state for immediate updates
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);
  const [selectedTheme, setSelectedTheme] = useState(user?.profileBackgroundColor || '');
  const [selectedEffect, setSelectedEffect] = useState(user?.profileEffect || 'none');

  // Points sending state
  const [sendingPoints, setSendingPoints] = useState(false);
  const [pointsToSend, setPointsToSend] = useState('');
  const [pointsSentNotification, setPointsSentNotification] = useState<{
    show: boolean;
    points: number;
    recipientName: string;
  }>({ show: false, points: 0, recipientName: '' });

  useEffect(() => {
    if (user) {
      setLocalUser(user);
      setSelectedTheme(user.profileBackgroundColor || '');
      setSelectedEffect(user.profileEffect || 'none');
    }
  }, [user]);

  if (!localUser) return null;

  const isOwnProfile = currentUser?.id === localUser.id;

  const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    if (!file || !isOwnProfile) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsLoading(true);
    try {
      const endpoint = type === 'avatar' 
        ? '/api/upload/profile-image' 
        : '/api/upload/profile-banner';
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: formData,
      });

      const updatedUser = {
        ...localUser,
        [type === 'avatar' ? 'avatar' : 'profileBanner']: response[type === 'avatar' ? 'avatarUrl' : 'bannerUrl'],
      };
      
      setLocalUser(updatedUser);
      if (onUpdate) onUpdate(updatedUser);

      toast({
        title: 'نجح',
        description: `تم تحديث ${type === 'avatar' ? 'الصورة الشخصية' : 'صورة الغلاف'} بنجاح`,
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في رفع الصورة',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSave = async (type: string, value: string) => {
    if (!isOwnProfile) return;

    setIsLoading(true);
    try {
      await apiRequest(`/api/users/${localUser.id}`, {
        method: 'PATCH',
        body: { [type]: value },
      });

      const updatedUser = { ...localUser, [type]: value };
      setLocalUser(updatedUser);
      if (onUpdate) onUpdate(updatedUser);

      toast({
        title: 'نجح',
        description: 'تم تحديث البيانات بنجاح',
      });
      
      setCurrentEditType(null);
      setEditValue('');
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPoints = async () => {
    if (!currentUser || currentUser.isGuest || !pointsToSend) return;

    const points = parseInt(pointsToSend);
    if (points <= 0 || points > (currentUser.totalPoints || 0)) {
      toast({
        title: 'خطأ',
        description: 'عدد النقاط غير صالح',
        variant: 'destructive',
      });
      return;
    }

    setSendingPoints(true);
    try {
      await apiRequest('/api/points/transfer', {
        method: 'POST',
        body: {
          recipientId: localUser.id,
          points,
        },
      });

      setPointsSentNotification({
        show: true,
        points,
        recipientName: localUser.displayName,
      });

      setPointsToSend('');
      if (onUpdate && currentUser) {
        onUpdate({
          ...currentUser,
          totalPoints: (currentUser.totalPoints || 0) - points,
        });
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إرسال النقاط',
        variant: 'destructive',
      });
    } finally {
      setSendingPoints(false);
    }
  };

  const handleThemeChange = async (color: string, effect: string) => {
    if (!isOwnProfile) return;

    setIsLoading(true);
    try {
      await apiRequest(`/api/users/${localUser.id}`, {
        method: 'PATCH',
        body: {
          profileBackgroundColor: color,
          profileEffect: effect,
        },
      });

      const updatedUser = {
        ...localUser,
        profileBackgroundColor: color,
        profileEffect: effect,
      };
      
      setLocalUser(updatedUser);
      setSelectedTheme(color);
      setSelectedEffect(effect);
      
      if (onUpdate) onUpdate(updatedUser);

      toast({
        title: 'نجح',
        description: 'تم تحديث المظهر بنجاح',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث المظهر',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      
      <div 
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto bg-background rounded-lg shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
        style={{
          background: localUser.profileBackgroundColor 
            ? `linear-gradient(135deg, ${localUser.profileBackgroundColor}22 0%, transparent 100%)`
            : undefined,
        }}
      >
        <ProfileHeader
          user={localUser}
          isOwnProfile={isOwnProfile}
          onClose={onClose}
          onBannerClick={() => bannerInputRef.current?.click()}
          bannerInputRef={bannerInputRef}
          onBannerChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')}
        />

        <ProfileAvatar
          user={localUser}
          isOwnProfile={isOwnProfile}
          onAvatarClick={() => avatarInputRef.current?.click()}
          avatarInputRef={avatarInputRef}
          onAvatarChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')}
        />

        <ProfileInfo
          user={localUser}
          isOwnProfile={isOwnProfile}
          onEditClick={(type, value) => {
            setCurrentEditType(type);
            setEditValue(value);
          }}
        />

        {isOwnProfile && (
          <ProfileThemeSelector
            selectedTheme={selectedTheme}
            selectedEffect={selectedEffect}
            onThemeChange={handleThemeChange}
            disabled={isLoading}
          />
        )}

        <ProfileActions
          user={localUser}
          currentUser={currentUser}
          isOwnProfile={isOwnProfile}
          sendingPoints={sendingPoints}
          pointsToSend={pointsToSend}
          onPrivateMessage={() => onPrivateMessage?.(localUser)}
          onAddFriend={() => onAddFriend?.(localUser)}
          onReportUser={() => onReportUser?.(localUser)}
          onIgnoreUser={() => onIgnoreUser?.(localUser.id)}
          onPointsChange={setPointsToSend}
          onSendPoints={handleSendPoints}
        />
      </div>

      {currentEditType && (
        <ProfileEditDialog
          type={currentEditType}
          value={editValue}
          onChange={setEditValue}
          onSave={handleEditSave}
          onCancel={() => {
            setCurrentEditType(null);
            setEditValue('');
          }}
          isLoading={isLoading}
        />
      )}

      {pointsSentNotification.show && (
        <PointsSentNotification
          points={pointsSentNotification.points}
          recipientName={pointsSentNotification.recipientName}
          onComplete={() => setPointsSentNotification({ show: false, points: 0, recipientName: '' })}
        />
      )}
    </>
  );
}
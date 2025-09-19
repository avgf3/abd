import { X } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import PointsSentNotification from '@/components/ui/PointsSentNotification';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { getProfileImageSrc, getBannerImageSrc } from '@/utils/imageUtils';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import {
  getEffectColor,
  getFinalUsernameColor,
  buildProfileBackgroundGradient,
} from '@/utils/themeUtils';
import { getCountryFlag } from '@/utils';
import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import CountryFlag from '@/components/ui/CountryFlag';
import ProfileImage from './ProfileImage';
import { useStories } from '@/hooks/useStories';
import { useRoomManager } from '@/hooks/useRoomManager';
import { getSocket } from '@/lib/socket';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onUpdate?: (user: ChatUser) => void;
  onUserClick?: (user: ChatUser) => void;
  // عند التفعيل: يتم إدارة الصوت خارجياً من ChatInterface
  externalAudioManaged?: boolean;
}

export default function ProfileModal({
  user,
  currentUser,
  onClose,
  onUpdate,
  onUserClick,
  externalAudioManaged,
}: ProfileModalProps) {
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sendingPoints, setSendingPoints] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [showPointsNotification, setShowPointsNotification] = useState(false);
  const [pointsNotificationMessage, setPointsNotificationMessage] = useState('');
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(70);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState('');
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [deletingMusic, setDeletingMusic] = useState(false);
  const [showMusicUpload, setShowMusicUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'music' | 'settings'>('info');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const { stories } = useStories();
  const { resolveRoomName } = useRoomManager();

  const isOwnProfile = currentUser?.id === localUser?.id;
  const levelInfo = getLevelInfo(localUser?.level || 1);

  // مزامنة حالة المستخدم المحلي
  useEffect(() => {
    if (user) {
      setLocalUser((prev) => {
        if (prev && prev.id === user.id) {
          return { ...prev, ...user };
        }
        return user;
      });
    } else {
      setLocalUser(null);
    }
  }, [user]);

  // تهيئة الموسيقى عند تحميل المستخدم
  useEffect(() => {
    if (localUser?.profileMusicUrl && audioRef.current && !externalAudioManaged) {
      audioRef.current.src = localUser.profileMusicUrl;
      audioRef.current.load();
      setMusicVolume(localUser.profileMusicVolume || 70);
      setMusicEnabled(localUser.profileMusicEnabled ?? true);
    }
  }, [localUser?.profileMusicUrl, externalAudioManaged]);

  // توحيد لون خلفية الملف الشخصي للأعضاء والزوار
  const isMemberOrGuest = (localUser?.userType === 'member' || localUser?.userType === 'guest');
  const forcedBotColor = '#2a2a2a';
  const resolvedProfileColor = isMemberOrGuest
    ? forcedBotColor
    : (localUser?.profileBackgroundColor || '');
  const computedGradient = buildProfileBackgroundGradient(resolvedProfileColor) ||
    'linear-gradient(135deg, #1a1a1a, #2d2d2d)';

  const handleImageUpdate = (imageUrl: string) => {
    if (localUser) {
      const updatedUser = { ...localUser, profileImage: imageUrl };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);
    }
  };

  const handleBannerUpdate = (bannerUrl: string) => {
    if (localUser) {
      const updatedUser = { ...localUser, profileBanner: bannerUrl };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditingField(field);
    switch (field) {
      case 'username':
        setEditValue(localUser?.username || '');
        break;
      case 'age':
        setEditValue(localUser?.age?.toString() || '');
        break;
      case 'gender':
        setEditValue(localUser?.gender || '');
        break;
      case 'country':
        setEditValue(localUser?.country || '');
        break;
      case 'relation':
        setEditValue(localUser?.relation || '');
        break;
      case 'bio':
        setEditValue(localUser?.bio || '');
        break;
    }
  };

  const handleFieldSave = async (field: string) => {
    if (!localUser) return;

    try {
      const updateData: any = {};
      
      switch (field) {
        case 'username':
          if (!editValue.trim()) {
            toast({
              title: 'خطأ',
              description: 'اسم المستخدم مطلوب',
              variant: 'destructive',
            });
            return;
          }
          updateData.username = editValue.trim();
          break;
        case 'age':
          const age = parseInt(editValue);
          if (isNaN(age) || age < 13 || age > 120) {
            toast({
              title: 'خطأ',
              description: 'العمر يجب أن يكون بين 13 و 120 سنة',
              variant: 'destructive',
            });
            return;
          }
          updateData.age = age;
          break;
        case 'gender':
          if (!['ذكر', 'أنثى'].includes(editValue)) {
            toast({
              title: 'خطأ',
              description: 'الجنس يجب أن يكون ذكر أو أنثى',
              variant: 'destructive',
            });
            return;
          }
          updateData.gender = editValue;
          break;
        case 'country':
          if (!editValue.trim()) {
            toast({
              title: 'خطأ',
              description: 'البلد مطلوب',
              variant: 'destructive',
            });
            return;
          }
          updateData.country = editValue.trim();
          break;
        case 'relation':
          updateData.relation = editValue;
          break;
        case 'bio':
          if (editValue.length > 500) {
            toast({
              title: 'خطأ',
              description: 'السيرة الذاتية يجب أن تكون أقل من 500 حرف',
              variant: 'destructive',
            });
            return;
          }
          updateData.bio = editValue.trim();
          break;
      }

      await apiRequest(`/api/users/${localUser.id}`, {
        method: 'PUT',
        body: updateData,
      });

      const updatedUser = { ...localUser, ...updateData };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);

      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث البيانات بنجاح',
      });

      setEditingField(null);
    } catch (error: any) {
      toast({
        title: 'خطأ في الحفظ',
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
        variant: 'destructive',
      });
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSendPoints = async () => {
    if (!localUser || !currentUser || sendingPoints) return;

    const amount = parseInt(pointsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive',
      });
      return;
    }

    if (amount > (currentUser.points || 0)) {
      toast({
        title: 'نقاط غير كافية',
        description: 'ليس لديك نقاط كافية',
        variant: 'destructive',
      });
      return;
    }

    setSendingPoints(true);

    try {
      const response = await apiRequest(`/api/users/${localUser.id}/send-points`, {
        method: 'POST',
        body: { amount },
      });

      if (response.success) {
        // تحديث النقاط المحلية
        const updatedUser = { ...localUser, points: (localUser.points || 0) + amount };
        setLocalUser(updatedUser);
        onUpdate?.(updatedUser);

        // إظهار إشعار النجاح
        setPointsNotificationMessage(`تم إرسال ${amount} نقطة بنجاح!`);
        setShowPointsNotification(true);

        // إخفاء الإشعار بعد 3 ثوان
        setTimeout(() => {
          setShowPointsNotification(false);
        }, 3000);

        toast({
          title: 'تم إرسال النقاط',
          description: `تم إرسال ${amount} نقطة إلى ${localUser.username}`,
        });
      } else {
        throw new Error(response.error || 'فشل في إرسال النقاط');
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في إرسال النقاط',
        description: error.message || 'حدث خطأ أثناء إرسال النقاط',
        variant: 'destructive',
      });
    } finally {
      setSendingPoints(false);
      setPointsAmount('');
    }
  };

  const handleMusicPlayPause = () => {
    if (!audioRef.current || externalAudioManaged) return;

    if (isPlayingMusic) {
      audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      audioRef.current.play().catch(() => {
        toast({
          title: 'خطأ في تشغيل الموسيقى',
          description: 'تأكد من أن الملف صالح',
          variant: 'destructive',
        });
      });
      setIsPlayingMusic(true);
    }
  };

  const handleMusicVolumeChange = (volume: number) => {
    setMusicVolume(volume);
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }

    // حفظ الإعدادات
    if (isOwnProfile && localUser) {
      apiRequest(`/api/users/${localUser.id}`, {
        method: 'PUT',
        body: { profileMusicVolume: volume },
      }).catch(() => {});
    }
  };

  const handleMusicToggle = (enabled: boolean) => {
    setMusicEnabled(enabled);
    if (audioRef.current) {
      audioRef.current.muted = !enabled;
    }

    // حفظ الإعدادات
    if (isOwnProfile && localUser) {
      apiRequest(`/api/users/${localUser.id}`, {
        method: 'PUT',
        body: { profileMusicEnabled: enabled },
      }).catch(() => {});
    }
  };

  const handleMusicFileSelect = async (file: File) => {
    if (!isOwnProfile) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'خطأ في نوع الملف',
        description: 'يرجى اختيار ملف صوتي صالح',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: 'حجم الملف كبير',
        description: 'حجم الملف يجب أن يكون أقل من 10 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    setMusicFile(file);
    setMusicTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleMusicUpload = async () => {
    if (!musicFile || !isOwnProfile || !localUser) return;

    setUploadingMusic(true);
    try {
      const formData = new FormData();
      formData.append('music', musicFile);
      formData.append('userId', localUser.id.toString());
      formData.append('title', musicTitle);

      const result = await apiRequest('/api/upload/profile-music', {
        method: 'POST',
        body: formData,
      });

      if (result.success) {
        const updatedUser = {
          ...localUser,
          profileMusicUrl: result.musicUrl,
          profileMusicTitle: musicTitle,
        };
        setLocalUser(updatedUser);
        onUpdate?.(updatedUser);

        toast({
          title: 'تم رفع الموسيقى بنجاح',
          description: 'تم تحديث موسيقى البروفايل',
        });

        setMusicFile(null);
        setMusicTitle('');
        setShowMusicUpload(false);
        if (musicFileInputRef.current) {
          musicFileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.error || 'فشل في رفع الموسيقى');
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في رفع الموسيقى',
        description: error.message || 'حدث خطأ أثناء رفع الموسيقى',
        variant: 'destructive',
      });
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleDeleteMusic = async () => {
    if (!isOwnProfile || !localUser) return;

    setDeletingMusic(true);
    try {
      await apiRequest(`/api/users/${localUser.id}/profile-music`, {
        method: 'DELETE',
      });

      const updatedUser = {
        ...localUser,
        profileMusicUrl: null,
        profileMusicTitle: '',
      };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);

      toast({
        title: 'تم حذف الموسيقى',
        description: 'تم حذف موسيقى البروفايل',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في الحذف',
        description: 'حدث خطأ أثناء حذف الموسيقى',
        variant: 'destructive',
      });
    } finally {
      setDeletingMusic(false);
    }
  };

  const handleUserClick = (e: React.MouseEvent, clickedUser: ChatUser) => {
    e.preventDefault();
    e.stopPropagation();
    onUserClick?.(clickedUser);
  };

  const getLastSeenText = () => {
    if (!localUser?.lastSeen) return 'لم يتم تسجيل آخر تواجد';
    
    const lastSeen = new Date(localUser.lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (localUser.isOnline) {
      return 'متصل الآن';
    } else if (diffMins < 1) {
      return 'كان هنا للتو';
    } else if (diffMins < 60) {
      return `منذ ${diffMins} دقيقة`;
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      return `منذ ${diffDays} يوم`;
    } else {
      return lastSeen.toLocaleDateString('ar-SA');
    }
  };

  const getCurrentRoomText = () => {
    if (!localUser?.currentRoom) return 'غير متصل';
    
    try {
      const roomName = resolveRoomName(localUser.currentRoom);
      return roomName || localUser.currentRoom;
    } catch {
      return localUser.currentRoom;
    }
  };

  if (!localUser) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative">
          {/* Banner */}
          <div 
            className="h-48 w-full bg-cover bg-center relative"
            style={{
              backgroundImage: localUser.profileBanner 
                ? `url(${getBannerImageSrc(localUser.profileBanner)})` 
                : computedGradient,
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Profile Image */}
            <div className="absolute bottom-0 left-4 transform translate-y-1/2">
              <ProfileImage user={localUser} size="large" />
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="pt-16 pb-4 px-4">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold">{localUser.username}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    المستوى {localUser.level || 1}
                  </span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {formatPoints(localUser.points || 0)} نقطة
                  </span>
                  {localUser.country && (
                    <>
                      <span className="text-sm text-muted-foreground">•</span>
                      <CountryFlag country={localUser.country} size={16} />
                      <span className="text-sm text-muted-foreground">{localUser.country}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Tabs */}
          <div className="flex space-x-1 mb-4">
            <Button
              variant={activeTab === 'info' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('info')}
              className="flex-1"
            >
              المعلومات
            </Button>
            <Button
              variant={activeTab === 'music' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('music')}
              className="flex-1"
            >
              الموسيقى
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('settings')}
              className="flex-1"
            >
              الإعدادات
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">الاسم</label>
                  {editingField === 'username' ? (
                    <div className="space-y-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="اسم المستخدم"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleFieldSave('username')}>
                          حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleFieldCancel}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{localUser.username}</p>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit('username')}
                        >
                          تعديل
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">العمر</label>
                  {editingField === 'age' ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="العمر"
                        min="13"
                        max="120"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleFieldSave('age')}>
                          حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleFieldCancel}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{localUser.age || 'غير محدد'}</p>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit('age')}
                        >
                          تعديل
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">الجنس</label>
                  {editingField === 'gender' ? (
                    <div className="space-y-2">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">اختر الجنس</option>
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleFieldSave('gender')}>
                          حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleFieldCancel}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{localUser.gender || 'غير محدد'}</p>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit('gender')}
                        >
                          تعديل
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">البلد</label>
                  {editingField === 'country' ? (
                    <div className="space-y-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="البلد"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleFieldSave('country')}>
                          حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleFieldCancel}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{localUser.country || 'غير محدد'}</p>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit('country')}
                        >
                          تعديل
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">الحالة الاجتماعية</label>
                  {editingField === 'relation' ? (
                    <div className="space-y-2">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">اختر الحالة</option>
                        <option value="أعزب">أعزب</option>
                        <option value="متزوج">متزوج</option>
                        <option value="مطلق">مطلق</option>
                        <option value="أرمل">أرمل</option>
                        <option value="في علاقة">في علاقة</option>
                        <option value="غير محدد">غير محدد</option>
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleFieldSave('relation')}>
                          حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleFieldCancel}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{localUser.relation || 'غير محدد'}</p>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit('relation')}
                        >
                          تعديل
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">نبذة شخصية</label>
                {editingField === 'bio' ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="اكتب نبذة شخصية عنك..."
                      className="w-full p-2 border rounded min-h-[100px]"
                      maxLength={500}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {editValue.length}/500 حرف
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleFieldSave('bio')}>
                        حفظ
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleFieldCancel}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground flex-1">
                      {localUser.bio || 'لا توجد نبذة شخصية'}
                    </p>
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFieldEdit('bio')}
                      >
                        تعديل
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{formatPoints(localUser.points || 0)}</div>
                  <div className="text-sm text-muted-foreground">النقاط</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{localUser.level || 1}</div>
                  <div className="text-sm text-muted-foreground">المستوى</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{levelInfo.progress}%</div>
                  <div className="text-sm text-muted-foreground">التقدم</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>التقدم للمستوى التالي</span>
                  <span>{levelInfo.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${levelInfo.progress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {levelInfo.pointsNeeded} نقطة للوصول للمستوى {levelInfo.nextLevel}
                </div>
              </div>

              {/* Send Points */}
              {!isOwnProfile && currentUser && (currentUser.points || 0) > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">إرسال نقاط</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="المبلغ"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                      min="1"
                      max={currentUser.points || 0}
                    />
                    <Button
                      onClick={handleSendPoints}
                      disabled={sendingPoints || !pointsAmount}
                    >
                      {sendingPoints ? 'جاري الإرسال...' : 'إرسال'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Last Seen */}
              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">آخر تواجد:</span> {getLastSeenText()}
                </div>
                {localUser.currentRoom && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">الغرفة الحالية:</span> {getCurrentRoomText()}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'music' && (
            <div className="space-y-4">
              {/* Current Music */}
              {localUser.profileMusicUrl && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">موسيقى البروفايل الحالية</h3>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleMusicPlayPause}
                      variant="outline"
                      size="sm"
                      disabled={externalAudioManaged}
                    >
                      {isPlayingMusic ? '⏸️' : '▶️'}
                    </Button>
                    
                    <div className="flex-1">
                      <p className="font-medium">{localUser.profileMusicTitle || 'بدون عنوان'}</p>
                      <p className="text-sm text-muted-foreground">موسيقى البروفايل</p>
                    </div>

                    {isOwnProfile && (
                      <Button
                        onClick={handleDeleteMusic}
                        variant="destructive"
                        size="sm"
                        disabled={deletingMusic}
                      >
                        {deletingMusic ? 'جاري الحذف...' : 'حذف'}
                      </Button>
                    )}
                  </div>

                  {/* Music Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">تفعيل الموسيقى</label>
                      <input
                        type="checkbox"
                        checked={musicEnabled}
                        onChange={(e) => handleMusicToggle(e.target.checked)}
                        disabled={externalAudioManaged}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">مستوى الصوت</label>
                        <span className="text-sm text-muted-foreground">{musicVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        onChange={(e) => handleMusicVolumeChange(parseInt(e.target.value))}
                        disabled={externalAudioManaged}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload New Music */}
              {isOwnProfile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">رفع موسيقى جديدة</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMusicUpload(!showMusicUpload)}
                    >
                      {showMusicUpload ? 'إخفاء' : 'إظهار'}
                    </Button>
                  </div>

                  {showMusicUpload && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">اختر ملف صوتي</label>
                        <input
                          ref={musicFileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMusicFileSelect(file);
                          }}
                          className="w-full p-2 border rounded"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          الصيغ المدعومة: MP3, WAV, OGG. الحد الأقصى: 10MB
                        </p>
                      </div>

                      {musicFile && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">عنوان الموسيقى</label>
                          <Input
                            value={musicTitle}
                            onChange={(e) => setMusicTitle(e.target.value)}
                            placeholder="عنوان الموسيقى"
                          />
                        </div>
                      )}

                      {musicFile && (
                        <Button
                          onClick={handleMusicUpload}
                          disabled={uploadingMusic || !musicTitle.trim()}
                          className="w-full"
                        >
                          {uploadingMusic ? 'جاري الرفع...' : 'رفع الموسيقى'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Element */}
              <audio
                ref={audioRef}
                onEnded={() => setIsPlayingMusic(false)}
                onError={() => {
                  toast({
                    title: 'خطأ في تشغيل الموسيقى',
                    description: 'تأكد من أن الملف صالح',
                    variant: 'destructive',
                  });
                }}
                volume={musicVolume / 100}
                muted={!musicEnabled}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              {isOwnProfile && (
                <>
                  {/* Profile Image Upload */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">صورة البروفايل</h3>
                    <div className="flex items-center gap-4">
                      <ProfileImage user={localUser} size="medium" />
                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Handle image upload logic here
                              console.log('Image selected:', file);
                            }
                          }}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          تغيير الصورة
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Banner Upload */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">صورة البانر</h3>
                    <div className="space-y-2">
                      <div
                        className="h-24 w-full bg-cover bg-center rounded border"
                        style={{
                          backgroundImage: localUser.profileBanner 
                            ? `url(${getBannerImageSrc(localUser.profileBanner)})` 
                            : computedGradient,
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Handle banner upload logic here
                          console.log('Banner upload clicked');
                        }}
                      >
                        تغيير البانر
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Points Notification */}
        {showPointsNotification && (
          <PointsSentNotification
            message={pointsNotificationMessage}
            onClose={() => setShowPointsNotification(false)}
          />
        )}
      </div>
    </div>
  );
}
import { X } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
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
import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import ProfileImage from '@/components/chat/ProfileImage';

interface ProfileCardProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose?: () => void;
  onIgnoreUser?: (userId: number) => void;
  onUpdate?: (user: ChatUser) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
  onReportUser?: (user: ChatUser) => void;
  isEmbedded?: boolean; // للتحكم في عرض البطاقة كجزء من صفحة أو كمودال
  showActions?: boolean; // للتحكم في عرض الأزرار
}

export default function ProfileCard({
  user,
  currentUser,
  onClose,
  onIgnoreUser,
  onUpdate,
  onPrivateMessage,
  onAddFriend,
  onReportUser,
  isEmbedded = false,
  showActions = true,
}: ProfileCardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // حالة محلية للمستخدم للتحديث الفوري
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);
  const [selectedTheme, setSelectedTheme] = useState(user?.profileBackgroundColor || '');
  const [selectedEffect, setSelectedEffect] = useState(user?.profileEffect || 'none');

  // متغيرات نظام إرسال النقاط
  const [sendingPoints, setSendingPoints] = useState(false);
  const [pointsToSend, setPointsToSend] = useState('');
  const [pointsSentNotification, setPointsSentNotification] = useState<{
    show: boolean;
    points: number;
    recipientName: string;
  }>({ show: false, points: 0, recipientName: '' });

  // تحديث الحالة المحلية عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setLocalUser(user);
      setSelectedTheme(user.profileBackgroundColor || '');
      setSelectedEffect(user.profileEffect || 'none');
    }
  }, [user]);

  // معالجة محسنة للحالات الفارغة
  if (!localUser || !user) {
    if (onClose) onClose();
    return null;
  }

  // دالة موحدة لجلب بيانات المستخدم من السيرفر وتحديث الحالة المحلية
  const fetchAndUpdateUser = async (userId: number) => {
    try {
      const userData = await apiRequest(`/api/users/${userId}?t=${Date.now()}`);
      setLocalUser(userData);
      if (onUpdate) onUpdate(userData);

      // تحديث لون الخلفية والتأثير المحلي
      if (userData.profileBackgroundColor) {
        setSelectedTheme(userData.profileBackgroundColor);
      }
      if (userData.profileEffect) {
        setSelectedEffect(userData.profileEffect);
      }
    } catch (err: any) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', err);
      toast({
        title: 'خطأ',
        description: err.message || 'فشل في تحديث بيانات الملف الشخصي من السيرفر',
        variant: 'destructive',
      });
    }
  };

  // تحديث المستخدم المحلي والخارجي
  const updateUserData = (updates: Partial<ChatUser>) => {
    const updatedUser = { ...localUser, ...updates };
    setLocalUser(updatedUser);

    if (onUpdate) {
      onUpdate(updatedUser);
    }

    // تحديث لون الخلفية والتأثير إذا تم تغييرهما
    if (updates.profileBackgroundColor) {
      setSelectedTheme(updates.profileBackgroundColor);
    }
    if (updates.profileEffect) {
      setSelectedEffect(updates.profileEffect);
    }
  };

  // Themes collection
  const themes = [
    {
      value: 'theme-sunset-glow',
      name: 'توهج الغروب',
      preview: 'linear-gradient(135deg, #ff6b6b, #ff8e53, #ffa726, #ffcc02, #ff6b6b)',
      emoji: '🌅',
    },
    {
      value: 'theme-ocean-depths',
      name: 'أعماق المحيط',
      preview: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea)',
      emoji: '🌊',
    },
    // يمكن إضافة المزيد من الثيمات هنا
  ];

  // Effects collection
  const effects = [
    {
      value: 'none',
      name: 'بدون تأثيرات',
      emoji: '🚫',
      description: 'بدون أي تأثيرات حركية',
    },
    {
      value: 'effect-pulse',
      name: 'النبض الناعم',
      emoji: '💓',
      description: 'نبض خفيف ومريح',
    },
    // يمكن إضافة المزيد من التأثيرات هنا
  ];

  // Profile image fallback
  const getProfileImageSrcLocal = () => {
    return getProfileImageSrc(localUser?.profileImage);
  };

  // Profile banner fallback
  const getProfileBannerSrcLocal = () => {
    return getBannerImageSrc(localUser?.profileBanner);
  };

  // Edit modal handlers
  const openEditModal = (type: string) => {
    setCurrentEditType(type);

    switch (type) {
      case 'name':
        setEditValue(localUser?.username || '');
        break;
      case 'status':
        setEditValue(localUser?.status || '');
        break;
      case 'gender':
        setEditValue(localUser?.gender || '');
        break;
      case 'country':
        setEditValue(localUser?.country || '');
        break;
      case 'age':
        setEditValue(localUser?.age?.toString() || '');
        break;
      case 'socialStatus':
        setEditValue(localUser?.relation || '');
        break;
    }
  };

  const closeEditModal = () => {
    setCurrentEditType(null);
    setEditValue('');
  };

  // معالجة رفع الملفات
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    uploadType: 'profile' | 'banner' = 'profile'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF, WebP, SVG)',
        variant: 'destructive',
      });
      return;
    }

    // التحقق من حجم الملف
    const maxSize = uploadType === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'خطأ',
        description:
          uploadType === 'profile'
            ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت'
            : 'حجم الغلاف يجب أن يكون أقل من 10 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const formData = new FormData();
      if (uploadType === 'profile') {
        formData.append('profileImage', file);
      } else {
        formData.append('banner', file);
      }

      if (currentUser?.id) {
        formData.append('userId', currentUser.id.toString());
      }

      const endpoint =
        uploadType === 'profile' ? '/api/upload/profile-image' : '/api/upload/profile-banner';
      const result = await apiRequest(endpoint, { method: 'POST', body: formData });

      if (!result.success) {
        throw new Error(result.error || 'فشل في رفع الصورة');
      }

      // تحديث البيانات المحلية فوراً
      if (uploadType === 'profile' && result.imageUrl) {
        updateUserData({ profileImage: result.imageUrl });
      } else if (uploadType === 'banner' && result.bannerUrl) {
        updateUserData({ profileBanner: result.bannerUrl });
      }

      // جلب البيانات المحدثة من السيرفر
      if (currentUser?.id) {
        await fetchAndUpdateUser(currentUser.id);
      }

      toast({
        title: 'نجح ✅',
        description: uploadType === 'profile' ? 'تم تحديث الصورة الشخصية' : 'تم تحديث صورة الغلاف',
      });
    } catch (error: any) {
      console.error(`❌ خطأ في رفع ${uploadType}:`, error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحميل الصورة',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // حفظ تعديل البيانات
  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال قيمة صحيحة', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      let fieldName = '';
      switch (currentEditType) {
        case 'name':
          fieldName = 'username';
          break;
        case 'status':
          fieldName = 'status';
          break;
        case 'gender':
          fieldName = 'gender';
          break;
        case 'country':
          fieldName = 'country';
          break;
        case 'age':
          fieldName = 'age';
          break;
        case 'socialStatus':
          fieldName = 'relation';
          break;
      }
      const response = await apiRequest('/api/users/update-profile', {
        method: 'POST',
        body: { userId: currentUser?.id, [fieldName]: editValue },
      });
      if ((response as any).success) {
        if (currentUser?.id) {
          await fetchAndUpdateUser(currentUser.id);
        }
        toast({ title: 'نجح ✅', description: 'تم تحديث الملف الشخصي' });
        closeEditModal();
      } else {
        throw new Error((response as any).error || 'فشل في التحديث');
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث البيانات. تحقق من اتصال الإنترنت.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة إرسال النقاط
  const handleSendPoints = async () => {
    const points = parseInt(pointsToSend);

    if (!points || points <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال عدد صحيح من النقاط',
        variant: 'destructive',
      });
      return;
    }

    if (
      !(currentUser?.userType === 'owner' || currentUser?.role === 'owner') &&
      points > (currentUser?.points || 0)
    ) {
      toast({
        title: 'نقاط غير كافية',
        description: `لديك ${currentUser?.points || 0} نقطة فقط`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingPoints(true);

      const response = await apiRequest('/api/points/send', {
        method: 'POST',
        body: {
          senderId: currentUser?.id,
          receiverId: localUser?.id,
          points: points,
          reason: `نقاط مُهداة من ${currentUser?.username}`,
        },
      });

      if (response.success) {
        // إظهار إشعار النجاح
        setPointsSentNotification({
          show: true,
          points: points,
          recipientName: localUser?.username || '',
        });

        setPointsToSend('');

        // تحديث النقاط محلياً
        if (currentUser && (window as any).updateUserPoints) {
          if (currentUser?.userType === 'owner' || currentUser?.role === 'owner') {
            (window as any).updateUserPoints(currentUser.points);
          } else {
            (window as any).updateUserPoints(currentUser.points - points);
          }
        }

        // إغلاق البروفايل بعد الإرسال الناجح
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في الإرسال',
        description: error.message || 'فشل في إرسال النقاط',
        variant: 'destructive',
      });
    } finally {
      setSendingPoints(false);
    }
  };

  const cardContent = (
    <div
      className={`profile-card ${selectedEffect} ${isEmbedded ? 'w-full' : 'max-w-[440px]'}`}
      style={{
        background: localUser?.profileBackgroundColor
          ? buildProfileBackgroundGradient(localUser.profileBackgroundColor)
          : 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        position: 'relative',
      }}
    >
      {/* Close Button - فقط في وضع المودال */}
      {!isEmbedded && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors shadow-lg"
        >
          <X size={20} />
        </button>
      )}

      {/* Cover Section */}
      <div
        className="relative h-[250px] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: getProfileBannerSrcLocal() ? `url(${getProfileBannerSrcLocal()})` : 'none',
        }}
      >
        {localUser?.id === currentUser?.id && (
          <>
            <button
              className="absolute top-3 left-3 bg-black/70 rounded-lg px-3 py-2 text-white text-xs cursor-pointer z-[3] transition-all hover:bg-black/90"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              🖼️ تغيير الغلاف
            </button>
            
            {/* اسم المستخدم مع الرتبة */}
            <div className="absolute bottom-[60px] left-[160px] flex flex-col items-center gap-[2px] z-[3]">
              {/* الرتبة فوق الاسم */}
              {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    {localUser?.userType === 'owner' && 'Owner'}
                    {localUser?.userType === 'admin' && 'Super Admin'}
                    {localUser?.userType === 'moderator' && 'Moderator'}
                  </span>
                  <span className="text-base">
                    {getUserLevelIcon(localUser, 16)}
                    {localUser?.userType === 'admin' && '⭐'}
                  </span>
                </div>
              )}
              {/* الاسم */}
              <h3
                className="m-0 text-lg font-bold cursor-pointer"
                style={{
                  color: getFinalUsernameColor(localUser || {}),
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
                onClick={() => openEditModal('name')}
              >
                {localUser?.username || 'اسم المستخدم'}
              </h3>
            </div>
          </>
        )}

        {localUser?.id !== currentUser?.id && (
          <>
            {/* اسم المستخدم مع الرتبة */}
            <div className="absolute bottom-[70px] left-[160px] flex flex-col items-center gap-[2px] z-[3]">
              {/* الرتبة فوق الاسم */}
              {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    {localUser?.userType === 'owner' && 'Owner'}
                    {localUser?.userType === 'admin' && 'Super Admin'}
                    {localUser?.userType === 'moderator' && 'Moderator'}
                  </span>
                  <span className="text-base">
                    {getUserLevelIcon(localUser, 16)}
                    {localUser?.userType === 'admin' && '⭐'}
                  </span>
                </div>
              )}
              {/* الاسم */}
              <h3
                className="m-0 text-lg font-bold"
                style={{
                  color: getFinalUsernameColor(localUser || {}),
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                {localUser?.username || 'اسم المستخدم'}
              </h3>
            </div>
            
            {/* الأزرار */}
            {showActions && (
              <div className="absolute bottom-[45px] left-[160px] flex gap-2 items-center z-[3]">
                <button
                  className="bg-gradient-to-r from-[#3490dc] to-[#2779bd] text-white px-[10px] py-[6px] rounded-lg font-bold text-xs cursor-pointer shadow-lg transition-all hover:translate-y-[-1px] hover:shadow-xl"
                  onClick={() => onPrivateMessage?.(localUser)}
                >
                  💬 محادثة خاصة
                </button>
                <button
                  className="bg-gradient-to-r from-[#38a169] to-[#2f855a] text-white px-[10px] py-[6px] rounded-lg font-bold text-xs cursor-pointer shadow-lg transition-all hover:translate-y-[-1px] hover:shadow-xl"
                  onClick={() => onAddFriend?.(localUser)}
                >
                  👥 إضافة صديق
                </button>
                <button
                  className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white px-[10px] py-[6px] rounded-lg font-bold text-xs cursor-pointer shadow-lg transition-all hover:translate-y-[-1px] hover:shadow-xl"
                  onClick={() => onIgnoreUser?.(localUser?.id || 0)}
                >
                  🚫 تجاهل
                </button>
                <button
                  className="bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white px-[10px] py-[6px] rounded-lg font-bold text-xs cursor-pointer shadow-lg transition-all hover:translate-y-[-1px] hover:shadow-xl"
                  onClick={() => onReportUser?.(localUser)}
                >
                  🚩 إبلاغ
                </button>
              </div>
            )}
          </>
        )}

        {/* Profile Avatar */}
        <div className="absolute top-[calc(100%-90px)] right-5 w-[130px] h-[130px] rounded-2xl overflow-hidden border-4 border-white/90 bg-black/50 shadow-xl z-[2] transition-transform hover:scale-105">
          {localUser ? (
            <ProfileImage user={localUser as any} size="large" className="w-full h-full" />
          ) : (
            <img
              src={getProfileImageSrcLocal()}
              alt="الصورة الشخصية"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {localUser?.id === currentUser?.id && (
          <button
            className="absolute top-[calc(100%-57px)] right-[28px] bg-black/80 rounded-full w-[30px] h-[30px] text-center leading-[30px] text-sm text-white cursor-pointer z-[3] transition-all hover:bg-black hover:scale-110"
            onClick={() => avatarInputRef.current?.click()}
            title="تغيير الصورة"
            disabled={isLoading}
          >
            📷
          </button>
        )}
      </div>

      {/* Profile Body */}
      <div className="p-5">
        <div className="mb-3 text-center">
          <small
            className="block text-sm text-gray-300 opacity-90 cursor-pointer transition-all hover:text-white hover:translate-y-[-1px]"
            onClick={() => localUser?.id === currentUser?.id && openEditModal('status')}
            style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
          >
            {localUser?.status || 'اضغط لإضافة حالة'}
          </small>
        </div>

        <div className="p-3 text-sm bg-white/5 rounded-xl mb-3 border border-white/10 backdrop-blur-lg">
          <p
            className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5 cursor-pointer hover:bg-white/5 hover:translate-x-[-3px]"
            onClick={() => localUser?.id === currentUser?.id && openEditModal('gender')}
            style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
          >
            🧍‍♀️ الجنس: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">{localUser?.gender || 'غير محدد'}</span>
          </p>
          <p
            className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5 cursor-pointer hover:bg-white/5 hover:translate-x-[-3px]"
            onClick={() => localUser?.id === currentUser?.id && openEditModal('country')}
            style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
          >
            🌍 البلد: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">{localUser?.country || 'غير محدد'}</span>
          </p>
          <p
            className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5 cursor-pointer hover:bg-white/5 hover:translate-x-[-3px]"
            onClick={() => localUser?.id === currentUser?.id && openEditModal('age')}
            style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
          >
            🎂 العمر: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">{localUser?.age ? `${localUser.age} سنة` : 'غير محدد'}</span>
          </p>
          <p
            className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5 cursor-pointer hover:bg-white/5 hover:translate-x-[-3px]"
            onClick={() => localUser?.id === currentUser?.id && openEditModal('socialStatus')}
            style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
          >
            💍 الحالة الاجتماعية: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">{localUser?.relation || 'غير محدد'}</span>
          </p>
          <p className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5">
            📅 تاريخ الإنضمام:{' '}
            <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">
              {localUser?.createdAt
                ? new Date(localUser.createdAt).toLocaleDateString('ar-SA')
                : 'غير محدد'}
            </span>
          </p>
          <p className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5">
            🎁 نقاط الهدايا: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">{localUser?.points || 0}</span>
          </p>
          {/* إرسال النقاط */}
          {currentUser && currentUser.id !== localUser?.id && (
            <p
              className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all border-b border-white/5 cursor-pointer hover:bg-white/5 hover:translate-x-[-3px]"
              onClick={() => setCurrentEditType('sendPoints')}
            >
              💰 إرسال النقاط: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">اضغط للإرسال</span>
            </p>
          )}
          <p className="my-1.5 flex justify-between items-center px-2 py-1.5 rounded-md transition-all">
            🧾 الحالة: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/5">{localUser?.isOnline ? 'متصل' : 'غير متصل'}</span>
          </p>
        </div>

        {localUser?.id === currentUser?.id && (
          <div className="bg-gradient-to-r from-white/10 to-white/5 p-2.5 rounded-xl my-2.5 border border-white/15 backdrop-blur-xl shadow-lg">
            <p className="my-1.5 text-xs text-gray-200 flex justify-between items-center px-2 py-1 rounded-md transition-all hover:bg-white/10 hover:scale-[1.02]">
              💬 عدد الرسائل: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">0</span>
            </p>
            <p className="my-1.5 text-xs text-gray-200 flex justify-between items-center px-2 py-1 rounded-md transition-all hover:bg-white/10 hover:scale-[1.02]">
              ⭐ مستوى العضو: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">مستوى {localUser?.level || 1}</span>
            </p>
            <p
              className="my-1.5 text-xs text-gray-200 flex justify-between items-center px-2 py-1 rounded-md transition-all cursor-pointer hover:bg-white/10 hover:scale-[1.02]"
              onClick={() => setCurrentEditType('theme')}
            >
              🎨 لون الملف الشخصي: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">اضغط للتغيير</span>
            </p>
            <p
              className="my-1.5 text-xs text-gray-200 flex justify-between items-center px-2 py-1 rounded-md transition-all cursor-pointer hover:bg-white/10 hover:scale-[1.02]"
              onClick={() => setCurrentEditType('effects')}
            >
              ✨ تأثيرات حركية: <span className="font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">اضغط للتغيير</span>
            </p>
          </div>
        )}
      </div>

      {/* مؤشر التحميل */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-30">
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">جاري الحفظ...</span>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      {localUser?.id === currentUser?.id && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'banner')}
            disabled={isLoading}
            className="hidden"
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'profile')}
            disabled={isLoading}
            className="hidden"
          />
        </>
      )}
    </div>
  );

  // في وضع المودال، نعرض خلفية وتوسيط
  if (!isEmbedded) {
    return (
      <>
        {/* Modal Background */}
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Main Modal */}
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-4 overflow-y-auto">
          {cardContent}
        </div>

        {/* Edit Modal */}
        {currentEditType && (user.id === currentUser?.id || currentEditType === 'sendPoints') && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex justify-center items-center">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl w-[90%] max-w-[350px] shadow-2xl">
              <h3 className="m-0 mb-4 text-yellow-400 text-center text-lg">
                {currentEditType === 'sendPoints' && '💰 إرسال النقاط'}
                {/* يمكن إضافة المزيد من العناوين هنا */}
              </h3>

              {currentEditType === 'sendPoints' && (
                <div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="text-xs text-gray-300 mb-2">
                      {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                        <>نقاطك الحالية: غير محدودة للمالك</>
                      ) : (
                        <>نقاطك الحالية: {formatPoints(currentUser?.points || 0)}</>
                      )}
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="عدد النقاط"
                        value={pointsToSend}
                        onChange={(e) => setPointsToSend(e.target.value)}
                        className="flex-1 p-2 rounded-md border border-white/20 bg-white/10 text-white text-xs"
                        min="1"
                        {...(currentUser?.userType === 'owner' || currentUser?.role === 'owner'
                          ? {}
                          : { max: currentUser?.points || 0 })}
                        disabled={sendingPoints}
                        autoFocus
                      />
                      <button
                        onClick={handleSendPoints}
                        disabled={sendingPoints || !pointsToSend || parseInt(pointsToSend) <= 0}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-2 rounded-md text-xs font-bold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingPoints ? '⏳' : '🎁'} إرسال
                      </button>
                    </div>

                    <div className="text-[10px] text-gray-400">
                      {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                        <>💡 لن يتم خصم النقاط من رصيدك، كونك المالك</>
                      ) : (
                        <>💡 سيتم خصم النقاط من رصيدك وإضافتها للمستخدم</>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center mt-4">
                    <button
                      className="bg-red-500 text-white px-5 py-2 rounded-lg font-bold cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-lg"
                      onClick={closeEditModal}
                    >
                      ❌ إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* إشعار إرسال النقاط */}
        <PointsSentNotification
          show={pointsSentNotification.show}
          points={pointsSentNotification.points}
          recipientName={pointsSentNotification.recipientName}
          onClose={() => setPointsSentNotification({ show: false, points: 0, recipientName: '' })}
        />
      </>
    );
  }

  // في وضع الـ embedded، نعرض البطاقة مباشرة
  return cardContent;
}
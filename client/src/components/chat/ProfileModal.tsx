import { X, User, MapPin, Calendar, Heart, Gift, Circle, Edit2, Camera, Palette, Sparkles } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';

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

// Info Row Component
const InfoRow = ({ 
  icon, 
  label, 
  value, 
  editable = false, 
  onEdit 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  editable?: boolean; 
  onEdit?: () => void;
}) => (
  <div 
    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
      editable ? 'hover:bg-muted/50 cursor-pointer' : ''
    } transition-colors`}
    onClick={editable ? onEdit : undefined}
  >
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{value}</span>
      {editable && <Edit2 className="w-3 h-3 text-muted-foreground" />}
    </div>
  </div>
);

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
    onClose();
    return null;
  }

  // دالة موحدة لجلب بيانات المستخدم من السيرفر وتحديث الحالة المحلية
  const fetchAndUpdateUser = async (userId: number) => {
    try {
      const userData = await apiRequest(`/api/users/${userId}?t=${Date.now()}`);
      setLocalUser(userData);
      if (onUpdate) onUpdate(userData);

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
    {
      value: 'theme-aurora-borealis',
      name: 'الشفق القطبي',
      preview: 'linear-gradient(135deg, #a8edea, #fed6e3, #ffecd2, #fcb69f, #a8edea)',
      emoji: '✨',
    },
    {
      value: 'theme-cosmic-night',
      name: 'الليل الكوني',
      preview: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea, #764ba2)',
      emoji: '🌌',
    },
    {
      value: 'theme-emerald-forest',
      name: 'الغابة الزمردية',
      preview: 'linear-gradient(135deg, #11998e, #38ef7d, #11998e, #38ef7d)',
      emoji: '🌿',
    },
    {
      value: 'theme-rose-gold',
      name: 'الوردي الذهبي',
      preview: 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef, #ff9a9e)',
      emoji: '🌸',
    },
    {
      value: 'theme-midnight-purple',
      name: 'البنفسجي الليلي',
      preview: 'linear-gradient(135deg, #4facfe, #00f2fe, #4facfe, #00f2fe)',
      emoji: '🔮',
    },
    {
      value: 'theme-golden-hour',
      name: 'الساعة الذهبية',
      preview: 'linear-gradient(135deg, #fa709a, #fee140, #fa709a, #fee140)',
      emoji: '🌟',
    },
    {
      value: 'theme-neon-dreams',
      name: 'أحلام النيون',
      preview: 'linear-gradient(135deg, #ff0099, #493240, #ff0099, #493240)',
      emoji: '💫',
    },
    {
      value: 'theme-silver-mist',
      name: 'الضباب الفضي',
      preview: 'linear-gradient(135deg, #c3cfe2, #c3cfe2, #e0c3fc, #c3cfe2)',
      emoji: '☁️',
    },
    {
      value: 'theme-fire-opal',
      name: 'الأوبال الناري',
      preview: 'linear-gradient(135deg, #ff416c, #ff4b2b, #ff416c, #ff4b2b)',
      emoji: '🔥',
    },
    {
      value: 'theme-crystal-clear',
      name: 'البلور الصافي',
      preview: 'linear-gradient(135deg, #89f7fe, #66a6ff, #89f7fe, #66a6ff)',
      emoji: '💎',
    },
    {
      value: 'theme-burgundy-velvet',
      name: 'الخمري المخملي',
      preview: 'linear-gradient(135deg, #800020, #8b0000, #a52a2a, #800020)',
      emoji: '🍷',
    },
    {
      value: 'theme-golden-velvet',
      name: 'الذهبي المخملي',
      preview: 'linear-gradient(135deg, #ffd700, #daa520, #b8860b, #ffd700)',
      emoji: '👑',
    },
    {
      value: 'theme-royal-black',
      name: 'الأسود الملكي',
      preview: 'linear-gradient(135deg, #191970, #2f4f4f, #000000, #191970)',
      emoji: '⚜️',
    },
    {
      value: 'theme-berry-velvet',
      name: 'التوتي المخملي',
      preview: 'linear-gradient(135deg, #8a2be2, #4b0082, #800080, #8a2be2)',
      emoji: '🫐',
    },
    {
      value: 'theme-crimson-velvet',
      name: 'العنابي المخملي',
      preview: 'linear-gradient(135deg, #dc143c, #b22222, #8b0000, #dc143c)',
      emoji: '🔴',
    },
    {
      value: 'theme-emerald-velvet',
      name: 'الزمردي المخملي',
      preview: 'linear-gradient(135deg, #008000, #228b22, #006400, #008000)',
      emoji: '💚',
    },
    {
      value: 'theme-sapphire-velvet',
      name: 'الياقوتي المخملي',
      preview: 'linear-gradient(135deg, #0047ab, #191970, #00008b, #0047ab)',
      emoji: '💙',
    },
    {
      value: 'theme-ruby-velvet',
      name: 'الياقوت الأحمر',
      preview: 'linear-gradient(135deg, #9b111e, #8b0000, #800000, #9b111e)',
      emoji: '❤️',
    },
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
    {
      value: 'effect-glow',
      name: 'التوهج الذهبي',
      emoji: '✨',
      description: 'توهج ذهبي جميل',
    },
    {
      value: 'effect-water',
      name: 'التموج المائي',
      emoji: '🌊',
      description: 'حركة مائية سلسة',
    },
    {
      value: 'effect-aurora',
      name: 'الشفق القطبي',
      emoji: '🌌',
      description: 'تأثير الشفق الملون',
    },
    {
      value: 'effect-neon',
      name: 'النيون المتوهج',
      emoji: '💖',
      description: 'توهج نيون وردي',
    },
    {
      value: 'effect-crystal',
      name: 'البلور المتلألئ',
      emoji: '💎',
      description: 'لمعة بلورية جميلة',
    },
    {
      value: 'effect-fire',
      name: 'النار المتوهجة',
      emoji: '🔥',
      description: 'توهج ناري حارق',
    },
    {
      value: 'effect-magnetic',
      name: 'المغناطيس',
      emoji: '🧲',
      description: 'حركة عائمة مغناطيسية',
    },
    {
      value: 'effect-heartbeat',
      name: 'القلب النابض',
      emoji: '❤️',
      description: 'نبض مثل القلب',
    },
  ];

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

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    uploadType: 'profile' | 'banner' = 'profile'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
        description: 'يرجى اختيار ملف صورة صحيح',
        variant: 'destructive',
      });
      return;
    }

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

      if (uploadType === 'profile' && result.imageUrl) {
        updateUserData({ profileImage: result.imageUrl });
      } else if (uploadType === 'banner' && result.bannerUrl) {
        updateUserData({ profileBanner: result.bannerUrl });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

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

  // Save edit
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
        description: 'فشل في تحديث البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update theme
  const handleThemeChange = async (theme: string) => {
    try {
      setIsLoading(true);
      setSelectedTheme(theme);

      if (!currentUser?.id) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على معرف المستخدم',
          variant: 'destructive',
        });
        return;
      }

      const result = await apiRequest(`/api/users/${localUser?.id}`, {
        method: 'PUT',
        body: { profileBackgroundColor: theme },
      });

      const updated = (result as any)?.user ?? result;
      if (updated && (updated as any).id) {
        updateUserData({ profileBackgroundColor: updated.profileBackgroundColor || theme });
        toast({ title: 'نجح ✅', description: 'تم تحديث لون الملف الشخصي' });
      } else {
        throw new Error('فشل في تحديث لون الملف الشخصي');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث لون الملف الشخصي:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث اللون',
        variant: 'destructive',
      });
      setSelectedTheme(localUser?.profileBackgroundColor || '');
    } finally {
      setIsLoading(false);
    }
  };

  // Update effect
  const handleEffectChange = async (effect: string) => {
    try {
      setIsLoading(true);
      setSelectedEffect(effect);

      const result = await apiRequest(`/api/users/${localUser?.id}`, {
        method: 'PUT',
        body: {
          profileEffect: effect,
        },
      });

      const updated = (result as any)?.user ?? result;
      if (updated && (updated as any).id) {
        updateUserData({
          profileEffect: effect,
        });

        toast({
          title: 'نجح ✅',
          description: 'تم تحديث التأثيرات',
        });
      } else {
        throw new Error('فشل في تحديث التأثيرات');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث التأثير:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث التأثيرات',
        variant: 'destructive',
      });
      setSelectedEffect(localUser?.profileEffect || 'none');
    } finally {
      setIsLoading(false);
    }
  };

  // Send points handler
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
        setPointsSentNotification({
          show: true,
          points: points,
          recipientName: localUser?.username || '',
        });

        setPointsToSend('');

        if (currentUser && (window as any).updateUserPoints) {
          if (currentUser?.userType === 'owner' || currentUser?.role === 'owner') {
            (window as any).updateUserPoints(currentUser.points);
          } else {
            (window as any).updateUserPoints(currentUser.points - points);
          }
        }

        setTimeout(() => {
          onClose();
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

  return (
    <>
      {/* Modal Background */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border-border relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Header with Profile Image and Name */}
          <CardHeader className="relative pb-0">
            <div
              className="absolute inset-0 h-32 bg-gradient-to-br from-primary/20 to-primary/5"
              style={{
                background: localUser?.profileBanner
                  ? `url(${getBannerImageSrc(localUser.profileBanner)}) center/cover`
                  : buildProfileBackgroundGradient(localUser?.profileBackgroundColor || ''),
              }}
            />
            <div className="relative flex items-end gap-4 pt-16">
              <div className="relative">
                <ProfileImage
                  user={localUser}
                  size="large"
                  className="w-24 h-24 border-4 border-card"
                />
                {localUser?.id === currentUser?.id && (
                  <button
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Camera size={16} />
                  </button>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: getFinalUsernameColor(localUser || {}) }}
                  >
                    {localUser?.username}
                  </h2>
                  <UserRoleBadge user={localUser} size={20} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {localUser?.status || 'لا توجد حالة'}
                </p>
              </div>
            </div>
          </CardHeader>

          {/* Content Tabs */}
          <CardContent className="p-0">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                <TabsTrigger value="info" className="rounded-none">
                  <User className="w-4 h-4 mr-2" />
                  المعلومات
                </TabsTrigger>
                <TabsTrigger value="customize" className="rounded-none">
                  <Palette className="w-4 h-4 mr-2" />
                  التخصيص
                </TabsTrigger>
                <TabsTrigger value="actions" className="rounded-none">
                  <Heart className="w-4 h-4 mr-2" />
                  الإجراءات
                </TabsTrigger>
              </TabsList>

              {/* Info Tab */}
              <TabsContent value="info" className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                <div className="grid gap-4">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      المعلومات الأساسية
                    </h3>
                    <div className="grid gap-3 bg-muted/30 rounded-lg p-4">
                      <InfoRow
                        icon="👤"
                        label="الاسم"
                        value={localUser?.username || 'غير محدد'}
                        editable={localUser?.id === currentUser?.id}
                        onEdit={() => openEditModal('name')}
                      />
                      <InfoRow
                        icon="💬"
                        label="الحالة"
                        value={localUser?.status || 'لا توجد حالة'}
                        editable={localUser?.id === currentUser?.id}
                        onEdit={() => openEditModal('status')}
                      />
                      <InfoRow
                        icon="🧍"
                        label="الجنس"
                        value={localUser?.gender || 'غير محدد'}
                        editable={localUser?.id === currentUser?.id}
                        onEdit={() => openEditModal('gender')}
                      />
                      <InfoRow
                        icon="🌍"
                        label="البلد"
                        value={localUser?.country || 'غير محدد'}
                        editable={localUser?.id === currentUser?.id}
                        onEdit={() => openEditModal('country')}
                      />
                      <InfoRow
                        icon="🎂"
                        label="العمر"
                        value={localUser?.age ? `${localUser.age} سنة` : 'غير محدد'}
                        editable={localUser?.id === currentUser?.id}
                        onEdit={() => openEditModal('age')}
                      />
                      <InfoRow
                        icon="💍"
                        label="الحالة الاجتماعية"
                        value={localUser?.relation || 'غير محدد'}
                        editable={localUser?.id === currentUser?.id}
                        onEdit={() => openEditModal('socialStatus')}
                      />
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      معلومات الحساب
                    </h3>
                    <div className="grid gap-3 bg-muted/30 rounded-lg p-4">
                      <InfoRow
                        icon="📅"
                        label="تاريخ الانضمام"
                        value={
                          localUser?.createdAt
                            ? new Date(localUser.createdAt).toLocaleDateString('ar-SA')
                            : 'غير محدد'
                        }
                      />
                      <InfoRow
                        icon="🎁"
                        label="النقاط"
                        value={formatPoints(localUser?.points || 0)}
                      />
                      <InfoRow
                        icon="⭐"
                        label="المستوى"
                        value={`مستوى ${localUser?.level || 1}`}
                      />
                      <InfoRow
                        icon="🟢"
                        label="الحالة"
                        value={localUser?.isOnline ? 'متصل' : 'غير متصل'}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Customize Tab */}
              {localUser?.id === currentUser?.id && (
                <TabsContent value="customize" className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                  <div className="space-y-6">
                    {/* Profile Images */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        الصور
                      </h3>
                      <div className="grid gap-3">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          تغيير صورة الغلاف
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isLoading}
                        >
                          <User className="w-4 h-4 mr-2" />
                          تغيير الصورة الشخصية
                        </Button>
                      </div>
                    </div>

                    {/* Theme Selection */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        لون الملف الشخصي
                      </h3>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                        {themes.slice(0, 20).map((theme) => (
                          <button
                            key={theme.value}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all hover:scale-105 ${
                              selectedTheme === theme.preview
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleThemeChange(theme.preview)}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0"
                              style={{ background: theme.preview }}
                            />
                            <span className="text-sm truncate">{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Effects Selection */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        التأثيرات الحركية
                      </h3>
                      <div className="grid gap-2 max-h-60 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                        {effects.slice(0, 10).map((effect) => (
                          <button
                            key={effect.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.02] ${
                              selectedEffect === effect.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleEffectChange(effect.value)}
                          >
                            <span className="text-2xl">{effect.emoji}</span>
                            <div className="text-left flex-1">
                              <div className="font-medium">{effect.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {effect.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Actions Tab */}
              <TabsContent value="actions" className="p-6 space-y-4">
                {localUser?.id !== currentUser?.id ? (
                  <div className="grid gap-3">
                    <Button
                      className="w-full justify-start"
                      variant="default"
                      onClick={() => onPrivateMessage?.(localUser)}
                    >
                      💬 محادثة خاصة
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => onAddFriend?.(localUser)}
                    >
                      👥 إضافة صديق
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setCurrentEditType('sendPoints')}
                    >
                      💰 إرسال نقاط
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="destructive"
                      onClick={() => onIgnoreUser?.(localUser?.id || 0)}
                    >
                      🚫 تجاهل
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="destructive"
                      onClick={() => onReportUser?.(localUser)}
                    >
                      🚩 إبلاغ
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>لا توجد إجراءات متاحة لملفك الشخصي</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

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

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-30">
              <div className="bg-card rounded-lg p-4 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">جاري الحفظ...</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      {currentEditType && (user.id === currentUser?.id || currentEditType === 'sendPoints') && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">
                {currentEditType === 'name' && 'تعديل الاسم'}
                {currentEditType === 'status' && 'تعديل الحالة'}
                {currentEditType === 'gender' && 'تعديل الجنس'}
                {currentEditType === 'country' && 'تعديل البلد'}
                {currentEditType === 'age' && 'تعديل العمر'}
                {currentEditType === 'socialStatus' && 'تعديل الحالة الاجتماعية'}
                {currentEditType === 'sendPoints' && '💰 إرسال النقاط'}
              </h3>
            </CardHeader>
            <CardContent>
              {currentEditType === 'sendPoints' ? (
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                        <>نقاطك الحالية: غير محدودة</>
                      ) : (
                        <>نقاطك الحالية: {formatPoints(currentUser?.points || 0)}</>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="عدد النقاط"
                        value={pointsToSend}
                        onChange={(e) => setPointsToSend(e.target.value)}
                        min="1"
                        {...(currentUser?.userType === 'owner' || currentUser?.role === 'owner'
                          ? {}
                          : { max: currentUser?.points || 0 })}
                        disabled={sendingPoints}
                        autoFocus
                      />
                      <Button
                        onClick={handleSendPoints}
                        disabled={sendingPoints || !pointsToSend || parseInt(pointsToSend) <= 0}
                        className="min-w-[100px]"
                      >
                        {sendingPoints ? '⏳ جاري الإرسال...' : '🎁 إرسال'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                        <>💡 لن يتم خصم النقاط من رصيدك</>
                      ) : (
                        <>💡 سيتم خصم النقاط من رصيدك</>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" onClick={closeEditModal} className="w-full">
                    إلغاء
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {currentEditType === 'name' && 'الاسم الجديد:'}
                      {currentEditType === 'status' && 'الحالة الجديدة:'}
                      {currentEditType === 'gender' && 'الجنس:'}
                      {currentEditType === 'country' && 'البلد:'}
                      {currentEditType === 'age' && 'العمر:'}
                      {currentEditType === 'socialStatus' && 'الحالة الاجتماعية:'}
                    </label>
                    {currentEditType === 'gender' ? (
                      <select
                        className="w-full p-2 rounded-lg border bg-background"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      >
                        <option value="">اختر...</option>
                        <option value="ذكر">👨 ذكر</option>
                        <option value="أنثى">👩 أنثى</option>
                      </select>
                    ) : currentEditType === 'country' ? (
                      <select
                        className="w-full p-2 rounded-lg border bg-background"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      >
                        <option value="">اختر...</option>
                        <option value="🇸🇦 السعودية">🇸🇦 السعودية</option>
                        <option value="🇦🇪 الإمارات">🇦🇪 الإمارات</option>
                        <option value="🇪🇬 مصر">🇪🇬 مصر</option>
                        <option value="🇯🇴 الأردن">🇯🇴 الأردن</option>
                        <option value="🇱🇧 لبنان">🇱🇧 لبنان</option>
                        <option value="🇸🇾 سوريا">🇸🇾 سوريا</option>
                        <option value="🇮🇶 العراق">🇮🇶 العراق</option>
                        <option value="🇰🇼 الكويت">🇰🇼 الكويت</option>
                        <option value="🇶🇦 قطر">🇶🇦 قطر</option>
                        <option value="🇧🇭 البحرين">🇧🇭 البحرين</option>
                        <option value="🇴🇲 عمان">🇴🇲 عمان</option>
                        <option value="🇾🇪 اليمن">🇾🇪 اليمن</option>
                        <option value="🇱🇾 ليبيا">🇱🇾 ليبيا</option>
                        <option value="🇹🇳 تونس">🇹🇳 تونس</option>
                        <option value="🇩🇿 الجزائر">🇩🇿 الجزائر</option>
                        <option value="🇲🇦 المغرب">🇲🇦 المغرب</option>
                      </select>
                    ) : currentEditType === 'socialStatus' ? (
                      <select
                        className="w-full p-2 rounded-lg border bg-background"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      >
                        <option value="">اختر...</option>
                        <option value="أعزب">💚 أعزب</option>
                        <option value="متزوج">💍 متزوج</option>
                        <option value="مطلق">💔 مطلق</option>
                        <option value="أرمل">🖤 أرمل</option>
                      </select>
                    ) : (
                      <Input
                        type={currentEditType === 'age' ? 'number' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} disabled={isLoading} className="flex-1">
                      {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                    </Button>
                    <Button variant="outline" onClick={closeEditModal} className="flex-1">
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Points Sent Notification */}
      <PointsSentNotification
        show={pointsSentNotification.show}
        points={pointsSentNotification.points}
        recipientName={pointsSentNotification.recipientName}
        onClose={() => setPointsSentNotification({ show: false, points: 0, recipientName: '' })}
      />
    </>
  );
}
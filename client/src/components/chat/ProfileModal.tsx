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
import ProfileImage from './ProfileImage';

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
    // إغلاق المودال إذا لم يكن هناك مستخدم
    onClose();
    return null;
  }

  // دالة موحدة لجلب بيانات المستخدم من السيرفر وتحديث الحالة المحلية - محسّنة
  const fetchAndUpdateUser = async (userId: number) => {
    try {
      const userData = await apiRequest(`/api/users/${userId}?t=${Date.now()}`); // إضافة timestamp لتجنب cache
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

  // تحديث المستخدم المحلي والخارجي - محسّن
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

  // Complete themes collection from original code
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
    {
      value: 'theme-amethyst-velvet',
      name: 'الأميثيست المخملي',
      preview: 'linear-gradient(135deg, #9966cc, #8a2be2, #4b0082, #9966cc)',
      emoji: '💜',
    },
    {
      value: 'theme-onyx-velvet',
      name: 'الأونيكس المخملي',
      preview: 'linear-gradient(135deg, #2f4f4f, #191919, #000000, #2f4f4f)',
      emoji: '🖤',
    },
    {
      value: 'theme-sunset-fire',
      name: 'توهج النار البرتقالي - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🔥',
    },
    {
      value: 'theme-perfect-gradient',
      name: 'التدرج المثالي - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🌟',
    },
    {
      value: 'theme-image-gradient',
      name: 'تدرج الصورة - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🖼️',
    },
    {
      value: 'theme-new-gradient',
      name: 'التدرج الجديد المطابق للصورة',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🎨',
    },
    {
      value: 'theme-tropical-paradise',
      name: 'الجنة الاستوائية',
      preview: 'linear-gradient(135deg, #FF6B9D, #FFC0CB, #C9FFBF, #FFAFBD)',
      emoji: '🌺',
    },
    {
      value: 'theme-lavender-dreams',
      name: 'أحلام اللافندر',
      preview: 'linear-gradient(135deg, #E8B4FF, #D4A5D5, #B19CD9, #9B88ED)',
      emoji: '💜',
    },
    {
      value: 'theme-ocean-breeze',
      name: 'نسيم المحيط',
      preview: 'linear-gradient(135deg, #2E8BC0, #61A5D4, #85C1E9, #A9D6FF)',
      emoji: '🌊',
    },
    {
      value: 'theme-candy-crush',
      name: 'حلوى الفواكه',
      preview: 'linear-gradient(135deg, #FF69B4, #FFB6C1, #FFC0CB, #FFE4E1)',
      emoji: '🍭',
    },
    {
      value: 'theme-northern-lights',
      name: 'الأضواء الشمالية',
      preview: 'linear-gradient(135deg, #43C6AC, #191654, #6A0572, #AB83A1)',
      emoji: '🌌',
    },
    {
      value: 'theme-spring-blossom',
      name: 'زهر الربيع',
      preview: 'linear-gradient(135deg, #FFB3BA, #FFDFBA, #FFFFBA, #BAFFC9)',
      emoji: '🌸',
    },
    {
      value: 'theme-magic-sunset',
      name: 'غروب سحري',
      preview: 'linear-gradient(135deg, #FA8072, #FFA07A, #FFB347, #FFCC33)',
      emoji: '🌇',
    },
    {
      value: 'theme-mystic-purple',
      name: 'البنفسجي الغامض',
      preview: 'linear-gradient(135deg, #6A0DAD, #8B00FF, #9932CC, #BA55D3)',
      emoji: '🔮',
    },
    {
      value: 'theme-electric-blue',
      name: 'الأزرق الكهربائي',
      preview: 'linear-gradient(135deg, #00D4FF, #0099CC, #006699, #003366)',
      emoji: '⚡',
    },
    {
      value: 'theme-peachy-keen',
      name: 'الخوخي الناعم',
      preview: 'linear-gradient(135deg, #FFDAB9, #FFCBA4, #FFB6C1, #FFA07A)',
      emoji: '🍑',
    },
    {
      value: 'theme-galaxy-explorer',
      name: 'مستكشف المجرة',
      preview: 'linear-gradient(135deg, #1A1A2E, #16213E, #0F3460, #533483)',
      emoji: '🚀',
    },
    {
      value: 'theme-rainbow-cascade',
      name: 'شلال قوس قزح',
      preview: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
      emoji: '🌈',
    },
    {
      value: 'theme-mint-fresh',
      name: 'النعناع المنعش',
      preview: 'linear-gradient(135deg, #96CEB4, #FFEAA7, #DDA0DD, #B8E6B8)',
      emoji: '🌿',
    },
    {
      value: 'theme-flamingo-pink',
      name: 'وردي الفلامنجو',
      preview: 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C1, #FFC0CB)',
      emoji: '🦩',
    },
    {
      value: 'theme-cosmic-dust',
      name: 'غبار كوني',
      preview: 'linear-gradient(135deg, #483D8B, #6A5ACD, #7B68EE, #9370DB)',
      emoji: '✨',
    },
    {
      value: 'theme-cherry-blossom',
      name: 'زهر الكرز',
      preview: 'linear-gradient(135deg, #FFB7C5, #FFC0CB, #FFDAB9, #FFE4E1)',
      emoji: '🌸',
    },
    {
      value: 'theme-deep-ocean',
      name: 'أعماق المحيط',
      preview: 'linear-gradient(135deg, #001F3F, #003366, #004080, #0059B3)',
      emoji: '🌊',
    },
    {
      value: 'theme-desert-mirage',
      name: 'سراب الصحراء',
      preview: 'linear-gradient(135deg, #EDC9AF, #E7A857, #D4A574, #C19A6B)',
      emoji: '🏜️',
    },
    {
      value: 'theme-unicorn-dreams',
      name: 'أحلام اليونيكورن',
      preview: 'linear-gradient(135deg, #FFB3FF, #FF99FF, #FF80FF, #FF66FF)',
      emoji: '🦄',
    },
    {
      value: 'theme-forest-mist',
      name: 'ضباب الغابة',
      preview: 'linear-gradient(135deg, #228B22, #32CD32, #90EE90, #98FB98)',
      emoji: '🌲',
    },
  ];

  // Complete effects collection from original code
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
    {
      value: 'effect-stars',
      name: 'النجوم المتلألئة',
      emoji: '⭐',
      description: 'نجوم متحركة',
    },
    {
      value: 'effect-rainbow',
      name: 'قوس قزح',
      emoji: '🌈',
      description: 'تدرج قوس قزح متحرك',
    },
    {
      value: 'effect-snow',
      name: 'الثلج المتساقط',
      emoji: '❄️',
      description: 'ثلج متساقط جميل',
    },
    {
      value: 'effect-lightning',
      name: 'البرق',
      emoji: '⚡',
      description: 'وميض البرق',
    },
    {
      value: 'effect-smoke',
      name: 'الدخان',
      emoji: '💨',
      description: 'دخان متصاعد',
    },
    {
      value: 'effect-butterfly',
      name: 'الفراشة',
      emoji: '🦋',
      description: 'فراشة متحركة',
    },
  ];

  // Profile image fallback - محسّن للتعامل مع base64 و مشاكل الcache
  const getProfileImageSrcLocal = () => {
    return getProfileImageSrc(localUser?.profileImage);
  };

  // Profile banner fallback - محسّن للتعامل مع base64 و مشاكل الcache
  // إرجاع مصدر صورة البانر إن وُجد مع دعم المسارات والـ base64
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

  // دعم المعاينة قبل رفع الصورة الشخصية أو الغلاف
  const [previewProfile, setPreviewProfile] = useState<string | null>(null);

  const handlePreview = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewProfile(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // عند رفع صورة جديدة، أضمن تحديث بيانات المستخدم من السيرفر بعد نجاح الرفع
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
    const maxSize = uploadType === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB للبروفايل، 10MB للبانر
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

      // انتظار قصير للتأكد من التحديث المحلي
      await new Promise((resolve) => setTimeout(resolve, 100));

      // جلب البيانات المحدثة من السيرفر للتأكد
      if (currentUser?.id) {
        await fetchAndUpdateUser(currentUser.id);
      }

      toast({
        title: 'نجح ✅',
        description: uploadType === 'profile' ? 'تم تحديث الصورة الشخصية' : 'تم تحديث صورة الغلاف',
      });

      // إزالة المعاينة
      if (uploadType === 'profile') setPreviewProfile(null);
    } catch (error: any) {
      console.error(`❌ خطأ في رفع ${uploadType}:`, error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحميل الصورة',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      // تنظيف input files
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // حفظ تعديل البيانات - محسّن بدون إعادة تحميل
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

  // تحديث الثيم - محسّن
  const handleThemeChange = async (theme: string) => {
    try {
      setIsLoading(true);
      setSelectedTheme(theme);

      if (!currentUser?.id) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على معرف المستخدم. يرجى تسجيل الدخول مرة أخرى.',
          variant: 'destructive',
        });
        return;
      }

      if (!theme || theme.trim() === '') {
        toast({
          title: 'خطأ',
          description: 'يرجى اختيار لون صحيح.',
          variant: 'destructive',
        });
        return;
      }

      // نرسل قيمة HEX فقط. إذا تم تمرير تدرّج، سيُطبّق الخادم أول HEX صالح
      const colorValue = theme;
      const result = await apiRequest(`/api/users/${localUser?.id}`, {
        method: 'PUT',
        body: { profileBackgroundColor: colorValue },
      });

      const updated = (result as any)?.user ?? result;
      if (updated && (updated as any).id) {
        updateUserData({ profileBackgroundColor: updated.profileBackgroundColor || colorValue });
        toast({ title: 'نجح ✅', description: 'تم تحديث لون الملف الشخصي' });
      } else {
        throw new Error('فشل في تحديث لون الملف الشخصي');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث لون الملف الشخصي:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث اللون. تحقق من اتصال الإنترنت.',
        variant: 'destructive',
      });
      setSelectedTheme(localUser?.profileBackgroundColor || '');
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث التأثير - محسّن
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
          description: 'تم تحديث التأثيرات ولون الاسم',
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
      // إرجاع التأثير للحالة السابقة
      setSelectedEffect(localUser?.profileEffect || 'none');
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

        // Update current user points locally for immediate UI feedback
        if (currentUser && (window as any).updateUserPoints) {
          if (currentUser?.userType === 'owner' || currentUser?.role === 'owner') {
            (window as any).updateUserPoints(currentUser.points);
          } else {
            (window as any).updateUserPoints(currentUser.points - points);
          }
        }

        // إغلاق البروفايل بعد الإرسال الناجح
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
      {/* Complete CSS Styles from original HTML */}
      <style>{`
        :root {
          --main-bg: #121212;
          --card-bg: linear-gradient(135deg, #f57f17, #b71c1c, #6a1b9a);
          --text-color: #ffffff;
          --accent-color: #ffc107;
          --error-color: #f44336;
          --success-color: #4caf50;
          --default-bg: rgba(18, 18, 18, 0.95);
        }

        /* أنماط الألوان العصرية مع التدريج المائي */
        .theme-sunset-glow {
          --card-bg: linear-gradient(135deg, 
            #2c1810, 
            #8b0000, 
            #dc143c, 
            #ff6347, 
            #ff8c00
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff3e0;
        }

        .theme-ocean-depths {
          --card-bg: linear-gradient(135deg, 
            rgba(102, 126, 234, 0.9), 
            rgba(118, 75, 162, 0.85), 
            rgba(171, 147, 251, 0.8), 
            rgba(102, 126, 234, 0.9)
          ),
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0, 150, 255, 0.25) 0%, transparent 60%);
          --accent-color: #e3f2fd;
        }

        .theme-aurora-borealis {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #1a1a2e, 
            #16213e, 
            #0f3460, 
            #533483
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0f8ff;
        }

        .theme-cosmic-night {
          --card-bg: linear-gradient(135deg, 
            #000000, 
            #1a0033, 
            #330066, 
            #6600cc, 
            #9933ff
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #e8eaf6;
        }

        .theme-emerald-forest {
          --card-bg: linear-gradient(135deg, 
            #0a1a0a, 
            #1a3a1a, 
            #2d5a2d, 
            #4a7c4a, 
            #6b9e6b
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #e8f5e8;
        }

        .theme-rose-gold {
          --card-bg: linear-gradient(135deg, 
            #2d1b1b, 
            #4a2c2c, 
            #8b4513, 
            #daa520, 
            #ffd700
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff0f3;
        }

        .theme-midnight-purple {
          --card-bg: linear-gradient(135deg, 
            #000033, 
            #1a1a4a, 
            #333366, 
            #4d4d99, 
            #6666cc
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f3e5f5;
        }

        .theme-golden-hour {
          --card-bg: linear-gradient(135deg, 
            #1a0f0f, 
            #4a2c1a, 
            #8b4513, 
            #daa520, 
            #ffd700
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff8e1;
        }

        .theme-neon-dreams {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b2d, 
            #4a1a4a, 
            #8b008b, 
            #ff00ff
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fce4ec;
        }

        .theme-silver-mist {
          --card-bg: linear-gradient(135deg, 
            #1a1a1a, 
            #2d2d2d, 
            #4a4a4a, 
            #666666, 
            #808080
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fafafa;
        }

        .theme-fire-opal {
          --card-bg: linear-gradient(135deg, 
            #1a0a0a, 
            #4a1a1a, 
            #8b0000, 
            #dc143c, 
            #ff4500
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff3e0;
        }

        .theme-crystal-clear {
          --card-bg: linear-gradient(135deg, 
            #0a1a2a, 
            #1a2a4a, 
            #2a4a6a, 
            #4a6a8a, 
            #6a8aaa
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #e1f5fe;
        }

        .theme-burgundy-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b1b, 
            #4a1a1a, 
            #8b0000, 
            #a52a2a
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #ffe4e1;
        }

        .theme-golden-velvet {
          --card-bg: linear-gradient(135deg, 
            #1a1a0a, 
            #2d2d1a, 
            #4a4a1a, 
            #8b8b00, 
            #ffd700
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff8dc;
        }

        .theme-royal-black {
          --card-bg: linear-gradient(135deg, 
            #000000, 
            #1a1a2e, 
            #2d2d4a, 
            #4a4a6a, 
            #66668a
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0f8ff;
        }

        .theme-berry-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a1a, 
            #1a1a2d, 
            #2d2d4a, 
            #4a4a6a, 
            #8a2be2
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f8f0ff;
        }

        .theme-crimson-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b1b, 
            #4a1a1a, 
            #8b0000, 
            #dc143c
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #ffe4e1;
        }

        .theme-emerald-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a1a0a, 
            #1a2d1a, 
            #2d4a2d, 
            #4a6a4a, 
            #6b8a6b
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0fff0;
        }

        .theme-sapphire-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a1a, 
            #1a1a2d, 
            #2d2d4a, 
            #4a4a6a, 
            #6b6b8a
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0f8ff;
        }

        .theme-ruby-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b1b, 
            #4a1a1a, 
            #8b0000, 
            #9b111e
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #ffe4e1;
        }

        .theme-amethyst-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a1a, 
            #1a1a2d, 
            #2d2d4a, 
            #4a4a6a, 
            #9966cc
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f8f0ff;
        }

        .theme-onyx-velvet {
          --card-bg: linear-gradient(135deg, 
            #000000, 
            #1a1a1a, 
            #2d2d2d, 
            #4a4a4a, 
            #666666
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f5f5f5;
        }

        .theme-sunset-fire {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .theme-perfect-gradient {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .theme-image-gradient {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .theme-new-gradient {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .profile-card {
          width: 100%;
          max-width: 440px;
          border-radius: 16px;
          overflow: hidden;
          background: var(--card-bg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.8);
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          height: fit-content;
        }

        .profile-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.9);
        }

        .profile-cover {
          position: relative;
          height: 250px;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .change-cover-btn {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(0,0,0,0.7);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          z-index: 3;
          transition: background 0.3s ease;
          border: none;
          font-weight: 500;
        }

        .change-cover-btn:hover {
          background: rgba(0,0,0,0.9);
        }

        /* شريط الأزرار بجانب صورة الملف الشخصي */
        .profile-actions {
          position: absolute;
          bottom: 15px;
          left: 16px;
          right: auto;
          display: flex;
          gap: 5px;
          align-items: center;
          flex-wrap: nowrap;
          z-index: 10;
          padding: 0;
        }

        .profile-actions button {
          border: none;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 10px;
          cursor: pointer;
          color: #fff;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          white-space: nowrap;
        }

        .profile-actions button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
          filter: brightness(1.05);
        }

        .btn-chat { background: linear-gradient(135deg, #3490dc, #2779bd); }
        .btn-add { background: linear-gradient(135deg, #38a169, #2f855a); }
        .btn-ignore { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .btn-report { background: linear-gradient(135deg, #dc2626, #b91c1c); }

        .profile-avatar {
          width: 130px;
          height: 130px;
          border-radius: 16px;
          overflow: hidden;
          border: 4px solid rgba(255,255,255,0.9);
          position: absolute;
          top: calc(100% - 90px);
          right: 20px;
          background-color: rgba(0,0,0,0.5);
          box-shadow: 0 6px 20px rgba(0,0,0,0.6);
          z-index: 2;
          transition: transform 0.3s ease;
        }

        .profile-avatar:hover {
          transform: scale(1.05);
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 0; /* إزالة أي استدارة للصورة */
        }

        .change-avatar-btn {
          position: absolute;
          top: calc(100% - 57px);
          right: 28px;
          background: rgba(0,0,0,0.8);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          text-align: center;
          line-height: 30px;
          font-size: 14px;
          color: #fff;
          cursor: pointer;
          z-index: 3;
          transition: background 0.3s ease, transform 0.2s ease;
          border: none;
        }

        .change-avatar-btn:hover {
          background: rgba(0,0,0,1);
          transform: scale(1.1);
        }

        input[type="file"] {
          display: none;
        }

        .profile-body {
          padding: 20px 20px 16px;
        }

        .profile-info {
          margin-bottom: 12px;
          text-align: center;
          margin-top: 0;
        }

        .profile-info h3 {
          margin: 0 0 6px 0;
          font-size: 20px;
          font-weight: bold;
          color: var(--accent-color);
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .profile-info h3:hover {
          color: #fff;
          transform: translateY(-2px);
        }

        .profile-info small {
          display: block;
          font-size: 13px;
          color: #ddd;
          opacity: 0.9;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .profile-info small:hover {
          color: var(--accent-color);
          transform: translateY(-1px);
        }

        .profile-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
          justify-content: center;
        }

        .profile-buttons button {
          flex: 1 1 30%;
          background: linear-gradient(135deg, #b71c1c, #8e0000);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }

        .profile-buttons button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
          background: linear-gradient(135deg, #d32f2f, #b71c1c);
          border-color: rgba(255,255,255,0.2);
        }

        .profile-buttons button:active {
          transform: translateY(0);
        }

        .profile-details {
          padding: 12px;
          font-size: 13px;
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }

        .profile-details p {
          margin: 6px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          border-radius: 6px;
          transition: all 0.3s ease;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
        }
        
        .profile-details p:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(-3px);
        }

        .profile-details p:last-child {
          border-bottom: none;
        }

        .profile-details span {
          font-weight: bold;
          color: var(--accent-color);
          text-align: left;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          padding: 3px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
        }

        .additional-details {
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          padding: 10px 16px;
          border-radius: 12px;
          margin: 10px 0;
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(15px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .additional-details p {
          margin: 6px 0;
          font-size: 12px;
          color: #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .additional-details p:hover {
          background: rgba(255,255,255,0.08);
          transform: scale(1.02);
        }

        .additional-details span {
          font-weight: bold;
          color: var(--accent-color);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .edit-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .edit-content {
          background: var(--card-bg);
          padding: 24px;
          border-radius: 16px;
          width: 90%;
          max-width: 350px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.9);
        }
        
        .edit-content h3 {
          margin: 0 0 16px 0;
          color: var(--accent-color);
          text-align: center;
          font-size: 18px;
        }
        
        .edit-field {
          margin-bottom: 16px;
        }
        
        .edit-field label {
          display: block;
          margin-bottom: 6px;
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        }
        
        .edit-field input, .edit-field select, .edit-field textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        
        .edit-field input:focus, .edit-field select:focus, .edit-field textarea:focus {
          outline: none;
          border-color: var(--accent-color);
          background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
          box-shadow: 0 0 15px rgba(255,193,7,0.3);
        }

        .edit-field select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffc107' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          padding-right: 40px;
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          margin: 4px 0;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .theme-option:hover {
          background: rgba(255,255,255,0.1);
          transform: translateX(-5px);
        }

        .theme-option.selected {
          background: var(--accent-color);
          color: #000;
          font-weight: bold;
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(255,193,7,0.4);
        }

        .theme-preview {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }

        .theme-option:hover .theme-preview {
          transform: scale(1.2);
          border-color: rgba(255,255,255,0.8);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .theme-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        /* ===== تأثيرات حركية جميلة ===== */
        
        .effect-pulse {
          animation: gentlePulse 3s ease-in-out infinite;
        }
        
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        .effect-glow {
          animation: goldenGlow 4s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.3);
        }
        
        @keyframes goldenGlow {
          0%, 100% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.3);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(255,215,0,0.6);
          }
        }
        
        .effect-water {
          animation: waterWave 6s ease-in-out infinite;
          background-size: 400% 400% !important;
        }
        
        @keyframes waterWave {
          0%, 100% { background-position: 0% 50%; }
          25% { background-position: 100% 50%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
        }
        
        .effect-aurora {
          animation: auroraShift 8s ease-in-out infinite;
          background-size: 300% 300% !important;
        }
        
        @keyframes auroraShift {
          0%, 100% { 
            background-position: 0% 50%;
            filter: hue-rotate(0deg);
          }
          25% { 
            background-position: 100% 50%;
            filter: hue-rotate(90deg);
          }
          50% { 
            background-position: 100% 100%;
            filter: hue-rotate(180deg);
          }
          75% { 
            background-position: 0% 100%;
            filter: hue-rotate(270deg);
          }
        }
        
        .effect-neon {
          animation: neonFlicker 2s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,20,147,0.5);
        }
        
        @keyframes neonFlicker {
          0%, 100% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,20,147,0.5);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(255,20,147,0.8);
          }
        }
        
        .effect-crystal {
          animation: crystalShimmer 5s ease-in-out infinite;
          position: relative;
        }
        
        .effect-crystal::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: crystalSweep 3s ease-in-out infinite;
          z-index: 1;
          pointer-events: none;
        }
        
        @keyframes crystalShimmer {
          0%, 100% { filter: brightness(1) contrast(1); }
          50% { filter: brightness(1.1) contrast(1.1); }
        }
        
        @keyframes crystalSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .effect-fire {
          animation: fireFlicker 1.5s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,69,0,0.5);
        }
        
        @keyframes fireFlicker {
          0%, 100% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,69,0,0.5);
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(255,69,0,0.8);
            filter: brightness(1.1);
          }
        }

        .effect-magnetic {
          animation: magneticFloat 4s ease-in-out infinite;
        }
        
        @keyframes magneticFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        .effect-heartbeat {
          animation: heartbeat 2s ease-in-out infinite;
        }
        
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.03); }
          28% { transform: scale(1); }
          42% { transform: scale(1.03); }
          70% { transform: scale(1); }
        }
        
        .effect-stars {
          position: relative;
          animation: starTwinkle 3s ease-in-out infinite;
        }
        
        .effect-stars::before {
          content: '✨';
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 20px;
          animation: starFloat 4s ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        .effect-stars::after {
          content: '⭐';
          position: absolute;
          bottom: 10px;
          left: 10px;
          font-size: 16px;
          animation: starFloat 3s ease-in-out infinite reverse;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes starTwinkle {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        
        @keyframes starFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }

        .effect-rainbow {
          animation: rainbowShift 4s ease-in-out infinite;
          background-size: 400% 400% !important;
        }
        
        @keyframes rainbowShift {
          0% { filter: hue-rotate(0deg); }
          25% { filter: hue-rotate(90deg); }
          50% { filter: hue-rotate(180deg); }
          75% { filter: hue-rotate(270deg); }
          100% { filter: hue-rotate(360deg); }
        }

        .effect-snow {
          position: relative;
          overflow: hidden;
        }
        
        .effect-snow::before {
          content: '❄️';
          position: absolute;
          top: -20px;
          left: 20%;
          font-size: 16px;
          animation: snowfall 5s linear infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        .effect-snow::after {
          content: '❄️';
          position: absolute;
          top: -20px;
          right: 30%;
          font-size: 12px;
          animation: snowfall 6s linear infinite 2s;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes snowfall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(360deg); opacity: 0; }
        }

        .effect-lightning {
          animation: lightningFlash 3s ease-in-out infinite;
        }
        
        @keyframes lightningFlash {
          0%, 90%, 100% { filter: brightness(1); }
          95% { filter: brightness(1.5) contrast(1.2); }
        }

        .effect-smoke {
          position: relative;
        }
        
        .effect-smoke::before {
          content: '💨';
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 18px;
          animation: smokeRise 4s ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes smokeRise {
          0% { transform: translateY(0px) scale(0.8); opacity: 0.7; }
          50% { transform: translateY(-15px) scale(1.1); opacity: 0.9; }
          100% { transform: translateY(-30px) scale(1.2); opacity: 0.3; }
        }

        .effect-butterfly {
          position: relative;
        }
        
        .effect-butterfly::before {
          content: '🦋';
          position: absolute;
          top: 15px;
          left: 15px;
          font-size: 16px;
          animation: butterflyFly 6s ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes butterflyFly {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(20px, -10px) rotate(15deg); }
          50% { transform: translate(-10px, -20px) rotate(-10deg); }
          75% { transform: translate(15px, -5px) rotate(20deg); }
        }

        .edit-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 16px;
        }

        .edit-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 13px;
        }

        .save-btn {
          background: #28a745;
          color: white;
        }

        .cancel-btn {
          background: #dc3545;
          color: white;
        }

        .edit-buttons button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        @media (max-width: 480px) {
          .profile-card {
            max-width: 100%;
          }
          
          .profile-avatar {
            width: 100px;
            height: 100px;
            top: calc(100% - 50px);
            right: 16px;
            border-radius: 12px; /* زوايا مدورة قليلاً للأجهزة المحمولة */
          }
          
          .change-avatar-btn {
            top: calc(100% - 24px);
            right: 22px;
            width: 25px;
            height: 25px;
            line-height: 25px;
            font-size: 12px;
          }
          
          .profile-body {
            padding: 50px 12px 12px;
          }
          
          .profile-info h3 {
            font-size: 18px;
          }
          
          /* أنماط الأزرار للأجهزة المحمولة */
          .profile-actions {
            bottom: 10px;
            left: 16px;
            right: auto;
            gap: 3px;
            padding: 0;
            flex-wrap: wrap;
            max-width: calc(100% - 130px);
          }
          
          .profile-actions button {
            padding: 3px 6px;
            font-size: 9px;
          }
        }
      `}</style>

      {/* Modal Background - completely transparent */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-4 overflow-y-auto">
        <div
          className={`profile-card ${selectedEffect}`}
          style={{
            background: localUser?.profileBackgroundColor
              ? buildProfileBackgroundGradient(localUser.profileBackgroundColor)
              : 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
            backgroundBlendMode: 'normal',
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-20 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Cover Section - completely stable */}
          <div
            className="profile-cover"
            style={{
              backgroundImage: `url(${getProfileBannerSrcLocal()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {localUser?.id === currentUser?.id && (
              <>
                <button
                  className="change-cover-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  🖼️ تغيير الغلاف
                </button>
                
                {/* اسم المستخدم مع الرتبة */}
                <div style={{
                  position: 'absolute',
                  bottom: '45px',
                  left: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  zIndex: 3
                }}>
                  {/* الرتبة فوق الاسم */}
                  {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px' }}>
                        {localUser?.userType === 'owner' && 'Owner'}
                        {localUser?.userType === 'admin' && 'Super Admin'}
                        {localUser?.userType === 'moderator' && 'Moderator'}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {getUserLevelIcon(localUser, 16)}
                        {localUser?.userType === 'admin' && '⭐'}
                      </span>
                    </div>
                  )}
                  {/* الاسم */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: getFinalUsernameColor(localUser || {}),
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    cursor: 'pointer'
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
                <div style={{
                  position: 'absolute',
                  bottom: '45px',
                  left: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  zIndex: 3
                }}>
                  {/* الرتبة فوق الاسم */}
                  {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px' }}>
                        {localUser?.userType === 'owner' && 'Owner'}
                        {localUser?.userType === 'admin' && 'Super Admin'}
                        {localUser?.userType === 'moderator' && 'Moderator'}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {getUserLevelIcon(localUser, 16)}
                        {localUser?.userType === 'admin' && '⭐'}
                      </span>
                    </div>
                  )}
                  {/* الاسم */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: getFinalUsernameColor(localUser || {}),
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {localUser?.username || 'اسم المستخدم'}
                  </h3>
                </div>
              </>
            )}

            <div className="profile-avatar">
              {/* عرض الصورة مباشرة بدون استخدام ProfileImage للحصول على شكل مربع */}
              <img
                src={getProfileImageSrcLocal()}
                alt="الصورة الشخصية"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'none',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                }}
              />
            </div>

            {localUser?.id === currentUser?.id && (
              <button
                className="change-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
                title="تغيير الصورة"
                disabled={isLoading}
              >
                📷
              </button>
            )}

            {/* الأزرار - على حافة صورة الغلاف السفلية */}
            {localUser?.id !== currentUser?.id && (
              <div className="profile-actions">
                <button className="btn-chat" onClick={() => onPrivateMessage?.(localUser)}>
                  💬 محادثة خاصة
                </button>
                <button className="btn-ignore" onClick={() => onIgnoreUser?.(localUser?.id || 0)}>
                  🚫 تجاهل
                </button>
                <button className="btn-add" onClick={() => onAddFriend?.(localUser)}>
                  👥 إضافة صديق
                </button>
                <button className="btn-report" onClick={() => onReportUser?.(localUser)}>
                  🚩 بلاغ
                </button>
              </div>
            )}
          </div>

          {/* Profile Body - exact match to original */}
          <div className="profile-body">
            <div className="profile-info">
              <small
                onClick={() => localUser?.id === currentUser?.id && openEditModal('status')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {localUser?.status || 'اضغط لإضافة حالة'}
              </small>
            </div>

            {localUser?.id !== currentUser?.id && <></>}

            <div className="profile-details">
              <p
                onClick={() => localUser?.id === currentUser?.id && openEditModal('gender')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🧍‍♀️ الجنس: <span>{localUser?.gender || 'غير محدد'}</span>
              </p>
              <p
                onClick={() => localUser?.id === currentUser?.id && openEditModal('country')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🌍 البلد: <span>{localUser?.country || 'غير محدد'}</span>
              </p>
              <p
                onClick={() => localUser?.id === currentUser?.id && openEditModal('age')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🎂 العمر: <span>{localUser?.age ? `${localUser.age} سنة` : 'غير محدد'}</span>
              </p>
              <p
                onClick={() => localUser?.id === currentUser?.id && openEditModal('socialStatus')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                💍 الحالة الاجتماعية: <span>{localUser?.relation || 'غير محدد'}</span>
              </p>
              <p>
                📅 تاريخ الإنضمام:{' '}
                <span>
                  {localUser?.createdAt
                    ? new Date(localUser.createdAt).toLocaleDateString('ar-SA')
                    : 'غير محدد'}
                </span>
              </p>
              <p>
                🎁 نقاط الهدايا: <span>{localUser?.points || 0}</span>
              </p>
              {/* إرسال النقاط - يظهر فقط للمستخدمين الآخرين */}
              {currentUser && currentUser.id !== localUser?.id && (
                <p onClick={() => setCurrentEditType('sendPoints')} style={{ cursor: 'pointer' }}>
                  💰 إرسال النقاط: <span>اضغط للإرسال</span>
                </p>
              )}
              <p>
                🧾 الحالة: <span>{localUser?.isOnline ? 'متصل' : 'غير متصل'}</span>
              </p>
            </div>

            {localUser?.id === currentUser?.id && (
              <div className="additional-details">
                <p>
                  💬 عدد الرسائل: <span>0</span>
                </p>
                <p>
                  ⭐ مستوى العضو: <span>مستوى {localUser?.level || 1}</span>
                </p>
                <p onClick={() => setCurrentEditType('theme')} style={{ cursor: 'pointer' }}>
                  🎨 لون الملف الشخصي: <span>اضغط للتغيير</span>
                </p>
                <p onClick={() => setCurrentEditType('effects')} style={{ cursor: 'pointer' }}>
                  ✨ تأثيرات حركية: <span>اضغط للتغيير</span>
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
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'profile')}
                disabled={isLoading}
              />
            </>
          )}
        </div>
      </div>

      {/* Edit Modal - exact match to original */}
      {currentEditType && (user.id === currentUser?.id || currentEditType === 'sendPoints') && (
        <div className="edit-modal">
          <div className="edit-content">
            <h3>
              {currentEditType === 'name' && 'تعديل الاسم'}
              {currentEditType === 'status' && 'تعديل الحالة'}
              {currentEditType === 'gender' && 'تعديل الجنس'}
              {currentEditType === 'country' && 'تعديل البلد'}
              {currentEditType === 'age' && 'تعديل العمر'}
              {currentEditType === 'socialStatus' && 'تعديل الحالة الاجتماعية'}
              {currentEditType === 'theme' && '🎨 اختيار لون الملف الشخصي (خلفية الصندوق)'}
              {currentEditType === 'effects' && '✨ تعديل التأثيرات الحركية'}
              {currentEditType === 'sendPoints' && '💰 إرسال النقاط'}
            </h3>

            {currentEditType === 'theme' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {themes.map((theme) => (
                  <div
                    key={theme.value}
                    className={`theme-option ${selectedTheme === theme.preview ? 'selected' : ''}`}
                    onClick={() => handleThemeChange(theme.preview)}
                  >
                    <div className="theme-preview" style={{ background: theme.preview }} />
                    <div className="theme-name">
                      {theme.emoji} {theme.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'effects' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {effects.map((effect) => (
                  <div
                    key={effect.value}
                    className={`theme-option ${selectedEffect === effect.value ? 'selected' : ''}`}
                    onClick={() => handleEffectChange(effect.value)}
                  >
                    <div
                      className="theme-preview"
                      style={{
                        background: 'linear-gradient(45deg, #ff7c00, #e10026, #800e8c, #1a004d)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {effect.emoji}
                    </div>
                    <div>
                      <div className="theme-name">
                        {effect.emoji} {effect.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
                        {effect.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'sendPoints' ? (
              <div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                    {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                      <>نقاطك الحالية: غير محدودة للمالك</>
                    ) : (
                      <>نقاطك الحالية: {formatPoints(currentUser?.points || 0)}</>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      placeholder="عدد النقاط"
                      value={pointsToSend}
                      onChange={(e) => setPointsToSend(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
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
                      style={{
                        background: sendingPoints
                          ? 'rgba(255,193,7,0.5)'
                          : 'linear-gradient(135deg, #ffc107, #ff8f00)',
                        color: '#000',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: sendingPoints ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {sendingPoints ? '⏳' : '🎁'} إرسال
                    </button>
                  </div>

                  <div style={{ fontSize: '10px', color: '#aaa' }}>
                    {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                      <>💡 لن يتم خصم النقاط من رصيدك، كونك المالك</>
                    ) : (
                      <>💡 سيتم خصم النقاط من رصيدك وإضافتها للمستخدم</>
                    )}
                  </div>
                </div>

                <div className="edit-buttons" style={{ marginTop: '12px' }}>
                  <button className="cancel-btn" onClick={closeEditModal}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="edit-field">
                  <label>
                    {currentEditType === 'name' && 'الاسم الجديد:'}
                    {currentEditType === 'status' && 'الحالة الجديدة:'}
                    {currentEditType === 'gender' && 'الجنس:'}
                    {currentEditType === 'country' && 'البلد:'}
                    {currentEditType === 'age' && 'العمر:'}
                    {currentEditType === 'socialStatus' && 'الحالة الاجتماعية:'}
                  </label>
                  {currentEditType === 'gender' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)}>
                      <option value="">اختر...</option>
                      <option value="ذكر">👨 ذكر</option>
                      <option value="أنثى">👩 أنثى</option>
                    </select>
                  ) : currentEditType === 'country' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)}>
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
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)}>
                      <option value="">اختر...</option>
                      <option value="أعزب">💚 أعزب</option>
                      <option value="متزوج">💍 متزوج</option>
                      <option value="مطلق">💔 مطلق</option>
                      <option value="أرمل">🖤 أرمل</option>
                    </select>
                  ) : (
                    <input
                      type={currentEditType === 'age' ? 'number' : 'text'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={handleSaveEdit} disabled={isLoading}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={closeEditModal}>
                    ❌ إلغاء
                  </button>
                </div>
              </>
            )}

            {(currentEditType === 'theme' || currentEditType === 'effects') && (
              <div className="edit-buttons">
                <button className="cancel-btn" onClick={closeEditModal}>
                  ❌ إغلاق
                </button>
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

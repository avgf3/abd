import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Upload, Edit2, Save, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getEffectColor } from '@/utils/themeUtils';
import { getProfileImageSrc, getBannerImageSrc } from '@/utils/imageUtils';
import type { ChatUser } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import PointsSentNotification from '@/components/ui/PointsSentNotification';
import { uploadProfileImage, uploadProfileBanner } from '@/services/uploadService';
import { sanitizeInput, validateProfileData, validateImageFile } from '@/utils/validation';
import './ProfileModal.css';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
  onUpdate?: (user: ChatUser) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
}

export default function ProfileModal({ user, currentUser, onClose, onIgnoreUser, onUpdate, onPrivateMessage, onAddFriend }: ProfileModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // حالة محلية للمستخدم للتحديث الفوري
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);
  const [selectedTheme, setSelectedTheme] = useState(user?.userTheme || 'theme-new-gradient');
  const [selectedEffect, setSelectedEffect] = useState(user?.profileEffect || 'none');

  // متغيرات نظام إرسال النقاط
  const [sendingPoints, setSendingPoints] = useState(false);
  const [pointsToSend, setPointsToSend] = useState('');
  const [pointsSentNotification, setPointsSentNotification] = useState<{
    show: boolean;
    points: number;
    recipientName: string;
  }>({ show: false, points: 0, recipientName: '' });

  // معاينة الصور
  const [previewProfile, setPreviewProfile] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);

  // تحديث الحالة المحلية عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setLocalUser(user);
      setSelectedTheme(user.userTheme || 'theme-new-gradient');
      setSelectedEffect(user.profileEffect || 'none');
    }
  }, [user]);

  if (!localUser) return null;

  // دالة موحدة لجلب بيانات المستخدم من السيرفر وتحديث الحالة المحلية
  const fetchAndUpdateUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`فشل في جلب بيانات المستخدم: ${res.status}`);
      }
      
      const userData = await res.json();
      setLocalUser(userData);
      if (onUpdate) onUpdate(userData);
      
      // تحديث الثيم والتأثير المحلي
      if (userData.userTheme) {
        setSelectedTheme(userData.userTheme);
      }
      if (userData.profileEffect) {
        setSelectedEffect(userData.profileEffect);
      }
      
    } catch (err: any) {
      toast({ 
        title: 'خطأ', 
        description: err.message || 'فشل في تحديث بيانات الملف الشخصي من السيرفر', 
        variant: 'destructive' 
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
    
    // تحديث الثيم والتأثير إذا تم تغييرهما
    if (updates.userTheme) {
      setSelectedTheme(updates.userTheme);
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
      emoji: '🌅'
    },
    { 
      value: 'theme-ocean-depths', 
      name: 'أعماق المحيط',
      preview: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea)',
      emoji: '🌊'
    },
    { 
      value: 'theme-aurora-borealis', 
      name: 'الشفق القطبي',
      preview: 'linear-gradient(135deg, #a8edea, #fed6e3, #ffecd2, #fcb69f, #a8edea)',
      emoji: '✨'
    },
    { 
      value: 'theme-cosmic-night', 
      name: 'الليل الكوني',
      preview: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea, #764ba2)',
      emoji: '🌌'
    },
    { 
      value: 'theme-emerald-forest', 
      name: 'الغابة الزمردية',
      preview: 'linear-gradient(135deg, #11998e, #38ef7d, #11998e, #38ef7d)',
      emoji: '🌿'
    },
    { 
      value: 'theme-rose-gold', 
      name: 'الوردي الذهبي',
      preview: 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef, #ff9a9e)',
      emoji: '🌸'
    },
    { 
      value: 'theme-midnight-purple', 
      name: 'البنفسجي الليلي',
      preview: 'linear-gradient(135deg, #4facfe, #00f2fe, #4facfe, #00f2fe)',
      emoji: '🔮'
    },
    { 
      value: 'theme-golden-hour', 
      name: 'الساعة الذهبية',
      preview: 'linear-gradient(135deg, #fa709a, #fee140, #fa709a, #fee140)',
      emoji: '🌟'
    },
    { 
      value: 'theme-neon-dreams', 
      name: 'أحلام النيون',
      preview: 'linear-gradient(135deg, #ff0099, #493240, #ff0099, #493240)',
      emoji: '💫'
    },
    { 
      value: 'theme-silver-mist', 
      name: 'الضباب الفضي',
      preview: 'linear-gradient(135deg, #c3cfe2, #c3cfe2, #e0c3fc, #c3cfe2)',
      emoji: '☁️'
    },
    { 
      value: 'theme-fire-opal', 
      name: 'الأوبال الناري',
      preview: 'linear-gradient(135deg, #ff416c, #ff4b2b, #ff416c, #ff4b2b)',
      emoji: '🔥'
    },
    { 
      value: 'theme-crystal-clear', 
      name: 'البلور الصافي',
      preview: 'linear-gradient(135deg, #89f7fe, #66a6ff, #89f7fe, #66a6ff)',
      emoji: '💎'
    },
    { 
      value: 'theme-new-gradient', 
      name: 'التدرج الجديد المطابق للصورة',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🎨'
    }
  ];

  // Complete effects collection from original code
  const effects = [
    { 
      value: 'none', 
      name: 'بدون تأثيرات',
      emoji: '🚫',
      description: 'بدون أي تأثيرات حركية'
    },
    { 
      value: 'effect-pulse', 
      name: 'النبض الناعم',
      emoji: '💓',
      description: 'نبض خفيف ومريح'
    },
    { 
      value: 'effect-glow', 
      name: 'التوهج الذهبي',
      emoji: '✨',
      description: 'توهج ذهبي جميل'
    },
    { 
      value: 'effect-water', 
      name: 'التموج المائي',
      emoji: '🌊',
      description: 'حركة مائية سلسة'
    },
    { 
      value: 'effect-aurora', 
      name: 'الشفق القطبي',
      emoji: '🌌',
      description: 'تأثير الشفق الملون'
    },
    { 
      value: 'effect-neon', 
      name: 'النيون المتوهج',
      emoji: '💖',
      description: 'توهج نيون وردي'
    },
    { 
      value: 'effect-crystal', 
      name: 'البلور المتلألئ',
      emoji: '💎',
      description: 'لمعة بلورية جميلة'
    },
    { 
      value: 'effect-fire', 
      name: 'النار المتوهجة',
      emoji: '🔥',
      description: 'توهج ناري حارق'
    },
    { 
      value: 'effect-magnetic', 
      name: 'المغناطيس',
      emoji: '🧲',
      description: 'حركة عائمة مغناطيسية'
    },
    { 
      value: 'effect-heartbeat', 
      name: 'القلب النابض',
      emoji: '❤️',
      description: 'نبض مثل القلب'
    },
    { 
      value: 'effect-stars', 
      name: 'النجوم المتلألئة',
      emoji: '⭐',
      description: 'نجوم متحركة'
    },
    { 
      value: 'effect-rainbow', 
      name: 'قوس قزح',
      emoji: '🌈',
      description: 'تدرج قوس قزح متحرك'
    }
  ];

  // Profile image fallback
  const getProfileImageSrcLocal = () => {
    return getProfileImageSrc(localUser?.profileImage, '/default_avatar.svg');
  };

  // Profile banner fallback
  const getProfileBannerSrcLocal = () => {
    return getBannerImageSrc(localUser?.profileBanner, 'https://i.imgur.com/rJKrUfs.jpeg');
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

  // معالجة رفع الصور المحسّنة
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, uploadType: 'profile' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    
    // التحقق من صحة الملف
    const validation = validateImageFile(file, uploadType);
    if (!validation.isValid) {
      toast({
        title: "خطأ في الملف",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // إنشاء معاينة
      const reader = new FileReader();
      reader.onload = (e) => {
        if (uploadType === 'profile') {
          setPreviewProfile(e.target?.result as string);
        } else {
          setPreviewBanner(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);

      // رفع الصورة
      const result = uploadType === 'profile' 
        ? await uploadProfileImage(file, currentUser.id)
        : await uploadProfileBanner(file, currentUser.id);

      if (result.success) {
        // تحديث البيانات المحلية فوراً
        if (uploadType === 'profile' && result.imageUrl) {
          updateUserData({ profileImage: result.imageUrl });
        } else if (uploadType === 'banner' && result.bannerUrl) {
          updateUserData({ profileBanner: result.bannerUrl });
        }
        
        // جلب البيانات المحدثة من السيرفر للتأكد
        await fetchAndUpdateUser(currentUser.id);
        
        toast({
          title: "تم بنجاح",
          description: uploadType === 'profile' ? "تم تحديث الصورة الشخصية" : "تم تحديث صورة الغلاف"
        });
        
        // إزالة المعاينة
        if (uploadType === 'profile') setPreviewProfile(null);
        else setPreviewBanner(null);
      } else {
        throw new Error(result.error || 'فشل في رفع الصورة');
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحميل الصورة",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      // تنظيف input files
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // حفظ تعديل البيانات
  const handleSaveEdit = async () => {
    if (!editValue.trim() || !currentUser) {
      toast({ title: "خطأ", description: "يرجى إدخال قيمة صحيحة", variant: "destructive" });
      return;
    }

    // التحقق من صحة البيانات
    const sanitizedValue = sanitizeInput(editValue);
    const validation = validateProfileData(currentEditType!, sanitizedValue);
    
    if (!validation.isValid) {
      toast({
        title: "خطأ في البيانات",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let fieldName = '';
      switch (currentEditType) {
        case 'name': fieldName = 'username'; break;
        case 'status': fieldName = 'status'; break;
        case 'gender': fieldName = 'gender'; break;
        case 'country': fieldName = 'country'; break;
        case 'age': fieldName = 'age'; break;
        case 'socialStatus': fieldName = 'relation'; break;
      }
      
      const response = await apiRequest('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, [fieldName]: sanitizedValue }),
      });
      
      if (response.success) {
        await fetchAndUpdateUser(currentUser.id);
        toast({ title: "نجح ✅", description: "تم تحديث الملف الشخصي" });
        closeEditModal();
      } else {
        throw new Error(response.error || 'فشل في التحديث');
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحديث البيانات", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث الثيم
  const handleThemeChange = async (theme: string) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      setSelectedTheme(theme);
      
      const response = await apiRequest('/api/users/update-background-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id,
          color: theme 
        }),
      });

      if (response.success) {
        updateUserData({
          userTheme: theme,
          profileBackgroundColor: theme
        });
        
        toast({
          title: "نجح ✅",
          description: "تم تحديث لون الملف الشخصي",
        });
      } else {
        throw new Error(response.error || 'فشل في تحديث اللون');
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث اللون",
        variant: "destructive",
      });
      setSelectedTheme(localUser?.userTheme || 'theme-new-gradient');
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث التأثير
  const handleEffectChange = async (effect: string) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      setSelectedEffect(effect);
      
      const response = await apiRequest(`/api/users/${localUser?.id}`, {
        method: 'PUT',
        body: { 
          profileEffect: effect,
          usernameColor: getEffectColor(effect)
        }
      });

      if (response.success || response.id) {
        updateUserData({ 
          profileEffect: effect,
          usernameColor: getEffectColor(effect)
        });
        
        toast({
          title: "نجح ✅",
          description: "تم تحديث التأثيرات ولون الاسم",
        });
      } else {
        throw new Error('فشل في تحديث التأثيرات');
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث التأثيرات",
        variant: "destructive",
      });
      setSelectedEffect(localUser?.profileEffect || 'none');
    } finally {
      setIsLoading(false);
    }
  };

  // دالة إرسال النقاط
  const handleSendPoints = async () => {
    if (!currentUser) return;
    
    const points = parseInt(pointsToSend);
    
    if (!points || points <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عدد صحيح من النقاط",
        variant: "destructive"
      });
      return;
    }

    if (points > (currentUser.points || 0)) {
      toast({
        title: "نقاط غير كافية",
        description: `لديك ${currentUser.points || 0} نقطة فقط`,
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingPoints(true);
      
      const response = await apiRequest('/api/points/send', {
        method: 'POST',
        body: {
          senderId: currentUser.id,
          receiverId: localUser?.id,
          points: points,
          reason: `نقاط مُهداة من ${currentUser.username}`
        }
      });

      if (response.success) {
        setPointsSentNotification({
          show: true,
          points: points,
          recipientName: localUser?.username || ''
        });
        
        setPointsToSend('');
        
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الإرسال",
        description: error.message || "فشل في إرسال النقاط",
        variant: "destructive"
      });
    } finally {
      setSendingPoints(false);
    }
  };

  return (
    <>
      {/* Modal Background */}
      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose} />
      
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-4 overflow-y-auto">
        <div className={`profile-card ${selectedTheme} ${selectedEffect}`}>
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 z-20 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Cover Section */}
          <div 
            className="profile-cover"
            style={{ 
              backgroundImage: `url(${previewBanner || getProfileBannerSrcLocal()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {localUser?.id === currentUser?.id && (
              <button 
                className="change-cover-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                🖼️ تغيير الغلاف
              </button>
            )}

            <div className="profile-avatar">
              <img 
                src={previewProfile || getProfileImageSrcLocal()} 
                alt="الصورة الشخصية"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/default_avatar.svg') {
                    target.src = '/default_avatar.svg';
                  }
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
          </div>

          {/* Profile Body - exact match to original */}
          <div className="profile-body">
            <div className="profile-info">
              <h3 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('name')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {localUser?.username || 'اسم المستخدم'}
              </h3>
              <small 
                onClick={() => localUser?.id === currentUser?.id && openEditModal('status')}
                style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {localUser?.status || 'اضغط لإضافة حالة'}
              </small>
            </div>

            {localUser?.id !== currentUser?.id && (
              <div className="profile-buttons">
                <button>🚩 تبليغ</button>
                <button onClick={() => onIgnoreUser?.(localUser?.id || 0)}>🚫 حظر</button>
                <button onClick={() => onPrivateMessage?.(localUser)}>💬 محادثة</button>
                <button onClick={() => onAddFriend?.(localUser)}>👥 اضافة صديق</button>
              </div>
            )}

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
                📅 تاريخ الإنضمام: <span>{localUser?.createdAt ? new Date(localUser.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
              </p>
              <p>
                🎁 نقاط الهدايا: <span>{localUser?.points || 0}</span>
              </p>
              {/* إرسال النقاط - يظهر فقط للمستخدمين الآخرين */}
              {currentUser && currentUser.id !== localUser?.id && (
                <p 
                  onClick={() => setCurrentEditType('sendPoints')}
                  style={{ cursor: 'pointer' }}
                >
                  💰 إرسال النقاط: <span>اضغط للإرسال</span>
                </p>
              )}
              <p>
                🧾 الحالة: <span>{localUser?.isOnline ? 'متصل' : 'غير متصل'}</span>
              </p>
            </div>

            {localUser?.id === currentUser?.id && (
              <div className="additional-details">
                <p>💬 عدد الرسائل: <span>0</span></p>
                <p>⭐ مستوى العضو: <span>مستوى {localUser?.level || 1}</span></p>
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
              {currentEditType === 'theme' && '🎨 اختيار لون الملف الشخصي'}
              {currentEditType === 'effects' && '✨ تعديل التأثيرات الحركية'}
              {currentEditType === 'sendPoints' && '💰 إرسال النقاط'}
            </h3>
            
            {currentEditType === 'theme' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {themes.map(theme => (
                  <div
                    key={theme.value}
                    className={`theme-option ${selectedTheme === theme.value ? 'selected' : ''}`}
                    onClick={() => handleThemeChange(theme.value)}
                  >
                    <div 
                      className="theme-preview"
                      style={{ background: theme.preview }}
                    />
                    <div className="theme-name">{theme.emoji} {theme.name}</div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'effects' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {effects.map(effect => (
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
                        justifyContent: 'center'
                      }}
                    >
                      {effect.emoji}
                    </div>
                    <div>
                      <div className="theme-name">{effect.emoji} {effect.name}</div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
                        {effect.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'sendPoints' ? (
              <div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                    نقاطك الحالية: {formatPoints(currentUser?.points || 0)}
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
                        fontSize: '12px'
                      }}
                      min="1"
                      max={currentUser?.points || 0}
                      disabled={sendingPoints}
                      autoFocus
                    />
                    <button
                      onClick={handleSendPoints}
                      disabled={sendingPoints || !pointsToSend || parseInt(pointsToSend) <= 0}
                      style={{
                        background: sendingPoints ? 'rgba(255,193,7,0.5)' : 'linear-gradient(135deg, #ffc107, #ff8f00)',
                        color: '#000',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: sendingPoints ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {sendingPoints ? '⏳' : '🎁'} إرسال
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '10px', color: '#aaa' }}>
                    💡 سيتم خصم النقاط من رصيدك وإضافتها للمستخدم
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
import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getEffectColor } from '@/utils/themeUtils';
import type { ChatUser } from '@/types/chat';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
}

export default function ProfileModal({ user, currentUser, onClose, onIgnoreUser }: ProfileModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(user?.userTheme || 'theme-new-gradient');
  const [selectedEffect, setSelectedEffect] = useState(user?.profileEffect || 'none');

  if (!user) return null;

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
      value: 'theme-burgundy-velvet', 
      name: 'الخمري المخملي',
      preview: 'linear-gradient(135deg, #800020, #8b0000, #a52a2a, #800020)',
      emoji: '🍷'
    },
    { 
      value: 'theme-golden-velvet', 
      name: 'الذهبي المخملي',
      preview: 'linear-gradient(135deg, #ffd700, #daa520, #b8860b, #ffd700)',
      emoji: '👑'
    },
    { 
      value: 'theme-royal-black', 
      name: 'الأسود الملكي',
      preview: 'linear-gradient(135deg, #191970, #2f4f4f, #000000, #191970)',
      emoji: '⚜️'
    },
    { 
      value: 'theme-berry-velvet', 
      name: 'التوتي المخملي',
      preview: 'linear-gradient(135deg, #8a2be2, #4b0082, #800080, #8a2be2)',
      emoji: '🫐'
    },
    { 
      value: 'theme-crimson-velvet', 
      name: 'العنابي المخملي',
      preview: 'linear-gradient(135deg, #dc143c, #b22222, #8b0000, #dc143c)',
      emoji: '🔴'
    },
    { 
      value: 'theme-emerald-velvet', 
      name: 'الزمردي المخملي',
      preview: 'linear-gradient(135deg, #008000, #228b22, #006400, #008000)',
      emoji: '💚'
    },
    { 
      value: 'theme-sapphire-velvet', 
      name: 'الياقوتي المخملي',
      preview: 'linear-gradient(135deg, #0047ab, #191970, #00008b, #0047ab)',
      emoji: '💙'
    },
    { 
      value: 'theme-ruby-velvet', 
      name: 'الياقوت الأحمر',
      preview: 'linear-gradient(135deg, #9b111e, #8b0000, #800000, #9b111e)',
      emoji: '❤️'
    },
    { 
      value: 'theme-amethyst-velvet', 
      name: 'الأميثيست المخملي',
      preview: 'linear-gradient(135deg, #9966cc, #8a2be2, #4b0082, #9966cc)',
      emoji: '💜'
    },
    { 
      value: 'theme-onyx-velvet', 
      name: 'الأونيكس المخملي',
      preview: 'linear-gradient(135deg, #2f4f4f, #191919, #000000, #2f4f4f)',
      emoji: '🖤'
    },
    { 
      value: 'theme-sunset-fire', 
      name: 'توهج النار البرتقالي - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🔥'
    },
    { 
      value: 'theme-perfect-gradient', 
      name: 'التدرج المثالي - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🌟'
    },
    { 
      value: 'theme-image-gradient', 
      name: 'تدرج الصورة - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🖼️'
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
    },
    { 
      value: 'effect-snow', 
      name: 'الثلج المتساقط',
      emoji: '❄️',
      description: 'ثلج متساقط جميل'
    },
    { 
      value: 'effect-lightning', 
      name: 'البرق',
      emoji: '⚡',
      description: 'وميض البرق'
    },
    { 
      value: 'effect-smoke', 
      name: 'الدخان',
      emoji: '💨',
      description: 'دخان متصاعد'
    },
    { 
      value: 'effect-butterfly', 
      name: 'الفراشة',
      emoji: '🦋',
      description: 'فراشة متحركة'
    }
  ];

  // Profile image fallback
  const getProfileImageSrc = () => {
    if (user?.profileImage) {
      return user.profileImage.startsWith('http') ? user.profileImage : `/uploads/${user.profileImage}`;
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.username || 'User')}`;
  };

  // Profile banner fallback
  const getProfileBannerSrc = () => {
    if (user?.profileBanner) {
      return user.profileBanner.startsWith('http') ? user.profileBanner : `/uploads/${user.profileBanner}`;
    }
    return 'https://i.imgur.com/rJKrUfs.jpeg';
  };

  // Edit modal handlers
  const openEditModal = (type: string) => {
    setCurrentEditType(type);
    
    switch (type) {
      case 'name':
        setEditValue(user?.username || '');
        break;
      case 'status':
        setEditValue(user?.status || '');
        break;
      case 'gender':
        setEditValue(user?.gender || '');
        break;
      case 'country':
        setEditValue(user?.country || '');
        break;
      case 'age':
        setEditValue(user?.age?.toString() || '');
        break;
      case 'socialStatus':
        setEditValue(user?.relation || '');
        break;
    }
  };

  const closeEditModal = () => {
    setCurrentEditType(null);
    setEditValue('');
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, uploadType: 'profile' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صحيح",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ", 
        description: "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const endpoint = uploadType === 'profile' ? '/api/upload/profile-image' : '/api/upload/profile-banner';
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.success) {
        toast({
          title: "نجح",
          description: uploadType === 'profile' ? "تم تحديث الصورة الشخصية" : "تم تحديث صورة الغلاف",
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الصورة",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال قيمة صحيحة",
        variant: "destructive",
      });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: editValue }),
      });

      if (response.success) {
        toast({
          title: "نجح",
          description: "تم تحديث الملف الشخصي",
        });
        closeEditModal();
      }
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (theme: string) => {
    setSelectedTheme(theme);
    try {
      await apiRequest('/api/users/update-background-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: theme }),
      });
      toast({
        title: "نجح",
        description: "تم تحديث لون الخلفية",
      });
    } catch (error) {
      console.error('Theme update error:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث اللون",
        variant: "destructive",
      });
    }
  };

  const handleEffectChange = async (effect: string) => {
    setSelectedEffect(effect);
    
    try {
      // حفظ التأثير في قاعدة البيانات
      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        body: { 
          profileEffect: effect,
          // ربط لون الاسم بالتأثير تلقائياً
          usernameColor: getEffectColor(effect)
        }
      });

      // تحديث المستخدم في الواجهة
      if (onUpdate) {
        onUpdate({ 
          ...user, 
          profileEffect: effect,
          usernameColor: getEffectColor(effect)
        });
      }
      
      toast({
        title: "نجح",
        description: "تم تحديث التأثيرات ولون الاسم",
      });
    } catch (error) {
      console.error('Error updating profile effect:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث التأثيرات",
        variant: "destructive",
      });
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
          max-width: 380px;
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
          aspect-ratio: 3 / 1;
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

        .profile-avatar {
          width: 100px;
          height: 100px;
          border-radius: 16px;
          overflow: hidden;
          border: 4px solid rgba(255,255,255,0.9);
          position: absolute;
          top: calc(100% - 50px);
          right: 20px;
          background-color: white;
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
        }

        .change-avatar-btn {
          position: absolute;
          top: calc(100% - 25px);
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
          padding: 60px 20px 16px;
        }

        .profile-info {
          margin-bottom: 12px;
          text-align: center;
          margin-top: -50px;
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
            width: 80px;
            height: 80px;
            top: calc(100% - 40px);
            right: 16px;
          }
          
          .change-avatar-btn {
            top: calc(100% - 20px);
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
        }
      `}</style>

      {/* Modal Background - completely transparent */}
      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose} />
      
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className={`profile-card ${selectedTheme} ${selectedEffect}`}>
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Cover Section - exact match to original */}
          <div 
            className="profile-cover"
            style={{ backgroundImage: `url(${getProfileBannerSrc()})` }}
          >
            {user.id === currentUser?.id && (
              <button 
                className="change-cover-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                🖼️ تغيير الغلاف
              </button>
            )}

            <div className="profile-avatar">
              <img 
                src={getProfileImageSrc()} 
                alt="الصورة الشخصية"
              />
            </div>
            
            {user.id === currentUser?.id && (
              <button 
                className="change-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
                title="تغيير الصورة"
              >
                📷
              </button>
            )}
          </div>

          {/* Profile Body - exact match to original */}
          <div className="profile-body">
            <div className="profile-info">
              <h3 
                onClick={() => user.id === currentUser?.id && openEditModal('name')}
                style={{ cursor: user.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {user?.username || 'اسم المستخدم'}
              </h3>
              <small 
                onClick={() => user.id === currentUser?.id && openEditModal('status')}
                style={{ cursor: user.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                {user?.status || 'اضغط لإضافة حالة'}
              </small>
            </div>

            {user.id !== currentUser?.id && (
              <div className="profile-buttons">
                <button>🚩 تبليغ</button>
                <button onClick={() => onIgnoreUser?.(user.id)}>🚫 حظر</button>
                <button>💬 محادثة</button>
              </div>
            )}

            <div className="profile-details">
              <p 
                onClick={() => user.id === currentUser?.id && openEditModal('gender')}
                style={{ cursor: user.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🧍‍♀️ الجنس: <span>{user?.gender || 'غير محدد'}</span>
              </p>
              <p 
                onClick={() => user.id === currentUser?.id && openEditModal('country')}
                style={{ cursor: user.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🌍 البلد: <span>{user?.country || 'غير محدد'}</span>
              </p>
              <p 
                onClick={() => user.id === currentUser?.id && openEditModal('age')}
                style={{ cursor: user.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                🎂 العمر: <span>{user?.age ? `${user.age} سنة` : 'غير محدد'}</span>
              </p>
              <p 
                onClick={() => user.id === currentUser?.id && openEditModal('socialStatus')}
                style={{ cursor: user.id === currentUser?.id ? 'pointer' : 'default' }}
              >
                💍 الحالة الاجتماعية: <span>{user?.relation || 'غير محدد'}</span>
              </p>
              <p>
                📅 تاريخ الإنضمام: <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
              </p>
              <p>
                🎁 نقاط الهدايا: <span>{user?.points || 0}</span>
              </p>
              <p>
                🧾 الحالة: <span>{user?.isOnline ? 'متصل' : 'غير متصل'}</span>
              </p>
            </div>

            {user.id === currentUser?.id && (
              <div className="additional-details">
                <p>💬 عدد الرسائل: <span>0</span></p>
                <p>⭐ مستوى العضو: <span>مستوى {user?.level || 1}</span></p>
                <p onClick={() => setCurrentEditType('theme')}>
                  🎨 لون الملف الشخصي: <span>اضغط للتغيير</span>
                </p>
                <p onClick={() => setCurrentEditType('effects')}>
                  ✨ تأثيرات حركية: <span>اضغط للتغيير</span>
                </p>
              </div>
            )}
          </div>

          {/* Hidden File Inputs */}
          {user.id === currentUser?.id && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'banner')}
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'profile')}
              />
            </>
          )}
        </div>
      </div>

      {/* Edit Modal - exact match to original */}
      {currentEditType && user.id === currentUser?.id && (
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
    </>
  );
}
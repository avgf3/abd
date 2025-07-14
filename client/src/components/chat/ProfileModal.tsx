import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
}

interface ThemeOption {
  value: string;
  name: string;
  preview: string;
  emoji: string;
}

interface EffectOption {
  value: string;
  name: string;
  emoji: string;
  description: string;
}

export default function ProfileModal({ user, currentUser, onClose, onIgnoreUser }: ProfileModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentTheme, setCurrentTheme] = useState(user?.userTheme || 'theme-new-gradient');
  const [currentEffect, setCurrentEffect] = useState('none');

  if (!user) return null;

  // Complete theme collection
  const themes: ThemeOption[] = [
    {
      value: 'theme-default',
      name: 'الافتراضي',
      preview: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
      emoji: '🌑'
    },
    {
      value: 'theme-golden',
      name: 'الذهبي',
      preview: 'linear-gradient(135deg, #ffd700, #ffb347)',
      emoji: '✨'
    },
    {
      value: 'theme-royal',
      name: 'الملكي',
      preview: 'linear-gradient(135deg, #4b0082, #8a2be2)',
      emoji: '👑'
    },
    {
      value: 'theme-ocean',
      name: 'المحيط',
      preview: 'linear-gradient(135deg, #006994, #47b5ff)',
      emoji: '🌊'
    },
    {
      value: 'theme-sunset',
      name: 'الغروب',
      preview: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
      emoji: '🌅'
    },
    {
      value: 'theme-forest',
      name: 'الغابة',
      preview: 'linear-gradient(135deg, #134e5e, #71b280)',
      emoji: '🌲'
    },
    {
      value: 'theme-rose',
      name: 'الوردي',
      preview: 'linear-gradient(135deg, #ff9a9e, #fecfef)',
      emoji: '🌹'
    },
    {
      value: 'theme-emerald',
      name: 'الزمردي',
      preview: 'linear-gradient(135deg, #667eea, #764ba2)',
      emoji: '💚'
    },
    {
      value: 'theme-fire',
      name: 'النار',
      preview: 'linear-gradient(135deg, #ff416c, #ff4b2b)',
      emoji: '🔥'
    },
    {
      value: 'theme-galaxy',
      name: 'المجرة',
      preview: 'linear-gradient(135deg, #667db6, #0082c8, #0082c8, #667db6)',
      emoji: '🌌'
    },
    {
      value: 'theme-new-gradient',
      name: 'التدرج الجديد المطابق للصورة',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🎨'
    }
  ];

  // Effect options
  const effects: EffectOption[] = [
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
    }
  ];

  // Get theme styles
  const getThemeStyles = (themeValue: string) => {
    const theme = themes.find(t => t.value === themeValue);
    if (theme) {
      return { background: theme.preview };
    }
    return { background: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)' };
  };

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
    return null;
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, uploadType: 'profile' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
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

    setIsUploading(true);

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
        // Reload page to show new image
        window.location.reload();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الصورة",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle field updates
  const handleUpdateField = async (fieldName: string, newValue: string) => {
    setIsLoading(true);
    try {
      if (fieldName === 'theme') {
        const response = await apiRequest('/api/users/update-background-color', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: newValue }),
        });
        
        if (response.success) {
          setCurrentTheme(newValue);
          toast({
            title: "نجح",
            description: "تم تحديث لون الخلفية",
          });
        }
      } else {
        const response = await apiRequest('/api/users/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [fieldName]: newValue }),
        });

        if (response.success) {
          toast({
            title: "نجح",
            description: "تم تحديث الملف الشخصي",
          });
        }
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
      setCurrentEditType(null);
    }
  };

  // Edit modal handlers
  const openEditModal = (type: string) => {
    setCurrentEditType(type);
    
    // Set initial values
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
      default:
        setEditValue('');
    }
  };

  const saveEdit = () => {
    if (!editValue.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال قيمة صحيحة",
        variant: "destructive",
      });
      return;
    }

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

    if (fieldName) {
      handleUpdateField(fieldName, editValue);
    }
  };

  const selectTheme = (themeValue: string) => {
    setCurrentTheme(themeValue);
    handleUpdateField('theme', themeValue);
    setTimeout(() => {
      setCurrentEditType(null);
    }, 1000);
  };

  return (
    <>
      {/* CSS Styles */}
      <style>{`
        .profile-card {
          position: relative;
          width: 100%;
          max-width: 350px;
          background: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          border-radius: 16px;
          overflow: hidden;
          color: white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .profile-cover {
          position: relative;
          height: 120px;
          background: rgba(0,0,0,0.2);
          overflow: hidden;
        }

        .change-cover-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.8);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .change-cover-btn:hover {
          background: rgba(0,0,0,1);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .profile-avatar {
          position: absolute;
          top: calc(100% - 50px);
          right: 20px;
          width: 100px;
          height: 100px;
          border-radius: 0;
          border: 4px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          overflow: hidden;
          transition: all 0.3s ease;
          z-index: 2;
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
          color: #ffc107;
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
          color: #ffc107;
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
          color: #ffc107;
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
          color: #ffc107;
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
          background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
          padding: 24px;
          border-radius: 16px;
          width: 90%;
          max-width: 350px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.9);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .edit-content h3 {
          margin: 0 0 16px 0;
          color: #ffc107;
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

        .edit-field input, .edit-field select {
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
        }

        .edit-field input:focus, .edit-field select:focus {
          outline: none;
          border-color: #ffc107;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
          box-shadow: 0 0 15px rgba(255,193,7,0.3);
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
          background: #ffc107;
          color: #000;
          font-weight: bold;
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(255,193,7,0.4);
        }

        .theme-preview {
          width: 24px;
          height: 24px;
          border-radius: 0;
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

        .edit-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
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

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="profile-card" style={getThemeStyles(currentTheme)}>
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Cover Section */}
          <div className="profile-cover">
            {getProfileBannerSrc() && (
              <img 
                src={getProfileBannerSrc()!} 
                alt="غلاف الملف الشخصي"
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Show upload button only for own profile */}
            {user.id === currentUser?.id && (
              <button 
                className="change-cover-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                🖼️ تغيير الغلاف
              </button>
            )}

            <div className="profile-avatar">
              <img 
                src={getProfileImageSrc()} 
                alt="الصورة الشخصية"
              />
              {/* Show upload button only for own profile */}
              {user.id === currentUser?.id && (
                <button 
                  className="change-avatar-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploading}
                  title="تغيير الصورة"
                >
                  📷
                </button>
              )}
            </div>
          </div>

          {/* Profile Body */}
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
                {user?.status || 'بدون حالة'}
              </small>
            </div>

            {/* Show action buttons only for other users */}
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
                🎁 نقاط الهدايا: <span>340</span>
              </p>
              <p>
                🧾 الحالة: <span>{user?.isOnline ? 'متصل' : 'غير متصل'}</span>
              </p>
            </div>

            {/* Show theme and effects options only for own profile */}
            {user.id === currentUser?.id && (
              <div className="additional-details">
                <p>💬 عدد الرسائل: <span>0</span></p>
                <p>⭐ مستوى العضو: <span>الرتبة 1</span></p>
                <p onClick={() => setCurrentEditType('theme')}>
                  🎨 لون الملف الشخصي: <span>اضغط للتغيير</span>
                </p>
                <p onClick={() => setCurrentEditType('effects')}>
                  ✨ تأثيرات حركية: <span>بدون تأثيرات</span>
                </p>
              </div>
            )}
          </div>

          {/* Hidden File Inputs - only for own profile */}
          {user.id === currentUser?.id && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'banner')}
                style={{ display: 'none' }}
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'profile')}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Edit Modal - only for own profile */}
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
              {currentEditType === 'theme' && 'تعديل لون الملف الشخصي'}
              {currentEditType === 'effects' && 'تعديل التأثيرات الحركية'}
            </h3>
            
            {currentEditType === 'theme' ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
                {themes.map(theme => (
                  <div
                    key={theme.value}
                    className={`theme-option ${currentTheme === theme.value ? 'selected' : ''}`}
                    onClick={() => selectTheme(theme.value)}
                  >
                    <div 
                      className="theme-preview"
                      style={{ background: theme.preview }}
                    />
                    <div className="theme-name">
                      {theme.emoji} {theme.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'effects' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '10px' }}>
                {effects.map(effect => (
                  <div
                    key={effect.value}
                    className={`theme-option ${currentEffect === effect.value ? 'selected' : ''}`}
                    onClick={() => setCurrentEffect(effect.value)}
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
            ) : currentEditType === 'gender' ? (
              <div>
                <div className="edit-field">
                  <label>اختر الجنس:</label>
                  <select 
                    value={editValue} 
                    onChange={(e) => setEditValue(e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="ذكر">👨 ذكر</option>
                    <option value="أنثى">👩 أنثى</option>
                  </select>
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={saveEdit} disabled={isLoading || !editValue.trim()}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={() => setCurrentEditType(null)}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            ) : currentEditType === 'country' ? (
              <div>
                <div className="edit-field">
                  <label>اختر البلد:</label>
                  <select 
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
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={saveEdit} disabled={isLoading || !editValue.trim()}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={() => setCurrentEditType(null)}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            ) : currentEditType === 'socialStatus' ? (
              <div>
                <div className="edit-field">
                  <label>اختر الحالة الاجتماعية:</label>
                  <select 
                    value={editValue} 
                    onChange={(e) => setEditValue(e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="أعزب">💚 أعزب</option>
                    <option value="متزوج">💍 متزوج</option>
                    <option value="مطلق">💔 مطلق</option>
                    <option value="أرمل">🖤 أرمل</option>
                  </select>
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={saveEdit} disabled={isLoading || !editValue.trim()}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={() => setCurrentEditType(null)}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="edit-field">
                  <label>
                    {currentEditType === 'name' && 'الاسم الجديد:'}
                    {currentEditType === 'status' && 'الحالة الجديدة:'}
                    {currentEditType === 'age' && 'العمر الجديد:'}
                  </label>
                  <input
                    type={currentEditType === 'age' ? 'number' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={`أدخل ${currentEditType === 'name' ? 'الاسم' : currentEditType === 'status' ? 'الحالة' : 'العمر'} الجديد`}
                    autoFocus
                  />
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={saveEdit} disabled={isLoading || !editValue.trim()}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={() => setCurrentEditType(null)}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
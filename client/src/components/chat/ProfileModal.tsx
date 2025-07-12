import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { StealthModeButton } from "./StealthModeButton";
import { UserMinus } from "lucide-react";
import UsernameColorPicker from '../profile/UsernameColorPicker';
import ProfileImageUpload from '../profile/ProfileImageUpload';
import ProfileBanner from '../profile/ProfileBanner';
import { getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';


interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
}

export default function ProfileModal({ user, currentUser, onClose, onIgnoreUser }: ProfileModalProps) {
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    name: user?.username || '',
    status: user?.status || '',
    gender: user?.gender || 'ذكر',
    age: user?.age?.toString() || 'عدم إظهار',
    country: user?.country || 'السعودية',
    relation: user?.relation || 'عدم إظهار',
    profileImage: user?.profileImage || '/default_avatar.svg',
    profileBanner: user?.profileBanner || '',
    userTheme: user?.userTheme || 'default',
    usernameColor: user?.usernameColor || '#FFFFFF',
  });
  const [isIgnored, setIsIgnored] = useState(false);
  const [loading, setLoading] = useState(false);

  // دوال معالجة الثيمات
  const handleThemeChange = async (themeId: string) => {
    if (!currentUser) return;
    
    try {
      setProfileData(prev => ({ ...prev, userTheme: themeId }));
      
      // إرسال التحديث للخادم
      const response = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { userTheme: themeId }
      });
      
      console.log('Theme update response:', response);
      
      // تحديث المستخدم الحالي
      currentUser.userTheme = themeId;
      
      toast({
        title: "تم تحديث الثيم",
        description: "تم تطبيق الثيم الجديد بنجاح",
        variant: "default"
      });
      
      toast({
        title: "تم التحديث",
        description: "تم تغيير الثيم بنجاح!",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الثيم",
        variant: "destructive",
      });
    }
  };

  const getCurrentThemeGradient = () => {
    const theme = themeOptions.find(t => t.id === profileData.userTheme);
    return theme?.gradient || 'transparent';
  };

  const getCurrentThemeTextColor = () => {
    const theme = themeOptions.find(t => t.id === profileData.userTheme);
    return theme?.textColor || '#FFFFFF';
  };

  const getCurrentThemeEmoji = () => {
    const theme = themeOptions.find(t => t.id === profileData.userTheme);
    return theme?.emoji || '';
  };

  const countries = [
    'السعودية', 'مصر', 'الإمارات', 'الأردن', 'العراق', 'سوريا', 
    'لبنان', 'تونس', 'الجزائر', 'ليبيا', 'قطر', 'البحرين', 
    'عمان', 'فلسطين', 'اليمن', 'السودان', 'موريتانيا', 'الصومال'
  ];

  // ثيمات المستخدم الجميلة
  const themeOptions = [
    { id: 'default', name: 'افتراضي', emoji: '⚪', gradient: 'transparent', textColor: '#FFFFFF' },
    { id: 'golden', name: 'ذهبي', emoji: '👑', gradient: 'linear-gradient(45deg, #FFD700, #FFA500)', textColor: '#000000' },
    { id: 'royal', name: 'ملكي', emoji: '💜', gradient: 'linear-gradient(45deg, #8B5CF6, #A855F7)', textColor: '#FFFFFF' },
    { id: 'ocean', name: 'المحيط', emoji: '🌊', gradient: 'linear-gradient(45deg, #0EA5E9, #0284C7)', textColor: '#FFFFFF' },
    { id: 'sunset', name: 'غروب', emoji: '🌅', gradient: 'linear-gradient(45deg, #F97316, #EA580C)', textColor: '#FFFFFF' },
    { id: 'forest', name: 'الغابة', emoji: '🌲', gradient: 'linear-gradient(45deg, #22C55E, #16A34A)', textColor: '#FFFFFF' },
    { id: 'rose', name: 'وردي', emoji: '🌹', gradient: 'linear-gradient(45deg, #EC4899, #DB2777)', textColor: '#FFFFFF' },
    { id: 'emerald', name: 'زمردي', emoji: '💎', gradient: 'linear-gradient(45deg, #10B981, #059669)', textColor: '#FFFFFF' },
    { id: 'fire', name: 'نار', emoji: '🔥', gradient: 'linear-gradient(45deg, #EF4444, #DC2626)', textColor: '#FFFFFF' },
    { id: 'galaxy', name: 'مجرة', emoji: '🌌', gradient: 'linear-gradient(45deg, #6366F1, #4F46E5)', textColor: '#FFFFFF' },
    { id: 'rainbow', name: 'قوس قزح', emoji: '🌈', gradient: 'linear-gradient(45deg, #F59E0B, #EF4444, #EC4899, #8B5CF6)', textColor: '#FFFFFF' },
    { id: 'aqua', name: 'أكوا', emoji: '💧', gradient: 'linear-gradient(45deg, #06B6D4, #0891B2)', textColor: '#FFFFFF' },
    { id: 'crystal', name: 'كريستال', emoji: '💠', gradient: 'linear-gradient(45deg, #E5E7EB, #9CA3AF)', textColor: '#000000' },
    { id: 'amber', name: 'عنبر', emoji: '🟨', gradient: 'linear-gradient(45deg, #F59E0B, #D97706)', textColor: '#000000' },
    { id: 'coral', name: 'مرجاني', emoji: '🪸', gradient: 'linear-gradient(45deg, #FB7185, #F43F5E)', textColor: '#FFFFFF' },
    { id: 'jade', name: 'يشم', emoji: '🟩', gradient: 'linear-gradient(45deg, #059669, #047857)', textColor: '#FFFFFF' },
    { id: 'sapphire', name: 'ياقوت', emoji: '🔷', gradient: 'linear-gradient(45deg, #3B82F6, #1D4ED8)', textColor: '#FFFFFF' },
    { id: 'bronze', name: 'برونزي', emoji: '🥉', gradient: 'linear-gradient(45deg, #CD7F32, #B8860B)', textColor: '#FFFFFF' },
    { id: 'silver', name: 'فضي', emoji: '🥈', gradient: 'linear-gradient(45deg, #C0C0C0, #A8A8A8)', textColor: '#000000' },
    { id: 'platinum', name: 'بلاتيني', emoji: '⚪', gradient: 'linear-gradient(45deg, #E5E4E2, #D3D3D3)', textColor: '#000000' },
    { id: 'obsidian', name: 'سبج', emoji: '⚫', gradient: 'linear-gradient(45deg, #1F2937, #111827)', textColor: '#FFFFFF' },
    { id: 'mystical', name: 'غامض', emoji: '🔮', gradient: 'linear-gradient(45deg, #7C3AED, #5B21B6)', textColor: '#FFFFFF' },
    { id: 'tropical', name: 'استوائي', emoji: '🌺', gradient: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)', textColor: '#FFFFFF' },
    { id: 'aurora', name: 'شفق', emoji: '🌌', gradient: 'linear-gradient(45deg, #00C9FF, #92FE9D)', textColor: '#000000' },
    { id: 'phoenix', name: 'عنقاء', emoji: '🔥', gradient: 'linear-gradient(45deg, #FF4E50, #F9CA24)', textColor: '#FFFFFF' },
    { id: 'burgundy', name: 'خمري', emoji: '🍷', gradient: 'linear-gradient(45deg, #722F37, #B91C1C)', textColor: '#FFFFFF' },
    { id: 'midnight', name: 'منتصف الليل', emoji: '🌙', gradient: 'linear-gradient(45deg, #1E293B, #334155)', textColor: '#FFFFFF' },
    { id: 'arctic', name: 'القطب الشمالي', emoji: '❄️', gradient: 'linear-gradient(45deg, #0F172A, #1E40AF)', textColor: '#FFFFFF' },
    { id: 'wine', name: 'نبيذي', emoji: '🍇', gradient: 'linear-gradient(45deg, #881337, #4C1D95)', textColor: '#FFFFFF' },
    { id: 'steel', name: 'فولاذي', emoji: '⚔️', gradient: 'linear-gradient(45deg, #475569, #64748B)', textColor: '#FFFFFF' },
    { id: 'navy', name: 'كحلي', emoji: '🌊', gradient: 'linear-gradient(45deg, #1E3A8A, #3730A3)', textColor: '#FFFFFF' },
    { id: 'slate', name: 'أردوازي', emoji: '🗿', gradient: 'linear-gradient(45deg, #374151, #4B5563)', textColor: '#FFFFFF' },
    { id: 'storm', name: 'العاصفة', emoji: '⛈️', gradient: 'linear-gradient(45deg, #1F2937, #6B7280)', textColor: '#FFFFFF' },
    { id: 'crimson', name: 'قرمزي', emoji: '🌹', gradient: 'linear-gradient(45deg, #991B1B, #DC2626)', textColor: '#FFFFFF' },
    { id: 'royal_blue', name: 'أزرق ملكي', emoji: '👑', gradient: 'linear-gradient(45deg, #1E3A8A, #60A5FA)', textColor: '#FFFFFF' },
    { id: 'black_gradient', name: 'أسود متدرج', emoji: '⚫', gradient: 'linear-gradient(45deg, #000000, #374151)', textColor: '#FFFFFF' },
    { id: 'deep_black', name: 'أسود عميق', emoji: '🖤', gradient: 'linear-gradient(45deg, #111827, #1F2937)', textColor: '#FFFFFF' },
    { id: 'charcoal', name: 'فحمي', emoji: '⬛', gradient: 'linear-gradient(45deg, #1C1C1C, #4A4A4A)', textColor: '#FFFFFF' },
    { id: 'blush_pink', name: 'وردي خجول', emoji: '🌸', gradient: 'linear-gradient(45deg, #FCE7F3, #F9A8D4)', textColor: '#000000' },
    { id: 'lavender', name: 'خزامى', emoji: '💜', gradient: 'linear-gradient(45deg, #DDD6FE, #C4B5FD)', textColor: '#000000' },
    { id: 'powder_blue', name: 'أزرق بودرة', emoji: '💙', gradient: 'linear-gradient(45deg, #DBEAFE, #93C5FD)', textColor: '#000000' },
    { id: 'soft_mint', name: 'نعناع ناعم', emoji: '🌿', gradient: 'linear-gradient(45deg, #D1FAE5, #86EFAC)', textColor: '#000000' },
    { id: 'peach', name: 'خوخي', emoji: '🍑', gradient: 'linear-gradient(45deg, #FED7AA, #FDBA74)', textColor: '#000000' },
    { id: 'lilac', name: 'بنفسجي فاتح', emoji: '🪻', gradient: 'linear-gradient(45deg, #E9D5FF, #D8B4FE)', textColor: '#000000' },
    { id: 'ivory', name: 'عاجي', emoji: '🤍', gradient: 'linear-gradient(45deg, #FFFBEB, #FEF3C7)', textColor: '#000000' }
  ];

  const handleImageUpload = () => {
    if (!user) return;
    
    // Check if user is a member or owner (not guest)
    if (user.userType === 'guest') {
      toast({
        title: "غير مسموح",
        description: "رفع الصور الشخصية متاح للأعضاء فقط. سجل كعضو أولاً.",
        variant: "destructive",
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && user) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageData = event.target?.result as string;
          
          try {
            // Upload to server and update user's profile image
            const response = await apiRequest('POST', `/api/users/${user.id}/profile-image`, {
              imageData
            });
            const data = await response.json();
            
            // Update local state to show the new image immediately
            setProfileData(prev => ({ ...prev, profileImage: imageData }));
            
            toast({
              title: "تم التحديث",
              description: data.message,
            });
          } catch (error: any) {
            const errorData = await error.response?.json();
            toast({
              title: "خطأ",
              description: errorData?.error || "فشل في رفع الصورة",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleIgnoreToggle = async () => {
    if (!user || !currentUser || loading) return;

    try {
      setLoading(true);
      
      if (isIgnored) {
        await apiRequest(`/api/users/${currentUser.id}/ignore/${user.id}`, {
          method: 'DELETE'
        });
        setIsIgnored(false);
        toast({
          title: "تم الإلغاء",
          description: `تم إلغاء تجاهل ${user.username}`,
        });
      } else {
        await apiRequest(`/api/users/${currentUser.id}/ignore/${user.id}`, {
          method: 'POST'
        });
        setIsIgnored(true);
        toast({
          title: "تم التجاهل",
          description: `تم تجاهل ${user.username} - لن ترى رسائله أو طلباته`,
          variant: "destructive"
        });
      }
      
      if (onIgnoreUser) {
        onIgnoreUser(user.id);
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في تحديث التجاهل",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // تحقق من حالة التجاهل عند فتح الملف الشخصي
  useEffect(() => {
    const checkIgnoreStatus = async () => {
      if (!user || !currentUser) return;
      
      try {
        const response = await apiRequest(`/api/users/${currentUser.id}/ignored`);
        const ignoredUsers = response.ignoredUsers || [];
        setIsIgnored(ignoredUsers.includes(user.id));
      } catch (error) {
        console.error('Error checking ignore status:', error);
      }
    };
    
    checkIgnoreStatus();
  }, [user, currentUser]);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(profileData));
    onClose();
  };

  useEffect(() => {
    // Load saved profile data
    const saved = localStorage.getItem('userProfile');
    if (saved && user) {
      const savedData = JSON.parse(saved);
      setProfileData({
        name: savedData.name || user.username,
        status: savedData.status || user.status || '',
        gender: savedData.gender || user.gender || 'ذكر',
        age: savedData.age || user.age?.toString() || 'عدم إظهار',
        country: savedData.country || user.country || '',
        relation: savedData.relation || user.relation || '',
        profileImage: savedData.profileImage || user.profileImage || '/default_avatar.svg',
        profileBanner: savedData.profileBanner || user.profileBanner || '',
      });
    } else if (user) {
      setProfileData({
        name: user.username,
        status: user.status || '',
        gender: user.gender || 'ذكر',
        age: user.age?.toString() || 'عدم إظهار',
        country: user.country || '',
        relation: user.relation || '',
        profileImage: user.profileImage || '/default_avatar.svg',
        profileBanner: user.profileBanner || '',
      });
    }
  }, [user]);

  // Handle profile image upload
  const handleProfileImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && currentUser) {
        const formData = new FormData();
        formData.append('profileImage', file);
        formData.append('userId', currentUser.id.toString());
        
        try {
          const response = await fetch('/api/upload/profile-image', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('نتيجة رفع الصورة:', result);
            
            // تحديث الصورة في الواجهة فوراً
            setProfileData(prev => ({ ...prev, profileImage: result.imageUrl }));
            
            // تحديث بيانات المستخدم الحالي
            if (currentUser && result.user) {
              Object.assign(currentUser, result.user);
            }
            
            toast({
              title: "تم بنجاح",
              description: "تم تحديث الصورة الشخصية",
              variant: "default"
            });
          } else {
            const error = await response.json();
            console.error('خطأ من الخادم:', error);
            toast({
              title: "خطأ",
              description: error.error || "فشل في رفع الصورة",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('خطأ في رفع الصورة:', error);
          toast({
            title: "خطأ",
            description: "فشل في رفع الصورة",
            variant: "destructive"
          });
        }
      }
    };
    input.click();
  };

  // Handle banner upload
  const handleBannerUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && currentUser) {
        const formData = new FormData();
        formData.append('profileBanner', file);
        formData.append('userId', currentUser.id.toString());
        
        try {
          const response = await fetch('/api/upload/profile-banner', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('نتيجة رفع البانر:', result);
            
            // تحديث البانر في الواجهة فوراً
            setProfileData(prev => ({ ...prev, profileBanner: result.bannerUrl }));
            
            // تحديث بيانات المستخدم الحالي
            if (currentUser && result.user) {
              Object.assign(currentUser, result.user);
            }
            
            toast({
              title: "تم بنجاح",
              description: "تم تحديث صورة البانر",
              variant: "default"
            });
          } else {
            const error = await response.json();
            console.error('خطأ من الخادم:', error);
            toast({
              title: "خطأ",
              description: error.error || "فشل في رفع صورة البانر",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('خطأ في رفع البانر:', error);
          toast({
            title: "خطأ",
            description: "فشل في رفع صورة البانر",
            variant: "destructive"
          });
        }
      }
    };
    input.click();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-effect border border-border max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">
            الملف الشخصي
          </DialogTitle>
        </DialogHeader>

        {/* Profile Header - Modern Design */}
        <div className="relative">
          {/* Background Banner */}
          <div className="relative h-48 overflow-hidden rounded-t-2xl">
            {/* Banner Image */}
            {profileData.profileBanner && profileData.profileBanner !== '' ? (
              <img 
                src={profileData.profileBanner} 
                alt="صورة البروفايل" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white relative border border-gray-200">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">📸</div>
                    <p className="text-xl font-medium">صورة البروفايل</p>
                  </div>
                </div>
              </div>
            )}
            

            
            {/* Profile Image - Bottom Right Corner */}
            <div className="absolute -bottom-6 right-6 z-20">
              <div className="relative">
                <img
                  src={profileData.profileImage && profileData.profileImage !== '/default_avatar.svg' ? profileData.profileImage : "/default_avatar.svg"}
                  alt="صورة المستخدم"
                  className="w-32 h-28 rounded-full border-2 border-white object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default_avatar.svg';
                  }}
                />
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
            </div>
            
            {/* User Info */}
            <div className="absolute bottom-4 left-4 text-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">
                  {user.userType === 'owner' && '👑'}
                  {user.userType === 'admin' && '⭐'}
                  {user.userType === 'moderator' && '🛡️'}
                </span>
                <span className="text-sm bg-white/90 px-2 py-1 rounded-full backdrop-blur-sm text-gray-700 border">
                  {user.userType === 'owner' && 'المالك'}
                  {user.userType === 'admin' && 'إدمن'}
                  {user.userType === 'moderator' && 'مشرف'}
                  {user.userType === 'member' && 'عضو'}
                  {user.userType === 'guest' && 'ضيف'}
                </span>
              </div>
              <h2 
                className="text-2xl font-bold mb-1 text-gray-800"
                style={{ color: user.usernameColor || '#1f2937' }}
              >
                {user.username}
              </h2>
              <p className="text-sm text-gray-600 bg-white/80 px-2 py-1 rounded">
                {profileData.status || 'لا توجد حالة'}
              </p>
            </div>
            
            {/* Upload Controls */}
            {currentUser && currentUser.id === user.id && (
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  className="bg-white/90 backdrop-blur-md hover:bg-white text-gray-700 border border-gray-200 rounded-lg shadow-md"
                  onClick={handleBannerUpload}
                >
                  📸 تغيير صورة البروفايل
                </Button>
                <Button
                  size="sm"
                  className="bg-white/90 backdrop-blur-md hover:bg-white text-gray-700 border border-gray-200 rounded-lg shadow-md"
                  onClick={handleProfileImageUpload}
                >
                  👤 تغيير الصورة
                </Button>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {currentUser && currentUser.id !== user.id && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 shadow-lg"
                onClick={() => onReportUser && onReportUser(user, 'تبليغ عن المستخدم', 0)}
              >
                🚨 إبلاغ
              </Button>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 shadow-lg"
                onClick={() => handleIgnoreUser && handleIgnoreUser(user)}
              >
                🚫 تجاهل
              </Button>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg"
                onClick={() => handleStartPrivateChat && handleStartPrivateChat(user)}
              >
                💬 رسالة خاصة
              </Button>
            </div>
          )}
        </div>



        {currentUser && currentUser.id === user.id && (
          <div className="bg-white p-6 -mt-12 relative z-10 rounded-t-3xl">
            <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="info">معلوماتي</TabsTrigger>
              <TabsTrigger value="colors">🎨 الألوان</TabsTrigger>
              <TabsTrigger value="options">الإعدادات</TabsTrigger>
            </TabsList>

          <TabsContent value="info" className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">المعلومات الشخصية</h3>
            
            {/* رابط الملف الشخصي */}
            <div className="bg-accent/50 p-4 rounded-lg border border-border">
              <label className="block text-sm font-medium text-muted-foreground mb-2">رابط الملف الشخصي</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://www.arabic.chat/#id${user?.id || ''}`}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const profileLink = `https://www.arabic.chat/#id${user?.id || ''}`;
                    navigator.clipboard.writeText(profileLink);
                    toast({
                      title: "تم النسخ",
                      description: "تم نسخ رابط الملف الشخصي",
                    });
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  📋 نسخ
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">الجنس</label>
                <Select value={profileData.gender} onValueChange={(value) => setProfileData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ذكر">ذكر</SelectItem>
                    <SelectItem value="أنثى">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">العمر</label>
                <Select value={profileData.age} onValueChange={(value) => setProfileData(prev => ({ ...prev, age: value }))}>
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="عدم إظهار">عدم إظهار</SelectItem>
                    {Array.from({ length: 82 }, (_, i) => i + 18).map(age => (
                      <SelectItem key={age} value={age.toString()}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">البلد</label>
                <Select value={profileData.country} onValueChange={(value) => setProfileData(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">الحالة الاجتماعية</label>
                <Select value={profileData.relation} onValueChange={(value) => setProfileData(prev => ({ ...prev, relation: value }))}>
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="عدم إظهار">عدم إظهار</SelectItem>
                    <SelectItem value="أعزب">أعزب</SelectItem>
                    <SelectItem value="مرتبط">مرتبط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="colors">
            <h3 className="text-lg font-semibold text-primary mb-4">🎨 تخصيص المظهر والألوان</h3>
            {user && currentUser && user.id === currentUser.id ? (
              <div className="space-y-6">
                {/* ثيمات المستخدم */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-primary">🌟 ثيمات مميزة</h4>
                  <p className="text-sm text-muted-foreground">اختر ثيماً مميزاً لمظهرك في الدردشة:</p>
                  <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {themeOptions.map((theme, index) => (
                      <button
                        key={index}
                        className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                          profileData.userTheme === theme.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-600'
                        }`}
                        style={{ 
                          background: theme.gradient,
                          color: theme.textColor
                        }}
                        onClick={() => handleThemeChange(theme.id)}
                        title={theme.name}
                      >
                        <div className="text-center">
                          <div className="text-sm mb-1">{theme.emoji}</div>
                          <div className="text-xs font-bold">{theme.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* معاينة */}
                <div className="mt-4 p-4 bg-accent rounded-lg">
                  <p className="text-sm text-center mb-3">معاينة المظهر:</p>
                  <div className="text-center">
                    <div 
                      className="inline-block px-4 py-2 rounded-xl transition-all duration-300"
                      style={{ 
                        background: getCurrentThemeGradient(),
                        color: getCurrentThemeTextColor()
                      }}
                    >
                      <span className="text-lg font-bold">
                        {getCurrentThemeEmoji()} {profileData.name || 'اسم المستخدم'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            
            {user && currentUser && user.id !== currentUser.id && (
              <div className="text-center p-8 text-gray-400">
                <div className="text-6xl mb-4">🎨</div>
                <p>لا يمكنك تغيير مظهر مستخدم آخر</p>
                <p className="text-sm mt-2">هذه الخاصية متاحة فقط في ملفك الشخصي</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends">
            <h3 className="text-lg font-semibold text-primary mb-4">قائمة الأصدقاء</h3>
            <div className="text-center text-muted-foreground py-8">
              لا يوجد أصدقاء حالياً
            </div>
          </TabsContent>

          <TabsContent value="ignore">
            <h3 className="text-lg font-semibold text-primary mb-4">قائمة المحظورين</h3>
            <div className="text-center text-muted-foreground py-8">
              لا يوجد مستخدمون محظورون حالياً
            </div>
          </TabsContent>

          <TabsContent value="options">
            <h3 className="text-lg font-semibold text-primary mb-4">إعدادات الحساب</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">المنطقة الزمنية</label>
                <Select defaultValue="Asia/Riyadh">
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                    <SelectItem value="Asia/Amman">Asia/Amman</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">اللغة</label>
                <Select defaultValue="العربية">
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="العربية">العربية</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">الرسائل الخاصة</label>
                <Select defaultValue="مفتوحة للجميع">
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مفتوحة للجميع">مفتوحة للجميع</SelectItem>
                    <SelectItem value="الأصدقاء فقط">الأصدقاء فقط</SelectItem>
                    <SelectItem value="مغلقة">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">الإشعارات الصوتية</label>
                <Select defaultValue="مفعلة">
                  <SelectTrigger className="bg-accent border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مفعلة">مفعلة</SelectItem>
                    <SelectItem value="صامت">صامت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="more">
            <h3 className="text-lg font-semibold text-primary mb-4">المزيد من الخيارات</h3>
            <div className="space-y-4">
              <Button className="w-full glass-effect rounded-lg text-right hover:bg-accent transition-all justify-start">
                📥 تصدير بيانات الدردشة
              </Button>
              <Button className="w-full glass-effect rounded-lg text-right hover:bg-accent transition-all justify-start">
                🛡️ إعدادات الخصوصية المتقدمة
              </Button>
              <Button className="w-full glass-effect rounded-lg text-right hover:bg-accent transition-all justify-start">
                🎨 تخصيص المظهر
              </Button>
            </div>
          </TabsContent>

            {/* Footer */}
            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-6 py-3 glass-effect rounded-lg font-semibold hover:bg-accent"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSave}
                className="btn-success px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
              >
                💾 حفظ التغييرات
              </Button>
            </div>
          </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

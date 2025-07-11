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
  });
  const [isIgnored, setIsIgnored] = useState(false);
  const [loading, setLoading] = useState(false);

  const countries = [
    'السعودية', 'مصر', 'الإمارات', 'الأردن', 'العراق', 'سوريا', 
    'لبنان', 'تونس', 'الجزائر', 'ليبيا', 'قطر', 'البحرين', 
    'عمان', 'فلسطين', 'اليمن', 'السودان', 'موريتانيا', 'الصومال'
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
      });
    }
  }, [user]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-effect border border-border max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            الملف الشخصي
          </DialogTitle>
        </DialogHeader>

        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <img
            src={profileData.profileImage || "/default_avatar.svg"}
            alt="صورة المستخدم"
            className="w-20 h-20 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleImageUpload}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/default_avatar.svg';
            }}
          />
          <div className="flex-1 space-y-2">
            <Input
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="اسم المستخدم"
              className="text-xl font-bold bg-transparent border-none text-white"
            />
            <Input
              value={profileData.status}
              onChange={(e) => setProfileData(prev => ({ ...prev, status: e.target.value }))}
              placeholder="اكتب حالتك..."
              className="bg-transparent border-none text-muted-foreground"
            />
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="info">معلوماتي</TabsTrigger>
            <TabsTrigger value="friends">الأصدقاء</TabsTrigger>
            <TabsTrigger value="ignore">المحظورون</TabsTrigger>
            <TabsTrigger value="options">الإعدادات</TabsTrigger>
            <TabsTrigger value="more">المزيد</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">المعلومات الشخصية</h3>
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
        </Tabs>

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
      </DialogContent>
    </Dialog>
  );
}

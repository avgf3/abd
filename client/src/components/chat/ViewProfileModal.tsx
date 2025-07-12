import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface ViewProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
}

export default function ViewProfileModal({ 
  user, 
  currentUser, 
  onClose, 
  onIgnoreUser,
  onPrivateMessage,
  onAddFriend 
}: ViewProfileModalProps) {
  const { toast } = useToast();
  const [isIgnored, setIsIgnored] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleIgnore = () => {
    if (onIgnoreUser) {
      onIgnoreUser(user.id);
      setIsIgnored(true);
      toast({
        title: "تم التجاهل",
        description: `تم تجاهل المستخدم ${user.username}`,
      });
    }
  };

  const handlePrivateMessage = () => {
    if (onPrivateMessage) {
      onPrivateMessage(user);
      onClose();
    }
  };

  const handleAddFriend = () => {
    if (onAddFriend) {
      onAddFriend(user);
    }
  };

  const handleReport = async () => {
    try {
      setLoading(true);
      await apiRequest('/api/reports', {
        method: 'POST',
        body: {
          reporterId: currentUser?.id || 0,
          reportedUserId: user.id,
          reason: 'سلوك غير لائق',
          content: `تم الإبلاغ عن المستخدم ${user.username}`
        }
      });

      toast({
        title: "تم الإبلاغ",
        description: `تم إرسال تقرير عن ${user.username} للإدارة`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إرسال التقرير",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-effect border border-border max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">
            الملف الشخصي - {user.username}
          </DialogTitle>
        </DialogHeader>

        {/* Profile Header - Modern Design */}
        <div className="relative">
          {/* Background Banner */}
          <div className="relative h-48 overflow-hidden rounded-t-2xl">
            {/* Banner Image */}
            {user.profileBanner && user.profileBanner !== '' ? (
              <img 
                src={user.profileBanner} 
                alt="صورة البروفايل" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 relative border border-gray-200">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">👤</div>
                    <p className="text-xl font-medium">{user.username}</p>
                  </div>
                </div>
              </div>
            )}
            

            
            {/* Profile Image - Bottom Right Corner */}
            <div className="absolute -bottom-6 right-6 z-20">
              <div className="relative">
                <img
                  src={user.profileImage && user.profileImage !== '/default_avatar.svg' ? user.profileImage : "/default_avatar.svg"}
                  alt="صورة المستخدم"
                  className="w-32 h-32 rounded-full object-cover"
                  style={{ objectFit: 'cover' }}
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
                {user.status || 'لا توجد حالة'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="bg-white p-6 -mt-12 relative z-10 rounded-t-3xl" dir="rtl">
          {/* Action Buttons Row */}
          {currentUser && currentUser.id !== user.id && (
            <div className="flex justify-center gap-2 mb-6 pt-8">
              <Button
                onClick={handleReport}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                📢 ابلاغ
              </Button>
              
              <Button
                onClick={handleIgnore}
                disabled={isIgnored}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                🚫 تجاهل
              </Button>
              
              <Button
                onClick={handleAddFriend}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                👥 اضافة صديق
              </Button>
              
              <Button
                onClick={handlePrivateMessage}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                💬 محادثة خاصة
              </Button>
            </div>
          )}

          {/* Profile Information */}
          <div className="space-y-6">
            {/* معلوماتي Header */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg inline-block">
                معلوماتي
              </h3>
            </div>

            {/* رابط الملف الشخصي */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">رابط الملف الشخصي</span>
                <button
                  onClick={() => {
                    const profileLink = `https://www.arabic.chat/#id${user.id}`;
                    navigator.clipboard.writeText(profileLink);
                    toast({
                      title: "تم النسخ",
                      description: "تم نسخ رابط الملف الشخصي",
                    });
                  }}
                  className="text-orange-500 text-sm hover:text-orange-600 cursor-pointer"
                >
                  https://www.arabic.chat/#id{user.id}
                </button>
              </div>
            </div>

            {/* الجنس */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">الجنس</span>
                <span className="text-gray-600">
                  {user.gender || 'ذكر'}
                </span>
              </div>
            </div>

            {/* البلد */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">البلد</span>
                <span className="text-gray-600">
                  {user.country || 'السودان'}
                </span>
              </div>
            </div>

            {/* تاريخ الانضمام */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">تاريخ الانضمام</span>
                <span className="text-gray-600">
                  {user.joinDate ? new Date(user.joinDate).toLocaleDateString('ar-SA') : 
                   user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : 
                   new Date().toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>

            {/* آخر تواجد */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">آخر تواجد</span>
                <span className="text-gray-600">
                  {user.isOnline ? 'متصل الآن' : 
                    user.lastSeen ? 
                      `${user.country || 'غير محدد'} / ${new Date(user.lastSeen).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}` :
                      `${user.country || 'غير محدد'} / منذ وقت قريب`
                  }
                </span>
              </div>
            </div>

            {/* معلوماتي */}
            <div className="border-b border-gray-200 pb-4">
              <div className="space-y-2">
                <span className="text-gray-700 font-medium block">معلوماتي</span>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400">💬</span>
                  <div className="text-gray-600 text-sm leading-relaxed">
                    {user.status && (
                      <p className="mb-2">{user.status}</p>
                    )}
                    {user.bio && (
                      <p>{user.bio}</p>
                    )}
                    {!user.status && !user.bio && (
                      <p className="text-gray-400">لا توجد معلومات إضافية</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* عدد التنبيهات */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">عدد التنبيهات</span>
                <span className="text-gray-600">0</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-center mt-8">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8 py-2 rounded-lg font-medium border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
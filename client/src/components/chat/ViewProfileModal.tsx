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
      <DialogContent className="glass-effect border border-border max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">
            الملف الشخصي - {user.username}
          </DialogTitle>
        </DialogHeader>

        {/* Profile Header - Modern Design */}
        <div className="relative">
          {/* Background Banner */}
          <div className="relative h-64 overflow-hidden rounded-t-2xl">
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
            
            {/* Light Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent"></div>
            
            {/* Profile Image */}
            <div className="absolute bottom-4 right-4">
              <div className="relative">
                <img
                  src={user.profileImage && user.profileImage !== '/default_avatar.svg' ? user.profileImage : "/default_avatar.svg"}
                  alt="صورة المستخدم"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default_avatar.svg';
                  }}
                />
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-3 border-white rounded-full"></div>
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
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-2xl border border-teal-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📋</span>
              المعلومات الشخصية
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">الجنس</label>
                <p className="text-gray-800 bg-white/70 p-2 rounded-lg border">
                  {user.gender || 'غير محدد'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">العمر</label>
                <p className="text-gray-800 bg-white/70 p-2 rounded-lg border">
                  {user.age ? `${user.age} سنة` : 'غير محدد'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">البلد</label>
                <p className="text-gray-800 bg-white/70 p-2 rounded-lg border">
                  {user.country || 'غير محدد'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">الحالة الاجتماعية</label>
                <p className="text-gray-800 bg-white/70 p-2 rounded-lg border">
                  {user.relation || 'غير محدد'}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Link */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🔗</span>
              رابط الملف الشخصي
            </h3>
            
            <div className="bg-white/70 p-3 rounded-lg border text-center">
              <code className="text-blue-600 font-mono">
                https://chat.example.com/profile/{user.id}
              </code>
            </div>
          </div>

          {/* Action Buttons */}
          {currentUser && currentUser.id !== user.id && (
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handlePrivateMessage}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg"
              >
                💬 رسالة خاصة
              </Button>
              
              <Button
                onClick={handleAddFriend}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg"
              >
                👥 إضافة صديق
              </Button>
              
              <Button
                onClick={handleIgnore}
                disabled={isIgnored}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-xl font-medium"
              >
                {isIgnored ? '✅ تم التجاهل' : '🚫 تجاهل'}
              </Button>
              
              <Button
                onClick={handleReport}
                disabled={loading}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl font-medium"
              >
                {loading ? '⏳ جاري الإرسال...' : '⚠️ إبلاغ'}
              </Button>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8 py-3 rounded-xl font-medium border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
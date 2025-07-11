import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users, Crown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface WelcomeScreenProps {
  onUserLogin: (user: ChatUser) => void;
}

export default function FixedWelcomeScreen({ onUserLogin }: WelcomeScreenProps) {
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestGender, setGuestGender] = useState('male');
  const [memberName, setMemberName] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerGender, setRegisterGender] = useState('male');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الزائر",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/guest', {
        method: 'POST',
        body: {
          username: guestName.trim(),
          gender: guestGender,
        }
      });
      
      console.log('Guest login successful:', data);
      onUserLogin(data.user);
      setShowGuestModal(false);
      
      toast({
        title: "مرحباً",
        description: `مرحباً ${data.user.username}! تم تسجيل الدخول بنجاح`,
      });
    } catch (error: any) {
      console.error('Guest login error:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberLogin = async () => {
    if (!memberName.trim() || !memberPassword.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستخدم وكلمة المرور",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/member', {
        method: 'POST',
        body: {
          username: memberName.trim(),
          password: memberPassword.trim(),
        }
      });
      
      console.log('Member login successful:', data);
      onUserLogin(data.user);
      setShowMemberModal(false);
      
      toast({
        title: "مرحباً",
        description: `مرحباً ${data.user.username}! تم تسجيل الدخول بنجاح`,
      });
    } catch (error: any) {
      console.error('Member login error:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim() || !registerPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور غير متطابقة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          username: registerName.trim(),
          password: registerPassword.trim(),
          confirmPassword: confirmPassword.trim(),
          gender: registerGender,
        }
      });
      
      console.log('Registration successful:', data);
      toast({
        title: "نجح التسجيل",
        description: data.message,
      });
      onUserLogin(data.user);
      setShowRegisterModal(false);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في التسجيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Arabic Chat
          </h1>
          <p className="text-gray-300 mt-2">منصة الدردشة العربية الحديثة</p>
        </div>

        {/* Login Options */}
        <div className="space-y-4">
          <Button
            onClick={() => setShowGuestModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Users size={20} />
            دخول كضيف
          </Button>

          <Button
            onClick={() => setShowMemberModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Crown size={20} />
            دخول كعضو
          </Button>

          <Button
            onClick={() => setShowRegisterModal(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <UserPlus size={20} />
            تسجيل عضوية جديدة
          </Button>
        </div>

        {/* Quick Admin Login */}
        <div className="text-center">
          <Button
            onClick={() => {
              setMemberName('عبود');
              setMemberPassword('22333');
              setShowMemberModal(true);
            }}
            variant="outline"
            className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            👑 دخول سريع للمدير
          </Button>
        </div>
      </div>

      {/* Guest Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl">دخول كضيف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الجنس</label>
              <Select value={guestGender} onValueChange={setGuestGender} disabled={loading}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGuestLogin}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Button>
              <Button
                onClick={() => setShowGuestModal(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl">دخول الأعضاء</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <Input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <Input
                type="password"
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleMemberLogin}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Button>
              <Button
                onClick={() => setShowMemberModal(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl">تسجيل عضوية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <Input
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <Input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الجنس</label>
              <Select value={registerGender} onValueChange={setRegisterGender} disabled={loading}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRegister}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? 'جاري التسجيل...' : 'تسجيل'}
              </Button>
              <Button
                onClick={() => setShowRegisterModal(false)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
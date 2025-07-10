import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface WelcomeScreenProps {
  onUserLogin: (user: ChatUser) => void;
}

export default function WelcomeScreen({ onUserLogin }: WelcomeScreenProps) {
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      const response = await apiRequest('POST', '/api/auth/guest', {
        username: guestName.trim(),
      });
      const data = await response.json();
      onUserLogin(data.user);
      setShowGuestModal(false);
    } catch (error: any) {
      const errorData = await error.response?.json();
      toast({
        title: "خطأ",
        description: errorData?.error || "حدث خطأ في تسجيل الدخول",
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
      const response = await apiRequest('POST', '/api/auth/member', {
        username: memberName.trim(),
        password: memberPassword.trim(),
      });
      const data = await response.json();
      onUserLogin(data.user);
      setShowMemberModal(false);
    } catch (error: any) {
      const errorData = await error.response?.json();
      toast({
        title: "خطأ",
        description: errorData?.error || "حدث خطأ في تسجيل الدخول",
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
      const response = await apiRequest('POST', '/api/auth/register', {
        username: registerName.trim(),
        password: registerPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      const data = await response.json();
      toast({
        title: "نجح التسجيل",
        description: data.message,
      });
      onUserLogin(data.user);
      setShowRegisterModal(false);
    } catch (error: any) {
      const errorData = await error.response?.json();
      toast({
        title: "خطأ",
        description: errorData?.error || "حدث خطأ في التسجيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast({
      title: "قريباً",
      description: "🔄 جاري تطوير خدمة تسجيل الدخول بـ Google",
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center welcome-gradient">
      <div className="text-center animate-slide-up">
        <div className="mb-8">
          <div className="text-6xl mb-4 animate-pulse-slow">💬</div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            مرحبًا بك في دردشة العرب
          </h1>
          <p className="text-xl text-muted-foreground mb-8">منصة التواصل العربية الأولى</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            className="btn-success text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-3"
            onClick={() => setShowGuestModal(true)}
          >
            <span>👤</span>
            دخول كزائر
          </Button>
          
          <Button 
            className="btn-primary text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-3"
            onClick={() => setShowMemberModal(true)}
          >
            <span>✅</span>
            دخول كعضو
          </Button>
          
          <Button 
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300"
            onClick={() => setShowRegisterModal(true)}
          >
            <span>📝</span>
            تسجيل عضوية جديدة
          </Button>
          
          <Button 
            className="btn-danger text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-3"
            onClick={handleGoogleLogin}
          >
            <span>🔐</span>
            دخول بـ Google
          </Button>
        </div>
      </div>

      {/* Guest Name Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="glass-effect border border-border animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span>📝</span>
              أدخل اسم الزائر
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="مثال: زائر_2025"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
              onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
            />
            <Button 
              onClick={handleGuestLogin} 
              disabled={loading}
              className="btn-success w-full text-white px-6 py-3 rounded-xl font-semibold"
            >
              <span className="ml-2">🚀</span>
              {loading ? 'جاري الدخول...' : 'دخول الآن'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Login Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="glass-effect border border-border animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span>🔐</span>
              تسجيل دخول الأعضاء
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="اسم المستخدم"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />
            <Input
              type="password"
              value={memberPassword}
              onChange={(e) => setMemberPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
              onKeyPress={(e) => e.key === 'Enter' && handleMemberLogin()}
            />
            <Button 
              onClick={handleMemberLogin} 
              disabled={loading}
              className="btn-primary w-full text-white px-6 py-3 rounded-xl font-semibold"
            >
              <span className="ml-2">🔑</span>
              {loading ? 'جاري الدخول...' : 'دخول'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registration Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="glass-effect border border-border animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span>📝</span>
              تسجيل عضوية جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder="اسم المستخدم الجديد"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />
            <Input
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              placeholder="كلمة المرور (6 أحرف على الأقل)"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
              onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            />
            <Button 
              onClick={handleRegister} 
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              <span className="ml-2">🎉</span>
              {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

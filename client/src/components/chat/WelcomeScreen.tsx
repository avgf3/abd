import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import UserRegistration from './UserRegistration';
import type { ChatUser } from '@/types/chat';

interface WelcomeScreenProps {
  onUserLogin: (user: ChatUser) => void;
}

export default function WelcomeScreen({ onUserLogin }: WelcomeScreenProps) {
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
  const [registerAge, setRegisterAge] = useState('');
  const [registerCountry, setRegisterCountry] = useState('');
  const [registerStatus, setRegisterStatus] = useState('');
  const [registerRelation, setRegisterRelation] = useState('');
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
      onUserLogin(data.user);
      setShowGuestModal(false);
    } catch (error: any) {
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
      onUserLogin(data.user);
      setShowMemberModal(false);
    } catch (error: any) {
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
        description: "يرجى ملء جميع الحقول المطلوبة",
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

    if (registerPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (registerAge && (parseInt(registerAge) < 13 || parseInt(registerAge) > 100)) {
      toast({
        title: "خطأ",
        description: "العمر يجب أن يكون بين 13 و 100 سنة",
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
          age: registerAge ? parseInt(registerAge) : undefined,
          country: registerCountry.trim() || undefined,
          status: registerStatus.trim() || undefined,
          relation: registerRelation.trim() || undefined,
        }
      });
      toast({
        title: "نجح التسجيل",
        description: data.message,
      });
      onUserLogin(data.user);
      setShowRegisterModal(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في التسجيل",
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
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">الجنس:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="guestGender"
                    value="male"
                    checked={guestGender === 'male'}
                    onChange={(e) => setGuestGender(e.target.value)}
                    className="text-blue-500"
                  />
                  🧑 ذكر
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="guestGender"
                    value="female"
                    checked={guestGender === 'female'}
                    onChange={(e) => setGuestGender(e.target.value)}
                    className="text-pink-500"
                  />
                  👩 أنثى
                </label>
              </div>
            </div>
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
            <div>
              <label htmlFor="member-username" className="block text-sm font-medium text-white mb-1">
                اسم المستخدم
              </label>
              <Input
                id="member-username"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="اسم المستخدم"
                className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="member-password" className="block text-sm font-medium text-white mb-1">
                كلمة المرور
              </label>
              <Input
                id="member-password"
                type="password"
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
                onKeyPress={(e) => e.key === 'Enter' && handleMemberLogin()}
                aria-required="true"
              />
            </div>
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
            <div>
              <label htmlFor="register-username" className="block text-sm font-medium text-white mb-1">
                اسم المستخدم الجديد
              </label>
              <Input
                id="register-username"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="اسم المستخدم الجديد"
                className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-white mb-1">
                كلمة المرور (6 أحرف على الأقل)
              </label>
              <Input
                id="register-password"
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="كلمة المرور (6 أحرف على الأقل)"
                className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
                aria-required="true"
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-white mb-1">
                تأكيد كلمة المرور
              </label>
              <Input
                id="register-confirm-password"
                type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
              onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            />
            </div>
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">الجنس:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="registerGender"
                    value="male"
                    checked={registerGender === 'male'}
                    onChange={(e) => setRegisterGender(e.target.value)}
                    className="text-blue-500"
                  />
                  🧑 ذكر
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="registerGender"
                    value="female"
                    checked={registerGender === 'female'}
                    onChange={(e) => setRegisterGender(e.target.value)}
                    className="text-pink-500"
                  />
                  👩 أنثى
                </label>
              </div>
            </div>
            
            <Input
              type="number"
              value={registerAge}
              onChange={(e) => setRegisterAge(e.target.value)}
              placeholder="العمر (اختياري)"
              min="13"
              max="100"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />
            
            <Input
              value={registerCountry}
              onChange={(e) => setRegisterCountry(e.target.value)}
              placeholder="البلد (اختياري)"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />
            
            <Input
              value={registerStatus}
              onChange={(e) => setRegisterStatus(e.target.value)}
              placeholder="الحالة الاجتماعية (اختياري)"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />
            
            <Input
              value={registerRelation}
              onChange={(e) => setRegisterRelation(e.target.value)}
              placeholder="البحث عن (اختياري)"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
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

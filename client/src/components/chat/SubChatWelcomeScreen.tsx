import { UserPlus, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

import UserRegistration from './UserRegistration';
import StructuredData from '@/components/SEO/StructuredData';
import { getCityLinkFromName } from '@/utils/cityUtils';

import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import type { SubChat } from '@/data/subChats';

interface SubChatWelcomeScreenProps {
  onUserLogin: (user: ChatUser) => void;
  subChatData: SubChat;
}

export default function SubChatWelcomeScreen({ onUserLogin, subChatData }: SubChatWelcomeScreenProps) {
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
  const [registerCountry, setRegisterCountry] = useState(subChatData.nameAr.replace('شات ', ''));
  const [registerStatus, setRegisterStatus] = useState('');
  const [registerRelation, setRegisterRelation] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  // تحديث العنوان والوصف للصفحة
  useEffect(() => {
    document.title = subChatData.title;
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute('content', subChatData.metaDescription);
    }

    // إضافة الكلمات المفتاحية
    let metaKeywords = document.querySelector("meta[name='keywords']");
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', subChatData.keywords.join(', '));
  }, [subChatData]);

  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم الزائر',
        variant: 'destructive',
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
          country: subChatData.nameAr.replace('شات ', ''),
        },
      });
      onUserLogin(data.user);
      setShowGuestModal(false);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ في تسجيل الدخول',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberLogin = async () => {
    if (!memberName.trim() || !memberPassword.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم المستخدم/البريد وكلمة المرور',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/member', {
        method: 'POST',
        body: {
          identifier: memberName.trim(),
          password: memberPassword.trim(),
        },
      });
      onUserLogin(data.user);
      setShowMemberModal(false);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ في تسجيل الدخول',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim() || !registerPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمات المرور غير متطابقة',
        variant: 'destructive',
      });
      return;
    }

    if (registerPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
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
        },
      });
      toast({
        title: 'نجح التسجيل',
        description: data.message,
      });
      onUserLogin(data.user);
      setShowRegisterModal(false);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ في التسجيل',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* SEO Structured Data */}
      <StructuredData
        type="WebPage"
        data={{
          name: subChatData.title,
          url: `https://www.arabya.chat${subChatData.path}`,
          description: subChatData.metaDescription,
          breadcrumbs: [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "الرئيسية",
              "item": "https://www.arabya.chat"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": subChatData.parentPath.replace('/', ''),
              "item": `https://www.arabya.chat${subChatData.parentPath}`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": subChatData.nameAr,
              "item": `https://www.arabya.chat${subChatData.path}`
            }
          ],
          appName: subChatData.nameAr
        }}
      />

      {/* شريط العنوان */}
      <div className="bg-gray-900 text-white py-3 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          {/* روابط الشريط العلوي */}
          <div className="flex items-center gap-3 text-sm">
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors underline">
              سياسة الخصوصية
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors underline">
              شروط الاستخدام
            </Link>
          </div>
          {/* الشعار المثبت يساراً: أبيض وأزرق */}
          <div className="flex items-center gap-2 cursor-default select-none">
            <MessageCircle className="w-5 h-5" style={{ color: '#667eea' }} />
            <div className="text-xl font-bold whitespace-nowrap" style={{ color: '#ffffff' }}>
              Arabic<span style={{ color: '#667eea' }}>Chat</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`min-h-[calc(100dvh-60px)] flex flex-col justify-center items-center welcome-gradient relative overflow-hidden ${isMobile ? 'px-4' : ''}`}
        style={{ minHeight: 'calc(100dvh - 60px)' }}
      >
        {/* Modern Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
              {subChatData.nameAr}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-2">
              غرفة {subChatData.nameAr} الرسمية 🌟
            </p>
            <p className="text-lg text-gray-300">
              تعارف وتواصل في {subChatData.nameAr}
            </p>
          </div>

          {/* Login Options */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Guest Login */}
            <div className="glass-effect p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-center">
                <span className="text-5xl mb-4 block">👤</span>
                <h3 className="text-xl font-bold text-white mb-2">دخول كزائر</h3>
                <p className="text-gray-300 mb-4">ابدأ الدردشة فوراً بدون تسجيل</p>
                <Button
                  onClick={() => setShowGuestModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  <span className="ml-2">🚀</span>
                  دخول سريع
                </Button>
              </div>
            </div>

            {/* Member Login */}
            <div className="glass-effect p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-center">
                <span className="text-5xl mb-4 block">⭐</span>
                <h3 className="text-xl font-bold text-white mb-2">دخول الأعضاء</h3>
                <p className="text-gray-300 mb-4">سجل دخولك بحسابك المميز</p>
                <Button
                  onClick={() => setShowMemberModal(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  <span className="ml-2">🔐</span>
                  دخول الأعضاء
                </Button>
              </div>
            </div>

            {/* Register */}
            <div className="glass-effect p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-center">
                <span className="text-5xl mb-4 block">🎉</span>
                <h3 className="text-xl font-bold text-white mb-2">عضوية جديدة</h3>
                <p className="text-gray-300 mb-4">انضم لمجتمعنا واحصل على مزايا حصرية</p>
                <Button
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  <UserPlus className="ml-2" size={20} />
                  تسجيل جديد
                </Button>
              </div>
            </div>
          </div>

          {/* Sub Chat Specific Links */}
          <div className="glass-effect p-8 rounded-2xl border border-white/20 mb-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-white">
              غرف {subChatData.nameAr} المتخصصة
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {subChatData.chatLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => toast({
                    title: link.name,
                    description: link.description || 'جاري تحميل الغرفة...',
                  })}
                  className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 p-3 rounded-xl text-white transition-all duration-300 hover:transform hover:scale-105 border border-white/10 hover:border-white/30"
                >
                  <p className="font-semibold">{link.name}</p>
                  {link.description && (
                    <p className="text-xs text-gray-300 mt-1">{link.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Other Links */}
          <div className="glass-effect p-6 rounded-2xl border border-white/20">
            <h3 className="text-2xl font-bold text-center mb-4 text-white">
              دردشات أخرى
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/" className="text-blue-300 hover:text-blue-200 transition-colors">الرئيسية</Link>
              <span className="text-gray-500">|</span>
              <Link href="/oman" className="text-blue-300 hover:text-blue-200 transition-colors">شات عمان</Link>
              <span className="text-gray-500">|</span>
              <Link href="/egypt" className="text-blue-300 hover:text-blue-200 transition-colors">شات مصر</Link>
              <span className="text-gray-500">|</span>
              <Link href="/saudi" className="text-blue-300 hover:text-blue-200 transition-colors">شات السعودية</Link>
              <span className="text-gray-500">|</span>
              <Link href="/algeria" className="text-blue-300 hover:text-blue-200 transition-colors">شات الجزائر</Link>
              <span className="text-gray-500">|</span>
              <Link href="/bahrain" className="text-blue-300 hover:text-blue-200 transition-colors">شات البحرين</Link>
              <span className="text-gray-500">|</span>
              <Link href="/uae" className="text-blue-300 hover:text-blue-200 transition-colors">شات الإمارات</Link>
              <span className="text-gray-500">|</span>
              <Link href="/jordan" className="text-blue-300 hover:text-blue-200 transition-colors">شات الأردن</Link>
              <span className="text-gray-500">|</span>
              <Link href="/kuwait" className="text-blue-300 hover:text-blue-200 transition-colors">شات الكويت</Link>
              <span className="text-gray-500">|</span>
              <Link href="/libya" className="text-blue-300 hover:text-blue-200 transition-colors">شات ليبيا</Link>
              <span className="text-gray-500">|</span>
              <Link href="/tunisia" className="text-blue-300 hover:text-blue-200 transition-colors">شات تونس</Link>
              <span className="text-gray-500">|</span>
              <Link href="/morocco" className="text-blue-300 hover:text-blue-200 transition-colors">شات المغرب</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Login Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="glass-effect border border-border animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span>👤</span>
              دخول كزائر - {subChatData.nameAr}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value.slice(0, 14))}
              placeholder="اختر اسم مستعار"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
              maxLength={14}
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
              <span>⭐</span>
              دخول الأعضاء - {subChatData.nameAr}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="اسم المستخدم أو البريد الإلكتروني"
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
              className="btn-success w-full text-white px-6 py-3 rounded-xl font-semibold"
            >
              <span className="ml-2">🔐</span>
              {loading ? 'جاري الدخول...' : 'دخول الآن'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="glass-effect border border-border animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span>📝</span>
              تسجيل عضوية جديدة - {subChatData.nameAr}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value.slice(0, 14))}
              placeholder="اسم المستخدم الجديد"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
              maxLength={14}
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
              min="18"
              max="100"
              className="bg-secondary border-accent text-white placeholder:text-muted-foreground"
            />

            <Input
              value={registerCountry}
              onChange={(e) => setRegisterCountry(e.target.value)}
              placeholder="البلد"
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
import { UserPlus } from 'lucide-react';
import { useState } from 'react';

import UserRegistration from './UserRegistration';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  const isMobile = useIsMobile();

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

    if (registerAge && (parseInt(registerAge) < 18 || parseInt(registerAge) > 100)) {
      toast({
        title: 'خطأ',
        description: 'العمر يجب أن يكون بين 18 و 100 سنة',
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

  const handleGoogleLogin = () => {
    toast({
      title: 'قريباً',
      description: '🔄 جاري تطوير خدمة تسجيل الدخول بـ Google',
    });
  };

  return (
    <div className="min-h-screen">
      {/* شريط العنوان */}
      <div className="bg-gray-900 text-white py-3 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-2xl">💬</span>
            <span className="text-xl font-bold">Arabic<span className="text-red-500">chat</span></span>
          </div>
        </div>
      </div>

      <div
        className={`min-h-[calc(100dvh-60px)] flex flex-col justify-center items-center welcome-gradient relative overflow-hidden ${isMobile ? 'px-4' : ''}`}
      >
        {/* Modern Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-radial from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-radial from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="text-center animate-slide-up relative z-10">
          <div className="mb-10">
            <div className="text-6xl sm:text-7xl mb-6 animate-pulse-slow modern-float">💬</div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-blue-600">
              دردشة عربية | شات عربي | تعارف بدون تسجيل أو اشتراك مجانًا
            </h1>
            <p className="text-2xl text-muted-foreground mb-10 font-light">منصة التواصل العربية الأولى</p>
          </div>

        <div
          className={`flex ${isMobile ? 'flex-col w-full max-w-xs' : 'flex-col sm:flex-row'} gap-3 sm:gap-4 justify-center items-center px-3`}
        >
          <Button
            className={`modern-button btn-success text-white font-semibold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mobile-touch-button hover-glow ${isMobile ? 'w-full justify-center' : ''}`}
            onClick={() => setShowGuestModal(true)}
          >
            <span className="text-2xl">👤</span>
            <span className="text-lg">دخول كزائر</span>
          </Button>

          <Button
            className={`modern-button btn-primary text-white font-semibold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mobile-touch-button hover-glow ${isMobile ? 'w-full justify-center' : ''}`}
            onClick={() => setShowMemberModal(true)}
          >
            <span className="text-2xl">✅</span>
            <span className="text-lg">دخول كعضو</span>
          </Button>

          <Button
            className={`modern-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 mobile-touch-button hover-glow ${isMobile ? 'w-full justify-center' : ''}`}
            onClick={() => setShowRegisterModal(true)}
          >
            <span>📝</span>
            تسجيل عضوية جديدة
          </Button>

          <Button
            className={`btn-danger text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-3 mobile-touch-button ${isMobile ? 'w-full justify-center' : ''}`}
            onClick={handleGoogleLogin}
          >
            <span>🔐</span>
            دخول بـ Google
          </Button>
        </div>

        {/* روابط سياسة الخصوصية وشروط الاستخدام */}
        <div className="mt-8 text-center">
          <div className="flex justify-center items-center gap-4 text-sm">
            <a href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors underline">
              سياسة الخصوصية
            </a>
            <span className="text-gray-400">|</span>
            <a href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors underline">
              شروط الاستخدام
            </a>
          </div>
        </div>
      </div>
      </div>

      {/* Guest Name Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="modern-card glass-effect border-0 animate-fade-in shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-bold gradient-text flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl">📝</span>
              أدخل اسم الزائر
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value.slice(0, 14))}
              placeholder="مثال: زائر_2025"
              className="modern-input text-white"
              maxLength={14}
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

      {/* الأقسام الإضافية تحت صفحة تسجيل الدخول */}
      <div className="w-full space-y-0">
        {/* القسم الأول - الأسئلة الشائعة */}
        <div className="bg-pink-500 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">أهلاً بك في شات كل العرب</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            انضم الآن إلى افضل مجتمع دردشة عربية مجانية. تواصل مع شباب وصبايا من مختلف الدول، وابدأ تكوين صداقات حقيقية في أجواء ممتعة وآمنة.
          </p>
        </div>

        {/* القسم الثاني - ما الذي ستحصل عليه */}
        <div className="bg-blue-600 text-white p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">🎁 ما الذي ستحصل عليه فعلاً؟</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto text-right">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>تغيير نوع الخط واللون و الحجم</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>إرسال رسائل كتابية خاصة و عامة غير محدودة</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>إرسال صور من المعرض أو من كاميرا التصوير في المحادثات العامة الخاصة</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>إرسال رموز سمايلي في الغرف العامة والمحادثات الخاصة</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>تغيير أيقونة أو صورة المتحدث الشخصية في الدردشة</span>
              </li>
            </ul>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>يمكن تجاهل الرسائل الخاصة و العامة من شخص معين</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>منع استقبال رسائل خاصة من الأشخاص</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>البحث عن اسم حيف أو مستخدم في قائمة المتواجدين في الغرفة</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>تغيير لون الاسم في قائمة المستخدمين إلى ما يناسبك</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>تغيير لون خلفية الرسائل النصية المرسلة في الغرف والمحادثة الخاصة</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>عضوية أشراف تتضمن مرتبة الزوار من طرد و كتم عام و يحصل صاحب العضوية على لون مميز</span>
              </li>
            </ul>
          </div>
        </div>

        {/* القسم الثالث - كيفية تجاهل الأشخاص المزعجين */}
        <div className="bg-red-600 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🚫 كيفية تجاهل الأشخاص المزعجين؟</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكن تجاهل الرسائل الخاصة والعامة من شخص معين عن طريق فتح الملف الشخصي الخاص بالعضو المزعج والضغط علامة ❌ "تجاهل" وهكذا الأمر يحول الدردشة متنفقة
          </p>
        </div>

        {/* القسم الرابع - ماذا على أن أفعل لتجنب الظري من الشات */}
        <div className="bg-green-500 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">✅ ماذا على أن أفعل لتجنب الطرد من الشات؟</h2>
          <div className="max-w-4xl mx-auto space-y-2 text-lg">
            <p>يجب عليك تجنب الدخول بأسماء غير لائقة</p>
            <p>احترام قوانين "شات عربي" والأشخاص داخل الدردشة</p>
            <p>عدم الإساءة لأحد الأشخاص أو لأي مذهب ديني</p>
          </div>
        </div>

        {/* القسم الخامس - الملف الشخصي */}
        <div className="bg-cyan-600 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">👤 الملف الشخصي</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك تعديل الملف الشخصي الخاص بك من أيقونة 👤 تعديل الجنس العمر الحالة والبلد وكلمة المرور وتفاصيل الحساب وغير ذلك الكثير
          </p>
        </div>

        {/* القسم السادس - قبول / إضافة أصدقاء */}
        <div className="bg-purple-600 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🎉 قبول / إضافة أصدقاء</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك إضافة أصدقائك المفضلة الحالية يمكنك إضافة أصدقاء من الملف الشخصي للأعضاء عن طريق النقر على زر "إضافة صديق" في أعلى الملف الشخصي. يمكنك عرض قائمة لأصدقائك الحاليين عن طريق النقر 👥 على الرمز في أسفل الصفحة.
          </p>
        </div>

        {/* القسم السابع - الرسائل الخاصة */}
        <div className="bg-teal-500 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">💬 الرسائل الخاصة</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك بدء محادثة خاصة أو محادثة جماعية مع الأشخاص.
          </p>
          <p className="text-lg mt-4 leading-relaxed max-w-4xl mx-auto">
            في القائمة العلوية من أيقونة 💬 يمكنك عرض القائمة الخاصة للنشطة الحالية وإنشاء خاص جديد وغيرها،يمكنك فتح محادثة خاصة مع مستخدم عن طريق النقر على الصورة الرمزية للعضو المرغوب في الدردشة أو باقر على اسم المستخدم الخاص به في قائمة المستخدمين
          </p>
        </div>

        {/* القسم الثامن - إشعارات الدردشة */}
        <div className="bg-gray-600 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🔔 إشعارات الدردشة</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك عرض الإشعار الحالي خوار ما يحدث على حسابك يوجد إخطار غير مقروء في الأعلى ولونه مختلف
          </p>
        </div>

        {/* القسم التاسع - مشاركة الفيديوهات */}
        <div className="bg-red-700 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">📺 مشاركة الفيديوهات</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك مشاركة ونشر فيديوهات من اليوتيوب مع أصدقائك والجميع
          </p>
        </div>

        {/* القسم العاشر - الصوتيات */}
        <div className="bg-indigo-700 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🎵 الصوتيات</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك الاستماع لجميع محطات الراديو والصوتيات
          </p>
        </div>

        {/* القسم الحادي عشر - مشاركة الصور */}
        <div className="bg-pink-600 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">📸 مشاركة الصور</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            يمكنك مشاركة صور من الإنترنت أو من جهازك الشخصي مع جميع الأشخاص
          </p>
        </div>

        {/* القسم الثاني عشر - حائط اليوميات */}
        <div className="bg-blue-700 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">📷 حائط اليوميات</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            تستطيع نشر يومياتك على حائطك الخاص بك ومشاركتها مع أصدقائك
          </p>
        </div>

        {/* القسم الثالث عشر - الأمان والخصوصية */}
        <div className="bg-red-800 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🔒 الأمان والخصوصية</h2>
          <p className="text-lg leading-relaxed max-w-4xl mx-auto">
            دردشتك ودردشاتك في أمان تطبيق شات عربي يقوم بتشفير بيانات ومعلومات الضيوف والمشتركين ولا يتم مشاركتها مع أي طرف ثالث، ماعدا المعلومات التي تكتبها بنفسك على ملفك الشخصي (البروفايل) هي البيانات التي يمكن رؤيتها من قبل المشتركين الآخرين، كما أن أي نصوص أو عبارات أو وسائط تقوم بمشاركتها من خلال شات عربي مع المستخدمين الآخرين على مسؤوليتك الشخصية ولا وليس للتطبيق أي دخل بها
          </p>
        </div>

        {/* القسم الأخير - غرف الدردشة */}
        <div className="bg-blue-600 text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-6">دردشة عربية للتقي بأصدقاء عرب جدد من مختلف أنحاء العالم واستمتع بالدردشة الجماعية أو بدء محادثة خاصة في موقع شات عربي تعارف بدون تسجيل أو اشتراك مجانًا</h2>
          <h3 className="text-2xl font-semibold mb-4">غرف الدردشة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-6">
            <div className="space-y-2">
              <a href="/algeria" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات الجزائر</a>
              <a href="/bahrain" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات البحرين</a>
              <a href="/uae" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات الإمارات</a>
              <a href="/jordan" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات الأردن</a>
              <a href="/kuwait" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات الكويت</a>
            </div>
            <div className="space-y-2">
              <a href="/libya" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات ليبيا</a>
              <a href="/tunisia" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات تونس</a>
              <a href="/morocco" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات المغرب</a>
              <a href="/oman" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات عمان</a>
              <a href="/sudan" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات السودان</a>
            </div>
            <div className="space-y-2">
              <a href="/palestine" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات فلسطين</a>
              <a href="/qatar" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات قطر</a>
              <a href="/comoros" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات جزر القمر</a>
              <a href="/yemen" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات اليمن</a>
              <a href="/djibouti" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات جيبوتي</a>
            </div>
            <div className="space-y-2">
              <a href="/egypt" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات مصر</a>
              <a href="/saudi" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات السعودية</a>
              <a href="/lebanon" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات لبنان</a>
              <a href="/syria" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات سوريا</a>
              <a href="/iraq" className="block text-yellow-300 hover:text-yellow-200 transition-colors">شات العراق</a>
            </div>
          </div>
          <div className="mt-8 space-y-2">
            <div className="flex justify-center items-center gap-4 text-sm">
              <a href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors underline">
                سياسة الخصوصية
              </a>
              <span className="text-gray-400">|</span>
              <a href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors underline">
                شروط الاستخدام
              </a>
            </div>
            <p className="text-sm text-blue-300">جميع و تعارف من جميع أنحاء العالم بدون تسجيل</p>
          </div>
        </div>
      </div>

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

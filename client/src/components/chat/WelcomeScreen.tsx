import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, User, LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface WelcomeScreenProps {
  onUserLogin: (user: ChatUser, token?: string) => void;
}

export default function WelcomeScreen({ onUserLogin }: WelcomeScreenProps) {
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Guest login state
  const [guestData, setGuestData] = useState({
    username: '',
    gender: 'male'
  });

  // Member login state
  const [memberData, setMemberData] = useState({
    username: '',
    password: ''
  });

  // Registration state
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    gender: 'male',
    age: '',
    country: '',
    status: '',
    relation: ''
  });

  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return 'اسم المستخدم مطلوب';
    }
    if (username.trim().length < 3) {
      return 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
    }
    if (username.trim().length > 20) {
      return 'اسم المستخدم يجب أن يكون 20 حرف كحد أقصى';
    }
    if (!/^[\u0600-\u06FFa-zA-Z0-9_]+$/.test(username.trim())) {
      return 'اسم المستخدم يجب أن يحتوي على أحرف عربية أو إنجليزية وأرقام فقط';
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return 'كلمة المرور مطلوبة';
    }
    if (password.length < 8) {
      return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }
    if (!/(?=.*[a-zA-Z])/.test(password)) {
      return 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل';
    }
    if (!/(?=.*[0-9])/.test(password)) {
      return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
    }
    return null;
  };

  const handleGuestLogin = async () => {
    const usernameError = validateUsername(guestData.username);
    if (usernameError) {
      toast({
        title: "خطأ في التحقق",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/guest', {
        method: 'POST',
        body: {
          username: guestData.username.trim(),
          gender: guestData.gender,
        }
      });

      if (response.success) {
        // حفظ التوكن في localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        onUserLogin(response.user, response.token);
        setShowGuestModal(false);
        toast({
          title: "مرحباً!",
          description: `أهلاً بك ${response.user.username}`,
          variant: "default",
        });
      } else {
        throw new Error(response.error || 'فشل في تسجيل الدخول');
      }
    } catch (error: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberLogin = async () => {
    const usernameError = validateUsername(memberData.username);
    if (usernameError) {
      toast({
        title: "خطأ في التحقق",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }

    if (!memberData.password) {
      toast({
        title: "خطأ في التحقق",
        description: "كلمة المرور مطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/member', {
        method: 'POST',
        body: {
          username: memberData.username.trim(),
          password: memberData.password,
        }
      });

      if (response.success) {
        // حفظ التوكن في localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        onUserLogin(response.user, response.token);
        setShowMemberModal(false);
        toast({
          title: "أهلاً وسهلاً!",
          description: `مرحباً بعودتك ${response.user.username}`,
          variant: "default",
        });
      } else {
        throw new Error(response.error || 'فشل في تسجيل الدخول');
      }
    } catch (error: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message || "تحقق من اسم المستخدم وكلمة المرور",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // التحقق من صحة البيانات
    const usernameError = validateUsername(registerData.username);
    if (usernameError) {
      toast({
        title: "خطأ في التحقق",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(registerData.password);
    if (passwordError) {
      toast({
        title: "خطأ في التحقق",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "خطأ في التحقق",
        description: "كلمتا المرور غير متطابقتان",
        variant: "destructive",
      });
      return;
    }

    // التحقق من العمر إذا تم إدخاله
    if (registerData.age && (isNaN(Number(registerData.age)) || Number(registerData.age) < 13 || Number(registerData.age) > 100)) {
      toast({
        title: "خطأ في التحقق",
        description: "العمر يجب أن يكون بين 13 و 100 سنة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          username: registerData.username.trim(),
          password: registerData.password,
          confirmPassword: registerData.confirmPassword,
          gender: registerData.gender,
          age: registerData.age ? Number(registerData.age) : undefined,
          country: registerData.country.trim() || undefined,
          status: registerData.status.trim() || undefined,
          relation: registerData.relation.trim() || undefined,
        }
      });

      if (response.success) {
        // حفظ التوكن في localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        onUserLogin(response.user, response.token);
        setShowRegisterModal(false);
        toast({
          title: "تم التسجيل بنجاح! 🎉",
          description: `مرحباً بك في المجتمع ${response.user.username}`,
          variant: "default",
        });
      } else {
        throw new Error(response.error || 'فشل في التسجيل');
      }
    } catch (error: any) {
      toast({
        title: "خطأ في التسجيل",
        description: error.message || "حدث خطأ أثناء التسجيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setGuestData({ username: '', gender: 'male' });
    setMemberData({ username: '', password: '' });
    setRegisterData({
      username: '',
      password: '',
      confirmPassword: '',
      gender: 'male',
      age: '',
      country: '',
      status: '',
      relation: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            دردشة عربية
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            منصة التواصل الاجتماعي العربية
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-gray-800 dark:text-white">
              اختر طريقة الدخول
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              انضم إلى مجتمع الدردشة العربية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Guest Login Button */}
            <Button
              onClick={() => {
                resetForms();
                setShowGuestModal(true);
              }}
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
              size="lg"
            >
              <User className="ml-2 h-5 w-5" />
              دخول كزائر
            </Button>

            {/* Member Login Button */}
            <Button
              onClick={() => {
                resetForms();
                setShowMemberModal(true);
              }}
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
              size="lg"
            >
              <LogIn className="ml-2 h-5 w-5" />
              دخول عضو
            </Button>

            {/* Register Button */}
            <Button
              onClick={() => {
                resetForms();
                setShowRegisterModal(true);
              }}
              variant="outline"
              className="w-full h-12 text-lg border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-700 dark:hover:bg-indigo-900/20 transition-all duration-200"
              size="lg"
            >
              <UserPlus className="ml-2 h-5 w-5" />
              تسجيل عضوية جديدة
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>مرحباً بك في أفضل منصة دردشة عربية</p>
          <p className="mt-1">تواصل مع الأصدقاء واستمتع بالمحادثات الممتعة</p>
        </div>
      </div>

      {/* Guest Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              دخول كزائر
            </DialogTitle>
            <DialogDescription>
              ادخل كزائر للتجربة السريعة (لا يتطلب كلمة مرور)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="اسم الزائر"
                value={guestData.username}
                onChange={(e) => setGuestData(prev => ({ ...prev, username: e.target.value }))}
                className="text-right"
                maxLength={20}
              />
            </div>
            <div>
              <Select
                value={guestData.gender}
                onValueChange={(value) => setGuestData(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGuestLogin} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                'دخول'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              دخول العضو
            </DialogTitle>
            <DialogDescription>
              ادخل بياناتك لتسجيل الدخول كعضو
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="اسم المستخدم"
                value={memberData.username}
                onChange={(e) => setMemberData(prev => ({ ...prev, username: e.target.value }))}
                className="text-right"
                maxLength={20}
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="كلمة المرور"
                value={memberData.password}
                onChange={(e) => setMemberData(prev => ({ ...prev, password: e.target.value }))}
                className="text-right pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button 
              onClick={handleMemberLogin} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                'دخول'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              تسجيل عضوية جديدة
            </DialogTitle>
            <DialogDescription>
              أنشئ حساباً جديداً للاستفادة من جميع الميزات
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Required Fields */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">البيانات المطلوبة</h4>
              <div>
                <Input
                  placeholder="اسم المستخدم *"
                  value={registerData.username}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                  className="text-right"
                  maxLength={20}
                />
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="كلمة المرور *"
                  value={registerData.password}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                  className="text-right pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="تأكيد كلمة المرور *"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="text-right pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div>
                <Select
                  value={registerData.gender}
                  onValueChange={(value) => setRegisterData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="الجنس *" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">بيانات اختيارية</h4>
              <div>
                <Input
                  type="number"
                  placeholder="العمر (اختياري)"
                  value={registerData.age}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, age: e.target.value }))}
                  className="text-right"
                  min={13}
                  max={100}
                />
              </div>
              <div>
                <Input
                  placeholder="البلد (اختياري)"
                  value={registerData.country}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, country: e.target.value }))}
                  className="text-right"
                  maxLength={50}
                />
              </div>
              <div>
                <Input
                  placeholder="الحالة الاجتماعية (اختياري)"
                  value={registerData.relation}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, relation: e.target.value }))}
                  className="text-right"
                  maxLength={50}
                />
              </div>
              <div>
                <Input
                  placeholder="نبذة شخصية (اختياري)"
                  value={registerData.status}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, status: e.target.value }))}
                  className="text-right"
                  maxLength={100}
                />
              </div>
            </div>

            <Button 
              onClick={handleRegister} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التسجيل...
                </>
              ) : (
                'تسجيل العضوية'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

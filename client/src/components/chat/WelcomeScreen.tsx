import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface WelcomeScreenProps {
  onUserLogin: (user: ChatUser) => void;
}

export default function WelcomeScreen({ onUserLogin }: WelcomeScreenProps) {
  const [guestUsername, setGuestUsername] = useState('');
  const [guestGender, setGuestGender] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGuestLogin = async () => {
    if (!guestUsername.trim() || !guestGender) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستخدم واختيار الجنس",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/guest', {
        method: 'POST',
        body: {
          username: guestUsername.trim(),
          gender: guestGender,
        }
      });
      
      if (data && data.user) {
        onUserLogin(data.user);
        toast({
          title: "مرحباً",
          description: `مرحباً ${data.user.username}!`,
        });
      }
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
    if (!memberUsername.trim() || !memberPassword.trim()) {
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
          username: memberUsername.trim(),
          password: memberPassword.trim(),
        }
      });
      
      if (data && data.user) {
        onUserLogin(data.user);
        toast({
          title: "مرحباً",
          description: `مرحباً ${data.user.username}!`,
        });
      }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 text-white p-4 font-['Cairo']" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Arabic Chat
          </h1>
          <p className="text-gray-300 mt-2">منصة الدردشة العربية</p>
        </div>

        {/* Login Tabs */}
        <Tabs defaultValue="guest" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="guest" className="text-white data-[state=active]:bg-blue-600">
              دخول سريع
            </TabsTrigger>
            <TabsTrigger value="member" className="text-white data-[state=active]:bg-blue-600">
              عضو مسجل
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="guest">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">دخول سريع</CardTitle>
                <CardDescription className="text-gray-300">
                  ادخل كضيف بدون تسجيل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="guestUsername" className="text-gray-300">اسم المستخدم</Label>
                  <Input
                    id="guestUsername"
                    value={guestUsername}
                    onChange={(e) => setGuestUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="guestGender" className="text-gray-300">الجنس</Label>
                  <Select value={guestGender} onValueChange={setGuestGender} disabled={loading}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="اختر الجنس" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="male" className="text-white">ذكر</SelectItem>
                      <SelectItem value="female" className="text-white">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGuestLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !guestUsername.trim() || !guestGender}
                >
                  {loading ? 'جاري الدخول...' : 'دخول سريع'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="member">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">عضو مسجل</CardTitle>
                <CardDescription className="text-gray-300">
                  ادخل بحسابك المسجل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="memberUsername" className="text-gray-300">اسم المستخدم</Label>
                  <Input
                    id="memberUsername"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="memberPassword" className="text-gray-300">كلمة المرور</Label>
                  <Input
                    id="memberPassword"
                    type="password"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={handleMemberLogin}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={loading || !memberUsername.trim() || !memberPassword.trim()}
                >
                  {loading ? 'جاري الدخول...' : 'دخول'}
                </Button>
                
                <div className="text-center text-sm text-gray-400">
                  <p>للدخول كمدير: المستخدم "عبود" وكلمة المرور "22333"</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-gray-400">
          <p>مرحباً بك في أفضل منصة دردشة عربية</p>
          <p>ادخل واستمتع بالتواصل مع الآخرين</p>
        </div>
      </div>
    </div>
  );
}
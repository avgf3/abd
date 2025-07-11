import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface SimpleWelcomeScreenProps {
  onUserLogin: (user: ChatUser) => void;
}

export default function SimpleWelcomeScreen({ onUserLogin }: SimpleWelcomeScreenProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!username.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستخدم",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('محاولة تسجيل الدخول...', username);
      
      const data = await apiRequest('/api/auth/guest', {
        method: 'POST',
        body: {
          username: username.trim(),
          gender: 'male',
        }
      });
      
      console.log('نجح تسجيل الدخول:', data);
      
      if (data && data.user) {
        onUserLogin(data.user);
        toast({
          title: "مرحباً",
          description: `مرحباً ${data.user.username}!`,
        });
      } else {
        throw new Error('لم يتم استلام بيانات المستخدم');
      }
    } catch (error: any) {
      console.error('خطأ في تسجيل الدخول:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/member', {
        method: 'POST',
        body: {
          username: 'عبود',
          password: '22333',
        }
      });
      
      console.log('نجح دخول المدير:', data);
      
      if (data && data.user) {
        onUserLogin(data.user);
        toast({
          title: "مرحباً",
          description: `مرحباً بالمدير ${data.user.username}!`,
        });
      }
    } catch (error: any) {
      console.error('خطأ في دخول المدير:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في دخول المدير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 font-['Cairo']" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Arabic Chat
          </h1>
          <p className="text-gray-300 mt-2">منصة الدردشة العربية</p>
        </div>

        {/* Login Form */}
        <div className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">اسم المستخدم</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
          </div>
          
          <Button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-all duration-200"
            disabled={loading || !username.trim()}
          >
            {loading ? '🔄 جاري الدخول...' : '🚀 دخول سريع'}
          </Button>

          <div className="text-center">
            <Button
              onClick={handleAdminLogin}
              variant="outline"
              className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
              disabled={loading}
            >
              👑 دخول المدير
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>مرحباً بك في أفضل منصة دردشة عربية</p>
          <p>ادخل واستمتع بالتواصل مع الآخرين</p>
        </div>
      </div>
    </div>
  );
}
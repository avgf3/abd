import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface SimpleWelcomeProps {
  onUserLogin: (user: ChatUser) => void;
}

export default function SimpleWelcome({ onUserLogin }: SimpleWelcomeProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGuestLogin = async () => {
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
      const data = await apiRequest('/api/auth/guest', {
        method: 'POST',
        body: {
          username: username.trim(),
          gender: 'ذكر',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">💬 الشات العربي</h1>
            <p className="text-gray-300">انضم للمحادثة الآن</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Input
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
              />
            </div>
            
            <Button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            >
              {loading ? "جاري الدخول..." : "دخول كزائر"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
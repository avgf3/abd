import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface LoginFormProps {
  onLogin: (user: ChatUser) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [guestName, setGuestName] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await apiRequest('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: guestName.trim() })
      });

      if (response.user) {
        onLogin(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول كضيف');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUsername.trim() || !memberPassword.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await apiRequest('/api/auth/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: memberUsername.trim(), 
          password: memberPassword.trim() 
        })
      });

      if (response.user) {
        onLogin(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            🌟 دردشة عربية
          </CardTitle>
          <CardDescription>
            انضم إلى أفضل منصة دردشة عربية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="guest" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guest">دخول كضيف</TabsTrigger>
              <TabsTrigger value="member">تسجيل دخول عضو</TabsTrigger>
            </TabsList>

            <TabsContent value="guest">
              <form onSubmit={handleGuestLogin} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="اسمك في الدردشة"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="text-right"
                    maxLength={20}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !guestName.trim()}
                >
                  {isLoading ? 'جاري الدخول...' : 'دخول كضيف 👋'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="member">
              <form onSubmit={handleMemberLogin} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="اسم المستخدم"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    className="text-right"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="كلمة المرور"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="text-right"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !memberUsername.trim() || !memberPassword.trim()}
                >
                  {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول 🔐'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>🎯 دردشة آمنة ومجانية</p>
            <p>💬 رسائل فورية وغرف متنوعة</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
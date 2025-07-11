import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface StealthModeToggleProps {
  currentUser: ChatUser;
}

export default function StealthModeToggle({ currentUser }: StealthModeToggleProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // التحقق من حالة الإخفاء الحالية
  useEffect(() => {
    if (currentUser && (currentUser.userType === 'admin' || currentUser.userType === 'owner')) {
      setIsHidden(currentUser.isHidden || false);
    }
  }, [currentUser]);

  const toggleStealthMode = async () => {
    if (!currentUser || (currentUser.userType !== 'admin' && currentUser.userType !== 'owner')) {
      toast({
        title: "غير مسموح",
        description: "هذه الخاصية للإدمن والمالك فقط",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newHiddenState = !isHidden;
      
      await apiRequest(`/api/users/${currentUser.id}/toggle-hidden`, {
        method: 'POST',
        body: {
          isHidden: newHiddenState
        }
      });

      setIsHidden(newHiddenState);
      
      toast({
        title: "تم بنجاح",
        description: newHiddenState 
          ? "🕵️ تم تفعيل وضع المراقبة المخفية - أنت الآن مخفي عن قائمة المتصلين"
          : "👁️ تم إلغاء وضع المراقبة المخفية - أنت الآن ظاهر في قائمة المتصلين",
        variant: "default",
      });

      // إعادة تحميل الصفحة لتطبيق التغييرات
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تغيير حالة الإخفاء",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // إظهار الزر فقط للإدمن والمالك
  if (!currentUser || (currentUser.userType !== 'admin' && currentUser.userType !== 'owner')) {
    return null;
  }

  return (
    <Button 
      className={`glass-effect px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
        isHidden 
          ? 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-400 text-purple-300' 
          : 'hover:bg-accent border-gray-400'
      }`}
      onClick={toggleStealthMode}
      disabled={isLoading}
      title={isHidden ? "إلغاء الوضع المخفي" : "تفعيل الوضع المخفي"}
    >
      <span>{isHidden ? '🕵️' : '👁️'}</span>
      {isLoading ? 'جاري التحديث...' : (isHidden ? 'مخفي' : 'ظاهر')}
      {isHidden && <span className="text-xs bg-purple-500 px-2 py-1 rounded">مراقبة</span>}
    </Button>
  );
}
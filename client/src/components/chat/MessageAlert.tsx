import { useState, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { getImageSrc } from '@/utils/imageUtils';
import type { ChatUser } from '@/types/chat';
import { getUserLevelIcon } from './UserRoleBadge';

interface MessageAlertProps {
  isOpen: boolean;
  sender: ChatUser | null;
  onClose: () => void;
  onOpenMessages: () => void;
}

// Memoized component for better performance
const MessageAlert = memo(function MessageAlert({ 
  isOpen, 
  sender, 
  onClose, 
  onOpenMessages 
}: MessageAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Safe image error handler
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const target = e.target as HTMLImageElement;
      if (target) {
        target.src = '/default_avatar.svg';
      }
    } catch (error) {
      console.warn('خطأ في معالجة خطأ الصورة:', error);
    }
  }, []);

  // Optimized close handler
  const handleClose = useCallback(() => {
    try {
      setIsVisible(false);
      
      // تنظيف المؤقت
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
      
      // انتظار انتهاء الانيميشن قبل إغلاق المكون
      setTimeout(onClose, 300);
    } catch (error) {
      console.error('خطأ في إغلاق التنبيه:', error);
      onClose(); // إغلاق فوري في حالة الخطأ
    }
  }, [onClose, autoCloseTimer]);

  // Safe open messages handler
  const handleOpenMessages = useCallback(() => {
    try {
      onOpenMessages();
      handleClose();
    } catch (error) {
      console.error('خطأ في فتح الرسائل:', error);
      handleClose();
    }
  }, [onOpenMessages, handleClose]);

  // Enhanced user type display
  const getUserTypeLabel = useCallback((userType: string) => {
    const typeLabels: { [key: string]: string } = {
      'owner': 'مالك',
      'admin': 'مدير',
      'moderator': 'مشرف',
      'member': 'عضو',
      'guest': 'زائر'
    };
    return typeLabels[userType] || 'مستخدم';
  }, []);

  // Effect for handling visibility and auto-close
  useEffect(() => {
    if (isOpen && sender) {
      setIsVisible(true);
      
      // إعداد مؤقت الإغلاق التلقائي
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      
      setAutoCloseTimer(timer);
      
      // تنظيف عند إلغاء المكون
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    } else {
      setIsVisible(false);
      
      // تنظيف المؤقت عند الإغلاق
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
    }
  }, [isOpen, sender, handleClose, autoCloseTimer]);

  // Don't render if not open or no sender
  if (!isOpen || !sender) {
    return null;
  }

  // Validate sender data
  if (!sender.id || !sender.username) {
    console.warn('بيانات المرسل غير صحيحة:', sender);
    return null;
  }

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      role="alert"
      aria-live="polite"
      aria-label={`رسالة جديدة من ${sender.username}`}
    >
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 border-2 border-blue-300 rounded-lg shadow-2xl p-4 max-w-sm animate-pulse">
        <div className="flex items-center gap-3">
          {/* صورة المرسل مع معالجة آمنة للأخطاء */}
          <div className="relative flex-shrink-0">
            <img
              src={getImageSrc(sender.profileImage)}
              alt={`صورة ${sender.username}`}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
              onError={handleImageError}
              loading="lazy"
            />
            
            {/* مؤشر الرسالة الجديدة */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-bounce border-2 border-white">
              <div className="w-full h-full bg-red-500 rounded-full animate-ping"></div>
            </div>
            
            {/* مؤشر الحالة (إذا كان متصل) */}
            {sender.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          {/* معلومات المرسل */}
          <div className="flex-1 text-white min-w-0">
            <h3 className="font-bold text-lg truncate" title={sender.username}>
              {sender.username}
            </h3>
            
            <div className="flex items-center gap-1 text-sm opacity-90">
              {getUserLevelIcon(sender, 14)}
              <span className="truncate">
                {getUserTypeLabel(sender.userType)}
              </span>
              {sender.level && (
                <span className="text-xs bg-white/20 px-1 rounded">
                  مستوى {sender.level}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-yellow-300 text-lg" aria-hidden="true">✉️</span>
              <span className="text-sm font-medium">رسالة جديدة!</span>
            </div>
          </div>
          
          {/* أزرار التحكم */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleOpenMessages}
              className="bg-white text-blue-600 hover:bg-gray-100 text-xs px-3 py-1 font-medium transition-colors"
              aria-label="عرض الرسائل"
            >
              ✉️ عرض
            </Button>
            
            <Button
              size="sm"
              onClick={handleClose}
              variant="ghost"
              className="text-white hover:bg-white/20 text-xs px-2 py-1 transition-colors"
              aria-label="إغلاق التنبيه"
            >
              ❌
            </Button>
          </div>
        </div>
        
        {/* شريط التقدم للإغلاق التلقائي */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-5000 ease-linear"
            style={{
              width: isVisible ? '0%' : '100%',
              transitionDuration: '5000ms'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
});

export default MessageAlert;
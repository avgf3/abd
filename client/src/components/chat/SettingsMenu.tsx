import { User, Home, Moon, Shield, LogOut, Settings, Palette, Brush, Camera } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getFinalUsernameColor, getUserListItemStyles } from '@/utils/themeUtils';

interface SettingsMenuProps {
  onOpenProfile: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenReports?: () => void;
  onOpenThemeSelector?: () => void;
  onOpenUsernameColorPicker?: () => void;
  onOpenIgnoredUsers?: () => void;
  onOpenStories?: () => void;
  currentUser?: any;
}

export default function SettingsMenu({
  onOpenProfile,
  onLogout,
  onClose,
  onOpenReports,
  onOpenThemeSelector,
  onOpenUsernameColorPicker,
  onOpenIgnoredUsers,
  onOpenStories,
  currentUser,
}: SettingsMenuProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    if (confirm('🤔 هل أنت متأكد من تسجيل الخروج؟')) {
      onLogout();
    }
  };

  // تحسين موضع القائمة عند الظهور
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // إذا كانت القائمة خارج حدود الشاشة من اليمين
    if (rect.right > viewportWidth) {
      card.style.right = '1rem';
      card.style.left = 'auto';
    }

    // إذا كانت القائمة خارج حدود الشاشة من الأسفل
    if (rect.bottom > viewportHeight) {
      card.style.top = 'auto';
      card.style.bottom = '1rem';
    }
  }, []);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <Card 
      ref={cardRef}
      className="fixed top-20 z-50 shadow-2xl animate-fade-in w-56 bg-card/95 backdrop-blur-md border-accent" 
      style={{
        right: 'max(1rem, min(1rem, calc(100vw - 15rem)))',
        maxHeight: 'calc(100vh - 6rem)',
        overflowY: 'auto'
      }}>
      <CardContent className="p-0">
        {currentUser && (
          <div className="p-3 border-b border-border" style={getUserListItemStyles(currentUser)}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: getFinalUsernameColor(currentUser) }} />
              <span className="font-semibold" style={{ color: getFinalUsernameColor(currentUser) }}>
                {currentUser.username}
              </span>
            </div>
          </div>
        )}
        {/* القسم الأول - الملف الشخصي */}
        <div className="p-3 border-b border-border">
          <Button
            onClick={onOpenProfile}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <User className="w-4 h-4 text-primary" />
            الملف الشخصي
          </Button>
        </div>

        {/* القسم الثاني - الإعدادات العامة */}
        <div className="p-3 border-b border-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <Home className="w-4 h-4 text-primary" />
            الغرف
          </Button>

          {currentUser?.userType === 'owner' && (
            <Button
              onClick={onOpenThemeSelector}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            >
              <Palette className="w-4 h-4 text-primary" />
              اختيار الثيم
            </Button>
          )}

          {currentUser && currentUser.userType !== 'guest' && (
            <Button
              onClick={onOpenUsernameColorPicker}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            >
              <Brush className="w-4 h-4 text-primary" />
              لون الاسم
            </Button>
          )}

          {currentUser && currentUser.userType !== 'guest' && (
            <Button
              onClick={onOpenStories}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            >
              <Camera className="w-4 h-4 text-primary" />
              الحالات
            </Button>
          )}

          <Button
            onClick={onOpenIgnoredUsers}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <Shield className="w-4 h-4 text-primary" />
            قائمة المتجاهلين
          </Button>
        </div>

        {/* القسم الثالث - الإدارة (للمشرفين فقط) */}
        {currentUser?.userType === 'owner' && onOpenReports && (
          <div className="p-3 border-b border-border">
            <Button
              onClick={onOpenReports}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            >
              <Shield className="w-4 h-4 text-primary" />
              إدارة التبليغات
            </Button>
          </div>
        )}

        {/* القسم الرابع - تسجيل الخروج */}
        <div className="p-3">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

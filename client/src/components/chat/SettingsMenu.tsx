import { User, Home, Moon, Shield, LogOut, Settings, Palette, Brush, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getFinalUsernameColor,
  getUserListItemStyles,
  getUserNameplateStyles,
  getUserListItemClasses,
  getUsernameDisplayStyle,
} from '@/utils/themeUtils';

interface SettingsMenuProps {
  onOpenProfile: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenReports?: () => void;
  onOpenThemeSelector?: () => void;
  onOpenUsernameColorPicker?: () => void;
  onOpenIgnoredUsers?: () => void;
  onOpenStories?: () => void;
  onOpenRooms?: () => void;
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
  onOpenRooms,
  currentUser,
}: SettingsMenuProps) {
  const handleLogout = () => {
    if (confirm('🤔 هل أنت متأكد من تسجيل الخروج؟')) {
      onLogout();
    }
  };

  return (
    <Card className="fixed top-20 right-4 z-50 shadow-2xl animate-fade-in w-56 settings-menu-panel border-accent">
      <CardContent className="p-0">
        {/* شريط علوي مع زر إغلاق بنفس تصميم نافذة الأثرياء */}
        <div className="relative richest-header px-3 py-2 modern-nav border-b border-border">
          <button
            onClick={onClose}
            className="px-2 py-1 hover:bg-red-100 text-red-600 text-sm font-medium absolute left-2 top-1/2 -translate-y-1/2 rounded"
            aria-label="إغلاق"
            title="إغلاق"
          >
            ✖️
          </button>
        </div>
        {currentUser && (
          <div className="p-3 border-b border-border" style={getUserListItemStyles(currentUser)}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: getFinalUsernameColor(currentUser) }} />
              {(() => {
                const np = getUserNameplateStyles(currentUser);
                const hasNp = np && Object.keys(np).length > 0;
                const effectClasses = getUserListItemClasses(currentUser);
                const hasEffect = !!(effectClasses && effectClasses.length > 0);
                if (hasNp || hasEffect) {
                  return (
                    <span className={`ac-nameplate ${effectClasses}`} style={np}>
                      <span className="ac-name">{currentUser.username}</span>
                      <span className="ac-mark">〰</span>
                    </span>
                  );
                }
                const uds = getUsernameDisplayStyle(currentUser);
                return (
                  <span className={`font-semibold ${uds.className || ''}`} style={uds.style}>
                    {currentUser.username}
                  </span>
                );
              })()}
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
            onClick={onOpenRooms}
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

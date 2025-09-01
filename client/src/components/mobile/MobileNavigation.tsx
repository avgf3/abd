import React from 'react';
import { Home, Users, MessageSquare, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  unreadCount?: number;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeView,
  onViewChange,
  unreadCount = 0,
}) => {
  const navItems = [
    { id: 'chat', icon: Home, label: 'الدردشة' },
    { id: 'users', icon: Users, label: 'المستخدمين' },
    { id: 'messages', icon: MessageSquare, label: 'الرسائل', badge: unreadCount },
    { id: 'settings', icon: Settings, label: 'الإعدادات' },
    { id: 'menu', icon: Menu, label: 'القائمة' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ id, icon: Icon, label, badge }) => (
          <Button
            key={id}
            variant={activeView === id ? 'default' : 'ghost'}
            size="icon"
            className="flex-1 h-full rounded-none flex flex-col items-center justify-center gap-1 relative"
            onClick={() => onViewChange(id)}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
            {badge && badge > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-3 -translate-y-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Button>
        ))}
      </div>
    </nav>
  );
};
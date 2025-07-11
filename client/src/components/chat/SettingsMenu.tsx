import { Button } from '@/components/ui/button';

interface SettingsMenuProps {
  onOpenProfile: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenReports?: () => void;
  currentUser?: any;
}

export default function SettingsMenu({ onOpenProfile, onLogout, onClose, onOpenReports, currentUser }: SettingsMenuProps) {
  const handleLogout = () => {
    if (confirm('🤔 هل أنت متأكد من تسجيل الخروج؟')) {
      onLogout();
    }
  };

  return (
    <div className="fixed top-20 right-4 glass-effect rounded-2xl border border-accent z-50 shadow-2xl animate-fade-in min-w-[200px]">
      <Button
        onClick={onOpenProfile}
        variant="ghost"
        className="w-full px-6 py-4 border-b border-border text-right hover:bg-accent transition-all rounded-t-2xl flex items-center gap-3 justify-start"
      >
        <span className="text-primary">👤</span>
        الملف الشخصي
      </Button>
      
      <Button
        variant="ghost"
        className="w-full px-6 py-4 border-b border-border text-right hover:bg-accent transition-all flex items-center gap-3 justify-start"
      >
        <span className="text-primary">🏠</span>
        الغرف المتاحة
      </Button>
      
      <Button
        variant="ghost"
        className="w-full px-6 py-4 border-b border-border text-right hover:bg-accent transition-all flex items-center gap-3 justify-start"
      >
        <span className="text-primary">🌙</span>
        تبديل المظهر
      </Button>
      
      {/* زر إدارة التبليغات للمشرفين فقط */}
      {currentUser?.userType === 'owner' && onOpenReports && (
        <Button
          onClick={onOpenReports}
          variant="ghost"
          className="w-full px-6 py-4 border-b border-border text-right hover:bg-accent transition-all flex items-center gap-3 justify-start"
        >
          <span className="text-primary">🛡️</span>
          إدارة التبليغات
        </Button>
      )}
      
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="w-full px-6 py-4 text-right hover:bg-red-600 transition-all rounded-b-2xl flex items-center gap-3 text-red-400 hover:text-white justify-start"
      >
        <span>🚪</span>
        تسجيل الخروج
      </Button>
    </div>
  );
}

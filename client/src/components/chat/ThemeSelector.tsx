import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { settingsManager, THEMES } from '@/utils/settingsManager';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onThemeUpdate?: (theme: string) => void;
}

// استخدام الثيمات من النظام المركزي
const themes = Object.values(THEMES);

export default function ThemeSelector({
  isOpen,
  onClose,
  currentUser,
  onThemeUpdate,
}: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const selectingRef = useRef(false);

  // تحميل ثيم الموقع الحالي
  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest<{ siteTheme: string }>(`/api/settings/site-theme`);
        if (data?.siteTheme) {
          setSelectedTheme(data.siteTheme);
          settingsManager.applyTheme(data.siteTheme, false);
        } else {
          // تحميل الثيم المحفوظ محلياً
          const currentSettings = settingsManager.getSettings();
          setSelectedTheme(currentSettings.theme);
        }
      } catch (error) {
        // في حالة فشل تحميل الثيم من الخادم، استخدم الثيم المحفوظ محلياً
        const currentSettings = settingsManager.getSettings();
        setSelectedTheme(currentSettings.theme);
        console.warn('فشل في تحميل ثيم الموقع من الخادم:', error);
      }
    })();
  }, []);

  const handleThemeSelect = async (themeId: string) => {
    if (!currentUser || currentUser.userType !== 'owner') {
      toast({ title: 'غير مسموح', description: 'هذا الإعداد للمالك فقط', variant: 'destructive' });
      return;
    }

    setLoading(true);
    selectingRef.current = true;

    // تطبيق الثيم فوراً كتجربة مستخدم
    settingsManager.applyTheme(themeId, false);
    setSelectedTheme(themeId);

    try {
      const result = await apiRequest(`/api/settings/site-theme`, {
        method: 'PUT',
        body: { userId: currentUser.id, theme: themeId },
      });

      onThemeUpdate?.(themeId);

      toast({
        title: 'تم تحديث ثيم الموقع',
        description: `تم تطبيق ثيم ${themes.find((t) => t.id === themeId)?.name} على الجميع`,
      });

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث ثيم الموقع',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      selectingRef.current = false;
    }
  };

  const handleThemeHover = (themeId: string) => {
    if (loading) return;
    settingsManager.applyTheme(themeId, false);
  };

  const handleThemeLeave = () => {
    if (loading || selectingRef.current) return;
    settingsManager.applyTheme(selectedTheme, false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl bg-slate-900/95 backdrop-blur-lg border-slate-700/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold text-center flex items-center justify-center gap-2">
            <span>🎨</span>
            اختيار ثيم الموقع (المالك فقط)
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 hover:scale-105 ${
                selectedTheme === theme.id
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => !loading && handleThemeSelect(theme.id)}
              onMouseEnter={() => handleThemeHover(theme.id)}
              onMouseLeave={handleThemeLeave}
            >
              <div
                className="w-full h-16 rounded-lg mb-3 shadow-lg"
                style={{ background: theme.preview }}
              />
              <h3 className="text-white font-semibold text-center text-sm mb-1">{theme.name}</h3>
              <p className="text-slate-400 text-xs text-center">{theme.description}</p>
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
              )}
              {loading && selectedTheme === theme.id && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center p-4 gap-3">
          <Button
            onClick={() => settingsManager.applyTheme(selectedTheme, false)}
            variant="outline"
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            disabled={loading}
          >
            معاينة
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            disabled={loading}
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

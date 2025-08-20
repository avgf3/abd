import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { applyThemeById } from '@/utils/applyTheme';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onThemeUpdate?: (theme: string) => void;
}

const themes = [
  {
    id: 'default',
    name: 'الافتراضي',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'الثيم الافتراضي الأنيق',
    cssVars: {
      '--primary': '#667eea',
      '--primary-foreground': '#ffffff',
      '--background': '#ffffff',
      '--text': '#1a202c',
    },
  },
  {
    id: 'dark',
    name: 'الداكن',
    preview: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    description: 'ثيم داكن مريح للعيون',
    cssVars: {
      '--primary': '#2c3e50',
      '--primary-foreground': '#ffffff',
      '--background': '#1a202c',
      '--text': '#ffffff',
    },
  },
  {
    id: 'ocean',
    name: 'المحيط',
    preview: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    description: 'ثيم أزرق هادئ',
    cssVars: {
      '--primary': '#4facfe',
      '--primary-foreground': '#ffffff',
      '--background': '#f0f9ff',
      '--text': '#0c4a6e',
    },
  },
  {
    id: 'sunset',
    name: 'الغروب',
    preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'ثيم دافئ بألوان الغروب',
    cssVars: {
      '--primary': '#f093fb',
      '--primary-foreground': '#ffffff',
      '--background': '#fef7ff',
      '--text': '#831843',
    },
  },
  {
    id: 'forest',
    name: 'الغابة',
    preview: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'ثيم أخضر طبيعي',
    cssVars: {
      '--primary': '#11998e',
      '--primary-foreground': '#ffffff',
      '--background': '#f0fdf4',
      '--text': '#14532d',
    },
  },
  {
    id: 'royal',
    name: 'الملكي',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    description: 'ثيم أرجواني فاخر',
    cssVars: {
      '--primary': '#8b5cf6',
      '--primary-foreground': '#ffffff',
      '--background': '#faf5ff',
      '--text': '#581c87',
    },
  },
  {
    id: 'fire',
    name: 'النار',
    preview: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    description: 'ثيم ناري حماسي',
    cssVars: {
      '--primary': '#ff9a9e',
      '--primary-foreground': '#ffffff',
      '--background': '#fef2f2',
      '--text': '#991b1b',
    },
  },
  {
    id: 'ice',
    name: 'الثلج',
    preview: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    description: 'ثيم بارد منعش',
    cssVars: {
      '--primary': '#a8edea',
      '--primary-foreground': '#0f172a',
      '--background': '#f0fdfa',
      '--text': '#134e4a',
    },
  },
];

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
          applyThemeById(data.siteTheme, false);
        }
      } catch {}
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
    applyThemeById(themeId, false);
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
    applyThemeById(themeId, false);
  };

  const handleThemeLeave = () => {
    if (loading || selectingRef.current) return;
    applyThemeById(selectedTheme, false);
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
            onClick={() => applyThemeById(selectedTheme, false)}
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

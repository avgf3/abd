import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

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
      '--primary-dark': '#764ba2',
      '--background': '#ffffff',
      '--text': '#1a202c'
    }
  },
  {
    id: 'dark',
    name: 'الداكن',
    preview: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    description: 'ثيم داكن مريح للعيون',
    cssVars: {
      '--primary': '#2c3e50',
      '--primary-dark': '#34495e',
      '--background': '#1a202c',
      '--text': '#ffffff'
    }
  },
  {
    id: 'ocean',
    name: 'المحيط',
    preview: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    description: 'ثيم أزرق هادئ',
    cssVars: {
      '--primary': '#4facfe',
      '--primary-dark': '#00f2fe',
      '--background': '#f0f9ff',
      '--text': '#0c4a6e'
    }
  },
  {
    id: 'sunset',
    name: 'الغروب',
    preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'ثيم دافئ بألوان الغروب',
    cssVars: {
      '--primary': '#f093fb',
      '--primary-dark': '#f5576c',
      '--background': '#fef7ff',
      '--text': '#831843'
    }
  },
  {
    id: 'forest',
    name: 'الغابة',
    preview: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'ثيم أخضر طبيعي',
    cssVars: {
      '--primary': '#11998e',
      '--primary-dark': '#38ef7d',
      '--background': '#f0fdf4',
      '--text': '#14532d'
    }
  },
  {
    id: 'royal',
    name: 'الملكي',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    description: 'ثيم أرجواني فاخر',
    cssVars: {
      '--primary': '#8b5cf6',
      '--primary-dark': '#a855f7',
      '--background': '#faf5ff',
      '--text': '#581c87'
    }
  },
  {
    id: 'fire',
    name: 'النار',
    preview: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    description: 'ثيم ناري حماسي',
    cssVars: {
      '--primary': '#ff9a9e',
      '--primary-dark': '#fecfef',
      '--background': '#fef2f2',
      '--text': '#991b1b'
    }
  },
  {
    id: 'ice',
    name: 'الثلج',
    preview: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    description: 'ثيم بارد منعش',
    cssVars: {
      '--primary': '#a8edea',
      '--primary-dark': '#fed6e3',
      '--background': '#f0fdfa',
      '--text': '#134e4a'
    }
  }
];

export default function ThemeSelector({ isOpen, onClose, currentUser, onThemeUpdate }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentUser?.userTheme || 'default');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const selectingRef = useRef(false);

  // تطبيق CSS variables فوراً
  const applyThemeVariables = (themeId: string, persist: boolean = false) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // لا نقوم بالحفظ إلا عند التأكيد
    if (persist) {
      localStorage.setItem('selectedTheme', themeId);
    }
  };

  // تطبيق الثيم المحفوظ عند التحميل
  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || currentUser?.userTheme || 'default';
    setSelectedTheme(savedTheme);
    applyThemeVariables(savedTheme, false);
  }, [currentUser?.userTheme]);

  const handleThemeSelect = async (themeId: string) => {
    if (!currentUser) return;

    setLoading(true);
    selectingRef.current = true;
    
    // تطبيق الثيم فوراً للحصول على استجابة سريعة
    applyThemeVariables(themeId, true);
    setSelectedTheme(themeId);

    try {
      const result = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { userTheme: themeId }
      });

      if (onThemeUpdate) {
        onThemeUpdate(themeId);
      }

      toast({
        title: "تم تحديث الثيم",
        description: `تم تطبيق ثيم ${themes.find(t => t.id === themeId)?.name}`,
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      const previousTheme = currentUser.userTheme || 'default';
      applyThemeVariables(previousTheme, true);
      setSelectedTheme(previousTheme);
      
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الثيم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      selectingRef.current = false;
    }
  };

  // معاينة الثيم عند التمرير فوقه
  const handleThemeHover = (themeId: string) => {
    if (loading) return;
    applyThemeVariables(themeId, false);
  };

  // إعادة الثيم المحدد عند مغادرة المعاينة
  const handleThemeLeave = () => {
    if (loading || selectingRef.current) return;
    applyThemeVariables(selectedTheme, false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl bg-slate-900/95 backdrop-blur-lg border-slate-700/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold text-center flex items-center justify-center gap-2">
            <span>🎨</span>
            اختيار الثيم
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
              {/* معاينة الثيم */}
              <div
                className="w-full h-16 rounded-lg mb-3 shadow-lg"
                style={{ background: theme.preview }}
              />
              
              {/* اسم الثيم */}
              <h3 className="text-white font-semibold text-center text-sm mb-1">
                {theme.name}
              </h3>
              
              {/* وصف الثيم */}
              <p className="text-slate-400 text-xs text-center">
                {theme.description}
              </p>
              
              {/* مؤشر الاختيار */}
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
              )}
              
              {/* مؤشر التحميل */}
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
            onClick={() => applyThemeVariables(selectedTheme, false)}
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
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { getThemeData } from '@/utils/themeUtils';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  onThemeUpdate?: (theme: string) => void;
}

// قائمة الثيمات الكاملة (46 ثيم)
const themes = [
  { id: 'default', name: 'الافتراضي', category: 'كلاسيك' },
  { id: 'golden', name: 'الذهبي', category: 'كلاسيك' },
  { id: 'royal', name: 'الملكي', category: 'كلاسيك' },
  { id: 'ocean', name: 'المحيط', category: 'كلاسيك' },
  { id: 'sunset', name: 'الغروب', category: 'كلاسيك' },
  { id: 'forest', name: 'الغابة', category: 'كلاسيك' },
  { id: 'rose', name: 'الوردي', category: 'كلاسيك' },
  { id: 'emerald', name: 'الزمردي', category: 'كلاسيك' },
  { id: 'fire', name: 'النار', category: 'كلاسيك' },
  { id: 'galaxy', name: 'المجرة', category: 'كلاسيك' },
  { id: 'rainbow', name: 'قوس قزح', category: 'كلاسيك' },
  { id: 'aqua', name: 'الأكوا', category: 'مميز' },
  { id: 'crystal', name: 'الكريستال', category: 'مميز' },
  { id: 'amber', name: 'العنبر', category: 'مميز' },
  { id: 'coral', name: 'المرجاني', category: 'مميز' },
  { id: 'jade', name: 'اليشم', category: 'مميز' },
  { id: 'sapphire', name: 'الياقوت', category: 'مميز' },
  { id: 'bronze', name: 'البرونزي', category: 'مميز' },
  { id: 'silver', name: 'الفضي', category: 'مميز' },
  { id: 'platinum', name: 'البلاتيني', category: 'مميز' },
  { id: 'obsidian', name: 'السبج', category: 'مميز' },
  { id: 'mystical', name: 'الغامض', category: 'حديث' },
  { id: 'tropical', name: 'الاستوائي', category: 'حديث' },
  { id: 'aurora', name: 'الشفق', category: 'حديث' },
  { id: 'phoenix', name: 'العنقاء', category: 'حديث' },
  { id: 'burgundy', name: 'العنابي', category: 'داكن' },
  { id: 'midnight', name: 'منتصف الليل', category: 'داكن' },
  { id: 'arctic', name: 'القطبي', category: 'داكن' },
  { id: 'wine', name: 'النبيذي', category: 'داكن' },
  { id: 'steel', name: 'الفولاذي', category: 'داكن' },
  { id: 'navy', name: 'الكحلي', category: 'داكن' },
  { id: 'slate', name: 'الأردوازي', category: 'داكن' },
  { id: 'storm', name: 'العاصفة', category: 'داكن' },
  { id: 'crimson', name: 'القرمزي', category: 'داكن' },
  { id: 'royal_blue', name: 'الأزرق الملكي', category: 'داكن' },
  { id: 'black_gradient', name: 'التدرج الأسود', category: 'داكن' },
  { id: 'deep_black', name: 'الأسود العميق', category: 'داكن' },
  { id: 'charcoal', name: 'الفحمي', category: 'داكن' },
  { id: 'blush_pink', name: 'الوردي الخجول', category: 'ناعم' },
  { id: 'lavender', name: 'اللافندر', category: 'ناعم' },
  { id: 'powder_blue', name: 'الأزرق الباودر', category: 'ناعم' },
  { id: 'soft_mint', name: 'النعناع الناعم', category: 'ناعم' },
  { id: 'peach', name: 'الخوخي', category: 'ناعم' },
  { id: 'lilac', name: 'الليلكي', category: 'ناعم' },
  { id: 'ivory', name: 'العاجي', category: 'ناعم' }
];

// تجميع الثيمات حسب الفئة
const groupedThemes = themes.reduce((acc, theme) => {
  if (!acc[theme.category]) {
    acc[theme.category] = [];
  }
  acc[theme.category].push(theme);
  return acc;
}, {} as Record<string, typeof themes>);

export default function ThemeSelector({ isOpen, onClose, currentUser, onThemeUpdate }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentUser?.userTheme || 'default');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // تطبيق CSS variables فوراً
  const applyThemeVariables = (themeId: string) => {
    // نحصل على بيانات الثيم من themeUtils
    const themeData = getThemeData(themeId);
    
    // حفظ الثيم في localStorage للبقاء بين الجلسات
    localStorage.setItem('selectedTheme', themeId);
  };

  // تطبيق الثيم المحفوظ عند التحميل
  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || currentUser?.userTheme || 'default';
    setSelectedTheme(savedTheme);
    applyThemeVariables(savedTheme);
  }, [currentUser?.userTheme]);

  const handleThemeSelect = async (themeId: string) => {
    if (!currentUser) return;

    setLoading(true);
    
    // تطبيق الثيم فوراً للحصول على استجابة سريعة
    applyThemeVariables(themeId);
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
        description: `تم تطبيق ثيم ${themes.find(t => t.id === themeId)?.name || themeId}`,
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      const previousTheme = currentUser.userTheme || 'default';
      applyThemeVariables(previousTheme);
      setSelectedTheme(previousTheme);
      
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الثيم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // معاينة الثيم عند التمرير فوقه
  const handleThemeHover = (themeId: string) => {
    if (loading) return;
    applyThemeVariables(themeId);
  };

  // إعادة الثيم المحدد عند مغادرة المعاينة
  const handleThemeLeave = () => {
    if (loading) return;
    applyThemeVariables(selectedTheme);
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
        
        <div className="space-y-6 p-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedThemes).map(([category, categoryThemes]) => (
            <div key={category}>
              <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                {category === 'كلاسيك' && '🎨'}
                {category === 'مميز' && '⭐'}
                {category === 'حديث' && '✨'}
                {category === 'داكن' && '🌙'}
                {category === 'ناعم' && '🌸'}
                ثيمات {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categoryThemes.map((theme) => {
                  const themeData = getThemeData(theme.id);
                  return (
                    <div
                      key={theme.id}
                      className={`relative cursor-pointer rounded-xl p-3 border-2 transition-all duration-300 hover:scale-105 ${
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
                        className="w-full h-12 rounded-lg mb-2 shadow-lg"
                        style={{ background: themeData.gradient }}
                      />
                      
                      {/* اسم الثيم */}
                      <h4 className="text-white font-semibold text-center text-xs">
                        {theme.name}
                      </h4>
                      
                      {/* مؤشر الاختيار */}
                      {selectedTheme === theme.id && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                      
                      {/* مؤشر التحميل */}
                      {loading && selectedTheme === theme.id && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center p-4 gap-3">
          <Button
            onClick={() => applyThemeVariables(selectedTheme)}
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
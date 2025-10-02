import { Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'default' ? 'arabic-chat' : 'default')}
      className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent/50 rounded-lg transition-colors text-foreground"
    >
      <Palette className="w-4 h-4 text-primary" />
      <span>الثيم: {theme === 'arabic-chat' ? 'أرابيك شات' : 'الافتراضي'}</span>
    </button>
  );
}

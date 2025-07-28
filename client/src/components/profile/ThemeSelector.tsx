import React from 'react';
import { Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  isLoading: boolean;
}

const THEMES = [
  { value: 'theme-sunset-glow', name: 'توهج الغروب', emoji: '🌅' },
  { value: 'theme-ocean-depths', name: 'أعماق المحيط', emoji: '🌊' },
  { value: 'theme-aurora-borealis', name: 'الشفق القطبي', emoji: '✨' },
  { value: 'theme-cosmic-night', name: 'الليل الكوني', emoji: '🌌' },
  { value: 'theme-emerald-forest', name: 'الغابة الزمردية', emoji: '🌿' },
  { value: 'theme-rose-gold', name: 'الوردي الذهبي', emoji: '🌸' },
  { value: 'theme-midnight-purple', name: 'البنفسجي الليلي', emoji: '🔮' },
  { value: 'theme-golden-hour', name: 'الساعة الذهبية', emoji: '🌟' },
  { value: 'theme-neon-dreams', name: 'أحلام النيون', emoji: '💫' },
  { value: 'theme-new-gradient', name: 'التدرج الجديد', emoji: '🎨' }
];

export function ThemeSelector({ currentTheme, onThemeChange, isLoading }: ThemeSelectorProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette size={16} className="text-blue-400" />
          اختيار الثيم
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {THEMES.map((theme) => (
            <Button
              key={theme.value}
              onClick={() => onThemeChange(theme.value)}
              disabled={isLoading}
              variant={currentTheme === theme.value ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              <span>{theme.emoji}</span>
              <span className="truncate">{theme.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
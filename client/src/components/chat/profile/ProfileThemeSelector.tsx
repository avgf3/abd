import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProfileThemeSelectorProps {
  selectedTheme: string;
  selectedEffect: string;
  onThemeChange: (color: string, effect: string) => void;
  disabled?: boolean;
}

const themes = [
  { name: 'افتراضي', color: '' },
  { name: 'أزرق', color: '#3b82f6' },
  { name: 'أخضر', color: '#10b981' },
  { name: 'بنفسجي', color: '#8b5cf6' },
  { name: 'وردي', color: '#ec4899' },
  { name: 'برتقالي', color: '#f97316' },
  { name: 'أحمر', color: '#ef4444' },
];

const effects = [
  { name: 'بدون تأثير', value: 'none' },
  { name: 'توهج', value: 'glow' },
  { name: 'نبض', value: 'pulse' },
  { name: 'قوس قزح', value: 'rainbow' },
];

export function ProfileThemeSelector({
  selectedTheme,
  selectedEffect,
  onThemeChange,
  disabled,
}: ProfileThemeSelectorProps) {
  return (
    <div className="px-6 pb-6 space-y-4 border-t">
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          تخصيص المظهر
        </h4>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-2">لون الخلفية</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme) => (
                <Button
                  key={theme.name}
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onThemeChange(theme.color, selectedEffect)}
                  className={cn(
                    'relative',
                    selectedTheme === theme.color && 'ring-2 ring-primary'
                  )}
                >
                  {theme.color && (
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: theme.color }}
                    />
                  )}
                  {theme.name}
                  {selectedTheme === theme.color && (
                    <Check className="h-3 w-3 absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">تأثير الاسم</p>
            <div className="flex flex-wrap gap-2">
              {effects.map((effect) => (
                <Button
                  key={effect.value}
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onThemeChange(selectedTheme, effect.value)}
                  className={cn(
                    'relative',
                    selectedEffect === effect.value && 'ring-2 ring-primary'
                  )}
                >
                  {effect.name}
                  {selectedEffect === effect.value && (
                    <Check className="h-3 w-3 absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
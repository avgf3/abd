import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EffectSelectorProps {
  currentEffect: string;
  onEffectChange: (effect: string) => void;
  isLoading: boolean;
}

const EFFECTS = [
  { value: 'none', name: 'بدون تأثيرات', emoji: '🚫' },
  { value: 'effect-pulse', name: 'النبض الناعم', emoji: '💓' },
  { value: 'effect-glow', name: 'التوهج الذهبي', emoji: '✨' },
  { value: 'effect-water', name: 'التموج المائي', emoji: '🌊' },
  { value: 'effect-aurora', name: 'الشفق القطبي', emoji: '🌌' },
  { value: 'effect-neon', name: 'النيون المتوهج', emoji: '💖' },
  { value: 'effect-crystal', name: 'البلور المتلألئ', emoji: '💎' },
  { value: 'effect-fire', name: 'النار المتوهجة', emoji: '🔥' },
  { value: 'effect-stars', name: 'النجوم المتلألئة', emoji: '⭐' },
  { value: 'effect-rainbow', name: 'قوس قزح', emoji: '🌈' }
];

export function EffectSelector({ currentEffect, onEffectChange, isLoading }: EffectSelectorProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          التأثيرات الحركية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {EFFECTS.map((effect) => (
            <Button
              key={effect.value}
              onClick={() => onEffectChange(effect.value)}
              disabled={isLoading}
              variant={currentEffect === effect.value ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              <span>{effect.emoji}</span>
              <span className="truncate">{effect.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { TypingIndicator } from '@/types/private-messages';

interface TypingIndicatorDisplayProps {
  indicators: TypingIndicator[];
}

export function TypingIndicatorDisplay({ indicators }: TypingIndicatorDisplayProps) {
  if (!indicators || indicators.length === 0) return null;

  const names = indicators.map((i) => i.user.username).join('، ');
  return (
    <div className="text-xs text-gray-500 animate-pulse">
      {names} يكتب...
    </div>
  );
}
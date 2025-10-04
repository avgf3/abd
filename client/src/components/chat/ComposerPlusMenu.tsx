import React from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ComposerPlusMenuProps {
  onOpenImagePicker?: () => void; // intentionally unused after simplification
  disabled?: boolean;
  isMobile?: boolean;
  currentUser?: any; // intentionally unused
}

export default function ComposerPlusMenu({ disabled, isMobile }: ComposerPlusMenuProps) {
  // تبويب الزائد مبسّط: أيقونة + فقط بدون قائمة
  return (
    <Button
      type="button"
      size={isMobile ? 'icon' : 'icon'}
      disabled={disabled}
      className={`chat-plus-button mobile-touch-button ${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-lg px-0 bg-primary text-primary-foreground hover:bg-primary/90 border-0`}
      title="إضافة"
      aria-label="إضافة"
    >
      <Plus className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} strokeWidth={2.25} />
    </Button>
  );
}
import React from 'react';
import { Plus, Image, Bold, Palette } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useComposerStyle } from '@/contexts/ComposerStyleContext';

interface ComposerPlusMenuProps {
  onOpenImagePicker?: () => void;
  disabled?: boolean;
  isMobile?: boolean;
  currentUser?: any; // إضافة المستخدم الحالي للتحقق من الصلاحيات
}

export default function ComposerPlusMenu({ onOpenImagePicker, disabled, isMobile, currentUser }: ComposerPlusMenuProps) {
  const { toggleBold, setTextColor, palette, bold } = useComposerStyle();

  // التحقق من الصلاحيات
  const isAuthorized = currentUser && (
    currentUser.userType === 'owner' || 
    currentUser.userType === 'admin' || 
    currentUser.userType === 'moderator'
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="default"
          size={isMobile ? 'icon' : 'icon'}
          disabled={disabled}
          className={`chat-plus-button mobile-touch-button ${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-full px-0 bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:outline-none`}
          title="خيارات"
          aria-label="زر الخيارات"
        >
          <Plus className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} strokeWidth={2.25} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem] bg-popover text-popover-foreground border border-border">
        <DropdownMenuLabel>خيارات إضافية</DropdownMenuLabel>
        {isAuthorized && (
          <DropdownMenuItem onClick={() => onOpenImagePicker && onOpenImagePicker()}>
            <Image className="w-4 h-4 ml-2" />
            إرسال صورة
          </DropdownMenuItem>
        )}
        {!isAuthorized && (
          <DropdownMenuItem disabled className="opacity-50">
            <Image className="w-4 h-4 ml-2" />
            إرسال صورة (للمشرفين فقط)
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleBold}>
          <Bold className="w-4 h-4 ml-2" />
          نص غامق {bold ? '✔️' : ''}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="w-4 h-4 ml-2" />
            لون النص
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-2">
            <div className="grid grid-cols-6 gap-2">
              {palette.map((color) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
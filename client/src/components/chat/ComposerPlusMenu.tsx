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
          variant="outline"
          size={isMobile ? 'lg' : 'lg'}
          disabled={disabled}
          className={`mobile-touch-button rounded-full ${isMobile ? 'min-w-[48px] min-h-[48px]' : 'min-w-[44px] min-h-[44px]'} px-0 bg-white text-primary border-primary/30 hover:bg-primary/5 shadow-sm`}
          title="خيارات"
          aria-label="زر الخيارات"
        >
          <Plus className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} strokeWidth={2.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
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
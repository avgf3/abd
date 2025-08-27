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
}

export default function ComposerPlusMenu({ onOpenImagePicker, disabled }: ComposerPlusMenuProps) {
  const { toggleBold, setTextColor, palette, bold } = useComposerStyle();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={`aspect-square mobile-touch-button`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel>خيارات إضافية</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onOpenImagePicker && onOpenImagePicker()}>
          <Image className="w-4 h-4 ml-2" />
          إرسال صورة
        </DropdownMenuItem>
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
                  className="w-5 h-5 rounded"
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


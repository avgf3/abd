import { Plus, Image as ImageIcon, Palette, Bold } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useComposerStyle } from '@/contexts/ComposerStyleContext';

interface ComposerPlusMenuProps {
  openImagePicker: () => void;
  disabled?: boolean;
}

export default function ComposerPlusMenu({ openImagePicker, disabled = false }: ComposerPlusMenuProps) {
  const { textColor, bold, palette, setTextColor, toggleBold } = useComposerStyle();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="aspect-square mobile-touch-button"
          title="خيارات إضافية"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 bg-white border border-gray-200 shadow-lg">
        <div className="space-y-3">
          <button
            type="button"
            onClick={openImagePicker}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-gray-700"
          >
            <ImageIcon className="w-4 h-4" />
            <span>إرسال صورة</span>
          </button>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Palette className="w-4 h-4" />
              <span>لون الخط</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {palette.map((color) => {
                const isActive = color.toLowerCase() === textColor.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTextColor(color)}
                    className={`h-6 w-6 rounded ${isActive ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleBold}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 text-gray-700"
          >
            <span className="flex items-center gap-2">
              <Bold className="w-4 h-4" />
              <span>تعريض الخط (خفيف)</span>
            </span>
            <span className={`text-xs ${bold ? 'text-green-600' : 'text-gray-400'}`}>{bold ? 'مفعل' : 'غير مفعل'}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
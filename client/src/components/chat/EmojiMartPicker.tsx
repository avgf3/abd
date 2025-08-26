import { useEffect, useRef } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface EmojiMartPickerProps {
  onEmojiSelect: (emoji: any) => void;
  onClose: () => void;
}

export default function EmojiMartPicker({ onEmojiSelect, onClose }: EmojiMartPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // إغلاق المنتقي عند النقر خارجه
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiSelect = (emoji: any) => {
    // إرسال معلومات الإيموجي
    onEmojiSelect({
      id: emoji.id,
      native: emoji.native,
      name: emoji.name,
      colons: emoji.colons,
      skin: emoji.skin,
      unified: emoji.unified,
      shortcodes: emoji.shortcodes
    });
    onClose();
  };

  return (
    <div 
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg overflow-hidden"
      style={{ maxHeight: '400px' }}
    >
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center p-2 border-b">
          <h3 className="text-sm font-medium text-gray-700">اختر إيموجي</h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          locale="ar"
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          searchPosition="top"
          navPosition="bottom"
          perLine={8}
          emojiSize={24}
          emojiButtonSize={32}
          maxFrequentRows={2}
          noCountryFlags={false}
          set="native" // استخدام الإيموجي الأصلية للنظام
          icons="auto"
          custom={[
            {
              id: 'animated-pack-1',
              name: 'سمايلات متحركة كلاسيكية',
              emojis: [
                {
                  id: 'smile-gif',
                  name: 'ابتسامة متحركة',
                  keywords: ['smile', 'happy'],
                  skins: [{ 
                    src: 'https://media.giphy.com/media/3ohzdLQUbKEu47o9Ww/giphy.gif'
                  }]
                },
                {
                  id: 'laugh-gif',
                  name: 'ضحك متحرك',
                  keywords: ['laugh', 'lol'],
                  skins: [{ 
                    src: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif'
                  }]
                },
                {
                  id: 'wink-gif',
                  name: 'غمزة متحركة',
                  keywords: ['wink'],
                  skins: [{ 
                    src: 'https://media.giphy.com/media/3ohzdKQKZU3dXXFu8M/giphy.gif'
                  }]
                },
                {
                  id: 'heart-gif',
                  name: 'قلب متحرك',
                  keywords: ['love', 'heart'],
                  skins: [{ 
                    src: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif'
                  }]
                },
                {
                  id: 'cry-gif',
                  name: 'بكاء متحرك',
                  keywords: ['cry', 'sad'],
                  skins: [{ 
                    src: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif'
                  }]
                }
              ]
            }
          ]}
        />
      </div>
    </div>
  );
}
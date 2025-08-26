import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import animatedEmojis from '@/data/animatedEmojis.json';

interface AnimatedEmojiPickerProps {
  onEmojiSelect: (emoji: { id: string; url: string; name: string; code: string }) => void;
  onClose: () => void;
}

export default function AnimatedEmojiPicker({ onEmojiSelect, onClose }: AnimatedEmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('classic');

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-96 max-h-80 overflow-hidden z-50 animated-emoji-picker">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">اختر سمايل متحرك</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700 p-1"
        >
          ✕
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {Object.entries(animatedEmojis.categories).map(([key, category]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              <span className="ml-1">{category.icon}</span>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(animatedEmojis.categories).map(([key, category]) => (
          <TabsContent key={key} value={key} className="mt-3">
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {category.emojis.map((emoji) => (
                <Button
                  key={emoji.id}
                  onClick={() => onEmojiSelect(emoji)}
                  variant="ghost"
                  className="p-2 h-auto aspect-square hover:bg-gray-100 rounded-lg transition-colors"
                  title={`${emoji.name} ${emoji.code}`}
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                  />
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-3 text-xs text-gray-500 text-center">
        💡 نصيحة: يمكنك أيضاً كتابة الكود مباشرة مثل :) أو :D
      </div>
    </div>
  );
}
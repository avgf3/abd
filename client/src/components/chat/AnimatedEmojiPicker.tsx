import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import animatedEmojis from '@/data/animatedEmojis.json';

type AnimatedEmoji = { id: string; url: string; name: string; code: string };

interface AnimatedEmojiPickerProps {
  onEmojiSelect: (emoji: { id: string; url: string; name: string; code: string }) => void;
  onClose: () => void;
}

export default function AnimatedEmojiPicker({ onEmojiSelect, onClose }: AnimatedEmojiPickerProps) {
  // خمس صفحات صغيرة كما هو مطلوب
  const TOTAL_PAGES = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const allEmojis: AnimatedEmoji[] = useMemo(() => {
    const list: AnimatedEmoji[] = [];
    Object.values((animatedEmojis as any).categories || {}).forEach((category: any) => {
      (category.emojis || []).forEach((e: any) => {
        list.push({ id: e.id, url: e.url, name: e.name, code: e.code });
      });
    });
    return list;
  }, []);

  const pageSize = useMemo(() => {
    if (allEmojis.length === 0) return 1;
    return Math.ceil(allEmojis.length / TOTAL_PAGES);
  }, [allEmojis.length]);

  const getPageSlice = useMemo(() => {
    return (page: number) => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return allEmojis.slice(start, end);
    };
  }, [allEmojis, pageSize]);

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-96 max-h-80 overflow-hidden z-50">
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

      {/* خمس صفحات رقمية تعرض كل السمايلات المحلية */}
      <Tabs value={String(currentPage)} onValueChange={(v) => setCurrentPage(parseInt(v || '1', 10) || 1)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {Array.from({ length: TOTAL_PAGES }, (_, i) => String(i + 1)).map((num) => (
            <TabsTrigger key={num} value={num} className="text-xs">
              صفحة {num}
            </TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((page) => (
          <TabsContent key={page} value={String(page)} className="mt-3">
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {getPageSlice(page).map((emoji) => (
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
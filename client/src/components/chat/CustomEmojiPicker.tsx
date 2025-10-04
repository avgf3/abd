import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EmojiItem = { id: string; name: string; url: string; ext: string };

interface CustomEmojiPickerProps {
  onEmojiSelect: (emoji: { id: string; name: string; url: string; category: 'small' | 'medium' | 'animated' }) => void;
  onClose: () => void;
}

export default function CustomEmojiPicker({ onEmojiSelect, onClose }: CustomEmojiPickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<'animated' | 'small' | 'medium'>('animated');
  const [data, setData] = useState<{
    animated: EmojiItem[];
    small: EmojiItem[];
    medium: EmojiItem[];
  }>({ animated: [], small: [], medium: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/emojis', { credentials: 'include', cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) {
          const emojis = (json?.emojis || {}) as any;
          setData({
            animated: Array.isArray(emojis.animated) ? emojis.animated : [],
            small: Array.isArray(emojis.small) ? emojis.small : [],
            medium: Array.isArray(emojis.medium) ? emojis.medium : [],
          });
        }
      } catch (e: any) {
        if (!cancelled) setError('تعذر جلب قائمة السمايلات');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories: Array<{ key: 'animated' | 'small' | 'medium'; name: string; icon: string }> = [
    { key: 'animated', name: 'متحركة (GIF)', icon: '🎞️' },
    { key: 'small', name: 'صغيرة', icon: '🙂' },
    { key: 'medium', name: 'كبيرة قليلاً', icon: '😄' },
  ];

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[360px] max-h-[380px] overflow-hidden z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">سمايلات الموقع</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="p-1 text-gray-500 hover:text-gray-700">✕</Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">...جاري التحميل</div>
      ) : error ? (
        <div className="py-6 text-center text-sm text-red-600">{error}</div>
      ) : (
        <Tabs value={selected} onValueChange={(v) => setSelected(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {categories.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="text-xs">
                <span className="ml-1">{c.icon}</span>
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((c) => (
            <TabsContent key={c.key} value={c.key} className="mt-2">
              <div className="grid grid-cols-7 gap-2 max-h-56 overflow-y-auto">
                {(data as any)[c.key].length === 0 ? (
                  <div className="col-span-7 text-center text-xs text-gray-500 py-6">لا توجد صور في هذا القسم</div>
                ) : (
                  (data as any)[c.key].map((e: EmojiItem) => (
                    <Button
                      key={`${c.key}-${e.id}`}
                      onClick={() => onEmojiSelect({ id: e.id, name: e.name, url: e.url, category: c.key })}
                      variant="ghost"
                      className="p-1 h-auto aspect-square hover:bg-gray-100 rounded"
                      title={e.name}
                    >
                      <img
                        src={e.url}
                        alt={e.name}
                        className={`object-contain ${c.key === 'small' ? 'w-6 h-6' : c.key === 'medium' ? 'w-8 h-8' : 'w-8 h-8'}`}
                        loading="lazy"
                      />
                    </Button>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="mt-2 text-[11px] text-gray-500 text-center">الصور تُعرض مباشرة داخل الرسالة</div>
    </div>
  );
}

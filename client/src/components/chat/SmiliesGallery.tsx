import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import animatedEmojis from '@/data/animatedEmojis.json';

interface SmiliesGalleryProps {
  className?: string;
}

// تبويب/صفحة "السمايلات" لعرض جميع حِزم GIF (كلاسيكي/حديث/مخصص)
export default function SmiliesGallery({ className = '' }: SmiliesGalleryProps) {
  const categories = useMemo(() => Object.entries((animatedEmojis as any).categories || {}), []);

  const insertEmoji = (id: string, url: string) => {
    const code = ` [[emoji:${id}:${url}]] `;
    try {
      const ev = new CustomEvent('insertEmojiCode', { detail: { code } });
      window.dispatchEvent(ev);
    } catch {
      // fallback
      (window as any).dispatchEvent?.({ type: 'insertEmojiCode', detail: { code } });
    }
  };

  return (
    <div className={`w-full h-full overflow-hidden flex flex-col ${className}`}>
      <div className="p-2 border-b border-border bg-background flex items-center justify-between">
        <div className="font-semibold">السمايلات</div>
        <div className="text-xs text-muted-foreground">انقر لإدراج السمايل في الكتابة</div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue={(categories[0] && categories[0][0]) || 'classic'} className="w-full h-full flex flex-col">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 m-2">
            {categories.map(([key, cat]: any) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                <span className="ml-1">{cat.icon}</span>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-auto px-2 pb-3">
            {categories.map(([key, cat]: any) => (
              <TabsContent key={key} value={key} className="mt-0">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2">
                  {Array.isArray(cat.emojis) && cat.emojis.map((e: any) => (
                    <Card key={e.id} className="p-2 flex items-center justify-center hover:shadow cursor-pointer" onClick={() => insertEmoji(e.id, e.url)}>
                      {e.url?.toLowerCase()?.endsWith('.json') ? (
                        <span className="text-xs">Lottie</span>
                      ) : (
                        <img
                          src={e.url}
                          alt={e.name || e.id}
                          className="w-10 h-10 object-contain"
                          loading="lazy"
                        />
                      )}
                    </Card>
                  ))}
                </div>
                {(!cat.emojis || cat.emojis.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-8">لا توجد سمايلات هنا بعد</div>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
        يمكنك أيضاً كتابة الأكواد مثل :D أو :party:
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import localEmoticons from '@/data/localEmoticons.json';

interface UnifiedEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onGifEmojiSelect: (emoji: { id: string; url: string; name: string; code: string }) => void;
  onClose: () => void;
}

export default function UnifiedEmojiPicker({ onEmojiSelect, onGifEmojiSelect, onClose }: UnifiedEmojiPickerProps) {
  const [tab, setTab] = useState<'page1' | 'page2' | 'animated'>('page1');

  const pages = (localEmoticons as any).pages as { page1: string[]; page2: string[] };
  const basePathPage1 = (localEmoticons as any).basePathPage1 as string;
  const basePathPage2 = (localEmoticons as any).basePathPage2 as string;
  const ext = (localEmoticons as any).ext as string;

  const page1Items = useMemo(() => pages.page1 || [], [pages]);
  const page2Items = useMemo(() => pages.page2 || [], [pages]);

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[420px] max-h-[420px] overflow-hidden z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">السمايلات</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="p-1">✕</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="page1">الصفحة 1</TabsTrigger>
          <TabsTrigger value="page2">الصفحة 2</TabsTrigger>
          <TabsTrigger value="animated">متحرك</TabsTrigger>
        </TabsList>

        <TabsContent value="page1" className="mt-2">
          <div className="grid grid-cols-8 gap-2 max-h-[320px] overflow-y-auto">
            {page1Items.map((name) => (
              <Button
                key={name}
                variant="ghost"
                className="p-2 h-auto aspect-square hover:bg-gray-100"
                onClick={() => onEmojiSelect(`:${name}:`)}
                title={name}
              >
                <img
                  src={`${basePathPage1}${name}${ext}`}
                  alt={name}
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                />
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="page2" className="mt-2">
          <div className="grid grid-cols-8 gap-2 max-h-[320px] overflow-y-auto">
            {page2Items.map((name) => (
              <Button
                key={name}
                variant="ghost"
                className="p-2 h-auto aspect-square hover:bg-gray-100"
                onClick={() => onEmojiSelect(`:${name}:`)}
                title={name}
              >
                <img
                  src={`${basePathPage2}${name}${ext}`}
                  alt={name}
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                />
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="animated" className="mt-2">
          <div className="grid grid-cols-6 gap-2 max-h-[320px] overflow-y-auto">
            {/* إعادة استخدام GIF المحلية من emojis classic/modern */}
            {[
              '/assets/emojis/classic/smile.gif','/assets/emojis/classic/laugh.gif','/assets/emojis/classic/wink.gif','/assets/emojis/classic/heart.gif','/assets/emojis/modern/party.gif','/assets/emojis/modern/fire.gif','/assets/emojis/modern/thumbsup.gif','/assets/emojis/modern/clap.gif','/assets/emojis/modern/love.gif','/assets/emojis/modern/rofl.gif','/assets/emojis/modern/think.gif','/assets/emojis/modern/wave.gif','/assets/emojis/modern/dance.gif','/assets/emojis/modern/rainbow.gif','/assets/emojis/modern/star.gif','/assets/emojis/modern/rocket.gif'
            ].map((url) => {
              const id = url.split('/').pop()!.replace(/\.(gif|png|jpg)$/i, '');
              return (
                <Button
                  key={url}
                  variant="ghost"
                  className="p-2 h-auto aspect-square hover:bg-gray-100"
                  onClick={() => onGifEmojiSelect({ id, url, name: id, code: `:${id}:` })}
                  title={id}
                >
                  <img src={url} alt={id} className="w-10 h-10 object-contain" loading="lazy" />
                </Button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

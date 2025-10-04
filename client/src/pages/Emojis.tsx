import { useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import animatedEmojis from '@/data/animatedEmojis.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function EmojisPage() {
  const [matchTab, paramsTab] = useRoute('/emojis/:tab');
  const [, setLocation] = useLocation();

  const selected = useMemo(() => {
    if (matchTab && paramsTab?.tab) return paramsTab.tab;
    return 'classic';
  }, [matchTab, paramsTab]);

  const handleTabChange = (value: string) => {
    setLocation(`/emojis/${value}`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">السمايلات</h1>
      <Tabs value={selected} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-1">
          {Object.entries(animatedEmojis.categories).map(([key, category]) => (
            <TabsTrigger key={key} value={key} className="text-xs px-2">
              <span className="ml-1">{category.icon}</span>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(animatedEmojis.categories).map(([key, category]) => (
          <TabsContent key={key} value={key} className="mt-3">
            <div className="grid grid-cols-8 gap-3">
              {category.emojis.map((emoji) => (
                <div key={emoji.id} className="flex flex-col items-center text-center">
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="w-12 h-12 object-contain"
                    loading="lazy"
                  />
                  <div className="text-xs text-gray-600 mt-1">{emoji.name}</div>
                  <div className="text-[10px] text-gray-500">{emoji.code}</div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-1 h-7 px-2 text-xs"
                    onClick={() => navigator.clipboard.writeText(emoji.code)}
                  >
                    نسخ الكود
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { ArabicChatEmojiItem } from '@/data/arabicChatEmojis';
import arabicChatEmojis from '@/data/arabicChatEmojis';

interface ArabicChatEmojiPickerProps {
  onSelect: (emoji: { id: string; url: string; code: string; name?: string }) => void;
  onClose: () => void;
}

function EmojiGrid({ items, onPick }: { items: ArabicChatEmojiItem[]; onPick: (e: ArabicChatEmojiItem) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1 max-h-60 overflow-y-auto">
      {items.map((e) => (
        <Button
          key={e.id}
          onClick={() => onPick(e)}
          variant="ghost"
          className="p-1 h-auto aspect-square hover:bg-gray-100"
          title={e.name || e.code}
        >
          <img src={e.url} alt={e.name || e.id} className="w-6 h-6 object-contain" loading="lazy" />
        </Button>
      ))}
    </div>
  );
}

export default function ArabicChatEmojiPicker({ onSelect, onClose }: ArabicChatEmojiPickerProps) {
  const tabs = useMemo(() => (
    [
      { key: 'base', name: 'أساسية', icon: '🙂', items: arabicChatEmojis.base },
      { key: 'food', name: 'أطعمة', icon: '🍔', items: arabicChatEmojis.food },
      { key: 'stickers', name: 'ملصقات', icon: '🐾', items: arabicChatEmojis.stickers },
    ] as const
  ), []);

  const [active, setActive] = React.useState<typeof tabs[number]['key']>('base');

  const onPick = (e: ArabicChatEmojiItem) => {
    onSelect({ id: e.id, url: e.url, code: e.code, name: e.name });
    onClose();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-96">
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="text-sm font-medium text-gray-700">سمايلات arabic.chat</h3>
        <Button onClick={onClose} variant="ghost" size="sm" className="p-1 hover:bg-gray-100">✕</Button>
      </div>

      <div className="px-2 pt-2">
        <div className="flex items-center gap-2 mb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-2 py-1 rounded text-xs border ${active === t.key ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-accent/50'}`}
              title={t.name}
            >
              <span className="ml-1">{t.icon}</span>{t.name}
            </button>
          ))}
        </div>
        {tabs.map((t) => (
          <div key={t.key} className={active === t.key ? 'block' : 'hidden'}>
            <EmojiGrid items={t.items} onPick={onPick} />
          </div>
        ))}
      </div>
    </div>
  );
}

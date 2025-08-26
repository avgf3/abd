import { useState } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

interface LottieEmoji {
  id: string;
  name: string;
  url: string;
  category: string;
}

// مجموعة من ملفات Lottie المجانية للسمايلات المتحركة
const lottieEmojis: LottieEmoji[] = [
  // سمايلات الوجه
  {
    id: 'happy-face',
    name: 'وجه سعيد',
    url: 'https://assets10.lottiefiles.com/packages/lf20_a3ntzciy.json',
    category: 'faces'
  },
  {
    id: 'laughing',
    name: 'ضحك',
    url: 'https://assets2.lottiefiles.com/packages/lf20_tp7x3pwa.json',
    category: 'faces'
  },
  {
    id: 'love-eyes',
    name: 'عيون حب',
    url: 'https://assets10.lottiefiles.com/packages/lf20_4dzaex6n.json',
    category: 'faces'
  },
  {
    id: 'winking',
    name: 'غمزة',
    url: 'https://assets3.lottiefiles.com/packages/lf20_slg1lmzs.json',
    category: 'faces'
  },
  {
    id: 'cool',
    name: 'رائع',
    url: 'https://assets9.lottiefiles.com/packages/lf20_kdx6cani.json',
    category: 'faces'
  },
  // قلوب ومشاعر
  {
    id: 'heart-bounce',
    name: 'قلب نابض',
    url: 'https://assets4.lottiefiles.com/packages/lf20_afqxjcjl.json',
    category: 'hearts'
  },
  {
    id: 'hearts-burst',
    name: 'انفجار قلوب',
    url: 'https://assets1.lottiefiles.com/packages/lf20_hggujjqr.json',
    category: 'hearts'
  },
  {
    id: 'heart-like',
    name: 'قلب إعجاب',
    url: 'https://assets5.lottiefiles.com/packages/lf20_gye0p5ax.json',
    category: 'hearts'
  },
  // احتفالات
  {
    id: 'party-popper',
    name: 'احتفال',
    url: 'https://assets7.lottiefiles.com/packages/lf20_rovf9gzu.json',
    category: 'celebration'
  },
  {
    id: 'confetti',
    name: 'قصاصات ملونة',
    url: 'https://assets8.lottiefiles.com/packages/lf20_obhph3sh.json',
    category: 'celebration'
  },
  {
    id: 'fireworks',
    name: 'ألعاب نارية',
    url: 'https://assets5.lottiefiles.com/packages/lf20_8xr66xpt.json',
    category: 'celebration'
  },
  // رموز تعبيرية أخرى
  {
    id: 'thumbs-up',
    name: 'إعجاب',
    url: 'https://assets9.lottiefiles.com/packages/lf20_jjyyer1j.json',
    category: 'gestures'
  },
  {
    id: 'clapping',
    name: 'تصفيق',
    url: 'https://assets3.lottiefiles.com/packages/lf20_3spmcjmt.json',
    category: 'gestures'
  },
  {
    id: 'rocket',
    name: 'صاروخ',
    url: 'https://assets10.lottiefiles.com/packages/lf20_69HH48.json',
    category: 'objects'
  },
  {
    id: 'star',
    name: 'نجمة',
    url: 'https://assets2.lottiefiles.com/packages/lf20_kyu7xb1v.json',
    category: 'objects'
  }
];

const categories = {
  faces: { name: 'وجوه', icon: '😊' },
  hearts: { name: 'قلوب', icon: '❤️' },
  celebration: { name: 'احتفالات', icon: '🎉' },
  gestures: { name: 'إيماءات', icon: '👍' },
  objects: { name: 'رموز', icon: '⭐' }
};

interface LottieEmojiPickerProps {
  onEmojiSelect: (emoji: LottieEmoji) => void;
  onClose: () => void;
}

export default function LottieEmojiPicker({ onEmojiSelect, onClose }: LottieEmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('faces');
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  const filteredEmojis = lottieEmojis.filter(emoji => emoji.category === selectedCategory);

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-hidden z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">سمايلات متحركة احترافية</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="p-1 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-3">
          {Object.entries(categories).map(([key, category]) => (
            <TabsTrigger key={key} value={key} className="text-xs p-1">
              <span className="text-lg mr-1">{category.icon}</span>
              <span className="hidden sm:inline">{category.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-0">
          <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1">
            {filteredEmojis.map((emoji) => (
              <Button
                key={emoji.id}
                onClick={() => onEmojiSelect(emoji)}
                variant="ghost"
                className="p-1 h-20 w-20 aspect-square hover:bg-gray-100 rounded-lg transition-all relative group"
                onMouseEnter={() => setHoveredEmoji(emoji.id)}
                onMouseLeave={() => setHoveredEmoji(null)}
              >
                <Player
                  autoplay={hoveredEmoji === emoji.id}
                  loop
                  src={emoji.url}
                  style={{ height: '60px', width: '60px' }}
                />
                <span className="absolute bottom-0 left-0 right-0 text-[10px] text-gray-600 bg-white/90 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {emoji.name}
                </span>
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-3 text-xs text-gray-500 text-center">
        <span className="inline-flex items-center gap-1">
          <span className="animate-pulse">✨</span>
          رسوم متحركة احترافية بتقنية Lottie
        </span>
      </div>
    </div>
  );
}
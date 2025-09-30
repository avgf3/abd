import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Sparkles, Heart, PartyPopper, Flame, Star } from 'lucide-react';

interface AnimatedEmoji {
  id: string;
  emoji: string;
  name: string;
  animation: string;
  code: string;
}

// السمايلات العادية (من EmojiPicker)
const REGULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍',
];

// تعريف السمايلات مع الأنيميشن
const animatedEmojis: Record<string, AnimatedEmoji[]> = {
  classic: [
    { id: 'smile', emoji: '😊', name: 'ابتسامة', animation: 'bounce', code: ':)' },
    { id: 'laugh', emoji: '😂', name: 'ضحك', animation: 'shake', code: ':D' },
    { id: 'wink', emoji: '😉', name: 'غمزة', animation: 'pulse', code: ';)' },
    { id: 'love', emoji: '😍', name: 'حب', animation: 'heartBeat', code: ':love:' },
    { id: 'cool', emoji: '😎', name: 'رائع', animation: 'flip', code: '8)' },
    { id: 'cry', emoji: '😢', name: 'بكاء', animation: 'shake', code: ':(' },
    { id: 'angry', emoji: '😠', name: 'غضب', animation: 'shake', code: '>:(' },
    { id: 'surprised', emoji: '😮', name: 'مفاجأة', animation: 'rubberBand', code: ':O' },
  ],
  hearts: [
    { id: 'heart', emoji: '❤️', name: 'قلب', animation: 'heartBeat', code: '<3' },
    { id: 'purple-heart', emoji: '💜', name: 'قلب بنفسجي', animation: 'heartBeat', code: ':purple_heart:' },
    { id: 'broken-heart', emoji: '💔', name: 'قلب مكسور', animation: 'shake', code: '</3' },
    { id: 'sparkling-heart', emoji: '💖', name: 'قلب متلألئ', animation: 'sparkle', code: ':sparkling_heart:' },
    { id: 'growing-heart', emoji: '💗', name: 'قلب متزايد', animation: 'grow', code: ':growing_heart:' },
    { id: 'revolving-hearts', emoji: '💞', name: 'قلوب دوارة', animation: 'spin', code: ':revolving_hearts:' },
  ],
  celebration: [
    { id: 'party', emoji: '🎉', name: 'احتفال', animation: 'tada', code: ':party:' },
    { id: 'confetti', emoji: '🎊', name: 'قصاصات', animation: 'confetti', code: ':confetti:' },
    { id: 'balloon', emoji: '🎈', name: 'بالون', animation: 'float', code: ':balloon:' },
    { id: 'gift', emoji: '🎁', name: 'هدية', animation: 'bounce', code: ':gift:' },
    { id: 'cake', emoji: '🎂', name: 'كعكة', animation: 'wobble', code: ':cake:' },
    { id: 'champagne', emoji: '🍾', name: 'شمبانيا', animation: 'pop', code: ':champagne:' },
  ],
  gestures: [
    { id: 'thumbs-up', emoji: '👍', name: 'إعجاب', animation: 'thumbsUp', code: ':+1:' },
    { id: 'clap', emoji: '👏', name: 'تصفيق', animation: 'clap', code: ':clap:' },
    { id: 'wave', emoji: '👋', name: 'تحية', animation: 'wave', code: ':wave:' },
    { id: 'pray', emoji: '🙏', name: 'دعاء', animation: 'pulse', code: ':pray:' },
    { id: 'muscle', emoji: '💪', name: 'قوة', animation: 'flex', code: ':muscle:' },
    { id: 'peace', emoji: '✌️', name: 'سلام', animation: 'peace', code: ':v:' },
  ],
  special: [
    { id: 'fire', emoji: '🔥', name: 'نار', animation: 'fire', code: ':fire:' },
    { id: 'star', emoji: '⭐', name: 'نجمة', animation: 'twinkle', code: ':star:' },
    { id: 'rainbow', emoji: '🌈', name: 'قوس قزح', animation: 'rainbow', code: ':rainbow:' },
    { id: 'rocket', emoji: '🚀', name: 'صاروخ', animation: 'rocket', code: ':rocket:' },
    { id: 'unicorn', emoji: '🦄', name: 'وحيد القرن', animation: 'magical', code: ':unicorn:' },
    { id: 'sparkles', emoji: '✨', name: 'تألق', animation: 'sparkle', code: ':sparkles:' },
  ]
};

const categoryIcons = {
  regular: '😀',
  classic: '😊',
  hearts: '❤️',
  celebration: '🎉',
  gestures: '👋',
  special: '✨'
};

interface AnimatedEmojiEnhancedProps {
  onEmojiSelect: (emoji: AnimatedEmoji) => void;
  onClose: () => void;
}

export default function AnimatedEmojiEnhanced({ onEmojiSelect, onClose }: AnimatedEmojiEnhancedProps) {
  const [selectedCategory, setSelectedCategory] = useState('regular');
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  // تعريف الأنيميشن variants
  const animationVariants = {
    bounce: {
      y: [0, -20, 0],
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 1 }
    },
    shake: {
      x: [-10, 10, -10, 10, 0],
      transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1 }
    },
    pulse: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.6, repeat: Infinity }
    },
    heartBeat: {
      scale: [1, 1.3, 0.8, 1.3, 1],
      transition: { duration: 1, repeat: Infinity, repeatDelay: 0.5 }
    },
    flip: {
      rotateY: [0, 180, 360],
      transition: { duration: 1, repeat: Infinity, repeatDelay: 2 }
    },
    spin: {
      rotate: 360,
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    },
    tada: {
      scale: [1, 0.9, 0.9, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1],
      rotate: [0, -3, -3, 3, -3, 3, -3, 3, -3, 0],
      transition: { duration: 1, repeat: Infinity, repeatDelay: 1 }
    },
    float: {
      y: [0, -10, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
    wobble: {
      rotate: [0, -5, 5, -5, 5, 0],
      transition: { duration: 1, repeat: Infinity, repeatDelay: 1 }
    },
    sparkle: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.8, 1],
      transition: { duration: 0.8, repeat: Infinity }
    },
    grow: {
      scale: [1, 1.5, 1],
      transition: { duration: 1.5, repeat: Infinity }
    },
    confetti: {
      y: [0, -30, 0],
      rotate: [0, 360],
      transition: { duration: 1.5, repeat: Infinity }
    },
    wave: {
      rotate: [0, 14, -8, 14, -4, 10, 0],
      transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }
    },
    thumbsUp: {
      y: [0, -10, 0],
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1 }
    },
    clap: {
      scale: [1, 1.1, 0.9, 1.1, 1],
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }
    },
    fire: {
      scale: [1, 1.1, 0.9, 1.1, 1],
      y: [0, -5, 0],
      transition: { duration: 0.8, repeat: Infinity }
    },
    twinkle: {
      scale: [1, 1.3, 1],
      rotate: [0, 180, 360],
      transition: { duration: 2, repeat: Infinity }
    },
    rocket: {
      y: [0, -20, 0],
      x: [0, 5, 0],
      transition: { duration: 1.5, repeat: Infinity }
    },
    magical: {
      scale: [1, 1.2, 1],
      rotate: [0, 10, -10, 0],
      transition: { duration: 2, repeat: Infinity }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-[400px] max-h-[450px] overflow-hidden z-50"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            <h3 className="text-sm font-medium text-gray-700">سمايلات متحركة مميزة</h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-3 bg-gray-100">
            {Object.entries(categoryIcons).map(([key, icon]) => (
              <TabsTrigger 
                key={key} 
                value={key} 
                className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <span className="text-lg">{icon}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="max-h-[300px] overflow-y-auto">
            {/* تبويب السمايلات العادية */}
            <TabsContent value="regular" className="mt-0">
              <div className="grid grid-cols-10 gap-1">
                {REGULAR_EMOJIS.map((emoji, index) => (
                  <Button
                    key={index}
                    onClick={() => onEmojiSelect({ id: `regular-${index}`, emoji, name: emoji, code: emoji, animation: 'none' })}
                    variant="ghost"
                    className="text-xl hover:bg-gray-100 p-2 h-auto aspect-square"
                    title={emoji}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </TabsContent>

            {/* تبويبات السمايلات المتحركة */}
            {Object.keys(animatedEmojis).map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-4 gap-3">
                  {animatedEmojis[category].map((emoji) => (
                    <motion.div
                      key={emoji.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={() => onEmojiSelect(emoji)}
                        variant="ghost"
                        className="relative p-3 h-[70px] w-full aspect-square hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 rounded-xl transition-all group"
                        onMouseEnter={() => setHoveredEmoji(emoji.id)}
                        onMouseLeave={() => setHoveredEmoji(null)}
                      >
                        <motion.div
                          className="text-3xl"
                          animate={hoveredEmoji === emoji.id ? animationVariants[emoji.animation as keyof typeof animationVariants] : {}}
                        >
                          {emoji.emoji}
                        </motion.div>
                        <span className="absolute bottom-1 left-0 right-0 text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {emoji.name}
                        </span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
}
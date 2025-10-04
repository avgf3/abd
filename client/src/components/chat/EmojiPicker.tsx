import { Button } from '@/components/ui/button';
import STATIC_EMOJIS from '@/data/staticEmojis';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 max-h-60 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">اختر سمايل</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700 p-1"
        >
          ✕
        </Button>
      </div>

      <div className="grid grid-cols-10 gap-1">
        {STATIC_EMOJIS.map((emoji, index) => (
          <Button
            key={index}
            onClick={() => onEmojiSelect(emoji)}
            variant="ghost"
            className="text-xl hover:bg-gray-100 p-2 h-auto aspect-square"
            title={emoji}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
}

import { Heart, Gem, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GiftButtonsProps {
  onSendRose: () => void;
  onSendDiamond: () => void;
  userPoints: number;
  disabled?: boolean;
}

export default function GiftButtons({ onSendRose, onSendDiamond, userPoints, disabled }: GiftButtonsProps) {
  const rosePrice = 100;
  const diamondPrice = 5000;

  return (
    <div className="flex gap-2 p-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">الهدايا المتاحة</h3>
        
        {/* زر الوردة */}
        <Button
          onClick={onSendRose}
          disabled={disabled || userPoints < rosePrice}
          className="flex flex-col items-center gap-1 h-auto p-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
          size="sm"
        >
          <div className="flex items-center gap-1">
            <Heart className="w-5 h-5 text-white fill-white" />
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs text-white font-medium">وردة</span>
          <span className="text-xs text-pink-100">{rosePrice} نقطة</span>
        </Button>
        
        {/* زر الألماسة */}
        <Button
          onClick={onSendDiamond}
          disabled={disabled || userPoints < diamondPrice}
          className="flex flex-col items-center gap-1 h-auto p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 mt-2"
          size="sm"
        >
          <div className="flex items-center gap-1">
            <Gem className="w-5 h-5 text-white" />
            <Crown className="w-4 h-4 text-yellow-300" />
          </div>
          <span className="text-xs text-white font-medium">ألماسة</span>
          <span className="text-xs text-blue-100">{diamondPrice} نقطة</span>
        </Button>
      </div>
      
      {/* عرض النقاط الحالية */}
      <div className="flex flex-col justify-center px-3 border-r border-gray-200">
        <div className="text-center">
          <span className="text-xs text-gray-500">نقاطك الحالية</span>
          <div className="text-lg font-bold text-gray-800">{userPoints.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

// مكون لعرض الهدايا المستلمة في الرسائل
export function GiftDisplay({ giftType, senderName }: { giftType: 'rose' | 'diamond', senderName: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
      giftType === 'rose' 
        ? 'bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 border border-pink-200' 
        : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200'
    }`}>
      {giftType === 'rose' ? (
        <>
          <Heart className="w-4 h-4 text-pink-600 fill-pink-600" />
          <Sparkles className="w-3 h-3 text-pink-500" />
          <span>أرسل {senderName} وردة 🌹</span>
        </>
      ) : (
        <>
          <Gem className="w-4 h-4 text-blue-600" />
          <Crown className="w-3 h-3 text-yellow-500" />
          <span>أرسل {senderName} ألماسة 💎</span>
        </>
      )}
    </div>
  );
}
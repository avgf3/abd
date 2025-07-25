import { Heart, Gem, Sparkles, Crown, Gift, Star } from 'lucide-react';

export default function GiftPreview() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto" dir="rtl">
      <h2 className="text-xl font-bold text-center mb-6 text-gray-800">معاينة الأيقونات المتاحة</h2>
      
      {/* الوردة */}
      <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
        <h3 className="text-lg font-semibold text-pink-700 mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-600 fill-pink-600" />
          الوردة (100 نقطة)
        </h3>
        
        <div className="space-y-2">
          {/* خيارات مختلفة للوردة */}
          <div className="flex items-center gap-3 p-2 bg-white rounded border">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            <span className="text-sm">قلب كلاسيكي</span>
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-white rounded border">
            <div className="flex items-center">
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
              <Sparkles className="w-4 h-4 text-pink-400 -ml-1" />
            </div>
            <span className="text-sm">قلب مع بريق ✨</span>
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-white rounded border">
            <div className="flex items-center">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <Star className="w-3 h-3 text-yellow-400 -ml-1 -mt-1" />
            </div>
            <span className="text-sm">قلب مع نجمة ⭐</span>
          </div>
        </div>
      </div>

      {/* الألماسة */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center gap-2">
          <Gem className="w-5 h-5 text-blue-600" />
          الألماسة (5000 نقطة)
        </h3>
        
        <div className="space-y-2">
          {/* خيارات مختلفة للألماسة */}
          <div className="flex items-center gap-3 p-2 bg-white rounded border">
            <Gem className="w-6 h-6 text-blue-500" />
            <span className="text-sm">جوهرة كلاسيكية</span>
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-white rounded border">
            <div className="flex items-center">
              <Gem className="w-5 h-5 text-blue-500" />
              <Crown className="w-4 h-4 text-yellow-500 -ml-1" />
            </div>
            <span className="text-sm">جوهرة ملكية 👑</span>
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-white rounded border">
            <div className="flex items-center">
              <Gem className="w-5 h-5 text-purple-500" />
              <Sparkles className="w-4 h-4 text-blue-400 -ml-1" />
              <Crown className="w-3 h-3 text-yellow-400 -ml-1 -mt-1" />
            </div>
            <span className="text-sm">ألماسة إمبراطورية ✨👑</span>
          </div>
        </div>
      </div>

      {/* مثال على الرسالة */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-semibold text-gray-700 mb-2">مثال في الدردشة:</h4>
        
        <div className="space-y-2">
          <div className="bg-pink-100 p-2 rounded-lg border border-pink-200">
            <div className="flex items-center gap-2 text-sm">
              <Heart className="w-4 h-4 text-pink-600 fill-pink-600" />
              <Sparkles className="w-3 h-3 text-pink-500" />
              <span className="text-pink-700">أرسل أحمد وردة 🌹</span>
            </div>
          </div>
          
          <div className="bg-blue-100 p-2 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm">
              <Gem className="w-4 h-4 text-blue-600" />
              <Crown className="w-3 h-3 text-yellow-500" />
              <span className="text-blue-700">أرسل محمد ألماسة 💎</span>
            </div>
          </div>
        </div>
      </div>

      {/* معلومات إضافية */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 text-sm text-yellow-800">
          <Gift className="w-4 h-4" />
          <span>الألماسة ترفع المستوى إلى 20 للأعضاء فقط!</span>
        </div>
      </div>
    </div>
  );
}
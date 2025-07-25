import { Crown } from 'lucide-react';

export default function GoldenCrown() {
  return (
    <div className="p-8 bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto" dir="rtl">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
        👑 التاج الذهبي - تصاميم مختلفة
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {/* تاج ذهبي كلاسيكي */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-300 hover:shadow-lg transition-all">
          <Crown className="w-16 h-16 text-yellow-600 mb-3" />
          <span className="text-sm font-semibold text-yellow-800">تاج ذهبي كلاسيكي</span>
        </div>

        {/* تاج ذهبي مع بريق */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-xl border-2 border-yellow-400 hover:shadow-lg transition-all">
          <div className="relative">
            <Crown className="w-16 h-16 text-yellow-700 mb-3 drop-shadow-lg" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-300"></div>
          </div>
          <span className="text-sm font-semibold text-yellow-900">تاج ذهبي مع بريق</span>
        </div>

        {/* تاج ذهبي ملكي */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-amber-100 to-yellow-200 rounded-xl border-2 border-amber-400 hover:shadow-lg transition-all">
          <Crown className="w-16 h-16 text-amber-700 mb-3 filter drop-shadow-md" />
          <span className="text-sm font-semibold text-amber-800">تاج ذهبي ملكي</span>
        </div>

        {/* تاج ذهبي مع ظل */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-150 rounded-xl border-2 border-yellow-500 hover:shadow-xl transition-all">
          <Crown className="w-16 h-16 text-yellow-600 mb-3 drop-shadow-2xl" style={{filter: 'drop-shadow(0 4px 8px rgba(234, 179, 8, 0.4))'}} />
          <span className="text-sm font-semibold text-yellow-800">تاج ذهبي مع ظل</span>
        </div>

        {/* تاج ذهبي متحرك */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-100 to-orange-200 rounded-xl border-2 border-orange-300 hover:shadow-lg transition-all">
          <Crown className="w-16 h-16 text-orange-600 mb-3 animate-bounce" />
          <span className="text-sm font-semibold text-orange-800">تاج ذهبي متحرك</span>
        </div>

        {/* تاج ذهبي مضيء */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-xl border-2 border-yellow-600 hover:shadow-lg transition-all">
          <Crown className="w-16 h-16 text-yellow-800 mb-3" style={{filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))'}} />
          <span className="text-sm font-semibold text-yellow-900">تاج ذهبي مضيء</span>
        </div>
      </div>

      {/* تاج كبير مميز */}
      <div className="mt-12 text-center">
        <h3 className="text-2xl font-bold text-gray-700 mb-6">👑 التاج الذهبي المميز</h3>
        <div className="flex justify-center">
          <div className="relative p-8 bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 rounded-full border-4 border-yellow-400 shadow-2xl">
            <Crown 
              className="w-24 h-24 text-yellow-700" 
              style={{
                filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6)) drop-shadow(0 4px 12px rgba(217, 119, 6, 0.3))'
              }} 
            />
            {/* نجوم متحركة حول التاج */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-amber-400 rounded-full animate-ping delay-150"></div>
            <div className="absolute top-1/2 -left-4 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <div className="absolute top-1/4 -right-4 w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-300"></div>
          </div>
        </div>
        <p className="mt-4 text-gray-600 text-lg">للألماسة الملكية - 5000 نقطة</p>
      </div>

      {/* CSS مخصص للتأثيرات */}
      <style jsx>{`
        .golden-glow {
          animation: goldenGlow 2s ease-in-out infinite alternate;
        }
        
        @keyframes goldenGlow {
          0% {
            filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5));
          }
          100% {
            filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
          }
        }
      `}</style>
    </div>
  );
}
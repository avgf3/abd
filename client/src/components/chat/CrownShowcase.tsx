import { Crown } from 'lucide-react';

export default function CrownShowcase() {
  return (
    <div className="p-8 bg-white rounded-2xl shadow-2xl max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">
        👑 التيجان الذهبية - كل الأنواع
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* 1. تاج ذهبي كلاسيكي */}
        <div className="text-center p-8 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl border-4 border-yellow-300 hover:shadow-2xl transition-all">
          <h2 className="text-xl font-bold text-yellow-800 mb-6">1️⃣ تاج ذهبي كلاسيكي</h2>
          <Crown className="w-24 h-24 text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-700 font-medium">التاج الأساسي البسيط</p>
        </div>

        {/* 2. تاج ذهبي مع بريق */}
        <div className="text-center p-8 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-2xl border-4 border-yellow-400 hover:shadow-2xl transition-all">
          <h2 className="text-xl font-bold text-yellow-900 mb-6">2️⃣ تاج ذهبي مع بريق ✨</h2>
          <div className="relative mx-auto w-24 h-24 mb-4">
            <Crown className="w-24 h-24 text-yellow-700 drop-shadow-lg" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-300"></div>
            <div className="absolute top-2 -left-3 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
          </div>
          <p className="text-yellow-800 font-medium">مع نقاط مضيئة متحركة</p>
        </div>

        {/* 3. تاج ذهبي ملكي */}
        <div className="text-center p-8 bg-gradient-to-br from-amber-100 to-yellow-200 rounded-2xl border-4 border-amber-400 hover:shadow-2xl transition-all">
          <h2 className="text-xl font-bold text-amber-800 mb-6">3️⃣ تاج ذهبي ملكي</h2>
          <Crown className="w-24 h-24 text-amber-700 mx-auto mb-4 filter drop-shadow-md" />
          <p className="text-amber-700 font-medium">مع ظل خفيف أنيق</p>
        </div>

        {/* 4. تاج ذهبي مع ظل */}
        <div className="text-center p-8 bg-gradient-to-br from-yellow-50 to-yellow-150 rounded-2xl border-4 border-yellow-500 hover:shadow-2xl transition-all">
          <h2 className="text-xl font-bold text-yellow-800 mb-6">4️⃣ تاج ذهبي مع ظل</h2>
          <Crown 
            className="w-24 h-24 text-yellow-600 mx-auto mb-4 drop-shadow-2xl" 
            style={{filter: 'drop-shadow(0 8px 16px rgba(234, 179, 8, 0.6))'}} 
          />
          <p className="text-yellow-700 font-medium">ظل ذهبي عميق</p>
        </div>

        {/* 5. تاج ذهبي متحرك */}
        <div className="text-center p-8 bg-gradient-to-br from-yellow-100 to-orange-200 rounded-2xl border-4 border-orange-300 hover:shadow-2xl transition-all">
          <h2 className="text-xl font-bold text-orange-800 mb-6">5️⃣ تاج ذهبي متحرك</h2>
          <Crown className="w-24 h-24 text-orange-600 mx-auto mb-4 animate-bounce" />
          <p className="text-orange-700 font-medium">يتحرك لأعلى وأسفل</p>
        </div>

        {/* 6. تاج ذهبي مضيء */}
        <div className="text-center p-8 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-2xl border-4 border-yellow-600 hover:shadow-2xl transition-all">
          <h2 className="text-xl font-bold text-yellow-900 mb-6">6️⃣ تاج ذهبي مضيء</h2>
          <Crown 
            className="w-24 h-24 text-yellow-800 mx-auto mb-4" 
            style={{filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 40px rgba(251, 191, 36, 0.4))'}} 
          />
          <p className="text-yellow-800 font-medium">يتوهج بالذهب</p>
        </div>

      </div>

      {/* التاج المميز الكبير */}
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-bold text-gray-700 mb-8">👑 التاج الملكي المميز</h2>
        <div className="flex justify-center">
          <div className="relative p-12 bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 rounded-full border-8 border-yellow-400 shadow-2xl">
            <Crown 
              className="w-32 h-32 text-yellow-700" 
              style={{
                filter: 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.8)) drop-shadow(0 8px 20px rgba(217, 119, 6, 0.4))'
              }} 
            />
            {/* نجوم متحركة حول التاج */}
            <div className="absolute -top-4 -right-4 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-4 -left-4 w-4 h-4 bg-amber-400 rounded-full animate-ping delay-150"></div>
            <div className="absolute top-1/2 -left-8 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <div className="absolute top-1/4 -right-8 w-3 h-3 bg-orange-400 rounded-full animate-pulse delay-300"></div>
            <div className="absolute bottom-1/4 -right-6 w-2 h-2 bg-yellow-300 rounded-full animate-bounce"></div>
            <div className="absolute bottom-1/3 -left-6 w-2 h-2 bg-amber-300 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
        <p className="mt-6 text-gray-600 text-xl font-semibold">للألماسة الملكية - 5000 نقطة</p>
      </div>

      {/* مقارنة الأحجام */}
      <div className="mt-16 p-8 bg-gray-50 rounded-2xl">
        <h3 className="text-2xl font-bold text-center text-gray-700 mb-8">📏 أحجام مختلفة</h3>
        <div className="flex justify-center items-end gap-12">
          <div className="text-center">
            <Crown className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">صغير</p>
          </div>
          <div className="text-center">
            <Crown className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">متوسط</p>
          </div>
          <div className="text-center">
            <Crown className="w-16 h-16 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">كبير</p>
          </div>
          <div className="text-center">
            <Crown className="w-20 h-20 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">كبير جداً</p>
          </div>
        </div>
      </div>

    </div>
  );
}
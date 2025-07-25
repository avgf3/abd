export default function CartoonCrown() {
  // تاج كرتوني مخصص بـ SVG
  const CartoonCrownSVG = ({ size = 64, className = "" }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* التدرج الذهبي */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="30%" stopColor="#FFA500" />
          <stop offset="70%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id="gemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF69B4" />
          <stop offset="50%" stopColor="#FF1493" />
          <stop offset="100%" stopColor="#DC143C" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* قاعدة التاج */}
      <ellipse cx="50" cy="85" rx="35" ry="8" fill="url(#goldGradient)" opacity="0.8"/>
      
      {/* جسم التاج */}
      <path 
        d="M15 80 L20 45 L35 55 L50 35 L65 55 L80 45 L85 80 Z" 
        fill="url(#goldGradient)" 
        stroke="#B8860B" 
        strokeWidth="2"
        filter="url(#glow)"
      />
      
      {/* الجواهر */}
      <circle cx="30" cy="60" r="4" fill="url(#gemGradient)" />
      <circle cx="50" cy="50" r="5" fill="#00CED1" />
      <circle cx="70" cy="60" r="4" fill="#32CD32" />
      
      {/* تفاصيل ذهبية */}
      <path d="M20 70 Q25 65 30 70" stroke="#FFD700" strokeWidth="2" fill="none"/>
      <path d="M45 65 Q50 60 55 65" stroke="#FFD700" strokeWidth="2" fill="none"/>
      <path d="M70 70 Q75 65 80 70" stroke="#FFD700" strokeWidth="2" fill="none"/>
      
      {/* النقاط المضيئة */}
      <circle cx="25" cy="50" r="1.5" fill="#FFFF00" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="75" cy="50" r="1.5" fill="#FFFF00" opacity="0.8">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );

  // تاج كرتوني بسيط
  const SimpleCrownSVG = ({ size = 64, className = "" }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="simpleGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#DAA520" />
        </linearGradient>
      </defs>
      
      {/* التاج البسيط */}
      <path 
        d="M20 75 L25 40 L40 50 L50 30 L60 50 L75 40 L80 75 Z" 
        fill="url(#simpleGold)" 
        stroke="#B8860B" 
        strokeWidth="2"
      />
      
      {/* الجوهرة المركزية */}
      <circle cx="50" cy="55" r="6" fill="#FF69B4" stroke="#DC143C" strokeWidth="1"/>
      
      {/* النقاط الجانبية */}
      <circle cx="35" cy="60" r="3" fill="#00CED1"/>
      <circle cx="65" cy="60" r="3" fill="#32CD32"/>
    </svg>
  );

  return (
    <div className="p-8 bg-white rounded-2xl shadow-2xl max-w-4xl mx-auto" dir="rtl">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
        👑 التيجان الكرتونية الذهبية - تصميم مخصص
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* تاج كرتوني مفصل */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 hover:shadow-xl transition-all">
          <CartoonCrownSVG size={80} className="mb-4 hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold text-yellow-800 mb-2">تاج كرتوني مفصل</h3>
          <p className="text-sm text-gray-600 text-center">مع جواهر ملونة وتأثيرات مضيئة</p>
        </div>

        {/* تاج كرتوني بسيط */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-300 hover:shadow-xl transition-all">
          <SimpleCrownSVG size={80} className="mb-4 hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold text-amber-800 mb-2">تاج كرتوني بسيط</h3>
          <p className="text-sm text-gray-600 text-center">تصميم أنيق وبسيط</p>
        </div>

        {/* تاج كرتوني كبير */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-400 hover:shadow-xl transition-all">
          <div className="relative">
            <CartoonCrownSVG size={100} className="mb-4 hover:scale-105 transition-transform" />
            {/* بريق حول التاج */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-orange-400 rounded-full animate-ping delay-300"></div>
          </div>
          <h3 className="text-lg font-bold text-orange-800 mb-2">تاج كرتوني ملكي</h3>
          <p className="text-sm text-gray-600 text-center">للألماسة الملكية - 5000 نقطة</p>
        </div>
      </div>

      {/* مقارنة الأحجام */}
      <div className="mt-12 p-6 bg-gray-50 rounded-xl">
        <h3 className="text-xl font-bold text-center text-gray-700 mb-6">أحجام مختلفة</h3>
        <div className="flex justify-center items-end gap-8">
          <div className="text-center">
            <CartoonCrownSVG size={32} />
            <p className="text-xs text-gray-500 mt-2">صغير</p>
          </div>
          <div className="text-center">
            <CartoonCrownSVG size={48} />
            <p className="text-xs text-gray-500 mt-2">متوسط</p>
          </div>
          <div className="text-center">
            <CartoonCrownSVG size={64} />
            <p className="text-xs text-gray-500 mt-2">كبير</p>
          </div>
          <div className="text-center">
            <CartoonCrownSVG size={80} />
            <p className="text-xs text-gray-500 mt-2">كبير جداً</p>
          </div>
        </div>
      </div>

      {/* استخدام في الدردشة */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <h4 className="text-lg font-bold text-gray-700 mb-4 text-center">
          💬 مثال في الدردشة
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <CartoonCrownSVG size={24} />
            <span className="text-sm text-gray-700">أرسل أحمد تاج ذهبي!</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <SimpleCrownSVG size={24} />
            <span className="text-sm text-purple-700">تم ترقية محمد إلى المستوى 20! 👑</span>
          </div>
        </div>
      </div>
    </div>
  );
}
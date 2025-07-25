import { 
  // أيقونات الوسام والشارات
  Badge,
  BadgeCheck,
  BadgeDollarSign,
  BadgeEuro,
  BadgeInfo,
  BadgeMinus,
  BadgePlus,
  BadgeX,
  BadgeAlert,
  BadgeCent,
  BadgeIndianRupee,
  BadgeJapaneseYen,

  // أيقونات النجوم
  Star,
  Stars,
  Sparkles,
  Sparkle,
  StarHalf,

  // أيقونات الكؤوس والجوائز
  Trophy,
  Award,
  Medal,
  Cup,

  // أيقونات التيجان والملكية
  Crown,

  // أيقونات الألماس والجواهر
  Gem,
  Diamond,
  Zap,

  // أيقونات الأشكال الهندسية
  Circle,
  Square,
  Triangle,
  Hexagon,
  Pentagon,
  Octagon,

  // أيقونات إضافية
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Target,
  Crosshair,
  Disc,
  Disc2,
  Disc3,
  CircleDot,
  CircleCheck,
  CircleX,
  CircleAlert,
  CirclePlus,
  CircleMinus,
  SquareCheck,
  SquareX,
  SquarePlus,
  SquareMinus,
  TriangleAlert,
  
  // أيقونات خاصة
  Flame,
  Sun,
  Moon,
  Atom,
  Orbit,
  Radar,
  Focus,
  Aperture
} from 'lucide-react';

export default function VariedGiftIcons() {
  const iconCategories = [
    {
      title: "🏅 أيقونات الوسام والشارات - أشكال متنوعة",
      icons: [
        { name: "Badge", icon: Badge, color: "text-blue-600", bg: "bg-blue-100", desc: "وسام كلاسيكي" },
        { name: "BadgeCheck", icon: BadgeCheck, color: "text-green-600", bg: "bg-green-100", desc: "وسام تحقق" },
        { name: "BadgePlus", icon: BadgePlus, color: "text-blue-600", bg: "bg-blue-100", desc: "وسام إضافة" },
        { name: "BadgeMinus", icon: BadgeMinus, color: "text-red-600", bg: "bg-red-100", desc: "وسام ناقص" },
        { name: "BadgeX", icon: BadgeX, color: "text-red-600", bg: "bg-red-100", desc: "وسام رفض" },
        { name: "BadgeAlert", icon: BadgeAlert, color: "text-yellow-600", bg: "bg-yellow-100", desc: "وسام تحذير" },
        { name: "BadgeInfo", icon: BadgeInfo, color: "text-blue-600", bg: "bg-blue-100", desc: "وسام معلومات" },
        { name: "BadgeDollarSign", icon: BadgeDollarSign, color: "text-green-600", bg: "bg-green-100", desc: "وسام دولار" },
        { name: "BadgeEuro", icon: BadgeEuro, color: "text-purple-600", bg: "bg-purple-100", desc: "وسام يورو" },
        { name: "BadgeCent", icon: BadgeCent, color: "text-orange-600", bg: "bg-orange-100", desc: "وسام سنت" },
        { name: "BadgeIndianRupee", icon: BadgeIndianRupee, color: "text-indigo-600", bg: "bg-indigo-100", desc: "وسام روبية" },
        { name: "BadgeJapaneseYen", icon: BadgeJapaneseYen, color: "text-pink-600", bg: "bg-pink-100", desc: "وسام ين" },
      ]
    },
    {
      title: "⭐ أيقونات النجوم - أشكال مختلفة",
      icons: [
        { name: "Star", icon: Star, color: "text-yellow-500", bg: "bg-yellow-100", desc: "نجمة كلاسيكية" },
        { name: "Stars", icon: Stars, color: "text-yellow-400", bg: "bg-yellow-50", desc: "نجوم متعددة" },
        { name: "StarHalf", icon: StarHalf, color: "text-yellow-600", bg: "bg-yellow-100", desc: "نصف نجمة" },
        { name: "Sparkles", icon: Sparkles, color: "text-pink-400", bg: "bg-pink-50", desc: "بريق متعدد" },
        { name: "Sparkle", icon: Sparkle, color: "text-yellow-400", bg: "bg-yellow-50", desc: "بريق واحد" },
        { name: "Zap", icon: Zap, color: "text-orange-500", bg: "bg-orange-100", desc: "صاعقة نجمية" },
        { name: "Sun", icon: Sun, color: "text-yellow-500", bg: "bg-yellow-100", desc: "شمس مشعة" },
        { name: "Atom", icon: Atom, color: "text-purple-500", bg: "bg-purple-100", desc: "ذرة نجمية" },
      ]
    },
    {
      title: "🏆 أيقونات الكؤوس والجوائز - تصاميم متنوعة",
      icons: [
        { name: "Trophy", icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100", desc: "كأس ذهبي" },
        { name: "Award", icon: Award, color: "text-blue-600", bg: "bg-blue-100", desc: "جائزة دائرية" },
        { name: "Medal", icon: Medal, color: "text-orange-500", bg: "bg-orange-100", desc: "ميدالية" },
        { name: "Cup", icon: Cup, color: "text-amber-600", bg: "bg-amber-100", desc: "كأس بسيط" },
        { name: "Target", icon: Target, color: "text-red-500", bg: "bg-red-100", desc: "هدف دائري" },
        { name: "Crosshair", icon: Crosshair, color: "text-gray-600", bg: "bg-gray-100", desc: "تصويب" },
        { name: "Focus", icon: Focus, color: "text-blue-500", bg: "bg-blue-100", desc: "تركيز" },
      ]
    },
    {
      title: "👑 أيقونات التيجان والدروع - أشكال ملكية",
      icons: [
        { name: "Crown", icon: Crown, color: "text-yellow-600", bg: "bg-yellow-100", desc: "تاج ملكي" },
        { name: "Shield", icon: Shield, color: "text-blue-600", bg: "bg-blue-100", desc: "درع كلاسيكي" },
        { name: "ShieldCheck", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100", desc: "درع محقق" },
        { name: "ShieldAlert", icon: ShieldAlert, color: "text-yellow-600", bg: "bg-yellow-100", desc: "درع تحذير" },
        { name: "ShieldX", icon: ShieldX, color: "text-red-600", bg: "bg-red-100", desc: "درع مرفوض" },
      ]
    },
    {
      title: "💎 أيقونات الألماس والجواهر - أشكال متعددة",
      icons: [
        { name: "Gem", icon: Gem, color: "text-blue-500", bg: "bg-blue-100", desc: "جوهرة كلاسيكية" },
        { name: "Diamond", icon: Diamond, color: "text-purple-500", bg: "bg-purple-100", desc: "ألماسة هندسية" },
        { name: "Aperture", icon: Aperture, color: "text-indigo-500", bg: "bg-indigo-100", desc: "فتحة ألماسية" },
        { name: "Radar", icon: Radar, color: "text-green-500", bg: "bg-green-100", desc: "رادار ألماسي" },
        { name: "Orbit", icon: Orbit, color: "text-purple-400", bg: "bg-purple-100", desc: "مدار جوهري" },
      ]
    },
    {
      title: "🔷 أيقونات الأشكال الهندسية - تصاميم متنوعة",
      icons: [
        { name: "Circle", icon: Circle, color: "text-blue-500", bg: "bg-blue-100", desc: "دائرة" },
        { name: "CircleDot", icon: CircleDot, color: "text-blue-600", bg: "bg-blue-100", desc: "دائرة بنقطة" },
        { name: "CircleCheck", icon: CircleCheck, color: "text-green-600", bg: "bg-green-100", desc: "دائرة محققة" },
        { name: "CircleX", icon: CircleX, color: "text-red-600", bg: "bg-red-100", desc: "دائرة مرفوضة" },
        { name: "CircleAlert", icon: CircleAlert, color: "text-yellow-600", bg: "bg-yellow-100", desc: "دائرة تحذير" },
        { name: "CirclePlus", icon: CirclePlus, color: "text-blue-600", bg: "bg-blue-100", desc: "دائرة إضافة" },
        { name: "CircleMinus", icon: CircleMinus, color: "text-red-600", bg: "bg-red-100", desc: "دائرة ناقص" },
        
        { name: "Square", icon: Square, color: "text-purple-500", bg: "bg-purple-100", desc: "مربع" },
        { name: "SquareCheck", icon: SquareCheck, color: "text-green-600", bg: "bg-green-100", desc: "مربع محقق" },
        { name: "SquareX", icon: SquareX, color: "text-red-600", bg: "bg-red-100", desc: "مربع مرفوض" },
        { name: "SquarePlus", icon: SquarePlus, color: "text-blue-600", bg: "bg-blue-100", desc: "مربع إضافة" },
        { name: "SquareMinus", icon: SquareMinus, color: "text-red-600", bg: "bg-red-100", desc: "مربع ناقص" },
        
        { name: "Triangle", icon: Triangle, color: "text-orange-500", bg: "bg-orange-100", desc: "مثلث" },
        { name: "TriangleAlert", icon: TriangleAlert, color: "text-yellow-600", bg: "bg-yellow-100", desc: "مثلث تحذير" },
        
        { name: "Hexagon", icon: Hexagon, color: "text-teal-500", bg: "bg-teal-100", desc: "سداسي" },
        { name: "Pentagon", icon: Pentagon, color: "text-indigo-500", bg: "bg-indigo-100", desc: "خماسي" },
        { name: "Octagon", icon: Octagon, color: "text-pink-500", bg: "bg-pink-100", desc: "ثماني" },
        
        { name: "Disc", icon: Disc, color: "text-gray-600", bg: "bg-gray-100", desc: "قرص" },
        { name: "Disc2", icon: Disc2, color: "text-gray-500", bg: "bg-gray-100", desc: "قرص ثاني" },
        { name: "Disc3", icon: Disc3, color: "text-gray-400", bg: "bg-gray-100", desc: "قرص ثالث" },
      ]
    }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-6xl mx-auto" dir="rtl">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
        🎨 أيقونات متنوعة للهدايا - أشكال مختلفة
      </h2>
      
      {iconCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-10">
          <h3 className="text-xl font-bold mb-6 text-gray-700 border-b-2 border-gray-200 pb-3">
            {category.title}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {category.icons.map((iconData, iconIndex) => {
              const IconComponent = iconData.icon;
              return (
                <div 
                  key={iconIndex}
                  className={`p-4 ${iconData.bg} rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 group-hover:scale-110 transition-transform duration-200">
                      <IconComponent className={`w-10 h-10 ${iconData.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 mb-1">
                      {iconData.name}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight">
                      {iconData.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* اقتراحات التركيبات */}
      <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border-2 border-gray-200">
        <h4 className="text-lg font-bold text-gray-700 mb-4 text-center">
          💡 اقتراحات تركيبات مميزة للهدايا
        </h4>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h5 className="font-semibold text-gray-600">🌹 للوردة (100 نقطة):</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                <Badge className="w-5 h-5 text-pink-500" />
                <span className="text-sm">Badge + لون وردي</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                <CircleDot className="w-5 h-5 text-pink-500" />
                <span className="text-sm">CircleDot + بريق</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                <Star className="w-5 h-5 text-pink-500" />
                <span className="text-sm">Star + لون وردي</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-gray-600">💎 للألماسة (5000 نقطة):</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                <Gem className="w-5 h-5 text-blue-500" />
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Gem + Crown</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                <Diamond className="w-5 h-5 text-purple-500" />
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Diamond + Sparkles</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                <BadgeCheck className="w-5 h-5 text-blue-500" />
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">BadgeCheck + Trophy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* معلومة مهمة */}
      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
        <div className="flex items-center gap-3 text-yellow-800">
          <Crown className="w-6 h-6" />
          <div>
            <span className="font-semibold">تذكر:</span>
            <span className="mr-2">الألماسة ترفع المستوى إلى 20 للأعضاء فقط! 🚀</span>
          </div>
        </div>
      </div>
    </div>
  );
}
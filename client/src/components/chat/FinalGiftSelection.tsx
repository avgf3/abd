import { 
  Badge, BadgeCheck, BadgePlus, BadgeAlert, BadgeDollarSign,
  Star, Stars, Sparkles, StarHalf,
  Trophy, Award, Medal, Cup,
  Crown, Shield, ShieldCheck,
  Gem, Diamond, Zap,
  Circle, CircleDot, CircleCheck, Square, Triangle, Hexagon, Pentagon, Octagon,
  Heart, Flower, Flower2
} from 'lucide-react';

export default function FinalGiftSelection() {
  const selections = [
    {
      category: "🏅 أيقونات الوسام - الأفضل",
      description: "أشكال مختلفة للوسام",
      icons: [
        { name: "Badge", icon: Badge, color: "text-blue-600", bg: "bg-blue-100" },
        { name: "BadgeCheck", icon: BadgeCheck, color: "text-green-600", bg: "bg-green-100" },
        { name: "BadgePlus", icon: BadgePlus, color: "text-blue-600", bg: "bg-blue-100" },
        { name: "BadgeAlert", icon: BadgeAlert, color: "text-yellow-600", bg: "bg-yellow-100" },
        { name: "BadgeDollarSign", icon: BadgeDollarSign, color: "text-green-600", bg: "bg-green-100" },
        { name: "Shield", icon: Shield, color: "text-blue-600", bg: "bg-blue-100" },
        { name: "ShieldCheck", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100" },
      ]
    },
    {
      category: "⭐ أيقونات النجمة - الأجمل",
      description: "نجوم وبريق مختلف",
      icons: [
        { name: "Star", icon: Star, color: "text-yellow-500", bg: "bg-yellow-100" },
        { name: "Stars", icon: Stars, color: "text-yellow-400", bg: "bg-yellow-50" },
        { name: "StarHalf", icon: StarHalf, color: "text-yellow-600", bg: "bg-yellow-100" },
        { name: "Sparkles", icon: Sparkles, color: "text-pink-400", bg: "bg-pink-50" },
        { name: "Zap", icon: Zap, color: "text-orange-500", bg: "bg-orange-100" },
      ]
    },
    {
      category: "🏆 أيقونات الكأس - الأروع",
      description: "كؤوس وجوائز متنوعة",
      icons: [
        { name: "Trophy", icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100" },
        { name: "Award", icon: Award, color: "text-blue-600", bg: "bg-blue-100" },
        { name: "Medal", icon: Medal, color: "text-orange-500", bg: "bg-orange-100" },
        { name: "Cup", icon: Cup, color: "text-amber-600", bg: "bg-amber-100" },
      ]
    },
    {
      category: "👑 أيقونات التاج - الملكية",
      description: "تيجان ملكية",
      icons: [
        { name: "Crown", icon: Crown, color: "text-yellow-600", bg: "bg-yellow-100" },
      ]
    },
    {
      category: "💎 أيقونات الألماسة - المتألقة",
      description: "ألماس وجواهر",
      icons: [
        { name: "Gem", icon: Gem, color: "text-blue-500", bg: "bg-blue-100" },
        { name: "Diamond", icon: Diamond, color: "text-purple-500", bg: "bg-purple-100" },
      ]
    },
    {
      category: "🔷 أشكال هندسية - متنوعة",
      description: "دوائر ومربعات ومثلثات",
      icons: [
        { name: "Circle", icon: Circle, color: "text-blue-500", bg: "bg-blue-100" },
        { name: "CircleDot", icon: CircleDot, color: "text-blue-600", bg: "bg-blue-100" },
        { name: "CircleCheck", icon: CircleCheck, color: "text-green-600", bg: "bg-green-100" },
        { name: "Square", icon: Square, color: "text-purple-500", bg: "bg-purple-100" },
        { name: "Triangle", icon: Triangle, color: "text-orange-500", bg: "bg-orange-100" },
        { name: "Hexagon", icon: Hexagon, color: "text-teal-500", bg: "bg-teal-100" },
        { name: "Pentagon", icon: Pentagon, color: "text-indigo-500", bg: "bg-indigo-100" },
        { name: "Octagon", icon: Octagon, color: "text-pink-500", bg: "bg-pink-100" },
      ]
    }
  ];

  const bestCombinations = [
    {
      title: "🌹 للوردة (100 نقطة)",
      combinations: [
        { icons: [Heart, Sparkles], names: ["Heart", "Sparkles"], colors: ["text-pink-500", "text-pink-400"] },
        { icons: [Flower, Star], names: ["Flower", "Star"], colors: ["text-pink-500", "text-yellow-500"] },
        { icons: [Badge, CircleDot], names: ["Badge", "CircleDot"], colors: ["text-pink-500", "text-pink-600"] },
        { icons: [Circle, Sparkles], names: ["Circle", "Sparkles"], colors: ["text-pink-500", "text-pink-400"] },
      ]
    },
    {
      title: "💎 للألماسة (5000 نقطة)",
      combinations: [
        { icons: [Gem, Crown], names: ["Gem", "Crown"], colors: ["text-blue-500", "text-yellow-600"] },
        { icons: [Diamond, Sparkles, Crown], names: ["Diamond", "Sparkles", "Crown"], colors: ["text-purple-500", "text-blue-400", "text-yellow-600"] },
        { icons: [BadgeCheck, Trophy], names: ["BadgeCheck", "Trophy"], colors: ["text-blue-500", "text-yellow-600"] },
        { icons: [Shield, Gem, Star], names: ["Shield", "Gem", "Star"], colors: ["text-blue-600", "text-blue-500", "text-yellow-500"] },
      ]
    }
  ];

  return (
    <div className="p-8 bg-white rounded-2xl shadow-2xl max-w-7xl mx-auto" dir="rtl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          🎨 الأيقونات المختارة للهدايا
        </h1>
        <p className="text-lg text-gray-600">
          مجموعة شاملة من الأيقونات المتنوعة لنظام الهدايا
        </p>
      </div>

      {/* عرض الفئات */}
      {selections.map((selection, index) => (
        <div key={index} className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              {selection.category}
            </h2>
            <p className="text-gray-500">{selection.description}</p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {selection.icons.map((iconData, iconIndex) => {
              const IconComponent = iconData.icon;
              return (
                <div 
                  key={iconIndex}
                  className={`p-6 ${iconData.bg} rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 cursor-pointer group`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 group-hover:scale-125 transition-transform duration-300">
                      <IconComponent className={`w-12 h-12 ${iconData.color}`} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {iconData.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* أفضل التركيبات */}
      <div className="mt-16 p-8 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          ✨ أفضل التركيبات المقترحة
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {bestCombinations.map((combo, comboIndex) => (
            <div key={comboIndex} className="space-y-4">
              <h3 className="text-xl font-bold text-gray-700 text-center">
                {combo.title}
              </h3>
              
              <div className="space-y-3">
                {combo.combinations.map((combination, combIndex) => (
                  <div key={combIndex} className="flex items-center justify-center gap-3 p-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      {combination.icons.map((IconComp, iconIdx) => (
                        <IconComp 
                          key={iconIdx}
                          className={`w-6 h-6 ${combination.colors[iconIdx]}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {combination.names.join(" + ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ملاحظة مهمة */}
      <div className="mt-8 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-300">
        <div className="flex items-center justify-center gap-4 text-center">
          <Crown className="w-8 h-8 text-yellow-700" />
          <div className="text-yellow-800">
            <p className="text-lg font-bold">مهم جداً!</p>
            <p className="text-sm">الألماسة ترفع المستوى إلى 20 للأعضاء فقط 🚀</p>
          </div>
        </div>
      </div>
    </div>
  );
}
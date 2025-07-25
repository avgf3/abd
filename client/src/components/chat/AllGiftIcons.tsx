import { 
  Heart, 
  Gem, 
  Sparkles, 
  Crown, 
  Star, 
  Award, 
  Trophy, 
  Medal,
  Gift,
  Zap,
  Flower,
  Flower2,
  Diamond,
  Sun,
  Moon,
  Flame,
  Snowflake,
  Cherry,
  Apple,
  Leaf,
  TreePine,
  Clover,
  Feather,
  Butterfly,
  Fish,
  Bird,
  Cat,
  Dog,
  Rabbit,
  Turtle,
  Snail,
  Octagon,
  Hexagon,
  Triangle,
  Circle,
  Square,
  Pentagon,
  Stars,
  Sparkle,
  Wand2,
  Palette
} from 'lucide-react';

export default function AllGiftIcons() {
  const iconGroups = [
    {
      category: "أيقونات الحب والرومانسية 💕",
      icons: [
        { name: "Heart", icon: Heart, color: "text-pink-500", bgColor: "bg-pink-100", description: "قلب كلاسيكي" },
        { name: "Sparkles", icon: Sparkles, color: "text-pink-400", bgColor: "bg-pink-50", description: "بريق ولمعان" },
        { name: "Star", icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-100", description: "نجمة" },
        { name: "Stars", icon: Stars, color: "text-yellow-400", bgColor: "bg-yellow-50", description: "نجوم متعددة" },
      ]
    },
    {
      category: "أيقونات الجواهر والثروة 💎",
      icons: [
        { name: "Gem", icon: Gem, color: "text-blue-500", bgColor: "bg-blue-100", description: "جوهرة/ألماسة" },
        { name: "Crown", icon: Crown, color: "text-yellow-600", bgColor: "bg-yellow-100", description: "تاج ملكي" },
        { name: "Diamond", icon: Diamond, color: "text-purple-500", bgColor: "bg-purple-100", description: "ألماسة هندسية" },
        { name: "Zap", icon: Zap, color: "text-orange-500", bgColor: "bg-orange-100", description: "صاعقة/برق" },
      ]
    },
    {
      category: "أيقونات الجوائز والإنجازات 🏆",
      icons: [
        { name: "Trophy", icon: Trophy, color: "text-yellow-600", bgColor: "bg-yellow-100", description: "كأس/جائزة" },
        { name: "Award", icon: Award, color: "text-blue-600", bgColor: "bg-blue-100", description: "ميدالية" },
        { name: "Medal", icon: Medal, color: "text-orange-500", bgColor: "bg-orange-100", description: "وسام" },
        { name: "Gift", icon: Gift, color: "text-green-500", bgColor: "bg-green-100", description: "هدية" },
      ]
    },
    {
      category: "أيقونات الطبيعة والزهور 🌸",
      icons: [
        { name: "Flower", icon: Flower, color: "text-pink-500", bgColor: "bg-pink-100", description: "زهرة" },
        { name: "Flower2", icon: Flower2, color: "text-purple-500", bgColor: "bg-purple-100", description: "زهرة أخرى" },
        { name: "Cherry", icon: Cherry, color: "text-red-500", bgColor: "bg-red-100", description: "كرز" },
        { name: "Apple", icon: Apple, color: "text-red-600", bgColor: "bg-red-100", description: "تفاحة" },
        { name: "Leaf", icon: Leaf, color: "text-green-500", bgColor: "bg-green-100", description: "ورقة" },
        { name: "TreePine", icon: TreePine, color: "text-green-600", bgColor: "bg-green-100", description: "شجرة" },
        { name: "Clover", icon: Clover, color: "text-green-400", bgColor: "bg-green-50", description: "برسيم (حظ)" },
      ]
    },
    {
      category: "أيقونات العناصر الطبيعية 🌟",
      icons: [
        { name: "Sun", icon: Sun, color: "text-yellow-500", bgColor: "bg-yellow-100", description: "شمس" },
        { name: "Moon", icon: Moon, color: "text-blue-400", bgColor: "bg-blue-100", description: "قمر" },
        { name: "Flame", icon: Flame, color: "text-red-500", bgColor: "bg-red-100", description: "نار/لهب" },
        { name: "Snowflake", icon: Snowflake, color: "text-blue-300", bgColor: "bg-blue-50", description: "ندفة ثلج" },
      ]
    },
    {
      category: "أيقونات الحيوانات اللطيفة 🐱",
      icons: [
        { name: "Butterfly", icon: Butterfly, color: "text-purple-400", bgColor: "bg-purple-100", description: "فراشة" },
        { name: "Bird", icon: Bird, color: "text-blue-500", bgColor: "bg-blue-100", description: "طائر" },
        { name: "Fish", icon: Fish, color: "text-cyan-500", bgColor: "bg-cyan-100", description: "سمكة" },
        { name: "Cat", icon: Cat, color: "text-orange-500", bgColor: "bg-orange-100", description: "قطة" },
        { name: "Dog", icon: Dog, color: "text-brown-500", bgColor: "bg-amber-100", description: "كلب" },
        { name: "Rabbit", icon: Rabbit, color: "text-gray-500", bgColor: "bg-gray-100", description: "أرنب" },
      ]
    },
    {
      category: "أيقونات سحرية وخاصة ✨",
      icons: [
        { name: "Wand2", icon: Wand2, color: "text-purple-600", bgColor: "bg-purple-100", description: "عصا سحرية" },
        { name: "Feather", icon: Feather, color: "text-indigo-500", bgColor: "bg-indigo-100", description: "ريشة" },
        { name: "Palette", icon: Palette, color: "text-pink-500", bgColor: "bg-pink-100", description: "لوحة ألوان" },
        { name: "Sparkle", icon: Sparkle, color: "text-yellow-400", bgColor: "bg-yellow-50", description: "بريق واحد" },
      ]
    }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto" dir="rtl">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        جميع الأيقونات المتاحة للهدايا
      </h2>
      
      {iconGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
            {group.category}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {group.icons.map((iconData, iconIndex) => {
              const IconComponent = iconData.icon;
              return (
                <div 
                  key={iconIndex}
                  className={`p-4 ${iconData.bgColor} rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer`}
                >
                  <div className="flex flex-col items-center text-center">
                    <IconComponent className={`w-8 h-8 ${iconData.color} mb-2`} />
                    <span className="text-sm font-medium text-gray-700">
                      {iconData.name}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {iconData.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* اقتراحات للاستخدام */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <h4 className="font-semibold text-gray-700 mb-3">💡 اقتراحات للاستخدام:</h4>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            <span><strong>للوردة (100 نقطة):</strong> Heart + Sparkles أو Flower</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-blue-500" />
            <span><strong>للألماسة (5000 نقطة):</strong> Gem + Crown أو Diamond + Sparkles</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span><strong>للجوائز الخاصة:</strong> Trophy, Award, Medal</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-600" />
            <span><strong>للهدايا السحرية:</strong> Wand2, Stars, Zap</span>
          </div>
        </div>
      </div>

      {/* معلومة مهمة */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 text-sm text-yellow-800">
          <Crown className="w-4 h-4" />
          <span>تذكر: الألماسة ترفع المستوى إلى 20 للأعضاء فقط!</span>
        </div>
      </div>
    </div>
  );
}
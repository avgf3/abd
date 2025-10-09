import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface UsernameColorPickerProps {
  currentUser: ChatUser;
  onColorUpdate: (color: string) => void;
}

// 40 لون جميل ومتنوع - يتضمن ألوان النيون القوية والمتوهجة
const USERNAME_COLORS = [
  { name: 'أحمر', value: '#FF4444', bg: 'bg-red-500' },
  { name: 'أحمر فاتح', value: '#FF6B6B', bg: 'bg-red-400' },
  { name: 'أزرق', value: '#4A90E2', bg: 'bg-blue-500' },
  { name: 'أزرق فاتح', value: '#74B9FF', bg: 'bg-blue-400' },
  { name: 'أخضر', value: '#2ECC71', bg: 'bg-green-500' },
  { name: 'أخضر فاتح', value: '#55EFC4', bg: 'bg-green-400' },
  { name: 'أصفر', value: '#F1C40F', bg: 'bg-yellow-500' },
  { name: 'ذهبي', value: '#FFD700', bg: 'bg-yellow-400' },
  { name: 'برتقالي', value: '#FF8C00', bg: 'bg-orange-500' },
  { name: 'برتقالي فاتح', value: '#FFA726', bg: 'bg-orange-400' },
  { name: 'بنفسجي', value: '#9B59B6', bg: 'bg-purple-500' },
  { name: 'بنفسجي فاتح', value: '#A29BFE', bg: 'bg-purple-400' },
  { name: 'وردي', value: '#E91E63', bg: 'bg-pink-500' },
  { name: 'وردي فاتح', value: '#FF69B4', bg: 'bg-pink-400' },
  { name: 'فيروزي', value: '#1ABC9C', bg: 'bg-cyan-500' },
  { name: 'فيروزي فاتح', value: '#00CED1', bg: 'bg-cyan-400' },
  { name: 'بني', value: '#8B4513', bg: 'bg-amber-700' },
  { name: 'بني فاتح', value: '#CD853F', bg: 'bg-amber-600' },
  { name: 'رمادي', value: '#95A5A6', bg: 'bg-gray-500' },
  { name: 'رمادي فاتح', value: '#BDC3C7', bg: 'bg-gray-400' },
  { name: 'كحلي', value: '#2C3E50', bg: 'bg-slate-700' },
  { name: 'زهري داكن', value: '#C0392B', bg: 'bg-rose-600' },
  { name: 'زهري', value: '#E74C3C', bg: 'bg-rose-500' },
  { name: 'لايم', value: '#32CD32', bg: 'bg-lime-500' },
  { name: 'نعناعي', value: '#00FF7F', bg: 'bg-emerald-400' },
  { name: 'سماوي', value: '#87CEEB', bg: 'bg-sky-400' },
  { name: 'بحري', value: '#1E90FF', bg: 'bg-blue-600' },
  { name: 'أرجواني', value: '#8A2BE2', bg: 'bg-violet-600' },
  { name: 'مرجاني', value: '#FF7F50', bg: 'bg-orange-400' },
  
  // ألوان النيون والتوهج القوية - 10 ألوان جديدة
  { name: 'نيون أخضر سايبر', value: '#39FF14', bg: 'bg-green-400' }, // Cyber Green Neon
  { name: 'توهج ناري', value: '#FF4500', bg: 'bg-orange-600' }, // Fire Glow Orange-Red
  { name: 'نيون وردي كهربائي', value: '#FF10F0', bg: 'bg-pink-500' }, // Electric Pink Neon
  { name: 'بنفسجي كوني', value: '#9D00FF', bg: 'bg-purple-600' }, // Cosmic Purple
  { name: 'أزرق ليزر', value: '#00D4FF', bg: 'bg-cyan-400' }, // Laser Blue
  { name: 'برتقالي لافا', value: '#FF6600', bg: 'bg-orange-500' }, // Lava Orange
  { name: 'أصفر نيون', value: '#FFFF00', bg: 'bg-yellow-400' }, // Neon Yellow
  { name: 'أحمر توهج', value: '#FF0040', bg: 'bg-red-500' }, // Glowing Red
  { name: 'فيروزي كهربائي', value: '#00FFFF', bg: 'bg-cyan-300' }, // Electric Cyan
  { name: 'ماجنتا متوهج', value: '#FF00FF', bg: 'bg-fuchsia-500' }, // Glowing Magenta
];

// ألوان تدرجية خاصة بالمشرفين - من ملف ProfileModal
const MODERATOR_GRADIENT_COLORS = [
  {
    name: 'البرتقالي البني',
    value: 'linear-gradient(135deg, #3d2817 0%, #8b4513 20%, #cd853f 40%, #ff8c42 60%, #ffa366 80%, #ffb380 100%)',
    emoji: '🔥',
  },
  {
    name: 'الوردي الأحمر',
    value: 'linear-gradient(135deg, #8b4c6a 0%, #b85c8a 20%, #d97aa8 40%, #ff99c8 60%, #ffb3d0 80%, #ffc8dd 100%)',
    emoji: '❤️',
  },
  {
    name: 'البنفسجي الأرجواني',
    value: 'linear-gradient(135deg, #2d1b69 0%, #4a2d8b 20%, #6b46c1 40%, #9b72cf 60%, #b794f6 80%, #d6bcfa 100%)',
    emoji: '🌹',
  },
  {
    name: 'الأسود الأصفر',
    value: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 20%, #4a4a4a 40%, #ffd700 60%, #ffed4e 80%, #fff59d 100%)',
    emoji: '⭐',
  },
  {
    name: 'الأزرق البنفسجي الفاتح',
    value: 'linear-gradient(135deg, #00bcd4 0%, #40c4ff 20%, #7c4dff 40%, #b388ff 60%, #d1c4e9 80%, #e1bee7 100%)',
    emoji: '🌊',
  },
  {
    name: 'الأحمر الأسود',
    value: 'linear-gradient(135deg, #ff0000 0%, #cc0000 20%, #990000 40%, #660000 60%, #330000 80%, #000000 100%)',
    emoji: '💥',
  },
  {
    name: 'توهج الغروب',
    value: 'linear-gradient(135deg, #ff6b6b, #ff8e53, #ffa726, #ffcc02, #ff6b6b)',
    emoji: '🌅',
  },
  {
    name: 'أعماق المحيط',
    value: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea)',
    emoji: '🌊',
  },
];

// تأثيرات خاصة بالمشرفين - من ملف ProfileModal
const MODERATOR_EFFECTS = [
  {
    value: 'none',
    name: 'بدون تأثيرات',
    emoji: '🚫',
    description: 'بدون أي تأثيرات حركية',
  },
  {
    value: 'effect-pulse',
    name: 'النبض الناعم',
    emoji: '💓',
    description: 'نبض خفيف ومريح',
  },
  {
    value: 'effect-glow',
    name: 'التوهج الذهبي',
    emoji: '✨',
    description: 'توهج ذهبي جميل',
  },
  {
    value: 'effect-water',
    name: 'التموج المائي',
    emoji: '🌊',
    description: 'حركة مائية سلسة',
  },
  {
    value: 'effect-aurora',
    name: 'الشفق القطبي',
    emoji: '🌌',
    description: 'تأثير الشفق الملون',
  },
  {
    value: 'effect-neon',
    name: 'النيون المتوهج',
    emoji: '💖',
    description: 'توهج نيون وردي',
  },
  {
    value: 'effect-crystal',
    name: 'البلور المتلألئ',
    emoji: '💎',
    description: 'لمعة بلورية جميلة',
  },
  {
    value: 'effect-fire',
    name: 'النار المتوهجة',
    emoji: '🔥',
    description: 'توهج ناري حارق',
  },
  {
    value: 'effect-magnetic',
    name: 'المغناطيس',
    emoji: '🧲',
    description: 'حركة عائمة مغناطيسية',
  },
  {
    value: 'effect-heartbeat',
    name: 'القلب النابض',
    emoji: '❤️',
    description: 'نبض مثل القلب',
  },
  {
    value: 'effect-stars',
    name: 'النجوم المتلألئة',
    emoji: '⭐',
    description: 'نجوم متحركة',
  },
  {
    value: 'effect-rainbow',
    name: 'قوس قزح',
    emoji: '🌈',
    description: 'تدرج قوس قزح متحرك',
  },
  {
    value: 'effect-snow',
    name: 'الثلج المتساقط',
    emoji: '❄️',
    description: 'ثلج متساقط جميل',
  },
];

export default function UsernameColorPicker({
  currentUser,
  onColorUpdate,
}: UsernameColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentUser.usernameColor || '#4A90E2');
  const [selectedGradient, setSelectedGradient] = useState(currentUser.usernameGradient || '');
  const [selectedEffect, setSelectedEffect] = useState(currentUser.usernameEffect || 'none');
  const [activeTab, setActiveTab] = useState<'colors' | 'gradients' | 'effects'>('colors');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // التحقق من صلاحيات المشرف
  const isModerator = ['owner', 'admin', 'moderator'].includes(currentUser.userType);

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color);
    setSelectedGradient(''); // إزالة التدرج عند اختيار لون عادي
    setSelectedEffect('none'); // إزالة التأثير عند اختيار لون عادي
    setIsLoading(true);

    try {
      const result = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { 
          usernameColor: color,
          usernameGradient: null,
          usernameEffect: null
        },
      });

      const updated = (result as any)?.user ?? result;
      onColorUpdate((updated as any)?.usernameColor || color);

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث لون اسم المستخدم',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث لون الاسم',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradientSelect = async (gradient: string) => {
    if (!isModerator) {
      toast({
        title: 'غير مسموح',
        description: 'التدرجات متاحة للمشرفين فقط',
        variant: 'destructive',
      });
      return;
    }

    setSelectedGradient(gradient);
    setSelectedColor(''); // إزالة اللون العادي عند اختيار تدرج
    setIsLoading(true);

    try {
      const result = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { 
          usernameColor: null,
          usernameGradient: gradient,
        },
      });

      const updated = (result as any)?.user ?? result;
      onColorUpdate((updated as any)?.usernameGradient || gradient);

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث تدرج اسم المستخدم',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث التدرج',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEffectSelect = async (effect: string) => {
    if (!isModerator) {
      toast({
        title: 'غير مسموح',
        description: 'التأثيرات متاحة للمشرفين فقط',
        variant: 'destructive',
      });
      return;
    }

    setSelectedEffect(effect);
    setIsLoading(true);

    try {
      const result = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { 
          usernameEffect: effect === 'none' ? null : effect,
        },
      });

      const updated = (result as any)?.user ?? result;

      toast({
        title: 'تم بنجاح',
        description: effect === 'none' ? 'تم إزالة التأثير' : 'تم تحديث تأثير اسم المستخدم',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث التأثير',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تحديد النمط الحالي للمعاينة
  const getPreviewStyle = () => {
    // محاكاة بيانات المستخدم للمعاينة
    const previewUser = {
      ...currentUser,
      usernameColor: selectedColor,
      usernameGradient: selectedGradient,
      usernameEffect: selectedEffect,
    };
    
    if (selectedGradient) {
      return {
        background: selectedGradient,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        fontWeight: 'bold',
      };
    }
    return {
      color: selectedColor,
      fontWeight: 'bold',
    };
  };

  return (
    <Card className="bg-gray-900/95 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
          🎨 تخصيص اسم المستخدم
        </CardTitle>
        <div className="text-gray-400 text-sm">
          معاينة:{' '}
          <span 
            style={getPreviewStyle()}
            className={selectedEffect !== 'none' ? selectedEffect : ''}
          >
            {currentUser.username}
          </span>
        </div>
        
        {/* التبويبات */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={activeTab === 'colors' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('colors')}
            className="flex items-center gap-1"
          >
            🎨 الألوان
          </Button>
          {isModerator && (
            <>
              <Button
                variant={activeTab === 'gradients' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('gradients')}
                className="flex items-center gap-1"
              >
                🌈 التدرجات
              </Button>
              <Button
                variant={activeTab === 'effects' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('effects')}
                className="flex items-center gap-1"
              >
                ✨ التأثيرات
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* تبويب الألوان العادية */}
        {activeTab === 'colors' && (
          <>
            <div className="grid grid-cols-5 gap-3 max-h-80 overflow-y-auto">
              {USERNAME_COLORS.map((colorOption) => (
                <Button
                  key={colorOption.value}
                  className={`
                    h-12 w-full flex flex-col items-center justify-center p-2 text-xs
                    ${
                      selectedColor === colorOption.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900'
                        : 'hover:ring-1 hover:ring-gray-400'
                    }
                    transition-all duration-200
                  `}
                  style={{
                    backgroundColor: colorOption.value,
                    color:
                      colorOption.value === '#FFFFFF' ||
                      colorOption.value === '#F1C40F' ||
                      colorOption.value === '#FFD700' ||
                      colorOption.value === '#FFFF00' || // أصفر نيون
                      colorOption.value === '#00FFFF' || // فيروزي كهربائي
                      colorOption.value === '#39FF14'    // نيون أخضر سايبر
                        ? '#000'
                        : '#FFF',
                  }}
                  onClick={() => handleColorSelect(colorOption.value)}
                  disabled={isLoading}
                  title={colorOption.name}
                >
                  {selectedColor === colorOption.value && <div className="text-xs">✓</div>}
                </Button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-300 mb-2">لون مخصص:</div>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-12 h-8 rounded border border-gray-600"
                />
                <Button
                  size="sm"
                  onClick={() => handleColorSelect(selectedColor)}
                  disabled={isLoading}
                  className="glass-effect"
                >
                  {isLoading ? 'جاري التحديث...' : 'تطبيق'}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* تبويب التدرجات (للمشرفين فقط) */}
        {activeTab === 'gradients' && isModerator && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <div className="text-sm text-gray-300 mb-3 p-2 bg-blue-900/30 rounded-lg">
              ⭐ التدرجات متاحة للمشرفين فقط
            </div>
            {MODERATOR_GRADIENT_COLORS.map((gradient) => (
              <Button
                key={gradient.name}
                className={`
                  h-16 w-full flex items-center gap-3 p-3 text-sm
                  ${
                    selectedGradient === gradient.value
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900'
                      : 'hover:ring-1 hover:ring-gray-400'
                  }
                  transition-all duration-200 bg-gray-800 hover:bg-gray-700
                `}
                onClick={() => handleGradientSelect(gradient.value)}
                disabled={isLoading}
              >
                <div 
                  className="w-12 h-12 rounded-full border-2 border-white/30"
                  style={{ background: gradient.value }}
                />
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">
                    {gradient.emoji} {gradient.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    تدرج لوني متقدم
                  </div>
                </div>
                {selectedGradient === gradient.value && (
                  <div className="text-green-400">✓</div>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* تبويب التأثيرات (للمشرفين فقط) */}
        {activeTab === 'effects' && isModerator && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <div className="text-sm text-gray-300 mb-3 p-2 bg-purple-900/30 rounded-lg">
              ✨ التأثيرات متاحة للمشرفين فقط
            </div>
            {MODERATOR_EFFECTS.map((effect) => (
              <Button
                key={effect.value}
                className={`
                  h-16 w-full flex items-center gap-3 p-3 text-sm
                  ${
                    selectedEffect === effect.value
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900'
                      : 'hover:ring-1 hover:ring-gray-400'
                  }
                  transition-all duration-200 bg-gray-800 hover:bg-gray-700
                `}
                onClick={() => handleEffectSelect(effect.value)}
                disabled={isLoading}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
                  {effect.emoji}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">
                    {effect.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {effect.description}
                  </div>
                </div>
                {selectedEffect === effect.value && (
                  <div className="text-green-400">✓</div>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* رسالة للأعضاء العاديين عند محاولة الوصول للمميزات */}
        {(activeTab === 'gradients' || activeTab === 'effects') && !isModerator && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
              مميزات المشرفين
            </h3>
            <p className="text-gray-400 mb-4">
              {activeTab === 'gradients' ? 'التدرجات' : 'التأثيرات'} متاحة للمشرفين والإداريين فقط
            </p>
            <Button
              variant="outline"
              onClick={() => setActiveTab('colors')}
              className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
            >
              العودة للألوان العادية
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

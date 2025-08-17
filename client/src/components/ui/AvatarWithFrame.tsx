import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '../../lib/utils';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pixelSize?: number; // قياس مخصص بالإمكانات
  innerScale?: number; // نسبة حجم الصورة داخل الإطار (افتراض 0.8)
  className?: string;
  onClick?: () => void;
}

const frameSizes = {
  sm: { avatar: 'h-8 w-8', frame: 'h-12 w-12' },
  md: { avatar: 'h-10 w-10', frame: 'h-14 w-14' },
  lg: { avatar: 'h-12 w-12', frame: 'h-16 w-16' },
  xl: { avatar: 'h-16 w-16', frame: 'h-20 w-20' }
};

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  size = 'md',
  pixelSize,
  innerScale = 0.8,
  className,
  onClick 
}: AvatarWithFrameProps) {
  const sizes = frameSizes[size];

  const containerStyle: React.CSSProperties | undefined = typeof pixelSize === 'number' && pixelSize > 0
    ? { width: `${pixelSize}px`, height: `${pixelSize}px` }
    : undefined;

  const avatarStyle: React.CSSProperties | undefined = typeof pixelSize === 'number' && pixelSize > 0
    ? { width: `${Math.round(pixelSize * innerScale)}px`, height: `${Math.round(pixelSize * innerScale)}px` }
    : undefined;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.includes('/default_avatar.svg')) return;
    img.src = '/default_avatar.svg';
  };

  // منع عرض إطارات الأجنحة نهائياً حتى إن كانت محفوظة للمستخدم
  const HIDDEN_FRAME_IDS = new Set([
    'enhanced-wings-frame',
    'wings-frame-silver',
    'wings-frame-royalblue',
    'wings-frame-ruby',
    'wings-frame-turquoise',
    'wings-frame-violet',
    'wings-frame-king',
    'wings-frame-queen'
  ]);

  const normalizedFrame = frame && !HIDDEN_FRAME_IDS.has(frame) ? frame : 'none';

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', containerStyle ? '' : sizes.frame, className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...(containerStyle || {}) }}
    >
      {normalizedFrame && normalizedFrame !== 'none' && (
        <img 
          src={`/${normalizedFrame}.svg`} 
          alt="Avatar Frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-20"
        />
      )}

      <Avatar className={cn(containerStyle ? '' : sizes.avatar, 'z-10')} style={avatarStyle}>
        <AvatarImage src={src || '/default_avatar.svg'} alt={alt} onError={handleImgError} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </div>
  );
}

// قائمة الإطارات المتاحة مع أسمائها بالعربية
// جميع الإطارات (بما فيها المخفية)
const allFrames = [
  { id: 'none', name: 'بدون إطار', category: 'عام' },
  
  // إطارات التاج TOP
  { id: 'enhanced-crown-frame', name: 'تاج ذهبي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-silver', name: 'تاج فضي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-rosegold', name: 'تاج ذهبي وردي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-blue', name: 'تاج أزرق TOP', category: 'تاج TOP' },
  { id: 'crown-frame-emerald', name: 'تاج زمردي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-purple', name: 'تاج بنفسجي TOP', category: 'تاج TOP' },
  
  // إطارات الأجنحة VIP
  { id: 'enhanced-wings-frame', name: 'أجنحة ذهبية VIP', category: 'أجنحة VIP', hidden: true },
  { id: 'wings-frame-silver', name: 'أجنحة فضية VIP', category: 'أجنحة VIP', hidden: true },
  { id: 'wings-frame-royalblue', name: 'أجنحة زرقاء ملكية VIP', category: 'أجنحة VIP', hidden: true },
  { id: 'wings-frame-ruby', name: 'أجنحة ياقوتية VIP', category: 'أجنحة VIP', hidden: true },
  { id: 'wings-frame-turquoise', name: 'أجنحة فيروزية VIP', category: 'أجنحة VIP', hidden: true },
  { id: 'wings-frame-violet', name: 'أجنحة بنفسجية VIP', category: 'أجنحة VIP', hidden: true },
  
  // إطارات خاصة
  { id: 'wings-frame-king', name: 'أجنحة الملك KING', category: 'خاص', hidden: true },
  { id: 'wings-frame-queen', name: 'أجنحة الملكة QUEEN', category: 'خاص', hidden: true },
  { id: 'crown-frame-classic-gold', name: 'تاج كلاسيكي ذهبي', category: 'كلاسيك' },
  { id: 'crown-frame-classic-coolpink', name: 'تاج كلاسيكي وردي', category: 'كلاسيك' },
  
  // إطارات SVIP
  { id: 'svip1-frame-gold', name: 'SVIP1 ذهبي', category: 'SVIP' },
  { id: 'svip1-frame-pink', name: 'SVIP1 وردي', category: 'SVIP' },
  { id: 'svip2-frame-gold', name: 'SVIP2 ذهبي', category: 'SVIP' },
  { id: 'svip2-frame-pink', name: 'SVIP2 وردي', category: 'SVIP' }
];

// الإطارات المتاحة للعرض والاختيار (بدون الأجنحة)
export const availableFrames = (allFrames as any[]).filter((f) => !("hidden" in f && (f as any).hidden));

// دالة مساعدة للحصول على معلومات الإطار
export function getFrameInfo(frameId: string) {
  return (allFrames as any[]).find(f => f.id === frameId) || availableFrames[0];
}
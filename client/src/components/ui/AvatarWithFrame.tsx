import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: string; // معرف ملف SVG بدون الامتداد (مثال: 'crown-frame-gold')
  imageSize: number; // قطر الصورة الحقيقي بالبكسل
  frameThickness?: number; // سُمك الإطار الذي يزيد به حجم الحاوية من جميع الجهات
  className?: string;
  onClick?: () => void;
}

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  imageSize,
  frameThickness,
  className,
  onClick
}: AvatarWithFrameProps) {
  // سمك افتراضي إذا لم يُمرر: نسبة من حجم الصورة
  const effectiveThickness = typeof frameThickness === 'number' ? frameThickness : Math.round(imageSize * 0.12);

  // الحاوية: أكبر من الصورة بمقدار السُمك من كل جانب
  const containerSize = imageSize + (effectiveThickness * 2);
  const containerStyle: React.CSSProperties = {
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    position: 'relative',
    borderRadius: '50%',
    overflow: 'hidden'
  };

  // الصورة تتموضع في المركز بحجم الصورة الحقيقي
  const avatarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${imageSize}px`,
    height: `${imageSize}px`,
    borderRadius: '50%',
    overflow: 'hidden'
  };

  // الإطار يلتزم بحجم الحاوية 100% بدون أي تجاوز
  // قص علوي لإخفاء التيجان/الأجسام وترك الحلقة/القاعدة فقط
  function getClipTopPercent(frameId?: string): number {
    if (!frameId || frameId === 'none') return 0;
    if (frameId.includes('svip')) return 22;
    if (frameId.includes('classic')) return 12;
    if (frameId.includes('crown')) return 18;
    return 0;
  }
  const clipTopPercent = getClipTopPercent(frame);
  const frameStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 20,
    clipPath: clipTopPercent > 0 ? `polygon(0 ${clipTopPercent}%, 100% ${clipTopPercent}%, 100% 100%, 0 100%)` : undefined
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.includes('/default_avatar.svg')) return;
    img.src = '/default_avatar.svg';
  };

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...containerStyle }}
    >
      <div className="rounded-full overflow-hidden" style={avatarStyle}>
        <img 
          src={src || '/default_avatar.svg'} 
          alt={alt} 
          onError={handleImgError}
          className="w-full h-full object-cover"
        />
      </div>

      {frame && frame !== 'none' && (
        <img 
          src={`/${frame}.svg`} 
          alt="Avatar Frame"
          className="pointer-events-none select-none"
          style={frameStyle}
        />
      )}
    </div>
  );
}

// قائمة الإطارات المتاحة مع أسمائها بالعربية
export const availableFrames = [
  { id: 'none', name: 'بدون إطار', category: 'عام' },
  
  // إطارات التاج TOP
  { id: 'enhanced-crown-frame', name: 'تاج ذهبي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-silver', name: 'تاج فضي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-rosegold', name: 'تاج ذهبي وردي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-blue', name: 'تاج أزرق TOP', category: 'تاج TOP' },
  { id: 'crown-frame-emerald', name: 'تاج زمردي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-purple', name: 'تاج بنفسجي TOP', category: 'تاج TOP' },
  
  // إطارات خاصة (بدون أجنحة)
  { id: 'crown-frame-classic-gold', name: 'تاج كلاسيكي ذهبي', category: 'كلاسيك' },
  { id: 'crown-frame-classic-coolpink', name: 'تاج كلاسيكي وردي', category: 'كلاسيك' },
  
  // إطارات SVIP
  { id: 'svip1-frame-gold', name: 'SVIP1 ذهبي', category: 'SVIP' },
  { id: 'svip1-frame-pink', name: 'SVIP1 وردي', category: 'SVIP' },
  { id: 'svip2-frame-gold', name: 'SVIP2 ذهبي', category: 'SVIP' },
  { id: 'svip2-frame-pink', name: 'SVIP2 وردي', category: 'SVIP' }
];

// دالة مساعدة للحصول على معلومات الإطار
export function getFrameInfo(frameId: string) {
  return availableFrames.find(f => f.id === frameId) || availableFrames[0];
}
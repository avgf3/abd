import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '../../lib/utils';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: string; // معرف ملف SVG بدون الامتداد (مثال: 'crown-frame-gold')
  imageSize: number; // قطر الصورة الحقيقي بالبكسل
  frameThickness?: number; // سُمك الإطار بالبكسل (يضاف حول الصورة)
  className?: string;
  onClick?: () => void;
  // إطار دائري بسيط باستخدام CSS border + padding
  useCircularFrame?: boolean;
  frameBorderWidth?: number; // سمك إطار CSS
  frameBorderColor?: string; // لون إطار CSS
  frameGap?: number; // مسافة بين الصورة والإطار
  // وضع العرض: full للملف الشخصي (كامل)، compact لقائمة المتصلين (مختصر)
  displayMode?: 'full' | 'compact';
}

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  imageSize,
  frameThickness,
  className,
  onClick,
  useCircularFrame = false,
  frameBorderWidth = 3,
  frameBorderColor = 'gold',
  frameGap = 0,
  displayMode = 'full'
}: AvatarWithFrameProps) {
  // حساب سُمك الإطار الفعلي
  const effectiveFrameThickness = useCircularFrame
    ? 0
    : (frame && frame !== 'none'
      ? (typeof frameThickness === 'number' ? frameThickness : Math.max(2, Math.round(imageSize * 0.15)))
      : 0);

  // في الوضع المختصر، نستخدم نفس حجم الحاوية كحجم الصورة
  // في الوضع الكامل، نزيد حجم الحاوية لاستيعاب الإطار
  const containerSize = displayMode === 'compact' 
    ? imageSize 
    : (frame && frame !== 'none' ? imageSize + (effectiveFrameThickness * 2) : imageSize);

  const containerStyle: React.CSSProperties = useCircularFrame
    ? {
      width: `${imageSize}px`,
      height: `${imageSize}px`,
      position: 'relative',
      borderRadius: '50%',
      border: `${frameBorderWidth}px solid ${frameBorderColor}`,
      padding: `${frameGap}px`,
      boxSizing: 'content-box'
    }
    : {
      width: `${containerSize}px`,
      height: `${containerSize}px`,
      position: 'relative',
      overflow: displayMode === 'compact' ? 'visible' : 'visible'
    };

  // في الوضع المختصر، الصورة تملأ الحاوية بالكامل
  // في الوضع الكامل، الصورة أصغر من الحاوية لإفساح المجال للإطار
  const avatarStyle: React.CSSProperties = displayMode === 'compact'
    ? {
      width: `${imageSize}px`,
      height: `${imageSize}px`,
      position: 'relative',
      zIndex: 10
    }
    : {
      width: `${imageSize}px`,
      height: `${imageSize}px`,
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10
    };

  // حساب حجم الإطار SVG
  const frameScale = displayMode === 'compact' ? 1.3 : 1.0;
  const frameSize = displayMode === 'compact' 
    ? imageSize * frameScale 
    : containerSize;

  const frameStyle: React.CSSProperties = displayMode === 'compact'
    ? {
      position: 'absolute',
      width: `${frameSize}px`,
      height: `${frameSize}px`,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 20,
      // في الوضع المختصر، نقص الجزء العلوي من الإطار
      clipPath: frame?.includes('crown') || frame?.includes('svip') 
        ? 'inset(15% 0 0 0)' 
        : 'none'
    }
    : {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 20
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
      <Avatar className={cn('rounded-full overflow-hidden')} style={avatarStyle}>
        <AvatarImage src={src || '/default_avatar.svg'} alt={alt} onError={handleImgError} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      {!useCircularFrame && frame && frame !== 'none' && (
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
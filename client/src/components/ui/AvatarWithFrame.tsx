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
}

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  imageSize,
  frameThickness = 8,
  className,
  onClick,
  useCircularFrame = false,
  frameBorderWidth = 3,
  frameBorderColor = 'gold',
  frameGap = 0
}: AvatarWithFrameProps) {
  // عند استخدام إطار دائري بسيط، لا نزيد أبعاد المحتوى يدويًا
  // لأن border + padding يزيدان الحجم تلقائيًا
  // خلاف ذلك: حجم الحاوية = حجم الصورة + سُمك الإطار من الجانبين
  const containerSize = useCircularFrame
    ? imageSize
    : (frame && frame !== 'none'
      ? imageSize + (frameThickness * 2)
      : imageSize);

  const containerStyle: React.CSSProperties = useCircularFrame
    ? {
      width: `${containerSize}px`,
      height: `${containerSize}px`,
      position: 'relative',
      borderRadius: '50%',
      border: `${frameBorderWidth}px solid ${frameBorderColor}`,
      padding: `${frameGap}px`,
      boxSizing: 'content-box'
    }
    : {
      width: `${containerSize}px`,
      height: `${containerSize}px`,
      position: 'relative'
    };

  const avatarStyle: React.CSSProperties = {
    width: `${imageSize}px`,
    height: `${imageSize}px`,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
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
      <Avatar className={cn('z-10')} style={avatarStyle}>
        <AvatarImage src={src || '/default_avatar.svg'} alt={alt} onError={handleImgError} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      {!useCircularFrame && frame && frame !== 'none' && (
        <img 
          src={`/${frame}.svg`} 
          alt="Avatar Frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-20"
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
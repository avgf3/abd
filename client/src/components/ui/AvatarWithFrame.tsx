import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '../../lib/utils';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pixelSize?: number; // قياس مخصص بالبكسل
  imagePixelSize?: number; // قطر الصورة الحقيقي المطلوب
  className?: string;
  onClick?: () => void;
}

const frameSizes = {
  sm: { avatar: 'h-8 w-8', frame: 'h-8 w-8' },
  md: { avatar: 'h-10 w-10', frame: 'h-10 w-10' },
  lg: { avatar: 'h-12 w-12', frame: 'h-12 w-12' },
  xl: { avatar: 'h-16 w-16', frame: 'h-16 w-16' }
};

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  size = 'md',
  pixelSize,
  imagePixelSize,
  className,
  onClick 
}: AvatarWithFrameProps) {
  const sizes = frameSizes[size];

  // استخدام imagePixelSize إذا كان متوفرًا، وإلا استخدام pixelSize
  const actualSize = imagePixelSize || pixelSize;
  
  const containerStyle: React.CSSProperties | undefined = actualSize
    ? { 
        width: `${actualSize}px`, 
        height: `${actualSize}px`,
        position: 'relative' as const
      }
    : undefined;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.includes('/default_avatar.svg')) return;
    img.src = '/default_avatar.svg';
  };

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', containerStyle ? '' : sizes.frame, className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...(containerStyle || {}) }}
    >
      {/* الصورة الشخصية */}
      <Avatar 
        className={cn(containerStyle ? 'w-full h-full' : sizes.avatar, 'z-10')} 
      >
        <AvatarImage src={src || '/default_avatar.svg'} alt={alt} onError={handleImgError} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      {/* الإطار */}
      {frame && frame !== 'none' && (
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
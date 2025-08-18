import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: string; // معرف ملف SVG بدون الامتداد (مثال: 'crown-frame-gold')
  imageSize: number; // قطر الصورة الحقيقي بالبكسل
  className?: string;
  onClick?: () => void;
}

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  imageSize,
  className,
  onClick
}: AvatarWithFrameProps) {
  // الحاوية: نفس حجم الصورة دائماً، مع قص دائري لمنع أي تسريب خارج الحدود
  const containerStyle: React.CSSProperties = {
    width: `${imageSize}px`,
    height: `${imageSize}px`,
    position: 'relative',
    borderRadius: '50%',
    overflow: 'hidden'
  };

  // الصورة تملأ الحاوية بالكامل
  const avatarStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%'
  };

  // الإطار يلتزم بحجم الحاوية 100% بدون أي تجاوز
  // قص اختياري للجزء العلوي لإخفاء التيجان/الأجزاء العلوية غير المرغوبة
  const shouldClipTop = !!frame && (frame.includes('crown') || frame.includes('svip'));
  const frameStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 20,
    clipPath: shouldClipTop ? 'polygon(0 18%, 100% 18%, 100% 100%, 0 100%)' : undefined
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
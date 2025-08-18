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
  // إعدادات لكل إطار: سماكة نسبية وقص علوي حسب التصميم
  const frameConfig: Record<string, { thicknessRatio?: number; clipTopPercent?: number; compactFallback?: string }> = {
    // تيجان TOP المحسّنة
    'enhanced-crown-frame': { thicknessRatio: 0.16, clipTopPercent: 0 },
    'crown-frame-silver': { thicknessRatio: 0.14, clipTopPercent: 0 },
    'crown-frame-rosegold': { thicknessRatio: 0.14, clipTopPercent: 0 },
    'crown-frame-blue': { thicknessRatio: 0.14, clipTopPercent: 0 },
    'crown-frame-emerald': { thicknessRatio: 0.14, clipTopPercent: 0 },
    'crown-frame-purple': { thicknessRatio: 0.14, clipTopPercent: 0 },
    // كلاسيك بدون أجنحة
    'crown-frame-classic-gold': { thicknessRatio: 0.12, clipTopPercent: 0 },
    'crown-frame-classic-coolpink': { thicknessRatio: 0.12, clipTopPercent: 0 },
    // SVIP
    'svip1-frame-gold': { thicknessRatio: 0.16, clipTopPercent: 0 },
    'svip1-frame-pink': { thicknessRatio: 0.16, clipTopPercent: 0 },
    'svip2-frame-gold': { thicknessRatio: 0.16, clipTopPercent: 0 },
    'svip2-frame-pink': { thicknessRatio: 0.16, clipTopPercent: 0 },
    // أجنحة: بديل مضغوط تلقائي إلى كلاسيك ذهبي
    'wings-frame-king': { thicknessRatio: 0.18, clipTopPercent: 0, compactFallback: 'crown-frame-classic-gold' },
    'wings-frame-queen': { thicknessRatio: 0.18, clipTopPercent: 0, compactFallback: 'crown-frame-classic-coolpink' },
  };

  // اختيار إطار مناسب تلقائياً في الوضع المضغوط
  function resolveFrameId(baseId?: string, size?: number): string | undefined {
    if (!baseId || baseId === 'none') return baseId;
    const isCompact = typeof size === 'number' ? size < 64 : false;
    if (isCompact && frameConfig[baseId]?.compactFallback) {
      return frameConfig[baseId]!.compactFallback;
    }
    return baseId;
  }

  const resolvedFrame = resolveFrameId(frame, imageSize);
  const thicknessRatio = resolvedFrame && frameConfig[resolvedFrame]?.thicknessRatio != null ? frameConfig[resolvedFrame]!.thicknessRatio! : 0.12;
  // سمك افتراضي إذا لم يُمرر: نسبة من حجم الصورة (قابلة للتخصيص لكل إطار)
  const effectiveThickness = typeof frameThickness === 'number' ? frameThickness : Math.round(imageSize * thicknessRatio);

  // الحاوية: أكبر من الصورة بمقدار السُمك من كل جانب
  const containerSize = imageSize + (effectiveThickness * 2);
  const containerStyle: React.CSSProperties = {
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    position: 'relative',
    // السماح بظهور الزينة خارج الدائرة (أجنحة/تيجان)
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
    const cfg = frameConfig[frameId];
    return cfg?.clipTopPercent ?? 0;
  }
  const clipTopPercent = getClipTopPercent(resolvedFrame);
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

      {resolvedFrame && resolvedFrame !== 'none' && (
        <img 
          src={`/${resolvedFrame}.svg`} 
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
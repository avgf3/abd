import React, { useMemo } from 'react';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number; // pixels
  frame?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  className?: string;
}

export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
}: VipAvatarProps) {
  // تعطيل الحركة نهائياً (المطلوب نسخة ثابتة)
  // استثناء: Frame 7 (الجناح) يحتوي على حركة احترافية مخصصة
  const duration = useMemo(() => frame === 7 ? '0s' : '0s', [frame]);

  // الصورة تحتفظ بحجمها الأصلي المطلوب
  const imageSize = size;
  // الإطار (الحاوية) يتكيف ليكون أكبر من الصورة بنسبة كافية لاستيعاب الإطار بالكامل
  const frameSize = imageSize * 1.35; // الإطار أكبر بـ 35% لضمان احتواء الإطار بالكامل داخل الحاوية

  const containerStyle: React.CSSProperties & { ['--vip-spin-duration']?: string } = {
    width: frameSize,
    height: frameSize,
    // تمرير مدة الدوران عبر متغير CSS
    ['--vip-spin-duration']: duration,
  };

  const imgStyle: React.CSSProperties = {
    width: imageSize,
    height: imageSize,
  };

  // Use image-based overlay for frames 1..10 if available
  // Frame 7 uses PNG format (wing design), others use WebP
  const frameImage = frame >= 1 && frame <= 6 ? `/frames/frame${frame}.webp` : 
                     frame === 7 ? `/frames/frame7.png` :
                     frame >= 8 && frame <= 10 ? `/frames/frame${frame}.webp` : undefined;
  const hasImageOverlay = Boolean(frameImage);

  return (
    <div className={`vip-frame base ${hasImageOverlay ? 'with-image' : ''} ${`vip-frame-${frame}`} ${className}`} style={containerStyle}>
      <div className="vip-frame-inner">
        <img src={src} alt={alt} className="vip-frame-img" style={imgStyle} />
        {hasImageOverlay && (
          <img src={frameImage} alt="frame" className="vip-frame-overlay" />
        )}
      </div>
    </div>
  );
}

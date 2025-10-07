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
  const duration = useMemo(() => '0s', []);

  // الإطار أكبر من الصورة بـ 18% ليحيط بها من الخارج
  const frameSize = size * 1.18;
  // الصورة الداخلية أصغر بـ 15% من الإطار
  const imageSize = size * 0.85;

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

  // Use image-based overlay for frames 1..6 if available
  const frameImage = frame >= 1 && frame <= 10 ? `/frames/frame${frame}.webp` : undefined;
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

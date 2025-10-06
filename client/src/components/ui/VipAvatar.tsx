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
  // مدة الحركة الأصلية (سرعة مختلفة لكل إطار)
  const duration = useMemo(() => {
    const speeds = [6, 7, 5.5, 7.5, 6.5, 5.8, 6.8, 7.2, 6.2, 5.6];
    return `${speeds[(frame - 1) % speeds.length]}s`;
  }, [frame]);

  const containerStyle: React.CSSProperties & { ['--vip-spin-duration']?: string } = {
    width: size,
    height: size,
    // تمرير مدة الدوران عبر متغير CSS
    ['--vip-spin-duration']: duration,
  };

  const imgStyle: React.CSSProperties = {
    width: size,
    height: size,
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

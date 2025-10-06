import React, { useMemo, useState } from 'react';

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
  // أظهر تراكب الصورة فقط إذا تم تحميلها بنجاح
  const [overlayLoaded, setOverlayLoaded] = useState(false);
  const hasImageOverlay = Boolean(frameImage) && overlayLoaded;

  return (
    <div
      className={`vip-frame base ${hasImageOverlay ? 'with-image' : ''} ${`vip-frame-${frame}`} ${className}`}
      style={containerStyle}
    >
      <div className="vip-frame-inner">
        <img src={src} alt={alt} className="vip-frame-img" style={imgStyle} />
        {frameImage && (
          <img
            src={frameImage}
            alt=""
            aria-hidden="true"
            className="vip-frame-overlay"
            style={{ display: overlayLoaded ? 'block' : 'none' }}
            loading="lazy"
            decoding="async"
            onLoad={() => setOverlayLoaded(true)}
            onError={() => setOverlayLoaded(false)}
          />
        )}
      </div>
    </div>
  );
}

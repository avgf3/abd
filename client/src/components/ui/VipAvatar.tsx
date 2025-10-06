import React, { useMemo } from 'react';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number; // pixels
  frame?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  className?: string;
  // Optional UI refinements
  gender?: string;
  showGenderRing?: boolean;
  // Whether to render the decorative image overlay frame (gold-like webp). Defaults to true for non-list contexts.
  useImageOverlay?: boolean;
  // Tailwind ring width in px when showGenderRing is true (default 2)
  ringWidth?: number;
}

export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
  gender,
  showGenderRing = false,
  useImageOverlay = true,
  ringWidth = 2,
}: VipAvatarProps) {
  const duration = useMemo(() => {
    // منح كل إطار سرعة مختلفة قليلاً
    const speeds = [6, 7, 5.5, 7.5, 6.5, 5.8, 6.8, 7.2, 6.2, 5.6];
    return `${speeds[(frame - 1) % speeds.length]}s`;
  }, [frame]);

  const containerStyle: React.CSSProperties & { ['--vip-spin-duration']?: string } = {
    width: size,
    height: size,
    // تمرير مدة الدوران عبر متغير CSS
    ['--vip-spin-duration']: duration,
  };

  const isFemale = gender === 'female' || gender === 'أنثى';
  const genderRingClass = showGenderRing
    ? isFemale
      ? 'ring-2 ring-pink-200'
      : 'ring-2 ring-blue-200'
    : '';

  // Inner image fills the container; outer overlay aligns exactly
  const baseInnerSize = size;
  // If showing a Tailwind ring, subtract its outward thickness to avoid overlap with the animated frame
  const ringCompensation = showGenderRing ? ringWidth * 2 : 0;
  const imgStyle: React.CSSProperties = {
    width: baseInnerSize - ringCompensation,
    height: baseInnerSize - ringCompensation,
  };

  // Use image-based overlay for frames 1..6 only
  const frameImage = frame >= 1 && frame <= 6 ? `/frames/frame${frame}.webp` : undefined;
  const hasImageOverlay = Boolean(useImageOverlay && frameImage);

  return (
    <div className={`vip-frame base ${hasImageOverlay ? 'with-image' : ''} ${`vip-frame-${frame}`} ${className}`} style={containerStyle}>
      <div className="vip-frame-inner">
        <img src={src} alt={alt} className={`vip-frame-img ${genderRingClass}`} style={imgStyle} />
        {hasImageOverlay && (
          <img src={frameImage} alt="frame" className="vip-frame-overlay" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

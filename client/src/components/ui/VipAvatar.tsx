import React, { useMemo } from 'react';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number; // pixels
  frame?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  className?: string;
}

export default function VipAvatar({ src, alt = '', size = 48, frame = 1, className = '' }: VipAvatarProps) {
  const duration = useMemo(() => {
    // منح كل إطار سرعة مختلفة قليلاً
    const speeds = [6, 7, 5.5, 7.5, 6.5, 5.8, 6.8, 7.2, 6.2, 5.6];
    return `${speeds[(frame - 1) % speeds.length]}s`;
  }, [frame]);

  const containerStyle: React.CSSProperties & { [key: string]: string | number } = {
    width: size,
    height: size,
    // تمرير مدة الدوران عبر متغير CSS
    ['--vip-spin-duration']: duration,
  };

  const imgStyle: React.CSSProperties = {
    width: size - 4,
    height: size - 4,
  };

  return (
    <div className={`vip-frame base ${`vip-frame-${frame}`} ${className}`} style={containerStyle}>
      <div className="vip-frame-inner">
        <img src={src} alt={alt} className="vip-frame-img" style={imgStyle} />
      </div>
    </div>
  );
}
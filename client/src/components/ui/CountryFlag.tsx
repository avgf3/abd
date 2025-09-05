import React, { useMemo, useState, useCallback } from 'react';

import { getCountryIso2 } from '@/utils';

interface CountryFlagProps {
  country?: string | null; // قد يكون اسم، إيموجي، أو كود ISO-2
  iso2?: string | null;    // خيار: تمرير ISO-2 مباشرة لتجاوز التحويل
  title?: string;
  size?: number;           // العرض والارتفاع بالبكسل
  className?: string;
  style?: React.CSSProperties;
  rounded?: boolean;       // بعض الأعلام تبدو أفضل بدون تدوير
}

// مكوّن موحد لعرض علم الدولة باستخدام صور SVG من FlagCDN
// المصدر: https://flagcdn.com/{lower-iso}.svg
export default function CountryFlag({
  country,
  iso2,
  title,
  size = 20,
  className = '',
  style,
  rounded = false,
}: CountryFlagProps) {
  const code = (iso2 || getCountryIso2(country) || '').toLowerCase();
  const [sourceIndex, setSourceIndex] = useState(0);
  if (!code || code.length !== 2) return null;

  const sources = useMemo(() => [
    `https://flagcdn.com/${code}.svg`,
    `https://cdn.jsdelivr.net/npm/country-flag-icons/3x2/${code.toUpperCase()}.svg`,
    `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/6.6.6/flags/4x3/${code}.svg`,
    `/flags/${code}.svg`,
  ], [code]);

  const currentSrc = sources[Math.min(sourceIndex, sources.length - 1)];
  const alt = title || country || code.toUpperCase();
  const borderRadius = rounded ? 999 : 2;

  const handleError = useCallback(() => {
    setSourceIndex((idx) => (idx + 1 < sources.length ? idx + 1 : idx));
  }, [sources.length]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        objectFit: 'cover',
        borderRadius,
        verticalAlign: 'middle',
        ...style,
      }}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={handleError}
    />
  );
}


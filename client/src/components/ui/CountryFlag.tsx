import React from 'react';

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
  if (!code || code.length !== 2) return null;

  const src = `https://flagcdn.com/${code}.svg`;
  const alt = title || country || code.toUpperCase();

  const borderRadius = rounded ? 999 : 2;

  return (
    <img
      src={src}
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
    />
  );
}


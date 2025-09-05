import React, { useMemo, useState } from 'react';

import { getCountryFlag, getCountryIso2, getFlagImageSrc } from '@/utils';

interface FlagImageProps {
  country?: string;
  size?: number; // العرض بالبكسل، الارتفاع يتم حسابه بنسبة 3:4
  className?: string;
  title?: string;
}

export default function FlagImage({ country, size = 20, className = '', title }: FlagImageProps) {
  const [imageError, setImageError] = useState(false);
  const iso2 = useMemo(() => (country ? getCountryIso2(country) : null), [country]);
  const src = useMemo(() => (iso2 ? getFlagImageSrc(iso2) : country ? getFlagImageSrc(country) : null), [iso2, country]);
  const emoji = useMemo(() => (country ? getCountryFlag(country) : null), [country]);

  const height = Math.round((size * 3) / 4);

  if (!country) return null;

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={country}
        width={size}
        height={height}
        className={className}
        loading="lazy"
        decoding="async"
        title={title || country}
        onError={() => setImageError(true)}
        style={{ display: 'inline-block', border: 'none', background: 'transparent' }}
      />
    );
  }

  if (emoji) {
    return (
      <span
        title={title || country}
        style={{
          width: size,
          height,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
        }}
      >
        <span style={{ fontSize: Math.max(12, Math.round(size * 0.7)), lineHeight: 1 }}>{emoji}</span>
      </span>
    );
  }

  return null;
}


import React from 'react';
import { getIso2FromCountry, getFlagSvgUrl } from '@/utils/countryUtils';
import { getCountryFlag } from '@/utils';

interface CountryFlagProps extends React.HTMLAttributes<HTMLSpanElement> {
  country?: string | null;
  size?: number; // px
  rounded?: boolean;
  titleText?: string;
}

export default function CountryFlag({
  country,
  size = 16,
  rounded = false,
  titleText,
  className = '',
  ...rest
}: CountryFlagProps) {
  if (!country) return null;

  const iso2 = getIso2FromCountry(country);
  const emoji = getCountryFlag(country || undefined);
  const title = titleText || country;

  const style: React.CSSProperties = {
    width: size,
    height: Math.round((size * 2) / 3), // 3x2 aspect
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: rounded ? 4 : 0,
    lineHeight: 1,
  };

  if (iso2) {
    const src = getFlagSvgUrl(iso2, '3x2');
    return (
      <span className={className} title={title} style={style} {...rest}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={iso2}
          width={style.width as number}
          height={style.height as number}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            // fallback to emoji
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.textContent = emoji || '';
              parent.style.fontSize = `${Math.max(12, Math.round(size * 0.85))}px`;
            }
          }}
        />
      </span>
    );
  }

  if (emoji) {
    return (
      <span className={className} title={title} style={{ ...style, fontSize: Math.max(12, Math.round(size * 0.85)) }} {...rest}>
        {emoji}
      </span>
    );
  }

  return null;
}


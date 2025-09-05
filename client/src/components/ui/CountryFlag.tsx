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
    // Prefer local CSS flag icons (no network fetch). Fallback to CDN image if CSS missing.
    const codeLower = iso2.toLowerCase();
    return (
      <span className={className} title={title} style={style} {...rest}>
        <span
          className={`fi fi-${codeLower}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onError={(e: any) => {
            try {
              // if CSS icon fails, replace with img
              const parent = e.currentTarget.parentElement as HTMLElement | null;
              if (parent) {
                parent.innerHTML = '';
                const img = document.createElement('img');
                img.src = getFlagSvgUrl(iso2, '3x2');
                img.alt = iso2;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.onerror = () => {
                  parent.textContent = emoji || '';
                  parent.style.fontSize = `${Math.max(12, Math.round(size * 0.85))}px`;
                };
                parent.appendChild(img);
              }
            } catch {}
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


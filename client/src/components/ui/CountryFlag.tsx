import React from 'react';

import { getCountryFlagUrl } from '@/utils';

interface CountryFlagProps {
  country?: string | null;
  size?: number; // pixel height; width will auto-scale for SVG
  className?: string;
  title?: string;
}

export default function CountryFlag({ country, size = 16, className = '', title }: CountryFlagProps) {
  const url = getCountryFlagUrl(country || undefined);
  if (!url) return null;

  const alt = country || 'Country flag';
  const style: React.CSSProperties = {
    width: size * 1.5, // typical flag aspect ratio ~3:2
    height: size,
    display: 'inline-block',
    objectFit: 'cover',
    borderRadius: 2,
  };

  return (
    <img
      src={url}
      alt={alt}
      title={title || country || undefined}
      style={style}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}


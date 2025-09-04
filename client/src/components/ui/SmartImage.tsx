import React, { useMemo, useState } from 'react';

import { getImageSrc, optimizeImageUrl } from '@/utils/imageUtils';

type LoadingType = 'lazy' | 'eager';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  widthPx?: number;
  heightPx?: number;
  quality?: number;
  highPriority?: boolean;
  fallbackSrc?: string;
  preferBase64?: boolean;
}

export default function SmartImage({
  src,
  alt,
  className = '',
  widthPx,
  heightPx,
  quality = 80,
  highPriority = false,
  fallbackSrc = '/default_avatar.svg',
  preferBase64 = false,
  loading: loadingProp,
  decoding: decodingProp,
  sizes: sizesProp,
  onError,
  ...rest
}: SmartImageProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = useMemo(() => {
    const base = getImageSrc(src || '', fallbackSrc, { preferBase64 });
    const optimized = optimizeImageUrl(base, {
      width: widthPx,
      height: heightPx,
      quality,
      lazy: !highPriority,
    });
    return optimized;
  }, [src, fallbackSrc, preferBase64, widthPx, heightPx, quality, highPriority]);

  const loading: LoadingType = (loadingProp as LoadingType) || (highPriority ? 'eager' : 'lazy');
  const decoding: 'async' | 'sync' | 'auto' = decodingProp || (highPriority ? 'sync' : 'async');
  const fetchPriority = highPriority ? 'high' : 'low';
  const sizes = sizesProp || (widthPx ? `${widthPx}px` : undefined);

  return (
    <img
      src={resolvedSrc.src}
      srcSet={resolvedSrc.srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority as any}
      onError={(e) => {
        setHasError(true);
        if ((e.currentTarget as HTMLImageElement).src !== fallbackSrc) {
          (e.currentTarget as HTMLImageElement).src = fallbackSrc;
        }
        if (onError) onError(e);
      }}
      {...rest}
    />
  );
}


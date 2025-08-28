import { useState, useMemo } from 'react';
import { getImageSrc } from '@/utils/imageUtils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  srcInput?: string | null | undefined;
  fallbackSrc?: string;
}

export default function SafeImage({
  srcInput,
  fallbackSrc = '/default_avatar.svg',
  alt = '',
  ...imgProps
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const resolvedSrc = useMemo(() => getImageSrc(srcInput, fallbackSrc), [srcInput, fallbackSrc]);
  const finalSrc = error ? fallbackSrc : resolvedSrc;

  return (
    <img
      {...imgProps}
      src={finalSrc}
      alt={alt}
      onError={(e) => {
        if (!error) setError(true);
        imgProps.onError?.(e as any);
      }}
    />
  );
}


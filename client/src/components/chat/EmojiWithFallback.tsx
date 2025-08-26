import React, { useState } from 'react';

interface EmojiWithFallbackProps {
  src: string;
  alt: string;
  fallbackEmoji?: string;
  className?: string;
}

export default function EmojiWithFallback({ 
  src, 
  alt, 
  fallbackEmoji = '😊',
  className = ''
}: EmojiWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <span 
        className={`${className} inline-block text-2xl`}
        title={alt}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <>
      {isLoading && (
        <span className={`${className} inline-block animate-pulse`}>
          ⏳
        </span>
      )}
      <img
        src={src}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        loading="lazy"
      />
    </>
  );
}
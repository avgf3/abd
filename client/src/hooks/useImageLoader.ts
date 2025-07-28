import { useState, useEffect, useCallback } from 'react';

interface UseImageLoaderProps {
  src: string;
  fallback: string;
}

export function useImageLoader({ src, fallback }: UseImageLoaderProps) {
  const [imageState, setImageState] = useState({
    src: fallback,
    isLoading: false,
    hasError: false
  });

  const loadImage = useCallback((imageSrc: string) => {
    if (!imageSrc || imageSrc === fallback) {
      setImageState({
        src: fallback,
        isLoading: false,
        hasError: false
      });
      return;
    }

    // إذا كانت الصورة base64، استخدمها مباشرة دون تحميل
    if (imageSrc.startsWith('data:')) {
      setImageState({
        src: imageSrc,
        isLoading: false,
        hasError: false
      });
      return;
    }

    setImageState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false
    }));

    const img = new Image();
    
    img.onload = () => {
      setImageState({
        src: imageSrc,
        isLoading: false,
        hasError: false
      });
    };

    img.onerror = () => {
      setImageState({
        src: fallback,
        isLoading: false,
        hasError: true
      });
    };

    img.src = imageSrc;
  }, [fallback]);

  useEffect(() => {
    loadImage(src);
  }, [src, loadImage]);

  return {
    src: imageState.src,
    isLoading: imageState.isLoading,
    hasError: imageState.hasError,
    reload: () => loadImage(src)
  };
}
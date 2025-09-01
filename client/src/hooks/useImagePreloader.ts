import { useState, useEffect } from 'react';

interface ImageLoadState {
  isLoading: boolean;
  hasError: boolean;
  isLoaded: boolean;
}

export const useImagePreloader = (src: string | null | undefined): ImageLoadState => {
  const [state, setState] = useState<ImageLoadState>({
    isLoading: true,
    hasError: false,
    isLoaded: false,
  });

  useEffect(() => {
    if (!src) {
      setState({ isLoading: false, hasError: false, isLoaded: false });
      return;
    }

    // إذا كانت الصورة base64، اعتبرها محملة مباشرة
    if (src.startsWith('data:')) {
      setState({ isLoading: false, hasError: false, isLoaded: true });
      return;
    }

    let img: HTMLImageElement | null = new Image();
    
    const handleLoad = () => {
      setState({ isLoading: false, hasError: false, isLoaded: true });
    };

    const handleError = () => {
      setState({ isLoading: false, hasError: true, isLoaded: false });
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    
    // بدء التحميل
    img.src = src;

    // إذا كانت الصورة محملة مسبقاً في الكاش
    if (img.complete) {
      if (img.naturalWidth > 0) {
        handleLoad();
      } else {
        handleError();
      }
    }

    return () => {
      if (img) {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        img = null;
      }
    };
  }, [src]);

  return state;
};

// دالة لتحميل مجموعة من الصور مسبقاً
export const preloadImages = (urls: (string | null | undefined)[]): Promise<void[]> => {
  const promises = urls
    .filter(url => url && !url.startsWith('data:')) // تجاهل base64 والقيم الفارغة
    .map(url => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // حتى لو فشل، نتابع
        img.src = url!;
        
        // إذا كانت محملة مسبقاً
        if (img.complete) {
          resolve();
        }
      });
    });

  return Promise.all(promises);
};

export default useImagePreloader;
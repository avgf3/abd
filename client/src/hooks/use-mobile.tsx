import { useState, useEffect } from 'react';

export function useIsMobile() {
  console.log('🔴 [use-mobile] Initial render - isMobile will be FALSE');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      
      // فحص العرض والارتفاع
      const isSmallScreen = width <= 768;
      
      // فحص User Agent للأجهزة المحمولة
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      // فحص إضافي للتأكد من كونه جهاز لمس
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const result = isSmallScreen || (isMobileUserAgent && isTouchDevice);
      console.log(`✅ [use-mobile] Device check: width=${width}, result=${result}`);
      setIsMobile(result);
    };

    console.log('⚡ [use-mobile] useEffect running - will check device NOW');
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

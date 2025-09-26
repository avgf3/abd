import { useState, useEffect } from 'react';

export function useIsMobile() {
  // تهيئة القيمة الصحيحة من البداية بدلاً من false دائماً
  const [isMobile, setIsMobile] = useState(() => {
    // SSR-safe: تحقق من وجود window أولاً
    if (typeof window === 'undefined') {
      return false; // Default for SSR
    }
    
    // نفس المنطق المستخدم في checkDevice لكن من البداية
    const width = window.innerWidth;
    const userAgent = navigator.userAgent;
    const isSmallScreen = width <= 768;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // حساب القيمة الابتدائية الصحيحة
    return isSmallScreen || (isMobileUserAgent && isTouchDevice);
  });

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
      
      setIsMobile(isSmallScreen || (isMobileUserAgent && isTouchDevice));
    };

    // لا نحتاج checkDevice() هنا لأن القيمة الابتدائية صحيحة بالفعل
    // فقط نستمع للـ resize events
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

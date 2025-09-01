import { useEffect, useState } from 'react';

// Hook لكشف الأجهزة المحمولة
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // كشف الجوال بناءً على عرض الشاشة وخصائص اللمس
    const checkMobile = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // اعتبار الجهاز محمول إذا كان العرض أقل من 768 أو كان جهاز لمس
      setIsMobile(width < 768 || (hasTouch && isMobileUA));
    };

    // فحص أولي
    checkMobile();

    // الاستماع لتغيير حجم النافذة
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);
    
    // تنظيف
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
}

import { useRef, useEffect } from 'react';

/**
 * Hook موحد لإدارة منطقة التمرير
 * يوفر إمكانيات التمرير المحسنة لجميع القوائم
 */
export function useScrollArea() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // تحسين أداء التمرير
    scrollElement.style.overscrollBehavior = 'contain';
    scrollElement.style.touchAction = 'pan-y';
    
    return () => {
      // تنظيف
    };
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior
      });
    }
  };

  return {
    scrollRef,
    scrollToBottom,
    scrollToTop
  };
}
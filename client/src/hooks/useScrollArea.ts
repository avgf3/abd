import { useRef, useEffect, useState } from 'react';

/**
 * Hook موحد لإدارة منطقة التمرير
 * يوفر إمكانيات التمرير المحسنة لجميع القوائم
 */
export function useScrollArea() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // تحسين أداء التمرير
    scrollElement.style.overscrollBehavior = 'contain';
    scrollElement.style.touchAction = 'pan-y';
  }, []);

  const updateIsAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80; // px
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);
  };

  const onScroll = () => {
    updateIsAtBottom();
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
      // تحديث الحالة مباشرةً لتحسين استجابة زر التمرير
      setIsAtBottom(true);
    }
  };

  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior
      });
      // عند الصعود للأعلى قطعاً لسنا في الأسفل
      setIsAtBottom(false);
    }
  };

  return {
    scrollRef,
    scrollToBottom,
    scrollToTop,
    isAtBottom,
    onScroll,
  };
}
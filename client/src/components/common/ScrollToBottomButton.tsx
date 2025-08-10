import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  /** pixels from bottom-right/left */
  offset?: number;
  /** additional classes for the button */
  className?: string;
  /** if true, places the button on the left to better fit RTL UIs */
  rtlLeftPlacement?: boolean;
  /** optional title/aria label */
  label?: string;
}

export default function ScrollToBottomButton({
  targetRef,
  offset = 12,
  className = '',
  rtlLeftPlacement = true,
  label = 'الانتقال إلى الأسفل'
}: ScrollToBottomButtonProps) {
  const [visible, setVisible] = useState(false);

  const updateVisibility = useMemo(() => {
    return () => {
      const el = targetRef.current as HTMLElement | null;
      if (!el) {
        setVisible(false);
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isScrollable = scrollHeight > clientHeight + 4;
      const nearBottom = scrollTop >= scrollHeight - clientHeight - 32;
      setVisible(isScrollable && !nearBottom);
    };
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef.current as HTMLElement | null;
    if (!el) return;

    updateVisibility();

    const onScroll = () => updateVisibility();
    el.addEventListener('scroll', onScroll, { passive: true });

    // Observe size/content changes to recalc visibility
    const ro = new ResizeObserver(() => updateVisibility());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      try { ro.disconnect(); } catch {}
    };
  }, [targetRef, updateVisibility]);

  if (!visible) return null;

  const positionStyle = rtlLeftPlacement
    ? { left: `${offset}px`, right: 'auto' as const }
    : { right: `${offset}px`, left: 'auto' as const };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        const el = targetRef.current as HTMLElement | null;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }}
      className={[
        'absolute z-20 bottom-3 rounded-full shadow-lg bg-primary text-primary-foreground',
        'hover:bg-primary/90 transition-colors h-10 w-10 flex items-center justify-center',
        'border border-primary/30',
        className,
      ].join(' ')}
      style={positionStyle}
    >
      <ArrowDown className="w-5 h-5" />
    </button>
  );
}
import React, { ReactNode, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MobileScrollAreaProps {
  children: ReactNode;
  className?: string;
  pullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  horizontal?: boolean;
}

export const MobileScrollArea: React.FC<MobileScrollAreaProps> = ({
  children,
  className,
  pullToRefresh = false,
  onRefresh,
  horizontal = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !pullToRefresh) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (scrollElement.scrollTop === 0) {
        startY = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      
      if (distance > 0 && scrollElement.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, 150));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 80 && onRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setIsPulling(false);
      setPullDistance(0);
    };

    scrollElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart);
      scrollElement.removeEventListener('touchmove', handleTouchMove);
      scrollElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, onRefresh, isRefreshing, pullToRefresh]);

  return (
    <div className="relative w-full h-full">
      {pullToRefresh && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10',
            pullDistance > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            height: `${pullDistance}px`,
            transform: `translateY(-${pullDistance}px)`,
          }}
        >
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">جاري التحديث...</span>
              </>
            ) : (
              <>
                <svg
                  className={cn(
                    'w-5 h-5 text-muted-foreground transition-transform',
                    pullDistance > 80 ? 'rotate-180' : ''
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span className="text-sm text-muted-foreground">
                  {pullDistance > 80 ? 'اترك للتحديث' : 'اسحب للتحديث'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      
      <div
        ref={scrollRef}
        className={cn(
          'w-full h-full',
          horizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden',
          'overscroll-behavior-contain',
          '-webkit-overflow-scrolling-touch',
          'scroll-smooth',
          className
        )}
        style={{
          transform: pullToRefresh && pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};
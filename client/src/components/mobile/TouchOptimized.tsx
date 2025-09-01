import React, { ReactNode, TouchEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface TouchOptimizedProps {
  children: ReactNode;
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TouchOptimized: React.FC<TouchOptimizedProps> = ({
  children,
  onTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  className,
  disabled = false,
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    });

    // Long press detection
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress();
        setTouchStart(null);
      }, 500);
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (disabled || !touchStart) return;

    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Detect tap (small movement and short time)
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
      if (onTap) {
        e.preventDefault();
        onTap();
      }
    }

    // Detect swipe (horizontal movement > 50px)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
      if (deltaX > 0 && onSwipeRight) {
        e.preventDefault();
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        e.preventDefault();
        onSwipeLeft();
      }
    }

    setTouchStart(null);
  };

  const handleTouchCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStart(null);
  };

  return (
    <div
      className={cn(
        'touch-none select-none',
        'active:opacity-80 transition-opacity duration-150',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {children}
    </div>
  );
};
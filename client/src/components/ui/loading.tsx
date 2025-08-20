import React from 'react';

import { cn } from '@/lib/utils';

// أنواع أنماط التحميل
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'bars';

interface LoadingProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  message?: string;
  className?: string;
  fullScreen?: boolean;
  color?: string;
}

// أحجام مختلفة للمؤشرات
const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

// مؤشر دوراني
export const Spinner: React.FC<LoadingProps> = ({
  size = 'md',
  className,
  color = 'text-blue-600',
}) => (
  <div
    className={cn(
      'animate-spin rounded-full border-2 border-gray-300 border-t-current',
      sizeClasses[size],
      color,
      className
    )}
  />
);

// نقاط متحركة
export const DotsLoader: React.FC<LoadingProps> = ({
  size = 'md',
  className,
  color = 'bg-blue-600',
}) => {
  const dotSize = size === 'sm' ? 'w-1 h-1' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2';

  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('rounded-full animate-pulse', dotSize, color)}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.2s',
          }}
        />
      ))}
    </div>
  );
};

// نبضات
export const PulseLoader: React.FC<LoadingProps> = ({
  size = 'md',
  className,
  color = 'bg-blue-600',
}) => <div className={cn('rounded-full animate-pulse', sizeClasses[size], color, className)} />;

// أشرطة متحركة
export const BarsLoader: React.FC<LoadingProps> = ({
  size = 'md',
  className,
  color = 'bg-blue-600',
}) => {
  const barHeight = size === 'sm' ? 'h-3' : size === 'lg' ? 'h-6' : 'h-4';

  return (
    <div className={cn('flex items-end space-x-1', className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn('w-1 animate-pulse', barHeight, color)}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
};

// هيكل تحميل النص
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'h-4 bg-gray-300 rounded animate-pulse',
          i === lines - 1 ? 'w-3/4' : 'w-full'
        )}
      />
    ))}
  </div>
);

// هيكل تحميل الصورة
export const ImageSkeleton: React.FC<{ className?: string; aspectRatio?: string }> = ({
  className,
  aspectRatio = 'aspect-square',
}) => <div className={cn('bg-gray-300 rounded animate-pulse', aspectRatio, className)} />;

// هيكل تحميل البطاقة
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 space-y-3', className)}>
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-300 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-300 rounded animate-pulse w-1/4" />
      </div>
    </div>
    <TextSkeleton lines={2} />
  </div>
);

// مؤشر تحميل شامل
export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  message,
  className,
  fullScreen = false,
  color,
}) => {
  const LoadingComponent = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader size={size} color={color} />;
      case 'pulse':
        return <PulseLoader size={size} color={color} />;
      case 'bars':
        return <BarsLoader size={size} color={color} />;
      case 'skeleton':
        return <TextSkeleton />;
      default:
        return <Spinner size={size} color={color} />;
    }
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <LoadingComponent />
      {message && <p className="text-sm text-gray-600 animate-pulse">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

// مؤشر تحميل الصفحة
export const PageLoader: React.FC<{ message?: string }> = ({ message = 'جاري التحميل...' }) => (
  <Loading fullScreen size="lg" variant="spinner" message={message} className="space-y-4" />
);

// مؤشر تحميل الزر
export const ButtonLoader: React.FC<{ size?: LoadingSize }> = ({ size = 'sm' }) => (
  <Spinner size={size} className="mr-2" />
);

// مؤشر تحميل مضمن
export const InlineLoader: React.FC<LoadingProps> = (props) => (
  <Loading {...props} className={cn('py-4', props.className)} />
);

// هوك للتحكم في حالة التحميل
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(() => setIsLoading((prev) => !prev), []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading,
  };
};

// مؤشر تقدم
export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
  showPercent?: boolean;
  color?: string;
}> = ({ progress, className, showPercent = false, color = 'bg-blue-600' }) => (
  <div className={cn('w-full', className)}>
    <div className="flex justify-between items-center mb-1">
      {showPercent && <span className="text-sm text-gray-600">{Math.round(progress)}%</span>}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={cn('h-2 rounded-full transition-all duration-300', color)}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

// مؤشر تحميل للقوائم
export const ListLoader: React.FC<{
  items?: number;
  itemHeight?: string;
  className?: string;
}> = ({ items = 5, itemHeight = 'h-16', className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className={cn('bg-gray-300 rounded animate-pulse', itemHeight)} />
    ))}
  </div>
);

export default Loading;

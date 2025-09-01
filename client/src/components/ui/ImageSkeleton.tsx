import React from 'react';

interface ImageSkeletonProps {
  type?: 'avatar' | 'banner';
  className?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ 
  type = 'avatar', 
  className = '' 
}) => {
  if (type === 'banner') {
    return (
      <div className={`animate-pulse bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 ${className}`}>
        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
    );
  }

  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-full ${className}`}>
      <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer rounded-full" />
    </div>
  );
};

export default ImageSkeleton;
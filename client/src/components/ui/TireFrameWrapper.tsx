import React from 'react';

interface TireFrameWrapperProps {
  children: React.ReactNode;
  size: number;
  frameNumber?: number;
  className?: string;
}

/**
 * مكون بسيط لتركيب إطار الإطار حول الصورة
 * Simple component for mounting tire frame around image
 */
export default function TireFrameWrapper({
  children,
  size,
  frameNumber = 1,
  className = '',
}: TireFrameWrapperProps) {
  // حجم الإطار = حجم الصورة + 16px (8px من كل جانب)
  const frameSize = size + 16;
  
  // مصدر صورة الإطار
  const frameSrc = `/frames/frame${frameNumber}.webp`;

  return (
    <div
      className={`tire-frame-container ${className}`}
      style={{
        position: 'relative',
        width: frameSize,
        height: frameSize,
        display: 'inline-block',
      }}
    >
      {/* الصورة الأساسية */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      
      {/* إطار الإطار */}
      <img
        src={frameSrc}
        alt="tire frame"
        className="tire-frame-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: frameSize,
          height: frameSize,
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 10,
        }}
        onError={(e) => {
          // إخفاء الإطار في حالة عدم وجود الصورة
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
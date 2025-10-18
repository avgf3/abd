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
 * 
 * ✅ إصلاح شامل: الإطار يلتف حول الصورة بشكل مثالي في جميع الأحجام
 */
export default function TireFrameWrapper({
  children,
  size,
  frameNumber = 1,
  className = '',
}: TireFrameWrapperProps) {
  // ✅ حساب حجم الإطار بشكل نسبي أفضل
  // للصور الصغيرة: نسبة أكبر (35%)
  // للصور المتوسطة والكبيرة: نسبة معتدلة (25-30%)
  const framePercentage = size <= 40 ? 0.40 : size <= 60 ? 0.35 : 0.30;
  const framePadding = Math.round(size * framePercentage);
  const frameSize = size + (framePadding * 2);
  
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
          zIndex: 1,
        }}
      >
        {children}
      </div>
      
      {/* إطار الإطار - يلتف حول الصورة بالكامل */}
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
          objectFit: 'cover',
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
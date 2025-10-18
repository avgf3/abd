import React, { useState } from 'react';
import TireFrameWrapper from './TireFrameWrapper';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number;
  frame?: number;
  className?: string;
}

/**
 * مكون بسيط لعرض الصورة الشخصية مع إطار الإطار
 * Simple component for displaying profile image with tire frame
 */
export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
}: VipAvatarProps) {
  // إذا كان هناك إطار، استخدم TireFrameWrapper
  if (frame && frame > 0) {
    return (
      <TireFrameWrapper size={size} frameNumber={frame} className={className}>
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== '/default_avatar.svg') {
              e.currentTarget.src = '/default_avatar.svg';
            }
          }}
        />
      </TireFrameWrapper>
    );
  }

  // بدون إطار - صورة بسيطة
  return (
    <div
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src !== '/default_avatar.svg') {
            e.currentTarget.src = '/default_avatar.svg';
          }
        }}
      />
    </div>
  );
}

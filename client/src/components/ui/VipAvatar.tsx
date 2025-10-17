/* @jsxRuntime classic */
/* @jsx React.createElement */
import React, { useState, useEffect } from 'react';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number;
  frame?: number;
  className?: string;
}

export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
}: VipAvatarProps) {
  // Simple frame validation
  const hasValidFrame = Number.isFinite(frame as number) && (frame as number) > 0;
  const frameNumber = hasValidFrame
    ? Math.max(1, Math.min(50, Math.floor(frame as number)))
    : undefined;

  // Simple overlay source with fallback
  const overlayBase = frameNumber ? `/frames/frame${frameNumber}` : undefined;
  const [overlaySrc, setOverlaySrc] = useState<string | undefined>(
    overlayBase ? `${overlayBase}.webp` : undefined
  );
  const [fallbackStep, setFallbackStep] = useState<number>(0);

  useEffect(() => {
    setOverlaySrc(overlayBase ? `${overlayBase}.webp` : undefined);
    setFallbackStep(0);
  }, [overlayBase]);

  const hasImageOverlay = Boolean(overlaySrc);

  // Simple, clean styles - no complex calculations
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'inline-block',
  };

  const imgStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    pointerEvents: 'none',
    zIndex: 1,
  };

  return (
    <div
      className={`vip-avatar ${hasImageOverlay ? 'with-frame' : ''} ${
        frameNumber ? `frame-${frameNumber}` : ''
      } ${className}`}
      style={containerStyle}
    >
      <img 
        src={src} 
        alt={alt} 
        className="vip-avatar-img" 
        style={imgStyle} 
      />
      {overlaySrc && (
        <img
          src={overlaySrc}
          alt="frame"
          className="vip-avatar-overlay"
          style={overlayStyle}
          onError={(e) => {
            try {
              const cur = overlaySrc || '';
              if (fallbackStep === 0 && /\.webp(\?.*)?$/i.test(cur)) {
                setOverlaySrc(cur.replace(/\.webp(\?.*)?$/i, '.png$1'));
                setFallbackStep(1);
                return;
              }
              if (fallbackStep === 1 && /\.png(\?.*)?$/i.test(cur)) {
                setOverlaySrc(cur.replace(/\.png(\?.*)?$/i, '.jpg$1'));
                setFallbackStep(2);
                return;
              }
              if (fallbackStep === 2 && /\.jpg(\?.*)?$/i.test(cur)) {
                setOverlaySrc(cur.replace(/\.jpg(\?.*)?$/i, '.jpeg$1'));
                setFallbackStep(3);
                return;
              }
              // Hide overlay if all fallbacks fail
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              setOverlaySrc(undefined);
            } catch {}
          }}
        />
      )}
    </div>
  );
}
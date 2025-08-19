import React from 'react';
import { cn } from '../../lib/utils';
import { computeFrameMetrics, getAvailableFrames, getFrameImagePath, resolveFrameId, type AvatarFrameId, type AvatarVariant } from '@/utils/avatarFrame';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  frame?: AvatarFrameId;
  /** Diameter of the avatar image itself in pixels */
  size: number;
  /**
   * Variant: 'profile' shows full frame outside the image (container expands),
   * 'list' clips top ornaments so only ring/base fits inside the given size.
   */
  variant?: AvatarVariant;
  /**
   * When true, render only the ring part of the frame inside the given size (no container expansion).
   * In contacts list we still want the visual frame to be slightly larger than the avatar, so we
   * expand by the computed thickness outside without covering the image.
   */
  ringOnly?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AvatarWithFrame({ 
  src, 
  alt, 
  frame = 'none', 
  size,
  variant = 'profile',
  ringOnly = false,
  className,
  onClick
}: AvatarWithFrameProps) {
  const resolved = resolveFrameId(frame, size);
  // Force list-like metrics when ringOnly to avoid container expansion and clip top ornaments
  const { imageSize, thicknessPx, containerSize, clipPath } = computeFrameMetrics({ size, frameId: resolved, variant: ringOnly ? 'list' : variant });

  // In list variant, keep the avatar image at requested size, but visually allow the frame to extend outside
  // by padding equal to thickness. This keeps layout consistent and makes frame bigger than the avatar.
  const containerStyle: React.CSSProperties = (() => {
    if (variant === 'list' || ringOnly) {
      return {
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        overflow: 'visible'
      } as React.CSSProperties;
    }
    return {
      width: `${containerSize}px`,
      height: `${containerSize}px`,
      position: 'relative'
    } as React.CSSProperties;
  })();

  const avatarStyle: React.CSSProperties = (() => {
    if (variant === 'list' || ringOnly) {
      return {
        position: 'relative',
        width: `${imageSize}px`,
        height: `${imageSize}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        zIndex: 10
      } as React.CSSProperties;
    }
    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${imageSize}px`,
      height: `${imageSize}px`,
      borderRadius: '50%',
      overflow: 'hidden'
    } as React.CSSProperties;
  })();

  const frameStyle: React.CSSProperties = (() => {
    if (variant === 'list' || ringOnly) {
      // Draw the frame outside the avatar by expanding with negative offsets around the avatar box
      const pad = thicknessPx;
      return {
        position: 'absolute',
        top: `-${pad}px`,
        left: `-${pad}px`,
        right: `-${pad}px`,
        bottom: `-${pad}px`,
        width: `calc(100% + ${pad * 2}px)`,
        height: `calc(100% + ${pad * 2}px)`,
        pointerEvents: 'none',
        zIndex: 20,
        clipPath: clipPath
      } as React.CSSProperties;
    }
    return {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 20,
      clipPath: undefined
    } as React.CSSProperties;
  })();

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.includes('/default_avatar.svg')) return;
    img.src = '/default_avatar.svg';
  };

  const frameSrc = getFrameImagePath(resolved);

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...containerStyle }}
    >
      <div className="rounded-full overflow-hidden" style={avatarStyle}>
        <img 
          src={src || '/default_avatar.svg'} 
          alt={alt} 
          onError={handleImgError}
          className="w-full h-full object-cover"
        />
      </div>

      {frameSrc && (
        <img 
          src={frameSrc} 
          alt="Avatar Frame"
          className="pointer-events-none select-none"
          style={frameStyle}
        />
      )}
    </div>
  );
}

export const availableFrames = getAvailableFrames();
export function getFrameInfo(frameId: AvatarFrameId) {
  return availableFrames.find(f => f.id === frameId) || availableFrames[0];
}
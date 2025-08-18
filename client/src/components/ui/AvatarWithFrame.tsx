import React from 'react';
import { cn } from '../../lib/utils';
import { computeFrameMetrics, getAvailableFrames, getFrameImagePath, resolveFrameId, type AvatarFrameId, type AvatarVariant } from '@/utils/avatarFrame';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: AvatarFrameId;
  /** Diameter of the avatar image itself in pixels */
  size: number;
  /**
   * Variant: 'profile' shows full frame outside the image (container expands),
   * 'list' clips top ornaments so only ring/base fits inside the given size.
   */
  variant?: AvatarVariant;
  className?: string;
  onClick?: () => void;
}

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  size,
  variant = 'profile',
  className,
  onClick
}: AvatarWithFrameProps) {
  const resolved = resolveFrameId(frame, size);
  const { imageSize, thicknessPx, containerSize, clipPath } = computeFrameMetrics({ size, frameId: resolved, variant });

  const containerStyle: React.CSSProperties = {
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    position: 'relative'
  };

  const avatarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${imageSize}px`,
    height: `${imageSize}px`,
    borderRadius: '50%',
    overflow: 'hidden'
  };

  const frameStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 20,
    clipPath: variant === 'list' ? clipPath : undefined
  };

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
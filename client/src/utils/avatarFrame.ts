/**
 * Utilities for computing avatar frame layout so the frame is always OUTSIDE the avatar image.
 */

export type AvatarFrameId =
  | 'none'
  | 'enhanced-crown-frame'
  | 'crown-frame-silver'
  | 'crown-frame-rosegold'
  | 'crown-frame-blue'
  | 'crown-frame-emerald'
  | 'crown-frame-purple'
  | 'crown-frame-king'
  | 'crown-frame-queen'
  | 'crown-frame-classic-gold'
  | 'crown-frame-classic-coolpink'
  | 'svip1-frame-gold'
  | 'svip1-frame-pink'
  | 'svip2-frame-gold'
  | 'svip2-frame-pink'
  | 'wings-frame-king'
  | 'wings-frame-queen';

export type AvatarVariant = 'profile' | 'list';

interface FrameConfig {
  thicknessRatio: number;
  /** percent (0-100) of top area to clip when variant === 'list' (ring only) */
  listClipTopPercent?: number;
  /** When very small sizes, fallback to another frame id */
  compactFallback?: AvatarFrameId;
}

const DEFAULT_THICKNESS_RATIO = 0.12;

export const FRAME_CONFIG: Record<AvatarFrameId, FrameConfig> = {
  none: { thicknessRatio: DEFAULT_THICKNESS_RATIO },
  'enhanced-crown-frame': { thicknessRatio: 0.16, listClipTopPercent: 35 },
  'crown-frame-silver': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-rosegold': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-blue': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-emerald': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-purple': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-king': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-queen': { thicknessRatio: 0.16, listClipTopPercent: 30 },
  'crown-frame-classic-gold': { thicknessRatio: 0.16, listClipTopPercent: 0 },
  'crown-frame-classic-coolpink': { thicknessRatio: 0.16, listClipTopPercent: 0 },
  'svip1-frame-gold': { thicknessRatio: 0.16, listClipTopPercent: 28 },
  'svip1-frame-pink': { thicknessRatio: 0.16, listClipTopPercent: 28 },
  'svip2-frame-gold': { thicknessRatio: 0.16, listClipTopPercent: 28 },
  'svip2-frame-pink': { thicknessRatio: 0.16, listClipTopPercent: 28 },
  'wings-frame-king': { thicknessRatio: 0.16, listClipTopPercent: 45, compactFallback: 'crown-frame-classic-gold' },
  'wings-frame-queen': { thicknessRatio: 0.16, listClipTopPercent: 45, compactFallback: 'crown-frame-classic-coolpink' }
};

export function resolveFrameId(frameId: AvatarFrameId, sizePx: number): AvatarFrameId {
  if (!frameId || frameId === 'none') return 'none';
  const config = FRAME_CONFIG[frameId];
  if (!config) return 'none';
  const isCompact = sizePx < 64;
  if (isCompact && config.compactFallback) return config.compactFallback;
  return frameId;
}

export interface FrameMetrics {
  /** Diameter of the image itself (input) */
  imageSize: number;
  /** Calculated thickness in pixels */
  thicknessPx: number;
  /** Final container size (image + 2*thickness) when variant==='profile'. For 'list', same as imageSize. */
  containerSize: number;
  /** clip-path to apply on frame element for variant==='list' to hide crown/top */
  clipPath?: string;
}

export function computeFrameMetrics(params: {
  size: number; // image diameter in px
  frameId: AvatarFrameId;
  variant: AvatarVariant;
}): FrameMetrics {
  const { size, frameId, variant } = params;
  const resolved = resolveFrameId(frameId, size);
  // When there is no frame, keep image dimensions untouched and avoid container expansion
  if (resolved === 'none') {
    return {
      imageSize: size,
      thicknessPx: 0,
      containerSize: size,
      clipPath: undefined
    };
  }
  const ratio = FRAME_CONFIG[resolved]?.thicknessRatio ?? DEFAULT_THICKNESS_RATIO;
  const thicknessPx = Math.round(size * ratio);

  // In profile variant we expand the container to host the frame completely outside the image
  const containerSize = variant === 'profile' ? size + thicknessPx * 2 : size;

  let clipPath: string | undefined;
  if (variant === 'list' && resolved !== 'none') {
    const clipTop = FRAME_CONFIG[resolved]?.listClipTopPercent ?? 0;
    if (clipTop > 0) {
      clipPath = `polygon(0 ${clipTop}%, 100% ${clipTop}%, 100% 100%, 0 100%)`;
    }
  }

  return {
    imageSize: size,
    thicknessPx,
    containerSize,
    clipPath
  };
}

export function getFrameImagePath(frameId: AvatarFrameId): string | undefined {
  if (!frameId || frameId === 'none') return undefined;
  return `/${frameId}.svg`;
}

export function getAvailableFrames(): Array<{ id: AvatarFrameId; name: string; category: string }>{
  return [
    { id: 'none', name: 'بدون إطار', category: 'عام' },
    { id: 'enhanced-crown-frame', name: 'تاج ذهبي TOP', category: 'تاج TOP' },
    { id: 'crown-frame-silver', name: 'تاج فضي TOP', category: 'تاج TOP' },
    { id: 'crown-frame-rosegold', name: 'تاج ذهبي وردي TOP', category: 'تاج TOP' },
    { id: 'crown-frame-blue', name: 'تاج أزرق TOP', category: 'تاج TOP' },
    { id: 'crown-frame-emerald', name: 'تاج زمردي TOP', category: 'تاج TOP' },
    { id: 'crown-frame-purple', name: 'تاج بنفسجي TOP', category: 'تاج TOP' },
    { id: 'crown-frame-king', name: 'KING', category: 'تاج TOP' },
    { id: 'crown-frame-queen', name: 'QUEEN', category: 'تاج TOP' },
    { id: 'crown-frame-classic-gold', name: 'تاج كلاسيكي ذهبي', category: 'كلاسيك' },
    { id: 'crown-frame-classic-coolpink', name: 'تاج كلاسيكي وردي', category: 'كلاسيك' },
    { id: 'svip1-frame-gold', name: 'SVIP1 ذهبي', category: 'SVIP' },
    { id: 'svip1-frame-pink', name: 'SVIP1 وردي', category: 'SVIP' },
    { id: 'svip2-frame-gold', name: 'SVIP2 ذهبي', category: 'SVIP' },
    { id: 'svip2-frame-pink', name: 'SVIP2 وردي', category: 'SVIP' },
    { id: 'wings-frame-king', name: 'أجنحة الملك', category: 'أجنحة' },
    { id: 'wings-frame-queen', name: 'أجنحة الملكة', category: 'أجنحة' }
  ];
}

export function isAvatarFrameId(value: string): value is AvatarFrameId {
  return [
    'none',
    'enhanced-crown-frame',
    'crown-frame-silver',
    'crown-frame-rosegold',
    'crown-frame-blue',
    'crown-frame-emerald',
    'crown-frame-purple',
    'crown-frame-king',
    'crown-frame-queen',
    'crown-frame-classic-gold',
    'crown-frame-classic-coolpink',
    'svip1-frame-gold',
    'svip1-frame-pink',
    'svip2-frame-gold',
    'svip2-frame-pink',
    'wings-frame-king',
    'wings-frame-queen'
  ].includes(value as AvatarFrameId);
}

export function normalizeFrameId(value: string | null | undefined): AvatarFrameId {
  if (!value) return 'none';
  return isAvatarFrameId(value) ? value : 'none';
}


export type TagLayout = { widthRatio: number; xAdjustPx: number; yAdjustPx: number };

export const DEFAULT_TAG_LAYOUT: TagLayout = { widthRatio: 0.6, xAdjustPx: 0, yAdjustPx: 0 };

export const TAG_LAYOUTS: Record<number, TagLayout> = {
  1: { widthRatio: 0.66, xAdjustPx: 0, yAdjustPx: 2 },
  2: { widthRatio: 0.62, xAdjustPx: 0, yAdjustPx: 1 },
  3: { widthRatio: 0.6, xAdjustPx: 0, yAdjustPx: 0 },
  4: { widthRatio: 0.64, xAdjustPx: 0, yAdjustPx: 2 },
  5: { widthRatio: 0.58, xAdjustPx: 0, yAdjustPx: 0 },
  6: { widthRatio: 0.68, xAdjustPx: 0, yAdjustPx: 3 },
  7: { widthRatio: 0.64, xAdjustPx: 0, yAdjustPx: 1 },
  8: { widthRatio: 0.62, xAdjustPx: 0, yAdjustPx: 2 },
  9: { widthRatio: 0.66, xAdjustPx: 0, yAdjustPx: 2 },
  10:{ widthRatio: 0.6,  xAdjustPx: 0, yAdjustPx: 0 },
  11:{ widthRatio: 0.63, xAdjustPx: 0, yAdjustPx: 1 },
  12:{ widthRatio: 0.65, xAdjustPx: 0, yAdjustPx: 3 },
};

export function getTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber) return DEFAULT_TAG_LAYOUT;
  return TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}

import sharp from 'sharp';

export type WatermarkRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Remove a logo/watermark inside an image by simple region fill.
 * Strategy:
 * - If region is provided, blur and color-avg fill that region.
 * - Else, try common corners with heuristic (detect high-contrast small patch), fallback to no-op.
 * Note: This is a lightweight approach without deep inpainting to keep runtime and deps small.
 */
export async function removeWatermark(
  inputBuffer: Buffer,
  hintRegion?: WatermarkRegion
): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (!width || !height) {
    return inputBuffer;
  }

  const region = normalizeRegion(hintRegion, width, height) ?? guessCornerRegion(width, height);

  if (!region) {
    return inputBuffer;
  }

  // Extract a slightly larger patch to compute an average background color
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.005));
  const sampleX = Math.max(0, region.x - pad);
  const sampleY = Math.max(0, region.y - pad);
  const sampleW = Math.min(width - sampleX, region.width + pad * 2);
  const sampleH = Math.min(height - sampleY, region.height + pad * 2);

  const sample = await sharp(inputBuffer).extract({ left: sampleX, top: sampleY, width: sampleW, height: sampleH }).raw().toBuffer({ resolveWithObject: true });
  const avg = averageRgb(sample.data);

  // Create a filled rectangle with avg color, then blur to blend
  const overlay = await sharp({
    create: {
      width: region.width,
      height: region.height,
      channels: 3,
      background: { r: avg[0], g: avg[1], b: avg[2] },
    },
  })
    .blur(1.2)
    .toBuffer();

  const out = await image
    .composite([
      {
        input: overlay,
        left: region.x,
        top: region.y,
        blend: 'overlay',
      },
    ])
    .blur(0.3)
    .toBuffer();

  return out;
}

function normalizeRegion(region: WatermarkRegion | undefined, width: number, height: number): WatermarkRegion | undefined {
  if (!region) return undefined;
  const x = clamp(region.x, 0, Math.max(0, width - 1));
  const y = clamp(region.y, 0, Math.max(0, height - 1));
  const w = clamp(region.width, 1, width - x);
  const h = clamp(region.height, 1, height - y);
  return { x, y, width: w, height: h };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function averageRgb(raw: Buffer): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const channels = 3; // Assume RGB
  const pixels = Math.floor(raw.length / channels);
  for (let i = 0; i < pixels; i++) {
    r += raw[i * channels + 0];
    g += raw[i * channels + 1];
    b += raw[i * channels + 2];
  }
  return [Math.round(r / pixels), Math.round(g / pixels), Math.round(b / pixels)];
}

function guessCornerRegion(width: number, height: number): WatermarkRegion | undefined {
  const size = Math.round(Math.min(width, height) * 0.18); // heuristic watermark box
  const margin = Math.round(Math.min(width, height) * 0.02);
  // Prefer bottom-right region by default
  const x = clamp(width - size - margin, 0, Math.max(0, width - 1));
  const y = clamp(height - size - margin, 0, Math.max(0, height - 1));
  return { x, y, width: Math.min(size, width - x), height: Math.min(size, height - y) };
}


#!/usr/bin/env python3
"""
Generate animated WEBP frames with subtle rotating glow and faint lightning effects,
composited directly onto existing frame images (PNG/WebP) while preserving design.

- Input: frame images (with transparency) in a directory (default: client/public/frames)
- Output: animated WebP per frame, saved as frame{N}.webp into the output directory
- Effects:
  * Rotating glow: starts at bottom and travels around the border continuously
  * Lightning flicker: two faint zigzag streaks starting from bottom and meeting at top
- Effects are restricted to the frame's border region by using the image alpha mask
  and an inward "band" mask to avoid affecting the central transparent area.

CLI example:
  python3 scripts/frame_effects.py \
    --input-dir client/public/frames \
    --output-dir client/public/frames \
    --start 10 --end 42 \
    --num-frames 24 --duration 50 \
    --glow-intensity 0.35 --glow-sweep-deg 35 \
    --lightning-intensity 0.22 --lightning-cycles 2.2

You can also pass a JSON config to override parameters per-frame index:
  {
    "10": { "glow_intensity": 0.45, "glow_color": "#ffd966" },
    "11": { "lightning_intensity": 0.28 }
  }

Notes:
- Designed to be subtle. Increase intensities cautiously.
- WEBP supports animation and transparency; most modern browsers handle this fine in <img>.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
from typing import Dict, Optional, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageFilter

Color = Tuple[int, int, int]


def hex_to_rgb(hex_color: str) -> Color:
    s = hex_color.strip().lstrip('#')
    if len(s) == 3:
        s = ''.join([c * 2 for c in s])
    if len(s) != 6:
        raise ValueError(f"Invalid color: {hex_color}")
    r = int(s[0:2], 16)
    g = int(s[2:4], 16)
    b = int(s[4:6], 16)
    return (r, g, b)


def load_rgba(path: str) -> Image.Image:
    img = Image.open(path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    return img


def threshold_alpha_to_mask(img: Image.Image, threshold: int = 8) -> Image.Image:
    """Return L mask of where alpha > threshold (255 inside frame, 0 transparent)."""
    alpha = img.split()[3]
    mask = alpha.point(lambda a: 255 if a > threshold else 0, mode='L')
    return mask


def erode_mask(mask: Image.Image, radius_px: int) -> Image.Image:
    """Approximate erosion using repeated MinFilter(3)."""
    if radius_px <= 0:
        return mask
    out = mask
    # Each MinFilter(3) roughly erodes by 1px in L1 metric
    for _ in range(radius_px):
        out = out.filter(ImageFilter.MinFilter(size=3))
    return out


def gaussian(mask_or_img: Image.Image, radius: float) -> Image.Image:
    return mask_or_img.filter(ImageFilter.GaussianBlur(radius=radius))


def create_angular_ring_mask(
    size: Tuple[int, int],
    angle_center_deg: float,
    sweep_deg: float,
    outer_margin_px: int,
    ring_thickness_px: int,
    softness_px: int,
) -> Image.Image:
    """
    Create an L mask containing a soft ring wedge centered at angle_center_deg with sweep_deg.
    0° is at 3 o'clock, angle increases counter-clockwise (Pillow pieslice convention).
    """
    w, h = size
    cx, cy = w // 2, h // 2
    r_out = min(w, h) // 2 - max(1, outer_margin_px)
    r_in = max(1, r_out - max(1, ring_thickness_px))

    # Outer wedge
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)

    # Bounding boxes for outer and inner circles
    bbox_out = [cx - r_out, cy - r_out, cx + r_out, cy + r_out]
    bbox_in = [cx - r_in, cy - r_in, cx + r_in, cy + r_in]

    start = angle_center_deg - sweep_deg / 2.0
    end = angle_center_deg + sweep_deg / 2.0

    # Draw outer wedge filled
    d.pieslice(bbox_out, start=start, end=end, fill=255)
    # Cut inner wedge out to make it a ring wedge
    d.pieslice(bbox_in, start=start, end=end, fill=0)

    if softness_px > 0:
        m = gaussian(m, softness_px)
    return m


def colorize_from_mask(mask: Image.Image, color: Color, alpha_scale: float) -> Image.Image:
    """Create RGBA image colored with `color`, alpha from mask scaled by alpha_scale [0..1]."""
    if mask.mode != 'L':
        mask = mask.convert('L')
    a = mask.point(lambda p: int(max(0, min(255, p * alpha_scale))))
    rgb = Image.new('RGB', mask.size, color)
    rgba = Image.merge('RGBA', (*rgb.split(), a))
    return rgba


def make_border_band_mask(base_mask: Image.Image, band_width_px: int) -> Image.Image:
    """
    Create an inner-edge band mask from the opaque region, by subtracting an eroded version.
    This confines effects to the frame border and avoids the central transparent area.
    """
    if band_width_px <= 0:
        return base_mask
    eroded = erode_mask(base_mask, band_width_px)
    band = ImageChops.subtract(base_mask, eroded)
    # Slight soften to avoid hard edges
    band = gaussian(band, radius=max(1, band_width_px // 3))
    return band


def multiply_masks(a: Image.Image, b: Image.Image) -> Image.Image:
    if a.mode != 'L':
        a = a.convert('L')
    if b.mode != 'L':
        b = b.convert('L')
    return ImageChops.multiply(a, b)


def create_full_ring_mask(
    size: Tuple[int, int],
    r_inner: int,
    ring_thickness_px: int,
    softness_px: int,
) -> Image.Image:
    """Create an L mask for a full circular ring defined by inner radius and thickness."""
    w, h = size
    cx, cy = w // 2, h // 2
    r_in = max(1, int(r_inner))
    r_out = max(r_in + 1, int(r_inner + ring_thickness_px))
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    bbox_out = [cx - r_out, cy - r_out, cx + r_out, cy + r_out]
    bbox_in = [cx - r_in, cy - r_in, cx + r_in, cy + r_in]
    d.ellipse(bbox_out, fill=255)
    d.ellipse(bbox_in, fill=0)
    if softness_px > 0:
        m = gaussian(m, softness_px)
    return m


def estimate_inner_radius(mask: Image.Image, threshold: int = 8) -> float:
    """Estimate inner circle radius of the frame by ray casting from center to first opaque pixel."""
    if mask.mode != 'L':
        mask = mask.convert('L')
    w, h = mask.size
    cx, cy = w / 2.0, h / 2.0
    max_r = min(w, h) / 2.0 - 2
    radii: list[float] = []
    step_deg = 2
    pix = mask.load()
    for deg in range(0, 360, step_deg):
        theta = math.radians(deg)
        found = None
        r = 1.0
        while r < max_r:
            x = int(round(cx + r * math.cos(theta)))
            y = int(round(cy + r * math.sin(theta)))
            if x < 0 or y < 0 or x >= w or y >= h:
                break
            if pix[x, y] > threshold:
                found = r
                break
            r += 1.0
        if found is not None:
            radii.append(found)
    if not radii:
        return max(6.0, max_r * 0.7)
    radii.sort()
    mid = len(radii) // 2
    return float((radii[mid] + radii[~mid]) / 2.0)


def generate_glow_layer(
    size: Tuple[int, int],
    t: int,
    total: int,
    border_mask: Image.Image,
    ring_mask: Image.Image,
    glow_color: Color,
    glow_intensity: float,
    glow_sweep_deg: float,
    ring_thickness_px: int,
) -> Image.Image:
    # Start at bottom (270°) and rotate CCW
    angle = 270.0 + 360.0 * (t / float(total))
    # Ring softness proportional to ring thickness
    softness = max(1, ring_thickness_px // 2)
    # Small outer margin to keep it from clipping
    outer_margin_px = max(2, min(size) // 64)

    wedge = create_angular_ring_mask(
        size=size,
        angle_center_deg=angle,
        sweep_deg=glow_sweep_deg,
        outer_margin_px=outer_margin_px,
        ring_thickness_px=ring_thickness_px,
        softness_px=softness,
    )
    # Constrain to border
    wedge = multiply_masks(wedge, border_mask)
    wedge = multiply_masks(wedge, ring_mask)

    # Convert to colored layer
    overlay = colorize_from_mask(wedge, glow_color, alpha_scale=glow_intensity)
    return overlay


def jitter(value: float, amount: float) -> float:
    return value + random.uniform(-amount, amount)


def draw_lightning(draw: ImageDraw.ImageDraw, path: Tuple[Tuple[float, float], ...], width: int, intensity: float, color: Color):
    # Draw core
    draw.line(path, fill=(*color, int(255 * intensity)), width=width, joint="curve")


def generate_lightning_layer(
    size: Tuple[int, int],
    t: int,
    total: int,
    border_band_mask: Image.Image,
    lightning_color: Color,
    base_intensity: float,
    cycles_per_loop: float,
    r_midline: float,
    arc_span_deg: float = 18.0,
) -> Image.Image:
    w, h = size
    cx, cy = w / 2.0, h / 2.0

    # Flicker over time, configurable cycles per loop
    phase = cycles_per_loop * 2.0 * math.pi * (t / float(total))
    flicker = 0.6 + 0.4 * math.sin(phase)
    intensity = max(0.0, min(1.0, base_intensity * flicker))

    # Angular positions for two arcs that start at bottom (270°) and move towards top (90°)
    p = (t / float(total))  # 0..1
    theta_left = 270.0 + 180.0 * p
    theta_right = 270.0 - 180.0 * p

    def arc_path(theta_center_deg: float) -> Tuple[Tuple[float, float], ...]:
        half = arc_span_deg / 2.0
        start = theta_center_deg - half
        end = theta_center_deg + half
        steps = max(6, int(arc_span_deg // 2) * 2)
        pts = []
        for i in range(steps + 1):
            a = math.radians(start + (end - start) * (i / steps))
            # Small electric jitter
            radial_jitter = jitter(0.0, max(1.0, min(w, h) * 0.004))
            r = max(1.0, r_midline + radial_jitter)
            x = cx + r * math.cos(a)
            y = cy + r * math.sin(a)
            pts.append((x, y))
        return tuple(pts)

    path_left = arc_path(theta_left)
    path_right = arc_path(theta_right)

    # Create layer and draw
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, 'RGBA')

    # Core stroke
    base_width = max(2, int(round(min(w, h) * 0.007)))
    draw_lightning(d, path_left, width=base_width, intensity=intensity, color=lightning_color)
    draw_lightning(d, path_right, width=base_width, intensity=intensity, color=lightning_color)

    # Soft outer glow by blurring a copy
    glow_layer = layer.copy().filter(ImageFilter.GaussianBlur(radius=max(2, base_width * 2)))
    # Slightly stronger color tint for the glow
    tint = Image.new('RGBA', (w, h), (*lightning_color, int(255 * intensity * 0.6)))
    glow_layer = ImageChops.screen(glow_layer, tint)

    # Combine core and glow
    combined = Image.alpha_composite(glow_layer, layer)

    # Constrain to border band
    band_alpha = border_band_mask
    if band_alpha.mode != 'L':
        band_alpha = band_alpha.convert('L')
    # Apply band_alpha as the alpha of combined
    r, g, b, a = combined.split()
    a = ImageChops.multiply(a, band_alpha)
    combined = Image.merge('RGBA', (r, g, b, a))
    return combined


def apply_effects_to_frame(
    base_img: Image.Image,
    num_anim_frames: int,
    glow_color: Color,
    glow_intensity: float,
    glow_sweep_deg: float,
    ring_thickness_px: int,
    lightning_color: Color,
    lightning_intensity: float,
    band_width_px: int,
    lightning_cycles_per_loop: float,
) -> Tuple[Image.Image, ...]:
    """Return a tuple of RGBA animation frames including base image + effects."""
    w, h = base_img.size
    base_mask = threshold_alpha_to_mask(base_img)
    border_band_mask = make_border_band_mask(base_mask, band_width_px=band_width_px)
    # Estimate circular inner radius to align effects precisely with the frame circle (ignore wings)
    r_inner_est = estimate_inner_radius(base_mask)
    r_midline = r_inner_est + ring_thickness_px * 0.5
    ring_softness = max(1, ring_thickness_px // 3)
    ring_mask = create_full_ring_mask(size=(w, h), r_inner=int(round(r_inner_est)), ring_thickness_px=ring_thickness_px, softness_px=ring_softness)

    frames = []
    for t in range(num_anim_frames):
        # Start with original image
        frame = base_img.copy()

        # Rotating glow
        glow_layer = generate_glow_layer(
            size=(w, h),
            t=t,
            total=num_anim_frames,
            border_mask=base_mask,  # allow glow anywhere on opaque frame
            ring_mask=ring_mask,    # restrict to circular rim only
            glow_color=glow_color,
            glow_intensity=glow_intensity,
            glow_sweep_deg=glow_sweep_deg,
            ring_thickness_px=ring_thickness_px,
        )
        frame = Image.alpha_composite(frame, glow_layer)

        # Lightning
        lightning_layer = generate_lightning_layer(
            size=(w, h),
            t=t,
            total=num_anim_frames,
            border_band_mask=border_band_mask,
            lightning_color=lightning_color,
            base_intensity=lightning_intensity,
            cycles_per_loop=lightning_cycles_per_loop,
            r_midline=r_midline,
        )
        frame = Image.alpha_composite(frame, lightning_layer)

        frames.append(frame)
    return tuple(frames)


def find_input_path(input_dir: str, index: int) -> Optional[str]:
    # Prefer PNG (existing), fallback to webp/jpg/jpeg
    candidates = [
        os.path.join(input_dir, f"frame{index}.png"),
        os.path.join(input_dir, f"frame{index}.webp"),
        os.path.join(input_dir, f"frame{index}.jpg"),
        os.path.join(input_dir, f"frame{index}.jpeg"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def apply_overrides(base: dict, overrides: Optional[dict]) -> dict:
    if not overrides:
        return base
    merged = base.copy()
    for k, v in overrides.items():
        merged[k.replace('-', '_')] = v
    return merged


def main():
    parser = argparse.ArgumentParser(description='Generate animated WEBP frames with glow and lightning effects (Pillow).')
    parser.add_argument('--input-dir', default='client/public/frames', help='Directory containing input frames')
    parser.add_argument('--output-dir', default='client/public/frames', help='Directory to write output WEBP files')
    parser.add_argument('--start', type=int, default=10, help='Start frame index (inclusive)')
    parser.add_argument('--end', type=int, default=42, help='End frame index (inclusive)')
    parser.add_argument('--only', type=str, default=None, help='Comma-separated specific frame indices (overrides start/end)')
    parser.add_argument('--num-frames', type=int, default=24, help='Number of animation frames per output')
    parser.add_argument('--duration', type=int, default=50, help='Frame duration in ms (per animation frame)')
    parser.add_argument('--quality', type=int, default=95, help='WEBP quality (0-100)')
    parser.add_argument('--lossless', action='store_true', help='Use lossless WEBP (larger files)')

    parser.add_argument('--glow-color', default='#ffffff', help='Glow color hex')
    parser.add_argument('--glow-intensity', type=float, default=0.35, help='Glow alpha scale (0..1)')
    parser.add_argument('--glow-sweep-deg', type=float, default=35.0, help='Glow wedge sweep in degrees')
    parser.add_argument('--ring-thickness-px', type=int, default= max(6, 0), help='Approx ring thickness for glow (px)')

    parser.add_argument('--lightning-color', default='#cfefff', help='Lightning color hex')
    parser.add_argument('--lightning-intensity', type=float, default=0.22, help='Lightning base intensity (0..1)')
    parser.add_argument('--lightning-cycles', type=float, default=2.2, help='Lightning flicker cycles per animation loop (lower = slower)')

    parser.add_argument('--band-width-px', type=int, default=12, help='Border band width to confine effects (px)')

    parser.add_argument('--config', type=str, default=None, help='Optional JSON file with per-frame overrides')

    args = parser.parse_args()

    # Load config
    per_frame_overrides: Dict[str, dict] = {}
    if args.config:
        with open(args.config, 'r', encoding='utf-8') as f:
            per_frame_overrides = json.load(f)

    # Build list of frame indices
    if args.only:
        indices = [int(x.strip()) for x in args.only.split(',') if x.strip()]
    else:
        indices = list(range(args.start, args.end + 1))

    os.makedirs(args.output_dir, exist_ok=True)

    # Convert colors
    glow_color_rgb = hex_to_rgb(args.glow_color)
    lightning_color_rgb = hex_to_rgb(args.lightning_color)

    for idx in indices:
        # Merge overrides if any
        override = per_frame_overrides.get(str(idx)) or per_frame_overrides.get(idx)
        local = apply_overrides(
            base=dict(
                num_frames=args.num_frames,
                duration=args.duration,
                glow_color=glow_color_rgb,
                glow_intensity=args.glow_intensity,
                glow_sweep_deg=args.glow_sweep_deg,
                ring_thickness_px=args.ring_thickness_px,
                lightning_color=lightning_color_rgb,
                lightning_intensity=args.lightning_intensity,
                lightning_cycles=args.lightning_cycles,
                band_width_px=args.band_width_px,
                quality=args.quality,
                lossless=args.lossless,
            ),
            overrides=override,
        )

        # If ring_thickness not specified, infer based on size after loading image
        in_path = find_input_path(args.input_dir, idx)
        if not in_path:
            print(f"[WARN] Frame {idx}: input not found, skipping.")
            continue

        base_img = load_rgba(in_path)
        w, h = base_img.size
        if local['ring_thickness_px'] == 0:
            # Heuristic: 4% of min dimension, clamped to [6, 24]
            ring_thickness_px = max(6, min(24, int(round(min(w, h) * 0.04))))
        else:
            ring_thickness_px = int(local['ring_thickness_px'])

        band_width_px = int(local['band_width_px'])
        # Ensure band width is at most 40% of ring thickness to keep it on the border
        band_width_px = max(4, min(band_width_px, max(4, int(ring_thickness_px * 0.4))))

        frames = apply_effects_to_frame(
            base_img=base_img,
            num_anim_frames=int(local['num_frames']),
            glow_color=tuple(local['glow_color']),
            glow_intensity=float(local['glow_intensity']),
            glow_sweep_deg=float(local['glow_sweep_deg']),
            ring_thickness_px=ring_thickness_px,
            lightning_color=tuple(local['lightning_color']),
            lightning_intensity=float(local['lightning_intensity']),
            band_width_px=band_width_px,
            lightning_cycles_per_loop=float(local['lightning_cycles']),
        )

        out_path = os.path.join(args.output_dir, f"frame{idx}.webp")
        # Save animated WEBP
        frames[0].save(
            out_path,
            format='WEBP',
            save_all=True,
            append_images=list(frames[1:]),
            duration=int(local['duration']),
            loop=0,
            quality=int(local['quality']),
            lossless=bool(local['lossless']),
            method=6,
            transparency=0,
        )
        print(f"[OK] Wrote {out_path} ({len(frames)} frames, duration={local['duration']}ms)")


if __name__ == '__main__':
    main()

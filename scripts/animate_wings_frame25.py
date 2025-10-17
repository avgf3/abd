#!/usr/bin/env python3
import argparse
import math
from typing import List, Tuple, Optional
from PIL import Image, ImageDraw


def parse_pair(text: str) -> Tuple[int, int]:
    parts = text.split(",")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError("Expected 'x,y' pair")
    try:
        return int(parts[0]), int(parts[1])
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Coordinates must be integers") from exc


def generate_angles(num_frames: int, amplitude_deg: float) -> List[float]:
    """Generate a smooth, perfectly looping angle sequence using a sine wave."""
    angles: List[float] = []
    for i in range(num_frames):
        t = (2.0 * math.pi * i) / num_frames
        angles.append(amplitude_deg * math.sin(t))
    return angles


def rotate_around_pivot(img: Image.Image, angle_deg: float, pivot_in_img: Tuple[int, int]) -> Image.Image:
    """Rotate image around a specific pivot (x,y) in image coordinates.

    The returned image is expanded to fit the rotated bounds; the pivot is placed at the center
    of the returned image so it can be positioned by centering at the target pivot on the canvas.
    """
    return img.rotate(angle=angle_deg, resample=Image.BICUBIC, expand=True, center=pivot_in_img)


def paste_at_pivot(canvas: Image.Image, rotated: Image.Image, target_pivot_on_canvas: Tuple[int, int]):
    """Paste 'rotated' onto 'canvas' so that the center of 'rotated' aligns with 'target_pivot_on_canvas'."""
    tx, ty = target_pivot_on_canvas
    ox = int(round(tx - rotated.width / 2))
    oy = int(round(ty - rotated.height / 2))
    canvas.alpha_composite(rotated, (ox, oy))


def draw_debug_markers(img: Image.Image, points: List[Tuple[int, int]], color=(255, 0, 0, 255), radius: int = 4):
    draw = ImageDraw.Draw(img)
    for (x, y) in points:
        draw.ellipse([(x - radius, y - radius), (x + radius, y + radius)], fill=color)


def load_rgba(path: str) -> Image.Image:
    im = Image.open(path)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    return im


def compute_mirrored_pivot(original_w: int, original_pivot_x: int, original_pivot_y: int) -> Tuple[int, int]:
    # Mirror horizontally: new_x = (width - 1) - original_x
    return (original_w - 1 - original_pivot_x, original_pivot_y)


def build_frames(
    base_frame: Image.Image,
    left_wing_img: Image.Image,
    right_wing_img: Image.Image,
    left_pivot_in_left: Tuple[int, int],
    right_pivot_in_right: Tuple[int, int],
    left_target_on_base: Tuple[int, int],
    right_target_on_base: Tuple[int, int],
    num_frames: int,
    amplitude_deg: float,
    wings_above_frame: bool,
    debug_overlay: bool,
) -> List[Image.Image]:
    angles = generate_angles(num_frames=num_frames, amplitude_deg=amplitude_deg)

    frames: List[Image.Image] = []
    for angle in angles:
        # Mirror the motion for right wing to flap symmetrically
        left_angle = angle
        right_angle = -angle

        # Prepare canvas
        canvas = Image.new("RGBA", base_frame.size, (0, 0, 0, 0))

        if not wings_above_frame:
            canvas.alpha_composite(base_frame)

        # Left wing
        left_rot = rotate_around_pivot(left_wing_img, left_angle, left_pivot_in_left)
        paste_at_pivot(canvas, left_rot, left_target_on_base)

        # Right wing
        right_rot = rotate_around_pivot(right_wing_img, right_angle, right_pivot_in_right)
        paste_at_pivot(canvas, right_rot, right_target_on_base)

        if wings_above_frame:
            canvas.alpha_composite(base_frame)

        if debug_overlay:
            # Overlay small markers at target pivots (after final compositing)
            overlay = canvas.copy()
            draw_debug_markers(overlay, [left_target_on_base, right_target_on_base], color=(255, 0, 0, 255))
            canvas = overlay

        frames.append(canvas)

    return frames


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Animate side wings for a golden frame (frame #25) with smooth, subtle flapping "
            "and export as a looping transparent WebP without color changes."
        )
    )
    parser.add_argument("--frame", required=True, help="Path to base frame image (PNG/SVG rasterized/WebP with alpha).")
    parser.add_argument("--left-wing", required=True, help="Path to left wing layer (transparent background).")
    parser.add_argument("--right-wing", required=False, help="Path to right wing layer (transparent background). If omitted, can mirror left wing with --mirror-for-right.")
    parser.add_argument("--mirror-for-right", action="store_true", help="Use a horizontally mirrored copy of the left wing for the right wing if --right-wing is not provided.")

    parser.add_argument("--left-pivot", type=parse_pair, required=True, help="Left wing pivot in LEFT wing image coordinates as 'x,y'.")
    parser.add_argument("--right-pivot", type=parse_pair, required=False, help="Right wing pivot in RIGHT wing image coordinates as 'x,y'. Required unless --mirror-for-right is set.")

    parser.add_argument("--left-target", type=parse_pair, required=True, help="Target pivot position on base frame for LEFT wing as 'x,y'.")
    parser.add_argument("--right-target", type=parse_pair, required=True, help="Target pivot position on base frame for RIGHT wing as 'x,y'.")

    parser.add_argument("--num-frames", type=int, default=8, choices=range(6, 9), metavar="{6,7,8}", help="Number of frames for a smooth cycle (6–8). Default 8.")
    parser.add_argument("--amplitude-deg", type=float, default=7.0, help="Max rotation amplitude (degrees). Keep small for subtle motion. Default 7.")
    parser.add_argument("--duration-ms", type=int, default=100, help="Duration per frame in milliseconds. Default 100ms.")
    parser.add_argument("--wings-above", action="store_true", help="Composite wings above the frame (default is behind).")
    parser.add_argument("--debug-overlay", action="store_true", help="Draw small red dots on target pivot points for visual verification.")

    parser.add_argument("--out", default="frame25_wings_animated.webp", help="Output animated WebP path.")

    args = parser.parse_args()

    base = load_rgba(args.frame)
    left_wing = load_rgba(args.left_wing)

    if args.right_wing:
        right_wing = load_rgba(args.right_wing)
        if args.right_pivot is None:
            parser.error("--right-pivot is required when --right-wing is provided (unless using --mirror-for-right without right wing).")
        right_pivot = args.right_pivot
    else:
        if not args.mirror_for_right:
            parser.error("Either provide --right-wing with --right-pivot, or use --mirror-for-right to mirror the left wing.")
        # Mirror left wing to create right wing and compute its pivot
        right_wing = left_wing.transpose(Image.FLIP_LEFT_RIGHT)
        mirrored_pivot = compute_mirrored_pivot(left_wing.width, args.left_pivot[0], args.left_pivot[1])
        right_pivot = mirrored_pivot

    frames = build_frames(
        base_frame=base,
        left_wing_img=left_wing,
        right_wing_img=right_wing,
        left_pivot_in_left=args.left_pivot,
        right_pivot_in_right=right_pivot,
        left_target_on_base=args.left_target,
        right_target_on_base=args.right_target,
        num_frames=args.num_frames,
        amplitude_deg=args.amplitude_deg,
        wings_above_frame=args.wings_above,
        debug_overlay=args.debug_overlay,
    )

    # Ensure all frames are RGBA and same size (guaranteed by build_frames)
    first = frames[0]
    append_images = frames[1:]

    # Save animated WebP: lossless to avoid color changes; loop=0 for infinite loop.
    first.save(
        args.out,
        save_all=True,
        append_images=append_images,
        duration=args.duration_ms,
        loop=0,
        format="WEBP",
        lossless=True,
        quality=100,
        method=6,
    )

    print(f"Saved animated WebP -> {args.out}")


if __name__ == "__main__":
    main()

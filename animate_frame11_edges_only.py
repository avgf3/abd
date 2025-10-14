#!/usr/bin/env python3
"""
Frame Animation - Effects on EDGES ONLY
- Wing movement stays
- Glow and shine ONLY on the frame edges (not background)
- Background stays clean
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
import math
import os
from scipy import ndimage

def strong_wing_animation(base_img, frame_num, total_frames):
    """
    Strong and VISIBLE wing movement
    """
    img_array = np.array(base_img, dtype=np.float64)
    height, width = img_array.shape[:2]
    
    # Strong sinusoidal movement
    phase = (frame_num / total_frames) * 2 * math.pi
    movement = math.sin(phase) * 12
    
    # Create coordinate grids
    y_coords = np.arange(height, dtype=np.float64)
    x_coords = np.arange(width, dtype=np.float64)
    yy, xx = np.meshgrid(y_coords, x_coords, indexing='ij')
    
    # Define wing zones
    left_boundary = width * 0.35
    right_boundary = width * 0.65
    
    # Movement map
    movement_map = np.zeros((height, width), dtype=np.float64)
    
    for x in range(width):
        if x < left_boundary:
            factor = (1 - (x / left_boundary)) ** 1.2
            movement_map[:, x] = movement * factor
        elif x > right_boundary:
            factor = ((x - right_boundary) / (width - right_boundary)) ** 1.2
            movement_map[:, x] = movement * factor
        else:
            center_pos = (x - left_boundary) / (right_boundary - left_boundary)
            factor = 0.2 * (1 - (abs(center_pos - 0.5) * 2))
            movement_map[:, x] = movement * factor
    
    # Apply displacement
    new_yy = yy + movement_map
    new_yy = np.clip(new_yy, 0, height - 1)
    
    # High-quality interpolation
    result_array = np.zeros_like(img_array)
    
    for channel in range(img_array.shape[2]):
        result_array[:, :, channel] = ndimage.map_coordinates(
            img_array[:, :, channel],
            [new_yy, xx],
            order=5,
            mode='nearest',
            prefilter=True
        )
    
    result_array = np.clip(result_array, 0, 255)
    result = Image.fromarray(result_array.astype(np.uint8))
    
    return result

def create_edge_only_glow(width, height, frame_num, total_frames):
    """
    Create glow ONLY on the edges - not on background
    """
    # Strong pulse
    pulse_phase = (frame_num / total_frames) * 2 * math.pi
    pulse_intensity = 0.7 + math.sin(pulse_phase) * 0.3
    
    # Create overlay - completely transparent
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Draw glow ONLY on the outer edges (narrow band)
    edge_depth = 50  # Only affect outer 50 pixels
    
    for i in range(edge_depth):
        progress = i / edge_depth
        alpha = int((1 - progress) ** 1.5 * 180 * pulse_intensity)
        
        if alpha > 5:
            draw.rectangle(
                [i, i, width - i - 1, height - i - 1],
                outline=(255, 250, 200, alpha),
                width=2
            )
    
    # Blur the glow
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=15))
    
    # Create a mask to keep glow ONLY on edges
    mask = Image.new('L', (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    
    # White on edges (where glow should show)
    edge_mask_width = 80
    for i in range(edge_mask_width):
        progress = i / edge_mask_width
        intensity = int(255 * (1 - progress) ** 2)
        mask_draw.rectangle(
            [i, i, width - i - 1, height - i - 1],
            outline=intensity,
            width=2
        )
    
    # Blur mask for smooth transition
    mask = mask.filter(ImageFilter.GaussianBlur(radius=20))
    
    # Apply mask to overlay
    overlay.putalpha(Image.composite(mask, Image.new('L', (width, height), 0), mask))
    
    return overlay

def add_edge_sparkles(width, height, frame_num, total_frames):
    """
    Add sparkles ONLY on edges
    """
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Sparkle animation
    sparkle_phase = (frame_num % (total_frames // 2)) / (total_frames // 2)
    sparkle_alpha = int(abs(math.sin(sparkle_phase * math.pi * 2)) * 200)
    
    if sparkle_alpha > 30:
        # Corner sparkles
        corners = [
            (20, 20), (width - 20, 20),
            (20, height - 20), (width - 20, height - 20),
        ]
        
        for cx, cy in corners:
            for radius in range(12, 0, -2):
                r_alpha = int(sparkle_alpha * (radius / 12))
                draw.ellipse(
                    [cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=(255, 255, 255, r_alpha)
                )
        
        # Mid-edge sparkles
        mid_sparkles = [
            (width // 2, 15),
            (width // 2, height - 15),
            (15, height // 2),
            (width - 15, height // 2),
        ]
        
        for cx, cy in mid_sparkles:
            for radius in range(8, 0, -2):
                r_alpha = int(sparkle_alpha * 0.7 * (radius / 8))
                draw.ellipse(
                    [cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=(255, 255, 200, r_alpha)
                )
    
    # Blur sparkles
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    return overlay

def add_brightness_boost(img):
    """
    Boost colors
    """
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.15)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.08)
    
    return img

def create_edges_only_animation(input_path, output_path, num_frames=36, duration=55):
    """
    Create animation with effects ONLY on edges
    """
    print("\n" + "🎯 " + "="*70)
    print("🎯  EDGES ONLY - GLOW ON FRAME EDGES, CLEAN BACKGROUND")
    print("🎯 " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    # Boost base image
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Wing movement
        frame = strong_wing_animation(base_img, i, num_frames)
        
        # Add edge-only glow (NOT on background!)
        edge_glow = create_edge_only_glow(width, height, i, num_frames)
        frame = Image.alpha_composite(frame, edge_glow)
        
        # Add sparkles on edges
        sparkles = add_edge_sparkles(width, height, i, num_frames)
        frame = Image.alpha_composite(frame, sparkles)
        
        # Convert to RGB
        rgb_frame = Image.new('RGB', frame.size, (255, 255, 255))
        rgb_frame.paste(frame, mask=frame.split()[3])
        
        frames.append(rgb_frame)
    
    print(f"\n\n💾 Saving animation...\n")
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
        quality=95
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    
    print("✅ " + "="*70)
    print("✅  DONE - EFFECTS ON EDGES ONLY!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Specifications:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms per frame")
    print(f"   • Loop time: {(num_frames * duration / 1000):.1f}s")
    print(f"   • File size: {file_size_kb:.1f} KB\n")
    
    print("✨ Features:")
    print("   ✓ Wing movement (12 pixels)")
    print("   ✓ Glow ONLY on frame edges")
    print("   ✓ Background stays CLEAN")
    print("   ✓ Edge sparkles")
    print("   ✓ Pulsing effect")
    print("   ✓ Enhanced colors\n")
    
    print("🚀 BACKGROUND CLEAN - EFFECTS ON EDGES!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame11.png'
    output_path = '/workspace/client/public/frames/frame11_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    create_edges_only_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=36,
        duration=55
    )

if __name__ == '__main__':
    main()

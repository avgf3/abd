#!/usr/bin/env python3
"""
Final Professional Frame Animation
- VISIBLE wing movement (stronger motion)
- STRONG glow effect on the frame
- Clear and professional animation
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
    
    # Strong sinusoidal movement - VISIBLE!
    phase = (frame_num / total_frames) * 2 * math.pi
    movement = math.sin(phase) * 12  # 12 pixels - much more visible!
    
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
            # Left wing - outer moves more
            factor = (1 - (x / left_boundary)) ** 1.2
            movement_map[:, x] = movement * factor
        elif x > right_boundary:
            # Right wing - outer moves more
            factor = ((x - right_boundary) / (width - right_boundary)) ** 1.2
            movement_map[:, x] = movement * factor
        else:
            # Center - minimal movement
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

def strong_frame_glow(img, frame_num, total_frames):
    """
    STRONG and VISIBLE glow on the frame
    """
    width, height = img.size
    
    # Strong pulse
    pulse_phase = (frame_num / total_frames) * 2 * math.pi
    pulse_intensity = 0.7 + math.sin(pulse_phase) * 0.3  # 0.4 to 1.0
    
    # Create overlay with STRONG glow
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # STRONG edge glow - VERY VISIBLE
    edge_width = 40
    for i in range(edge_width):
        progress = i / edge_width
        
        # Much stronger alpha!
        alpha = int((1 - progress) ** 1.5 * 180 * pulse_intensity)  # Up to 180!
        
        if alpha > 5:
            # Bright golden glow
            r = 255
            g = 250
            b = 200
            
            draw.rectangle(
                [i, i, width - i - 1, height - i - 1],
                outline=(r, g, b, alpha),
                width=2  # Thicker lines
            )
    
    # Strong blur
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=15))
    
    # Add inner glow layer (extra visibility)
    inner_glow_width = 25
    for i in range(inner_glow_width):
        progress = i / inner_glow_width
        alpha = int((1 - progress) ** 2 * 140 * pulse_intensity)
        
        if alpha > 5:
            draw.rectangle(
                [i + 5, i + 5, width - i - 6, height - i - 6],
                outline=(255, 255, 220, alpha),
                width=1
            )
    
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=10))
    
    # Add bright corner sparkles
    sparkle_phase = (frame_num % (total_frames // 2)) / (total_frames // 2)
    sparkle_alpha = int(abs(math.sin(sparkle_phase * math.pi * 2)) * 200)  # Very bright!
    
    if sparkle_alpha > 30:
        corners = [
            (20, 20), (width - 20, 20),
            (20, height - 20), (width - 20, height - 20),
        ]
        
        for cx, cy in corners:
            # Large bright sparkle
            for radius in range(12, 0, -2):
                r_alpha = int(sparkle_alpha * (radius / 12))
                draw.ellipse(
                    [cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=(255, 255, 255, r_alpha)
                )
        
        # Add mid-edge sparkles
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
    
    # Final blur for smooth effect
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    # Composite with original
    result = Image.alpha_composite(img.convert('RGBA'), overlay)
    
    return result

def add_brightness_boost(img):
    """
    Boost overall brightness to make everything more visible
    """
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.15)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.08)
    
    return img

def create_final_animation(input_path, output_path, num_frames=36, duration=55):
    """
    Create final animation with VISIBLE movement and STRONG glow
    """
    print("\n" + "⚡ " + "="*70)
    print("⚡  FINAL ANIMATION - VISIBLE MOVEMENT & STRONG GLOW")
    print("⚡ " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    # Boost base image
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames with VISIBLE effects...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # STRONG wing movement
        frame = strong_wing_animation(base_img, i, num_frames)
        
        # STRONG frame glow
        frame = strong_frame_glow(frame, i, num_frames)
        
        # Convert to RGB
        rgb_frame = Image.new('RGB', frame.size, (255, 255, 255))
        rgb_frame.paste(frame, mask=frame.split()[3])
        
        frames.append(rgb_frame)
    
    print(f"\n\n💾 Saving animation...\n")
    
    # Save
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
    print("✅  ANIMATION CREATED - VISIBLE & STRONG!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Specifications:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms per frame")
    print(f"   • Loop time: {(num_frames * duration / 1000):.1f}s")
    print(f"   • File size: {file_size_kb:.1f} KB")
    print(f"   • Resolution: {width}x{height}px\n")
    
    print("✨ Features:")
    print("   ✓ STRONG wing movement (12 pixels)")
    print("   ✓ VISIBLE frame glow (bright golden)")
    print("   ✓ Pulsing edge effect")
    print("   ✓ Bright corner sparkles")
    print("   ✓ Mid-edge shine points")
    print("   ✓ Enhanced colors & brightness")
    print("   ✓ Smooth loop\n")
    
    print("🚀 MOVEMENT & GLOW ARE NOW VISIBLE!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame11.png'
    output_path = '/workspace/client/public/frames/frame11_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    # Create animation with VISIBLE effects
    # 36 frames at 55ms = ~2 seconds
    create_final_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=36,
        duration=55
    )

if __name__ == '__main__':
    main()

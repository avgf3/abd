#!/usr/bin/env python3
"""
Frame 17 Animation - PROFESSIONAL STRONG MOVEMENT
- Clear and visible wing movement
- Lower wings move with STRONG amplitude
- Professional quality
"""

from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import math
import os
from scipy import ndimage

def create_lower_wing_mask(width, height):
    """
    Create mask for lower wings with smooth gradients
    """
    mask = np.zeros((height, width), dtype=np.float64)
    
    left_wing_end = int(width * 0.32)
    right_wing_start = int(width * 0.68)
    upper_static_boundary = int(height * 0.35)  # Top 35% static
    
    for y in range(height):
        if y < upper_static_boundary:
            mask[y, :] = 0.0
        else:
            # Strong vertical gradient - more movement at bottom
            vertical_factor = ((y - upper_static_boundary) / (height - upper_static_boundary)) ** 1.3
            
            for x in range(width):
                if x < left_wing_end:
                    # Left wing
                    horizontal_factor = (1.0 - (x / left_wing_end)) ** 1.1
                    mask[y, x] = horizontal_factor * vertical_factor
                elif x > right_wing_start:
                    # Right wing
                    horizontal_factor = ((x - right_wing_start) / (width - right_wing_start)) ** 1.1
                    mask[y, x] = horizontal_factor * vertical_factor
    
    # Smooth the mask edges
    mask_img = Image.fromarray((mask * 255).astype(np.uint8))
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=2))
    mask = np.array(mask_img, dtype=np.float64) / 255.0
    
    return mask

def move_lower_wings_professional(base_img, frame_num, total_frames):
    """
    Professional wing movement with STRONG visible motion
    """
    img_array = np.array(base_img, dtype=np.float64)
    height, width = img_array.shape[:2]
    
    # Strong sinusoidal movement - VERY VISIBLE!
    phase = (frame_num / total_frames) * 2 * math.pi
    base_movement = math.sin(phase) * 25  # 25 PIXELS - STRONG MOVEMENT!
    
    # Create wing mask
    wing_mask = create_lower_wing_mask(width, height)
    
    # Create coordinate grids
    y_coords = np.arange(height, dtype=np.float64)
    x_coords = np.arange(width, dtype=np.float64)
    yy, xx = np.meshgrid(y_coords, x_coords, indexing='ij')
    
    # Apply movement
    movement_map = wing_mask * base_movement
    new_yy = yy + movement_map
    new_yy = np.clip(new_yy, 0, height - 1)
    
    # High-quality interpolation
    moved_array = np.zeros_like(img_array)
    
    for channel in range(img_array.shape[2]):
        moved_array[:, :, channel] = ndimage.map_coordinates(
            img_array[:, :, channel],
            [new_yy, xx],
            order=5,  # Quintic spline
            mode='nearest',
            prefilter=True
        )
    
    # Smooth blending
    mask_3d = np.stack([wing_mask] * img_array.shape[2], axis=2)
    result_array = img_array * (1 - mask_3d) + moved_array * mask_3d
    result_array = np.clip(result_array, 0, 255)
    
    result = Image.fromarray(result_array.astype(np.uint8))
    
    # Light sharpening for clarity
    result = result.filter(ImageFilter.UnsharpMask(radius=0.8, percent=25, threshold=2))
    
    return result

def ease_in_out(t):
    return t * t * (3.0 - 2.0 * t)

def apply_moving_lightning_wave(img, frame_num, total_frames):
    """Lightning wave"""
    width, height = img.size
    
    wave_progress = ease_in_out(frame_num / total_frames)
    wave_y = height - (wave_progress * (height + 100))
    wave_height = 150
    
    img_array = np.array(img, dtype=np.float32)
    
    if img.mode == 'RGBA':
        frame_mask = img_array[:, :, 3] > 10
    else:
        frame_mask = np.ones((height, width), dtype=bool)
    
    y_coords = np.arange(height, dtype=np.float32)
    distances = np.abs(y_coords - wave_y)
    lightning_factors = np.exp(-(distances ** 2) / (2 * (wave_height / 2.5) ** 2))
    lightning_factors = np.clip(lightning_factors, 0, 1)
    
    for y in range(height):
        lightning_intensity = lightning_factors[y]
        
        if lightning_intensity > 0.05:
            brightness_boost = 1.0 + (0.6 * lightning_intensity)
            contrast_boost = 1.0 + (0.3 * lightning_intensity)
            
            for x in range(width):
                if frame_mask[y, x]:
                    pixel = img_array[y, x].copy()
                    
                    for c in range(3):
                        pixel[c] = pixel[c] * brightness_boost
                    
                    for c in range(3):
                        pixel[c] = 128 + (pixel[c] - 128) * contrast_boost
                    
                    img_array[y, x, :3] = np.clip(pixel[:3], 0, 255)
    
    result = Image.fromarray(img_array.astype(np.uint8))
    return result

def add_brightness_boost(img):
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.12)
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.18)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.10)
    
    return img

def create_pro_movement_animation(input_path, output_path, num_frames=60, duration=50):
    """
    Create animation with PROFESSIONAL STRONG movement
    """
    print("\n" + "🔥 " + "="*70)
    print("🔥  FRAME 17 - PROFESSIONAL STRONG MOVEMENT!")
    print("🔥 " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames with STRONG movement...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Professional wing movement with STRONG amplitude
        frame = move_lower_wings_professional(base_img, i, num_frames)
        
        # Lightning wave
        frame = apply_moving_lightning_wave(frame, i, num_frames)
        
        # Convert to RGB
        rgb_frame = Image.new('RGB', frame.size, (255, 255, 255))
        rgb_frame.paste(frame, mask=frame.split()[3])
        
        frames.append(rgb_frame)
    
    print(f"\n\n💾 Saving with high quality...\n")
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
        quality=97
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  PROFESSIONAL MOVEMENT!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms")
    print(f"   • Loop: {(num_frames * duration / 1000):.1f}s")
    print(f"   • Size: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)\n")
    
    print("✨ Features:")
    print("   ✓ STRONG wing movement (25 pixels!)")
    print("   ✓ Lower 65% of wings move")
    print("   ✓ Upper 35% stays static")
    print("   ✓ Quintic spline interpolation")
    print("   ✓ Anti-aliasing enabled")
    print("   ✓ Smooth gradient masks")
    print("   ✓ Lightning wave effect")
    print("   ✓ Crystal clear quality\n")
    
    print("🔥 STRONG & PROFESSIONAL!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame17.png'
    output_path = '/workspace/client/public/frames/frame17_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    create_pro_movement_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=60,
        duration=50
    )

if __name__ == '__main__':
    main()

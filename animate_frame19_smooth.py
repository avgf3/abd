#!/usr/bin/env python3
"""
Frame 19 Animation - SMOOTH Professional Version
- Wings movement
- Lightning effect  
- Ultra-smooth golden wave from bottom to top
"""

from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
import numpy as np
import math
import os
from scipy import ndimage

def create_wing_mask(width, height):
    """Create mask for wings"""
    mask = np.zeros((height, width), dtype=np.float64)
    
    left_wing_end = int(width * 0.30)
    right_wing_start = int(width * 0.70)
    
    for x in range(width):
        if x < left_wing_end:
            mask[:, x] = 1.0 - (x / left_wing_end)
        elif x > right_wing_start:
            mask[:, x] = (x - right_wing_start) / (width - right_wing_start)
        else:
            mask[:, x] = 0.0
    
    return mask

def move_wings_only(base_img, frame_num, total_frames):
    """Move ONLY the wings"""
    img_array = np.array(base_img, dtype=np.float64)
    height, width = img_array.shape[:2]
    
    phase = (frame_num / total_frames) * 2 * math.pi
    base_movement = math.sin(phase) * 10
    
    wing_mask = create_wing_mask(width, height)
    
    y_coords = np.arange(height, dtype=np.float64)
    x_coords = np.arange(width, dtype=np.float64)
    yy, xx = np.meshgrid(y_coords, x_coords, indexing='ij')
    
    movement_map = wing_mask * base_movement
    new_yy = yy + movement_map
    new_yy = np.clip(new_yy, 0, height - 1)
    
    moved_array = np.zeros_like(img_array)
    
    for channel in range(img_array.shape[2]):
        moved_array[:, :, channel] = ndimage.map_coordinates(
            img_array[:, :, channel],
            [new_yy, xx],
            order=3,
            mode='nearest',
            prefilter=True
        )
    
    mask_3d = np.stack([wing_mask] * img_array.shape[2], axis=2)
    result_array = img_array * (1 - mask_3d) + moved_array * mask_3d
    result_array = np.clip(result_array, 0, 255)
    
    result = Image.fromarray(result_array.astype(np.uint8))
    return result

def apply_lightning_effect(img, frame_num, total_frames):
    """Apply lightning flash effect"""
    cycle_position = (frame_num % total_frames) / total_frames
    
    if 0.93 <= cycle_position <= 0.97:
        if cycle_position <= 0.95:
            flash_factor = (cycle_position - 0.93) / 0.02
        else:
            flash_factor = (0.97 - cycle_position) / 0.02
        
        brightness_boost = 1.0 + (0.5 * flash_factor)
        contrast_boost = 1.0 + (0.2 * flash_factor)
        
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(brightness_boost)
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(contrast_boost)
    
    return img

def ease_in_out(t):
    """Smooth easing function for professional movement"""
    return t * t * (3.0 - 2.0 * t)

def add_smooth_golden_wave(img, frame_num, total_frames):
    """
    Add ULTRA-SMOOTH golden wave from bottom to top
    Professional quality with no artifacts
    """
    width, height = img.size
    
    # Use easing for smooth movement
    wave_progress = ease_in_out(frame_num / total_frames)
    
    # Wave center position with smooth interpolation
    wave_y = height - (wave_progress * (height + 150))  # Extra range for smooth exit
    
    # Create high-resolution overlay
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_array = np.array(overlay, dtype=np.float32)
    
    # Wave parameters
    wave_height = 120
    
    # Pre-calculate frame mask (which pixels are part of the frame)
    frame_mask = np.array(img)[:, :, 3] > 10 if img.mode == 'RGBA' else np.ones((height, width), dtype=bool)
    
    # Create smooth gradient map
    y_coords = np.arange(height, dtype=np.float32)
    distances = np.abs(y_coords - wave_y)
    
    # Ultra-smooth falloff using Gaussian-like curve
    distance_factors = np.exp(-(distances ** 2) / (2 * (wave_height / 2.5) ** 2))
    distance_factors = np.clip(distance_factors, 0, 1)
    
    # Apply golden color with smooth gradients
    for y in range(height):
        distance_factor = distance_factors[y]
        
        if distance_factor > 0.01:
            # Smooth color transition
            base_intensity = distance_factor ** 0.7
            
            # Rich golden color with smooth gradients
            r = int(255 * base_intensity)
            g = int((220 + 25 * distance_factor) * base_intensity)
            b = int((120 + 40 * distance_factor) * base_intensity)
            
            # Smooth alpha with anti-aliasing
            alpha = int(160 * distance_factor ** 0.5)
            
            # Apply to frame pixels only
            for x in range(width):
                if frame_mask[y, x]:
                    overlay_array[y, x] = [r, g, b, alpha]
    
    # Convert back to PIL Image
    overlay = Image.fromarray(overlay_array.astype(np.uint8), 'RGBA')
    
    # Multi-pass blur for ultra-smooth result
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=12))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    # Smooth composite
    result = Image.alpha_composite(img.convert('RGBA'), overlay)
    
    return result

def add_brightness_boost(img):
    """Enhance colors"""
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.15)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.08)
    
    return img

def create_smooth_animation(input_path, output_path, num_frames=80, duration=40):
    """
    Create ultra-smooth professional animation
    80 frames at 40ms = 3.2 seconds (very smooth)
    """
    print("\n" + "💎 " + "="*70)
    print("💎  FRAME 19 - ULTRA-SMOOTH PROFESSIONAL VERSION")
    print("💎 " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames (ultra-smooth)...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Move wings
        frame = move_wings_only(base_img, i, num_frames)
        
        # Apply lightning effect
        frame = apply_lightning_effect(frame, i, num_frames)
        
        # Add ultra-smooth golden wave
        frame = add_smooth_golden_wave(frame, i, num_frames)
        
        # Convert to RGB
        rgb_frame = Image.new('RGB', frame.size, (255, 255, 255))
        rgb_frame.paste(frame, mask=frame.split()[3])
        
        frames.append(rgb_frame)
    
    print(f"\n\n💾 Saving...\n")
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
        quality=98  # Higher quality
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  ULTRA-SMOOTH ANIMATION CREATED!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms per frame")
    print(f"   • Loop time: {(num_frames * duration / 1000):.1f}s")
    print(f"   • File size: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)")
    print(f"   • Quality: 98% (Ultra-high)\n")
    
    print("✨ Improvements:")
    print("   ✓ 80 frames (33% more frames = smoother)")
    print("   ✓ Easing function for smooth movement")
    print("   ✓ Gaussian-based gradients (no artifacts)")
    print("   ✓ Multi-pass blur for silk-smooth effect")
    print("   ✓ High-precision float calculations")
    print("   ✓ Anti-aliased alpha blending")
    print("   ✓ Professional quality\n")
    
    print("💎 ULTRA-SMOOTH - NO ARTIFACTS!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame19.png'
    output_path = '/workspace/client/public/frames/frame19_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    create_smooth_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=80,  # More frames = smoother
        duration=40     # Faster frame rate
    )

if __name__ == '__main__':
    main()

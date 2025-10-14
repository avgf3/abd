#!/usr/bin/env python3
"""
Frame 18 Animation - ZERO BLUR
- Sharp movement with minimal interpolation
- Reduced movement for cleaner result
- Crystal clear edges
"""

from PIL import Image, ImageEnhance
import numpy as np
import math
import os
from scipy import ndimage

def extract_lower_wings(img):
    """Extract lower wings"""
    width, height = img.size
    img_array = np.array(img)
    
    left_wing_end = int(width * 0.32)
    right_wing_start = int(width * 0.68)
    lower_start = int(height * 0.35)
    
    wings = np.zeros_like(img_array)
    frame_base = img_array.copy()
    
    for y in range(lower_start, height):
        for x in range(width):
            if x < left_wing_end or x > right_wing_start:
                wings[y, x] = img_array[y, x]
                frame_base[y, x] = [0, 0, 0, 0]
    
    return Image.fromarray(wings), Image.fromarray(frame_base)

def move_wings_sharp(wings_img, frame_num, total_frames):
    """
    Move wings with SHARP edges - minimal blur
    """
    img_array = np.array(wings_img, dtype=np.float64)
    height, width = img_array.shape[:2]
    
    phase = (frame_num / total_frames) * 2 * math.pi
    base_movement = math.sin(phase) * 15  # Reduced to 15 pixels for cleaner result
    
    # Movement map
    movement_map = np.zeros((height, width), dtype=np.float64)
    
    left_wing_end = int(width * 0.32)
    right_wing_start = int(width * 0.68)
    lower_start = int(height * 0.35)
    
    for y in range(lower_start, height):
        vertical_factor = ((y - lower_start) / (height - lower_start)) ** 1.2
        
        for x in range(width):
            if x < left_wing_end:
                horizontal_factor = (1.0 - (x / left_wing_end)) ** 1.0
                movement_map[y, x] = base_movement * horizontal_factor * vertical_factor
            elif x > right_wing_start:
                horizontal_factor = ((x - right_wing_start) / (width - right_wing_start)) ** 1.0
                movement_map[y, x] = base_movement * horizontal_factor * vertical_factor
    
    # Apply displacement
    y_coords = np.arange(height, dtype=np.float64)
    x_coords = np.arange(width, dtype=np.float64)
    yy, xx = np.meshgrid(y_coords, x_coords, indexing='ij')
    
    new_yy = yy + movement_map
    new_yy = np.clip(new_yy, 0, height - 1)
    
    # Linear interpolation - sharper than cubic/quintic
    moved_array = np.zeros_like(img_array)
    
    for channel in range(img_array.shape[2]):
        moved_array[:, :, channel] = ndimage.map_coordinates(
            img_array[:, :, channel],
            [new_yy, xx],
            order=1,  # Linear - sharp and clean
            mode='constant',
            prefilter=False,
            cval=0
        )
    
    result = Image.fromarray(moved_array.astype(np.uint8))
    
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

def create_sharp_animation(input_path, output_path, num_frames=70, duration=43):
    """
    Create SHARP animation - zero blur
    """
    print("\n" + "✨ " + "="*70)
    print("✨  FRAME 18 - SHARP EDGES (بدون تمويه نهائي)")
    print("✨ " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    base_img = add_brightness_boost(base_img)
    
    print("🔪 Extracting lower wings...")
    wings, frame_base = extract_lower_wings(base_img)
    print("   ✓ Wings extracted\n")
    
    frames = []
    
    print(f"🎬 Creating {num_frames} sharp frames...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Sharp movement
        moved_wings = move_wings_sharp(wings, i, num_frames)
        
        # Composite
        frame = Image.alpha_composite(frame_base, moved_wings)
        
        # Lightning
        frame = apply_moving_lightning_wave(frame, i, num_frames)
        
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
        quality=98
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  SHARP - ZERO BLUR!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms")
    print(f"   • Size: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)\n")
    
    print("✨ Improvements:")
    print("   ✓ Linear interpolation (sharp)")
    print("   ✓ NO prefilter (crisp)")
    print("   ✓ Reduced movement (15px)")
    print("   ✓ Clean extraction")
    print("   ✓ ZERO blur/ghosting\n")
    
    print("✨ SHARP AND CLEAN!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame18.png'
    output_path = '/workspace/client/public/frames/frame18_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: not found")
        return
    
    create_sharp_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=70,
        duration=43
    )

if __name__ == '__main__':
    main()

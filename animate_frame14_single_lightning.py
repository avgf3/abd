#!/usr/bin/env python3
"""
Frame 14 Animation - SINGLE Lightning Pass
- NO wing movement (static frame)
- Single lightning bolt travels from bottom to top
- Lightning disappears at top, then starts again from bottom
"""

from PIL import Image, ImageEnhance
import numpy as np
import math
import os

def ease_in_out(t):
    """Smooth easing"""
    return t * t * (3.0 - 2.0 * t)

def apply_single_lightning_pass(img, frame_num, total_frames):
    """
    Single lightning pass from bottom to top
    Lightning starts at bottom, travels up, disappears at top
    """
    width, height = img.size
    
    # Progress of lightning (0 to 1)
    lightning_progress = ease_in_out(frame_num / total_frames)
    
    # Lightning position (travels from bottom to top)
    lightning_y = height - (lightning_progress * (height + 200))  # +200 for complete exit
    
    # Lightning bolt parameters
    bolt_height = 120  # Height of the lightning bolt
    
    img_array = np.array(img, dtype=np.float32)
    
    # Get frame mask
    if img.mode == 'RGBA':
        frame_mask = img_array[:, :, 3] > 10
    else:
        frame_mask = np.ones((height, width), dtype=bool)
    
    # Calculate lightning intensity for each row
    y_coords = np.arange(height, dtype=np.float32)
    distances = np.abs(y_coords - lightning_y)
    
    # Sharp Gaussian for concentrated bolt effect
    lightning_factors = np.exp(-(distances ** 2) / (2 * (bolt_height / 2.5) ** 2))
    lightning_factors = np.clip(lightning_factors, 0, 1)
    
    # Apply lightning effect
    for y in range(height):
        lightning_intensity = lightning_factors[y]
        
        if lightning_intensity > 0.08:
            # Strong lightning effect
            brightness_boost = 1.0 + (0.7 * lightning_intensity)  # Up to 1.7x
            contrast_boost = 1.0 + (0.35 * lightning_intensity)   # Up to 1.35x
            
            for x in range(width):
                if frame_mask[y, x]:
                    pixel = img_array[y, x].copy()
                    
                    # Apply brightness
                    for c in range(3):
                        pixel[c] = pixel[c] * brightness_boost
                    
                    # Apply contrast
                    for c in range(3):
                        pixel[c] = 128 + (pixel[c] - 128) * contrast_boost
                    
                    img_array[y, x, :3] = np.clip(pixel[:3], 0, 255)
    
    result = Image.fromarray(img_array.astype(np.uint8))
    return result

def add_brightness_boost(img):
    """Enhance colors"""
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.12)
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.18)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.10)
    
    return img

def create_single_lightning_animation(input_path, output_path, num_frames=60, duration=50):
    """
    Create animation with single lightning pass
    """
    print("\n" + "⚡ " + "="*70)
    print("⚡  FRAME 14 - SINGLE LIGHTNING PASS (برق واحد)")
    print("⚡ " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    print("✅ Frame will stay STATIC (no wing movement)")
    print("⚡ Single lightning bolt will travel from bottom to top\n")
    
    # Enhance base image
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames with single lightning...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Start with STATIC base image (NO movement!)
        frame = base_img.copy()
        
        # Apply single lightning pass
        frame = apply_single_lightning_pass(frame, i, num_frames)
        
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
        loop=0,  # Infinite loop
        optimize=True,
        quality=97
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  SINGLE LIGHTNING ANIMATION!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms per frame")
    print(f"   • Loop time: {(num_frames * duration / 1000):.1f}s")
    print(f"   • File size: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)\n")
    
    print("✨ Features:")
    print("   ✓ Frame stays STATIC (no wing movement)")
    print("   ✓ Single lightning bolt")
    print("   ✓ Travels from BOTTOM to TOP")
    print("   ✓ Disappears at top, repeats from bottom")
    print("   ✓ Smooth easing movement")
    print("   ✓ Professional effect\n")
    
    print("⚡ SINGLE LIGHTNING PASS!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame14.png'
    output_path = '/workspace/client/public/frames/frame14_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    create_single_lightning_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=60,
        duration=50
    )

if __name__ == '__main__':
    main()

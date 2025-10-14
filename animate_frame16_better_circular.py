#!/usr/bin/env python3
"""
Frame 16 Animation - BETTER Circular Lightning
- Stronger, more visible circular lightning
- Professional smooth rotation
"""

from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
import numpy as np
import math
import os

def apply_better_circular_lightning(img, frame_num, total_frames):
    """
    Better circular lightning with stronger visibility
    """
    width, height = img.size
    center_x, center_y = width / 2, height / 2
    
    # Lightning angle
    lightning_angle = (frame_num / total_frames) * 2 * math.pi
    
    # Create overlay for lightning
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Draw stronger lightning arc
    arc_width = 80  # Wider arc
    
    img_array = np.array(img, dtype=np.float32)
    frame_mask = img_array[:, :, 3] > 10 if img.mode == 'RGBA' else np.ones((height, width), dtype=bool)
    
    # Create lightning effect on pixels
    for y in range(height):
        for x in range(width):
            if frame_mask[y, x]:
                # Calculate angle
                dx = x - center_x
                dy = y - center_y
                pixel_angle = math.atan2(dy, dx)
                
                # Distance from center
                distance_from_center = math.sqrt(dx**2 + dy**2)
                
                # Angular distance
                angle_diff = lightning_angle - pixel_angle
                while angle_diff > math.pi:
                    angle_diff -= 2 * math.pi
                while angle_diff < -math.pi:
                    angle_diff += 2 * math.pi
                
                distance = abs(angle_diff) * 180 / math.pi
                
                if distance < arc_width:
                    distance_factor = 1.0 - (distance / arc_width)
                    distance_factor = distance_factor ** 1.5
                    
                    # Stronger lightning
                    lightning_intensity = distance_factor
                    
                    if lightning_intensity > 0.1:
                        brightness_boost = 1.0 + (0.9 * lightning_intensity)  # Up to 1.9x!
                        contrast_boost = 1.0 + (0.4 * lightning_intensity)
                        
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
    img = enhancer.enhance(1.15)
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.20)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.12)
    
    return img

def create_better_circular_animation(input_path, output_path, num_frames=60, duration=50):
    """
    Create better circular lightning animation
    """
    print("\n" + "⚡ " + "="*70)
    print("⚡  FRAME 16 - BETTER CIRCULAR LIGHTNING (أقوى وأوضح)")
    print("⚡ " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        frame = base_img.copy()
        frame = apply_better_circular_lightning(frame, i, num_frames)
        
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
        quality=97
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    
    print("✅ " + "="*70)
    print("✅  BETTER CIRCULAR LIGHTNING!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Size: {file_size_kb:.1f} KB\n")
    
    print("✨ Improvements:")
    print("   ✓ Stronger brightness (up to 1.9x)")
    print("   ✓ Wider arc (80 degrees)")
    print("   ✓ More visible")
    print("   ✓ Professional rotation\n")
    
    print("⚡ BETTER & STRONGER!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame16.png'
    output_path = '/workspace/client/public/frames/frame16_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: not found")
        return
    
    create_better_circular_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=60,
        duration=50
    )

if __name__ == '__main__':
    main()

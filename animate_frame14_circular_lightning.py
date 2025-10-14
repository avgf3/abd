#!/usr/bin/env python3
"""
Frame 14 Animation - CIRCULAR Lightning
- NO wing movement
- Lightning bolt travels around the frame in circular path
- Follows the circular shape of the frame
"""

from PIL import Image, ImageEnhance
import numpy as np
import math
import os

def apply_circular_lightning(img, frame_num, total_frames):
    """
    Lightning travels in circular path around the frame
    """
    width, height = img.size
    center_x, center_y = width / 2, height / 2
    
    # Lightning progress around the circle (0 to 2π)
    lightning_angle = (frame_num / total_frames) * 2 * math.pi
    
    # Lightning bolt parameters
    bolt_width = 100  # Width of the lightning arc
    
    img_array = np.array(img, dtype=np.float32)
    
    # Get frame mask
    if img.mode == 'RGBA':
        frame_mask = img_array[:, :, 3] > 10
    else:
        frame_mask = np.ones((height, width), dtype=bool)
    
    # Apply lightning in circular pattern
    for y in range(height):
        for x in range(width):
            if frame_mask[y, x]:
                # Calculate angle of this pixel from center
                dx = x - center_x
                dy = y - center_y
                pixel_angle = math.atan2(dy, dx)
                
                # Calculate angular distance from lightning position
                angle_diff = lightning_angle - pixel_angle
                
                # Normalize angle difference to -π to π
                while angle_diff > math.pi:
                    angle_diff -= 2 * math.pi
                while angle_diff < -math.pi:
                    angle_diff += 2 * math.pi
                
                # Convert angle difference to distance
                distance = abs(angle_diff) * 180 / math.pi  # Convert to degrees-like
                
                # Calculate lightning intensity based on angular distance
                if distance < bolt_width:
                    distance_factor = 1.0 - (distance / bolt_width)
                    lightning_intensity = distance_factor ** 2
                    
                    if lightning_intensity > 0.08:
                        # Apply lightning effect
                        brightness_boost = 1.0 + (0.7 * lightning_intensity)
                        contrast_boost = 1.0 + (0.35 * lightning_intensity)
                        
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

def create_circular_lightning_animation(input_path, output_path, num_frames=60, duration=50):
    """
    Create animation with circular lightning
    """
    print("\n" + "⚡ " + "="*70)
    print("⚡  FRAME 14 - CIRCULAR LIGHTNING (برق دائري)")
    print("⚡ " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px\n")
    
    print("✅ Frame will stay STATIC")
    print("⚡ Lightning travels in CIRCULAR path around frame\n")
    
    base_img = add_brightness_boost(base_img)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames with circular lightning...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Static frame
        frame = base_img.copy()
        
        # Apply circular lightning
        frame = apply_circular_lightning(frame, i, num_frames)
        
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
        quality=97
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  CIRCULAR LIGHTNING!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms")
    print(f"   • Loop: {(num_frames * duration / 1000):.1f}s")
    print(f"   • Size: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)\n")
    
    print("✨ Features:")
    print("   ✓ Frame STATIC (no movement)")
    print("   ✓ Lightning travels in CIRCULAR path")
    print("   ✓ Follows frame shape")
    print("   ✓ Complete 360° rotation")
    print("   ✓ Smooth angular movement\n")
    
    print("⚡ CIRCULAR LIGHTNING - يدور حول الإطار!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame14.png'
    output_path = '/workspace/client/public/frames/frame14_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    create_circular_lightning_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=60,
        duration=50
    )

if __name__ == '__main__':
    main()

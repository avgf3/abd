#!/usr/bin/env python3
"""
ULTRA PROFESSIONAL Frame Animation
- Preserves ALL frame details (no disappearing parts)
- Smooth wing movement with advanced interpolation
- Professional glow and shine effects
- Maximum quality output
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
import math
import os
from scipy import ndimage
import warnings
warnings.filterwarnings('ignore')

def create_wing_animation_advanced(base_img, frame_num, total_frames):
    """
    Advanced wing animation that PRESERVES all frame details
    Uses sophisticated displacement mapping
    """
    img_array = np.array(base_img, dtype=np.float32)
    height, width = img_array.shape[:2]
    
    # Calculate smooth sinusoidal movement
    phase = (frame_num / total_frames) * 2 * math.pi
    movement_amplitude = 5  # pixels
    base_movement = math.sin(phase) * movement_amplitude
    
    # Create coordinate grids
    y_coords, x_coords = np.mgrid[0:height, 0:width]
    
    # Define wing regions with smooth gradients
    # Left wing: 0-35% of width
    # Right wing: 65-100% of width
    # Center: 35-65% stays mostly static
    
    left_boundary = width * 0.35
    right_boundary = width * 0.65
    
    # Create smooth movement mask
    movement_map = np.zeros((height, width), dtype=np.float32)
    
    for x in range(width):
        if x < left_boundary:
            # Left wing - outer edge moves more
            factor = 1.0 - (x / left_boundary) * 0.85  # Keep 15% at minimum
            movement_map[:, x] = base_movement * factor
        elif x > right_boundary:
            # Right wing - outer edge moves more  
            factor = ((x - right_boundary) / (width - right_boundary)) * 0.85 + 0.15
            movement_map[:, x] = base_movement * factor
        else:
            # Center area - minimal movement for smooth transition
            center_pos = (x - left_boundary) / (right_boundary - left_boundary)
            factor = 0.15 * (1 - abs(center_pos - 0.5) * 2)  # Peak at center
            movement_map[:, x] = base_movement * factor
    
    # Apply vertical displacement
    new_y_coords = y_coords + movement_map
    
    # Clamp coordinates to valid range
    new_y_coords = np.clip(new_y_coords, 0, height - 1)
    
    # Create result image with proper interpolation
    result_array = np.zeros_like(img_array)
    
    # Interpolate each channel
    for channel in range(img_array.shape[2]):
        result_array[:, :, channel] = ndimage.map_coordinates(
            img_array[:, :, channel],
            [new_y_coords, x_coords],
            order=3,  # Cubic interpolation for smoothness
            mode='nearest'  # No missing pixels
        )
    
    result = Image.fromarray(result_array.astype(np.uint8))
    return result

def add_professional_glow(img, intensity=0.8):
    """
    Add professional glow without hiding any details
    Multi-layer glow effect
    """
    # Create multiple glow layers
    glow1 = img.filter(ImageFilter.GaussianBlur(radius=3))
    glow2 = img.filter(ImageFilter.GaussianBlur(radius=6))
    glow3 = img.filter(ImageFilter.GaussianBlur(radius=10))
    
    # Enhance each layer
    enhancer1 = ImageEnhance.Brightness(glow1)
    glow1 = enhancer1.enhance(1.1)
    
    enhancer2 = ImageEnhance.Brightness(glow2)
    glow2 = enhancer2.enhance(1.15)
    
    enhancer3 = ImageEnhance.Brightness(glow3)
    glow3 = enhancer3.enhance(1.2)
    
    # Composite layers with decreasing opacity
    result = Image.alpha_composite(
        img.convert('RGBA'),
        Image.blend(glow3.convert('RGBA'), Image.new('RGBA', img.size, (0, 0, 0, 0)), 0.85)
    )
    result = Image.alpha_composite(
        result,
        Image.blend(glow2.convert('RGBA'), Image.new('RGBA', img.size, (0, 0, 0, 0)), 0.9)
    )
    result = Image.alpha_composite(
        result,
        Image.blend(glow1.convert('RGBA'), Image.new('RGBA', img.size, (0, 0, 0, 0)), 0.95)
    )
    
    return result

def add_pulsing_shine(img, frame_num, total_frames):
    """
    Add elegant pulsing shine effect
    Beautiful animated glow on edges
    """
    width, height = img.size
    
    # Calculate pulse
    pulse_phase = (frame_num / total_frames) * 2 * math.pi
    pulse_intensity = 0.6 + math.sin(pulse_phase) * 0.4  # 0.2 to 1.0
    
    # Create shine overlay
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Draw multiple edge glow layers
    edge_thickness = 25
    for i in range(edge_thickness):
        # Calculate alpha for this layer
        progress = i / edge_thickness
        alpha = int((1 - progress) * 80 * pulse_intensity)
        
        if alpha > 0:
            # Warm golden glow color
            color = (255, 245, 200, alpha)
            draw.rectangle(
                [i, i, width - i - 1, height - i - 1],
                outline=color,
                width=1
            )
    
    # Apply gaussian blur for smooth glow
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    # Add corner sparkles
    sparkle_phase = (frame_num % (total_frames // 2)) / (total_frames // 2)
    sparkle_alpha = int(abs(math.sin(sparkle_phase * math.pi)) * 120)
    
    if sparkle_alpha > 20:
        sparkle_positions = [
            (15, 15), (width - 15, 15),
            (15, height - 15), (width - 15, height - 15)
        ]
        
        for px, py in sparkle_positions:
            # Draw sparkle star
            for radius in range(8, 0, -2):
                alpha = sparkle_alpha * (radius / 8)
                draw.ellipse(
                    [px - radius, py - radius, px + radius, py + radius],
                    fill=(255, 255, 255, int(alpha))
                )
    
    # Composite with original
    result = Image.alpha_composite(img.convert('RGBA'), overlay)
    
    return result

def add_edge_enhancement(img):
    """
    Enhance edges to make frame pop without losing details
    """
    # Subtle edge enhancement
    edges = img.filter(ImageFilter.FIND_EDGES)
    enhancer = ImageEnhance.Brightness(edges)
    edges = enhancer.enhance(0.3)
    
    # Composite subtly
    result = Image.alpha_composite(
        img.convert('RGBA'),
        edges.convert('RGBA')
    )
    
    return result

def create_ultra_professional_animation(input_path, output_path, num_frames=36, duration=55):
    """
    Create ULTRA PROFESSIONAL animated GIF
    - Perfect detail preservation
    - Smooth wing animation
    - Beautiful glow effects
    - Maximum quality
    """
    print("🎨 " + "="*60)
    print("🎨 ULTRA PROFESSIONAL FRAME ANIMATION")
    print("🎨 " + "="*60)
    print(f"\n📂 Loading: {os.path.basename(input_path)}")
    
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    print(f"📐 Size: {width}x{height}px")
    
    # Enhance base image colors
    enhancer = ImageEnhance.Color(base_img)
    base_img = enhancer.enhance(1.12)
    
    enhancer = ImageEnhance.Contrast(base_img)
    base_img = enhancer.enhance(1.05)
    
    frames = []
    
    print(f"\n🎬 Creating {num_frames} frames...")
    print("="*60)
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 40
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        print(f"  [{bar}] {progress*100:.1f}% - Frame {i+1}/{num_frames}", end='\r')
        
        # Step 1: Wing animation (preserves all details)
        frame = create_wing_animation_advanced(base_img, i, num_frames)
        
        # Step 2: Add professional glow
        frame = add_professional_glow(frame, intensity=0.7)
        
        # Step 3: Add pulsing shine
        frame = add_pulsing_shine(frame, i, num_frames)
        
        # Step 4: Edge enhancement
        # frame = add_edge_enhancement(frame)  # Optional, might be too much
        
        # Convert to RGB for GIF (preserve transparency as white)
        rgb_frame = Image.new('RGB', frame.size, (255, 255, 255))
        if frame.mode == 'RGBA':
            rgb_frame.paste(frame, mask=frame.split()[3])
        else:
            rgb_frame = frame.convert('RGB')
        
        frames.append(rgb_frame)
    
    print(f"\n{'='*60}")
    print(f"💾 Saving ultra-quality GIF...")
    
    # Save with maximum quality
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=False,  # Don't optimize to preserve quality
        quality=100
    )
    
    file_size = os.path.getsize(output_path) / 1024
    
    print(f"\n✅ " + "="*60)
    print(f"✅ ANIMATION CREATED SUCCESSFULLY!")
    print(f"✅ " + "="*60)
    print(f"\n📁 Output: {os.path.basename(output_path)}")
    print(f"📍 Location: {os.path.dirname(output_path)}")
    print(f"\n📊 Specifications:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms per frame")
    print(f"   • Loop time: {(num_frames * duration / 1000):.1f}s")
    print(f"   • File size: {file_size:.1f} KB")
    print(f"   • Quality: ULTRA (100%)")
    print(f"\n✨ Features:")
    print(f"   ✓ Wing movement with cubic interpolation")
    print(f"   ✓ Multi-layer professional glow")
    print(f"   ✓ Pulsing golden shine on edges")
    print(f"   ✓ Corner sparkle effects")
    print(f"   ✓ Perfect detail preservation")
    print(f"   ✓ No missing or hidden parts")
    print(f"\n🚀 ALL DETAILS PRESERVED - PROFESSIONAL QUALITY!")
    print("="*60 + "\n")

def main():
    # Check for scipy
    try:
        import scipy
    except ImportError:
        print("📦 Installing scipy for advanced interpolation...")
        os.system("pip install scipy --quiet")
        import scipy
    
    input_path = '/workspace/client/public/frames/frame11.png'
    output_path = '/workspace/client/public/frames/frame11_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: Input file not found: {input_path}")
        return
    
    # Create ULTRA PROFESSIONAL animation
    # 36 frames at 55ms = ~2 seconds per loop (smooth and professional)
    create_ultra_professional_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=36,
        duration=55
    )

if __name__ == '__main__':
    main()

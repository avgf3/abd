#!/usr/bin/env python3
"""
Frame Animation - GLOW ON FRAME ONLY
- NO wing movement
- NO background movement
- Frame image stays STATIC
- ONLY pulsing glow on the frame edges
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math
import os

def create_frame_glow(width, height, frame_num, total_frames):
    """
    Create pulsing glow on frame edges ONLY
    """
    # Pulse calculation
    pulse_phase = (frame_num / total_frames) * 2 * math.pi
    pulse_intensity = 0.7 + math.sin(pulse_phase) * 0.3
    
    # Create transparent overlay
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Draw edge glow - ONLY on edges
    edge_width = 45
    for i in range(edge_width):
        progress = i / edge_width
        alpha = int((1 - progress) ** 1.5 * 180 * pulse_intensity)
        
        if alpha > 5:
            draw.rectangle(
                [i, i, width - i - 1, height - i - 1],
                outline=(255, 250, 200, alpha),
                width=2
            )
    
    # Blur for smooth glow
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=15))
    
    return overlay

def create_sparkles(width, height, frame_num, total_frames):
    """
    Create corner sparkles
    """
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Sparkle phase
    sparkle_phase = (frame_num % (total_frames // 2)) / (total_frames // 2)
    sparkle_alpha = int(abs(math.sin(sparkle_phase * math.pi * 2)) * 200)
    
    if sparkle_alpha > 30:
        # Corners
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
        
        # Mid edges
        mid_points = [
            (width // 2, 15),
            (width // 2, height - 15),
            (15, height // 2),
            (width - 15, height // 2),
        ]
        
        for cx, cy in mid_points:
            for radius in range(8, 0, -2):
                r_alpha = int(sparkle_alpha * 0.7 * (radius / 8))
                draw.ellipse(
                    [cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=(255, 255, 200, r_alpha)
                )
    
    # Blur
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))
    
    return overlay

def create_glow_only_animation(input_path, output_path, num_frames=36, duration=55):
    """
    Create animation with GLOW ONLY - no movement
    """
    print("\n" + "✨ " + "="*70)
    print("✨  GLOW ONLY - STATIC FRAME WITH PULSING GLOW")
    print("✨ " + "="*70 + "\n")
    
    print(f"📂 Loading: {os.path.basename(input_path)}")
    
    # Load original - keep it STATIC!
    base_img = Image.open(input_path).convert('RGBA')
    width, height = base_img.size
    
    print(f"📐 Size: {width}x{height}px")
    print(f"✅ Frame will stay STATIC (no movement)\n")
    
    # Slight enhancement
    enhancer = ImageEnhance.Brightness(base_img)
    base_img = enhancer.enhance(1.1)
    
    enhancer = ImageEnhance.Color(base_img)
    base_img = enhancer.enhance(1.15)
    
    enhancer = ImageEnhance.Contrast(base_img)
    base_img = enhancer.enhance(1.08)
    
    frames = []
    
    print(f"🎬 Creating {num_frames} frames with pulsing glow...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # Start with STATIC base image (NO MOVEMENT!)
        frame = base_img.copy()
        
        # Add glow overlay
        glow = create_frame_glow(width, height, i, num_frames)
        frame = Image.alpha_composite(frame, glow)
        
        # Add sparkles
        sparkles = create_sparkles(width, height, i, num_frames)
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
    print("✅  DONE - GLOW ONLY ANIMATION!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 File: {os.path.basename(output_path)}")
    print(f"📍 Path: {output_path}\n")
    
    print("📊 Stats:")
    print(f"   • Frames: {num_frames}")
    print(f"   • Duration: {duration}ms/frame")
    print(f"   • Total: {(num_frames * duration / 1000):.1f}s")
    print(f"   • Size: {file_size_kb:.1f} KB\n")
    
    print("✨ What's animated:")
    print("   ✓ Frame stays STATIC (no movement)")
    print("   ✓ Pulsing golden glow on edges")
    print("   ✓ Sparkling corners")
    print("   ✓ Clean background\n")
    
    print("🚀 PERFECT - GLOW ONLY!")
    print("="*70 + "\n")

def main():
    input_path = '/workspace/client/public/frames/frame11.png'
    output_path = '/workspace/client/public/frames/frame11_animated.gif'
    
    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found")
        return
    
    create_glow_only_animation(
        input_path=input_path,
        output_path=output_path,
        num_frames=36,
        duration=55
    )

if __name__ == '__main__':
    main()

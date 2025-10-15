#!/usr/bin/env python3
"""
تأثيرات احترافية على الإطارات (10-42)
✅ حركة أجنحة ناعمة (Wing Movement)
✅ تأثير برق خفيف (Lightning Effect)  
❌ بدون بريق ولمعان (No Shine/Glow)
"""

from PIL import Image, ImageEnhance
import numpy as np
import math
import os
import sys

def ease_in_out(t):
    """منحنى سلس للحركة"""
    return t * t * (3.0 - 2.0 * t)

def apply_wing_movement(img, frame_num, total_frames):
    """
    حركة أجنحة ناعمة - تنفس طبيعي
    """
    width, height = img.size
    progress = frame_num / total_frames
    
    # حركة تنفس (صعود ونزول بطيء)
    angle = progress * 2 * math.pi
    movement_y = math.sin(angle) * 2  # حركة عمودية خفيفة ±2px
    movement_scale = 1.0 + (math.sin(angle) * 0.005)  # تكبير/تصغير خفيف جداً ±0.5%
    
    # تطبيق الحركة
    img_array = np.array(img, dtype=np.float32)
    
    # حركة عمودية بسيطة (shift)
    if abs(movement_y) > 0.1:
        shift = int(movement_y)
        if shift > 0:
            img_array[shift:, :, :] = img_array[:-shift, :, :]
            img_array[:shift, :, :] = 0
        elif shift < 0:
            img_array[:shift, :, :] = img_array[-shift:, :, :]
            img_array[shift:, :, :] = 0
    
    result = Image.fromarray(img_array.astype(np.uint8))
    
    # تطبيق scale خفيف جداً
    if abs(movement_scale - 1.0) > 0.001:
        new_size = (int(width * movement_scale), int(height * movement_scale))
        result = result.resize(new_size, Image.LANCZOS)
        # إرجاع للحجم الأصلي
        result = result.resize((width, height), Image.LANCZOS)
    
    return result

def apply_lightning_effect(img, frame_num, total_frames):
    """
    تأثير برق خفيف - يتحرك من الأسفل للأعلى
    """
    width, height = img.size
    
    # تقدم البرق
    lightning_progress = ease_in_out(frame_num / total_frames)
    lightning_y = height - (lightning_progress * (height + 150))
    
    img_array = np.array(img, dtype=np.float32)
    
    # قناع الإطار
    if img.mode == 'RGBA':
        frame_mask = img_array[:, :, 3] > 10
    else:
        frame_mask = np.ones((height, width), dtype=bool)
    
    # حساب شدة البرق
    y_coords = np.arange(height, dtype=np.float32)
    distances = np.abs(y_coords - lightning_y)
    
    bolt_height = 70  # برق ضيق
    lightning_factors = np.exp(-(distances ** 2) / (2 * (bolt_height / 4.0) ** 2))
    lightning_factors = np.clip(lightning_factors, 0, 1)
    
    # تطبيق البرق - خفيف جداً!
    for y in range(height):
        lightning_intensity = lightning_factors[y]
        
        if lightning_intensity > 0.18:  # عتبة عالية
            # تأثير برق خفيف جداً
            brightness_boost = 1.0 + (0.15 * lightning_intensity)  # أقصى 1.15x
            contrast_boost = 1.0 + (0.08 * lightning_intensity)     # أقصى 1.08x
            
            for x in range(width):
                if frame_mask[y, x]:
                    pixel = img_array[y, x].copy()
                    
                    # تطبيق على RGB فقط
                    for c in range(3):
                        pixel[c] = pixel[c] * brightness_boost
                    for c in range(3):
                        pixel[c] = 128 + (pixel[c] - 128) * contrast_boost
                    
                    img_array[y, x, :3] = np.clip(pixel[:3], 0, 255)
    
    return Image.fromarray(img_array.astype(np.uint8))

def create_animated_frame(input_path, output_path, frame_number, num_frames=50, duration=60):
    """
    إنشاء إطار متحرك بتأثيرات احترافية
    """
    print(f"\n{'='*70}")
    print(f"🎬 معالجة الإطار {frame_number}")
    print(f"{'='*70}")
    
    print(f"📂 المصدر: {os.path.basename(input_path)}")
    
    try:
        base_img = Image.open(input_path).convert('RGBA')
        width, height = base_img.size
        print(f"📐 الحجم: {width}x{height}px")
        
        frames = []
        
        print(f"\n⚡ تطبيق التأثيرات:")
        print(f"  ✓ حركة أجنحة ناعمة")
        print(f"  ✓ تأثير برق خفيف")
        print(f"  ✗ بدون بريق ولمعان")
        print(f"\n🎬 إنشاء {num_frames} إطار...\n")
        
        for i in range(num_frames):
            progress = (i + 1) / num_frames
            bar_length = 50
            filled = int(bar_length * progress)
            bar = "█" * filled + "░" * (bar_length - filled)
            print(f"   [{bar}] {progress*100:5.1f}%", end='\r')
            
            frame = base_img.copy()
            
            # 1. حركة أجنحة
            frame = apply_wing_movement(frame, i, num_frames)
            
            # 2. تأثير برق
            frame = apply_lightning_effect(frame, i, num_frames)
            
            frames.append(frame)
        
        print(f"\n\n💾 حفظ كـ GIF...\n")
        
        # حفظ كـ GIF مع شفافية
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0,
            optimize=True,
            transparency=0,
            disposal=2
        )
        
        file_size_kb = os.path.getsize(output_path) / 1024
        file_size_mb = file_size_kb / 1024
        
        print(f"✅ نجح!")
        print(f"   💾 الحجم: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)")
        print(f"   ⏱️  المدة: {(num_frames * duration / 1000):.1f}s loop")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def main():
    base_path = '/workspace/client/public/frames'
    
    print("\n" + "🎬 " + "="*68)
    print("🎬  تأثيرات احترافية - برق + حركة أجنحة (بدون بريق)")
    print("🎬 " + "="*68)
    
    if len(sys.argv) > 1:
        # معالجة إطار واحد
        try:
            frame_number = int(sys.argv[1])
            if frame_number < 10 or frame_number > 42:
                print("❌ رقم الإطار يجب أن يكون بين 10 و 42")
                sys.exit(1)
            
            input_path = f'{base_path}/frame{frame_number}.webp'
            output_path = f'{base_path}/frame{frame_number}_animated.gif'
            
            if not os.path.exists(input_path):
                print(f"❌ {input_path} غير موجود")
                sys.exit(1)
            
            success = create_animated_frame(input_path, output_path, frame_number)
            sys.exit(0 if success else 1)
            
        except ValueError:
            print("❌ رقم إطار غير صحيح")
            sys.exit(1)
    else:
        # معالجة جميع الإطارات 10-42
        print("\n📋 معالجة جميع الإطارات من 10 إلى 42...\n")
        
        success_count = 0
        fail_count = 0
        
        for frame_num in range(10, 43):
            input_path = f'{base_path}/frame{frame_num}.webp'
            output_path = f'{base_path}/frame{frame_num}_animated.gif'
            
            if os.path.exists(input_path):
                if create_animated_frame(input_path, output_path, frame_num):
                    success_count += 1
                else:
                    fail_count += 1
            else:
                print(f"❌ frame{frame_num}.webp غير موجود")
                fail_count += 1
        
        print("\n" + "="*70)
        print(f"✅ نجح: {success_count} إطار")
        print(f"❌ فشل: {fail_count} إطار")
        print("="*70 + "\n")

if __name__ == '__main__':
    main()

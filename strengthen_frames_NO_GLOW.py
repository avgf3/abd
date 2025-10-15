#!/usr/bin/env python3
"""
تقوية الإطارات بدون التوهج الأبيض
✅ إزالة التوهج الأبيض الناصع
✅ تقوية الإطار نفسه فقط
✅ بدون العبث بالتصاميم
"""

from PIL import Image
import numpy as np
import os
import sys

def strengthen_frame_no_glow(img, strength=1.8, remove_white_glow=True):
    """
    تقوية الإطار مع إزالة التوهج الأبيض
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    img_array = np.array(img, dtype=np.float32)
    
    # إزالة التوهج الأبيض الناصع
    if remove_white_glow:
        # البيكسلات البيضاء الفاتحة جداً (التوهج) - نزيلها!
        r = img_array[:, :, 0]
        g = img_array[:, :, 1]
        b = img_array[:, :, 2]
        alpha = img_array[:, :, 3]
        
        # إذا كانت البيكسل بيضاء جداً (R>240, G>240, B>240) -> نضعفها أو نزيلها
        white_mask = (r > 240) & (g > 240) & (b > 240) & (alpha > 10)
        
        # تقليل شدة البيكسلات البيضاء بشكل كبير
        img_array[white_mask, 3] = img_array[white_mask, 3] * 0.1  # تقليل alpha للأبيض بـ 90%
    
    # تقوية alpha للبيكسلات الباقية (الإطار نفسه)
    alpha = img_array[:, :, 3]
    mask = alpha > 5
    alpha[mask] = np.clip(alpha[mask] * strength, 0, 255)
    img_array[:, :, 3] = alpha
    
    return Image.fromarray(img_array.astype(np.uint8))

def process_frame(frame_number, strength=1.8):
    """
    معالجة إطار واحد - تقوية بدون توهج أبيض
    """
    base_path = '/workspace/client/public/frames'
    
    source_candidates = [
        f'{base_path}/frame{frame_number}.png',
        f'{base_path}/frame{frame_number}.webp',
        f'{base_path}/frame{frame_number}_animated.gif',
    ]
    
    input_path = None
    for candidate in source_candidates:
        if os.path.exists(candidate):
            input_path = candidate
            break
    
    if not input_path:
        print(f"❌ الإطار {frame_number} غير موجود")
        return False
    
    output_path = f'{base_path}/frame{frame_number}_animated.gif'
    
    print(f"\n🔧 معالجة الإطار {frame_number}...")
    print(f"   📂 المصدر: {os.path.basename(input_path)}")
    
    try:
        img = Image.open(input_path).convert('RGBA')
        width, height = img.size
        print(f"   📐 الحجم: {width}x{height}px")
        
        print(f"   ❌ إزالة التوهج الأبيض...")
        print(f"   ⚡ تقوية الإطار (x{strength})...")
        img_strong = strengthen_frame_no_glow(img, strength=strength, remove_white_glow=True)
        
        img_strong.save(
            output_path,
            'GIF',
            transparency=0,
            optimize=True
        )
        
        file_size_kb = os.path.getsize(output_path) / 1024
        print(f"   💾 الحجم: {file_size_kb:.1f} KB")
        print(f"   ✅ نجح!")
        
        return True
        
    except Exception as e:
        print(f"   ❌ خطأ: {e}")
        return False

def main():
    print("\n" + "=" * 70)
    print("🔧 تقوية الإطارات بدون التوهج الأبيض")
    print("=" * 70 + "\n")
    
    strength = 1.8
    
    if len(sys.argv) > 1:
        try:
            frame_number = int(sys.argv[1])
            if len(sys.argv) > 2:
                strength = float(sys.argv[2])
            
            if frame_number < 10 or frame_number > 42:
                print("❌ رقم الإطار يجب أن يكون بين 10 و 42")
                sys.exit(1)
            
            print(f"قوة التغميق: x{strength}")
            success = process_frame(frame_number, strength=strength)
            sys.exit(0 if success else 1)
            
        except ValueError:
            print("❌ رقم الإطار غير صحيح")
            sys.exit(1)
    else:
        print(f"قوة التغميق: x{strength}")
        print("معالجة الإطارات من 10 إلى 42...\n")
        
        success_count = 0
        fail_count = 0
        
        for frame_num in range(10, 43):
            if process_frame(frame_num, strength=strength):
                success_count += 1
            else:
                fail_count += 1
        
        print("\n" + "=" * 70)
        print(f"✅ نجح: {success_count} إطار")
        print(f"❌ فشل: {fail_count} إطار")
        print("=" * 70 + "\n")

if __name__ == '__main__':
    main()

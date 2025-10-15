#!/usr/bin/env python3
"""
إزالة التوهج الأبيض فقط - كل شيء آخر يبقى كما هو
✅ فقط إزالة التوهج الأبيض الناصع
✅ بدون أي تغييرات أخرى
✅ التصاميم تبقى كما هي تماماً
"""

from PIL import Image
import numpy as np
import os
import sys

def remove_white_glow_only(img):
    """
    إزالة التوهج الأبيض فقط - كل شيء آخر بدون تغيير
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    img_array = np.array(img, dtype=np.float32)
    
    r = img_array[:, :, 0]
    g = img_array[:, :, 1]
    b = img_array[:, :, 2]
    alpha = img_array[:, :, 3]
    
    # البيكسلات البيضاء الناصعة جداً (التوهج) -> نضعفها بشكل كبير
    # إذا كانت RGB > 240 (بيضاء جداً) -> نقلل alpha بنسبة 90%
    white_glow_mask = (r > 240) & (g > 240) & (b > 240) & (alpha > 20)
    
    # تقليل شدة التوهج الأبيض بـ 90%
    img_array[white_glow_mask, 3] = img_array[white_glow_mask, 3] * 0.1
    
    return Image.fromarray(img_array.astype(np.uint8))

def process_frame(frame_number):
    """
    معالجة إطار واحد - إزالة التوهج الأبيض فقط
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
        
        print(f"   ❌ إزالة التوهج الأبيض فقط...")
        img_no_glow = remove_white_glow_only(img)
        
        img_no_glow.save(
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
    print("❌ إزالة التوهج الأبيض فقط - كل شيء آخر يبقى كما هو")
    print("=" * 70 + "\n")
    
    if len(sys.argv) > 1:
        try:
            frame_number = int(sys.argv[1])
            
            if frame_number < 10 or frame_number > 42:
                print("❌ رقم الإطار يجب أن يكون بين 10 و 42")
                sys.exit(1)
            
            success = process_frame(frame_number)
            sys.exit(0 if success else 1)
            
        except ValueError:
            print("❌ رقم الإطار غير صحيح")
            sys.exit(1)
    else:
        print("معالجة الإطارات من 10 إلى 42...\n")
        
        success_count = 0
        fail_count = 0
        
        for frame_num in range(10, 43):
            if process_frame(frame_num):
                success_count += 1
            else:
                fail_count += 1
        
        print("\n" + "=" * 70)
        print(f"✅ نجح: {success_count} إطار")
        print(f"❌ فشل: {fail_count} إطار")
        print("=" * 70 + "\n")

if __name__ == '__main__':
    main()

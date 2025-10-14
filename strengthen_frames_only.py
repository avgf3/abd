#!/usr/bin/env python3
"""
تقوية/تغميق الإطارات فقط - بدون أي تأثيرات!
✅ فقط تقوية alpha channel (جعل الإطار أقوى/أوضح)
✅ بدون برق أو أي تأثيرات
✅ بدون العبث بالتصاميم
"""

from PIL import Image
import numpy as np
import os
import sys

def strengthen_frame_alpha(img, strength=1.8):
    """
    تقوية/تغميق الإطار فقط
    - البيكسلات الشفافة (الخلفية) تبقى شفافة
    - البيكسلات شبه الشفافة (الإطار) تصبح أقوى وأوضح
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    img_array = np.array(img, dtype=np.float32)
    
    # تقوية alpha channel فقط للبيكسلات غير الشفافة تماماً
    alpha = img_array[:, :, 3]
    
    # البيكسلات ذات alpha > 5 تصبح أقوى (الإطار)
    # البيكسلات ذات alpha <= 5 تبقى شفافة (الخلفية)
    mask = alpha > 5
    alpha[mask] = np.clip(alpha[mask] * strength, 0, 255)
    
    img_array[:, :, 3] = alpha
    
    return Image.fromarray(img_array.astype(np.uint8))

def process_frame(frame_number, strength=1.8):
    """
    معالجة إطار واحد - فقط تقوية بدون أي تأثيرات
    """
    base_path = '/workspace/client/public/frames'
    
    # البحث عن الملف الأصلي (PNG/WEBP) أو GIF الموجود
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
        # قراءة الصورة الأصلية
        img = Image.open(input_path).convert('RGBA')
        width, height = img.size
        print(f"   📐 الحجم: {width}x{height}px")
        
        # فقط تقوية الإطار - لا شيء آخر!
        print(f"   ⚡ تقوية الإطار (x{strength})...")
        img_strong = strengthen_frame_alpha(img, strength=strength)
        
        # حفظ كـ GIF ثابت (بدون animation!)
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
    print("🔧 تقوية/تغميق الإطارات فقط - بدون أي تأثيرات")
    print("=" * 70 + "\n")
    
    # قوة التغميق (1.8 = زيادة 80%)
    strength = 1.8
    
    if len(sys.argv) > 1:
        # معالجة إطار واحد
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
            print("الاستخدام: python3 strengthen_frames_only.py <رقم_الإطار> [قوة_التغميق]")
            print("مثال: python3 strengthen_frames_only.py 14 1.8")
            sys.exit(1)
    else:
        # معالجة جميع الإطارات
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

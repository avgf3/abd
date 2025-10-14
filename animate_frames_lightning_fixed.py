#!/usr/bin/env python3
"""
إصلاح تأثير البرق على الإطارات (10-42)
✅ البرق أخف بكثير - لا يخفي الإطار
✅ يعمل على أي إطار من 10 إلى 42
✅ يحافظ على تفاصيل الإطار الأصلية
✅ شفافية مثالية

المشكلة الأصلية: البرق كان قوي جداً ويخفي الإطار
الحل: تقليل شدة التأثير + زيادة الشفافية
"""

from PIL import Image, ImageEnhance
import numpy as np
import os
import sys

def ease_in_out(t):
    """حركة سلسة"""
    return t * t * (3.0 - 2.0 * t)

def apply_gentle_lightning_pass(img, frame_num, total_frames):
    """
    تأثير برق خفيف لا يخفي الإطار
    
    التحسينات:
    - brightness_boost: 1.3x بدلاً من 1.7x (أخف بـ 23%)
    - contrast_boost: 1.15x بدلاً من 1.35x (أخف بـ 14%)
    - عتبة تطبيق أعلى: 0.12 بدلاً من 0.08
    - تأثير البرق أكثر شفافية
    """
    width, height = img.size
    
    # تقدم البرق من 0 إلى 1
    lightning_progress = ease_in_out(frame_num / total_frames)
    
    # موضع البرق (من الأسفل للأعلى)
    lightning_y = height - (lightning_progress * (height + 200))
    
    # معاملات البرق
    bolt_height = 100  # أقل من 120 - برق أضيق وأكثر تركيزاً
    
    img_array = np.array(img, dtype=np.float32)
    
    # الحصول على قناع الإطار
    if img.mode == 'RGBA':
        frame_mask = img_array[:, :, 3] > 10
    else:
        frame_mask = np.ones((height, width), dtype=bool)
    
    # حساب شدة البرق لكل صف
    y_coords = np.arange(height, dtype=np.float32)
    distances = np.abs(y_coords - lightning_y)
    
    # توزيع Gaussian حاد لتأثير برق مركّز
    lightning_factors = np.exp(-(distances ** 2) / (2 * (bolt_height / 3.0) ** 2))
    lightning_factors = np.clip(lightning_factors, 0, 1)
    
    # تطبيق تأثير البرق
    for y in range(height):
        lightning_intensity = lightning_factors[y]
        
        # ✅ عتبة أعلى - البرق يظهر في نطاق أضيق
        if lightning_intensity > 0.12:  # كان 0.08
            # ✅ تأثير برق خفيف - لا يخفي الإطار!
            brightness_boost = 1.0 + (0.30 * lightning_intensity)  # أقصى 1.30x (كان 1.70x)
            contrast_boost = 1.0 + (0.15 * lightning_intensity)    # أقصى 1.15x (كان 1.35x)
            
            for x in range(width):
                if frame_mask[y, x]:
                    pixel = img_array[y, x].copy()
                    
                    # تطبيق السطوع
                    for c in range(3):
                        pixel[c] = pixel[c] * brightness_boost
                    
                    # تطبيق التباين
                    for c in range(3):
                        pixel[c] = 128 + (pixel[c] - 128) * contrast_boost
                    
                    img_array[y, x, :3] = np.clip(pixel[:3], 0, 255)
    
    result = Image.fromarray(img_array.astype(np.uint8))
    return result

def add_gentle_enhancement(img):
    """تحسين الألوان بشكل خفيف"""
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.05)  # كان 1.12 - أخف الآن
    
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.10)  # كان 1.18 - أخف الآن
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.05)  # كان 1.10 - أخف الآن
    
    return img

def create_gentle_lightning_animation(input_path, output_path, frame_number, num_frames=60, duration=50):
    """
    إنشاء رسوم متحركة بتأثير برق خفيف
    """
    print("\n" + "⚡ " + "="*70)
    print(f"⚡  إصلاح الإطار {frame_number} - برق خفيف (لا يخفي الإطار)")
    print("⚡ " + "="*70 + "\n")
    
    print(f"📂 تحميل: {os.path.basename(input_path)}")
    
    # محاولة قراءة الملف بصيغ مختلفة
    try:
        base_img = Image.open(input_path).convert('RGBA')
    except Exception as e:
        print(f"❌ خطأ في قراءة الملف: {e}")
        return False
    
    width, height = base_img.size
    print(f"📐 الحجم: {width}x{height}px\n")
    
    print("✅ الإطار ثابت (بدون حركة)")
    print("⚡ برق خفيف يتحرك من الأسفل للأعلى")
    print("✨ التأثير لا يخفي تفاصيل الإطار\n")
    
    # تحسين الصورة الأساسية بشكل خفيف
    base_img = add_gentle_enhancement(base_img)
    
    frames = []
    
    print(f"🎬 إنشاء {num_frames} إطار بتأثير برق خفيف...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # البدء بالصورة الثابتة
        frame = base_img.copy()
        
        # تطبيق تأثير البرق الخفيف
        frame = apply_gentle_lightning_pass(frame, i, num_frames)
        
        # تحويل إلى RGB
        rgb_frame = Image.new('RGB', frame.size, (255, 255, 255))
        rgb_frame.paste(frame, mask=frame.split()[3])
        
        frames.append(rgb_frame)
    
    print(f"\n\n💾 حفظ...\n")
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,  # تكرار لا نهائي
        optimize=True,
        quality=95
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  نجح! برق خفيف لا يخفي الإطار!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 الملف: {os.path.basename(output_path)}")
    print(f"📍 المسار: {output_path}\n")
    
    print("📊 الإحصائيات:")
    print(f"   • عدد الإطارات: {num_frames}")
    print(f"   • المدة لكل إطار: {duration}ms")
    print(f"   • وقت الدورة: {(num_frames * duration / 1000):.1f}s")
    print(f"   • حجم الملف: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)\n")
    
    print("✨ المميزات:")
    print("   ✓ الإطار ثابت (بدون حركة)")
    print("   ✓ برق خفيف وشفاف")
    print("   ✓ يتحرك من الأسفل للأعلى")
    print("   ✓ لا يخفي تفاصيل الإطار الأصلية")
    print("   ✓ حركة سلسة")
    print("   ✓ تأثير احترافي\n")
    
    print("⚡ تم الإصلاح بنجاح!")
    print("="*70 + "\n")
    
    return True

def process_frame(frame_number):
    """معالجة إطار واحد"""
    base_path = '/workspace/client/public/frames'
    
    # البحث عن الملف المصدر بصيغ مختلفة
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
    
    return create_gentle_lightning_animation(
        input_path=input_path,
        output_path=output_path,
        frame_number=frame_number,
        num_frames=60,
        duration=50
    )

def main():
    if len(sys.argv) > 1:
        # معالجة إطار محدد
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
        # معالجة جميع الإطارات من 10 إلى 42
        print("\n" + "🔥 " + "="*70)
        print("🔥  معالجة جميع الإطارات من 10 إلى 42")
        print("🔥 " + "="*70 + "\n")
        
        success_count = 0
        fail_count = 0
        
        for frame_num in range(10, 43):
            if process_frame(frame_num):
                success_count += 1
            else:
                fail_count += 1
            print()
        
        print("\n" + "=" * 70)
        print(f"✅ نجح: {success_count} إطار")
        print(f"❌ فشل: {fail_count} إطار")
        print("=" * 70 + "\n")

if __name__ == '__main__':
    main()

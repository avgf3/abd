#!/usr/bin/env python3
"""
إصلاح تأثير البرق الصحيح - مع تقوية الإطار نفسه
✅ تقوية alpha channel للإطار (الإطار يصبح أقوى وأوضح)
✅ الخلفية تبقى شفافة تماماً (transparent background)
✅ البرق خفيف وجميل
✅ لا عبث بالتصاميم الأصلية
"""

from PIL import Image, ImageEnhance
import numpy as np
import os
import sys

def ease_in_out(t):
    """حركة سلسة"""
    return t * t * (3.0 - 2.0 * t)

def strengthen_frame_alpha(img, strength=1.5):
    """
    تقوية قناة الشفافية للإطار نفسه
    - البيكسلات الشفافة تبقى شفافة
    - البيكسلات شبه الشفافة تصبح أقوى
    """
    if img.mode != 'RGBA':
        return img
    
    img_array = np.array(img, dtype=np.float32)
    
    # تقوية alpha channel فقط للبيكسلات غير الشفافة
    alpha = img_array[:, :, 3]
    
    # البيكسلات ذات alpha > 10 تصبح أقوى
    mask = alpha > 10
    alpha[mask] = np.clip(alpha[mask] * strength, 0, 255)
    
    img_array[:, :, 3] = alpha
    
    return Image.fromarray(img_array.astype(np.uint8))

def apply_gentle_lightning_pass(img, frame_num, total_frames):
    """
    تأثير برق خفيف مع الحفاظ على شفافية الخلفية
    """
    width, height = img.size
    
    # تقدم البرق من 0 إلى 1
    lightning_progress = ease_in_out(frame_num / total_frames)
    
    # موضع البرق (من الأسفل للأعلى)
    lightning_y = height - (lightning_progress * (height + 200))
    
    # معاملات البرق - أخف من الأول
    bolt_height = 80  # أضيق أكثر
    
    img_array = np.array(img, dtype=np.float32)
    
    # الحصول على قناع الإطار (فقط البيكسلات غير الشفافة)
    if img.mode == 'RGBA':
        frame_mask = img_array[:, :, 3] > 10  # فقط البيكسلات الموجودة
    else:
        frame_mask = np.ones((height, width), dtype=bool)
    
    # حساب شدة البرق لكل صف
    y_coords = np.arange(height, dtype=np.float32)
    distances = np.abs(y_coords - lightning_y)
    
    # توزيع Gaussian حاد لتأثير برق مركّز جداً
    lightning_factors = np.exp(-(distances ** 2) / (2 * (bolt_height / 3.5) ** 2))
    lightning_factors = np.clip(lightning_factors, 0, 1)
    
    # تطبيق تأثير البرق - أخف بكثير!
    for y in range(height):
        lightning_intensity = lightning_factors[y]
        
        # عتبة أعلى - البرق يظهر في نطاق أضيق
        if lightning_intensity > 0.15:  # أعلى من قبل
            # تأثير برق خفيف جداً - لا يخفي الإطار!
            brightness_boost = 1.0 + (0.20 * lightning_intensity)  # أقصى 1.20x (كان 1.30x)
            contrast_boost = 1.0 + (0.10 * lightning_intensity)    # أقصى 1.10x (كان 1.15x)
            
            for x in range(width):
                if frame_mask[y, x]:
                    pixel = img_array[y, x].copy()
                    
                    # تطبيق السطوع فقط على RGB (ليس alpha!)
                    for c in range(3):
                        pixel[c] = pixel[c] * brightness_boost
                    
                    # تطبيق التباين فقط على RGB
                    for c in range(3):
                        pixel[c] = 128 + (pixel[c] - 128) * contrast_boost
                    
                    # تحديث RGB فقط، alpha يبقى كما هو!
                    img_array[y, x, :3] = np.clip(pixel[:3], 0, 255)
    
    result = Image.fromarray(img_array.astype(np.uint8))
    return result

def create_correct_lightning_animation(input_path, output_path, frame_number, num_frames=60, duration=50):
    """
    إنشاء رسوم متحركة بتأثير برق صحيح
    - تقوية الإطار نفسه
    - الخلفية شفافة
    - البرق خفيف وجميل
    """
    print("\n" + "⚡ " + "="*70)
    print(f"⚡  إصلاح صحيح للإطار {frame_number} - تقوية الإطار + برق خفيف")
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
    
    print("✅ تقوية alpha channel للإطار (الإطار يصبح أوضح)")
    print("✅ الخلفية تبقى شفافة تماماً")
    print("⚡ برق خفيف جداً يتحرك من الأسفل للأعلى")
    print("✨ لا عبث بالتصاميم الأصلية\n")
    
    # ✅ الخطوة المهمة: تقوية الإطار نفسه!
    print("🔧 تقوية الإطار...")
    base_img = strengthen_frame_alpha(base_img, strength=1.6)  # زيادة قوة الإطار بـ 60%
    print("✅ تم تقوية الإطار!\n")
    
    frames = []
    
    print(f"🎬 إنشاء {num_frames} إطار بتأثير برق خفيف جداً...\n")
    
    for i in range(num_frames):
        progress = (i + 1) / num_frames
        bar_length = 50
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"   [{bar}] {progress*100:5.1f}% ({i+1}/{num_frames})", end='\r')
        
        # البدء بالصورة الثابتة (المقواة)
        frame = base_img.copy()
        
        # تطبيق تأثير البرق الخفيف جداً
        frame = apply_gentle_lightning_pass(frame, i, num_frames)
        
        # ✅ المهم: الحفاظ على الشفافية!
        # لا نحول إلى RGB - نبقي RGBA
        frames.append(frame)
    
    print(f"\n\n💾 حفظ...\n")
    
    # حفظ كـ GIF مع الحفاظ على الشفافية
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
        transparency=0,  # ✅ الحفاظ على الشفافية
        disposal=2  # ✅ Clear to background color
    )
    
    file_size_kb = os.path.getsize(output_path) / 1024
    file_size_mb = file_size_kb / 1024
    
    print("✅ " + "="*70)
    print("✅  نجح! الإطار قوي + البرق خفيف + الخلفية شفافة!")
    print("✅ " + "="*70 + "\n")
    
    print(f"📁 الملف: {os.path.basename(output_path)}")
    print(f"📍 المسار: {output_path}\n")
    
    print("📊 الإحصائيات:")
    print(f"   • عدد الإطارات: {num_frames}")
    print(f"   • المدة لكل إطار: {duration}ms")
    print(f"   • وقت الدورة: {(num_frames * duration / 1000):.1f}s")
    print(f"   • حجم الملف: {file_size_kb:.1f} KB ({file_size_mb:.2f} MB)\n")
    
    print("✨ المميزات:")
    print("   ✓ الإطار قوي وواضح (alpha مقوى)")
    print("   ✓ الخلفية شفافة تماماً")
    print("   ✓ برق خفيف جداً")
    print("   ✓ يتحرك من الأسفل للأعلى")
    print("   ✓ لا عبث بالتصاميم الأصلية")
    print("   ✓ حركة سلسة")
    print("   ✓ تأثير احترافي\n")
    
    print("⚡ تم الإصلاح الصحيح بنجاح!")
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
    
    return create_correct_lightning_animation(
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
        print("🔥  معالجة صحيحة لجميع الإطارات من 10 إلى 42")
        print("🔥  تقوية الإطار + برق خفيف + خلفية شفافة")
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

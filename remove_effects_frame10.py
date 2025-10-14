#!/usr/bin/env python3
"""
إزالة التأثيرات من الإطار 10 والاحتفاظ بالإطار الأساسي فقط
Remove effects from frame 10 and keep only the basic frame
"""

from PIL import Image, ImageDraw, ImageSequence
import os

def create_simple_frame():
    """إنشاء إطار بسيط بدون تأثيرات"""
    
    size = 200
    center = size // 2
    
    # إنشاء صورة شفافة
    frame = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    
    # رسم إطار دائري بسيط
    outer_radius = 90
    inner_radius = 75
    
    # الإطار الخارجي - ذهبي بسيط
    draw.ellipse([center-outer_radius, center-outer_radius, 
                  center+outer_radius, center+outer_radius], 
                 outline=(255, 215, 0, 255), width=4)
    
    # الإطار الداخلي - أبيض
    draw.ellipse([center-inner_radius, center-inner_radius, 
                  center+inner_radius, center+inner_radius], 
                 outline=(255, 255, 255, 200), width=2)
    
    # إضافة خط رفيع إضافي للتفصيل
    middle_radius = (outer_radius + inner_radius) // 2
    draw.ellipse([center-middle_radius, center-middle_radius, 
                  center+middle_radius, center+middle_radius], 
                 outline=(255, 215, 0, 150), width=1)
    
    return frame

def remove_effects_from_frame10():
    """إزالة التأثيرات من frame10 وإنشاء نسخة بسيطة"""
    
    print("🔄 إزالة التأثيرات من الإطار 10...")
    
    input_file = "client/public/frames/frame10_animated.gif"
    backup_file = "client/public/frames/frame10_animated_backup.gif"
    
    # إنشاء نسخة احتياطية
    try:
        if os.path.exists(input_file):
            original = Image.open(input_file)
            original.save(backup_file, save_all=True)
            print(f"💾 تم إنشاء نسخة احتياطية: {backup_file}")
    except Exception as e:
        print(f"⚠️ تحذير: لم يتم إنشاء نسخة احتياطية: {e}")
    
    # إنشاء إطار بسيط بدون تأثيرات
    simple_frame = create_simple_frame()
    
    # إنشاء عدة إطارات للحركة البسيطة (دوران بسيط)
    frames = []
    for i in range(8):
        # دوران بسيط للإطار
        rotated_frame = simple_frame.rotate(i * 45, expand=False)
        frames.append(rotated_frame)
    
    # حفظ الإطار الجديد البسيط
    frames[0].save(
        input_file,
        save_all=True,
        append_images=frames[1:],
        duration=200,  # حركة أبطأ وأكثر هدوءاً
        loop=0,
        optimize=True,
        transparency=0
    )
    
    print("✅ تم إزالة التأثيرات من الإطار 10 بنجاح!")
    print("🎯 الإطار الآن بسيط وبدون تأثيرات إضافية")
    print(f"🔒 النسخة الأصلية محفوظة في: {backup_file}")

def main():
    """الدالة الرئيسية"""
    print("🎨 إزالة التأثيرات من frame10_animated.gif...")
    remove_effects_from_frame10()
    print("🎉 تم الانتهاء!")

if __name__ == "__main__":
    main()
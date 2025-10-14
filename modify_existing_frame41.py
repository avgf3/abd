#!/usr/bin/env python3
"""
تعديل ملف frame41_animated.gif الموجود لإضافة تأثير البرق الدائري
Modify existing frame41_animated.gif to add circular lightning effect
"""

from PIL import Image, ImageDraw, ImageSequence
import math
import random

def extract_frames_from_gif(gif_path):
    """استخراج جميع الإطارات من الـ GIF الموجود"""
    print(f"📂 فتح الملف: {gif_path}")
    
    try:
        gif = Image.open(gif_path)
        frames = []
        durations = []
        
        for i, frame in enumerate(ImageSequence.Iterator(gif)):
            print(f"   📸 استخراج الإطار {i + 1}")
            
            # تحويل إلى RGBA للحفاظ على الشفافية
            if frame.mode != 'RGBA':
                frame = frame.convert('RGBA')
            
            frames.append(frame.copy())
            
            # الحصول على مدة الإطار
            duration = frame.info.get('duration', 100)
            durations.append(duration)
        
        print(f"✅ تم استخراج {len(frames)} إطار")
        return frames, durations
        
    except Exception as e:
        print(f"❌ خطأ في فتح الملف: {e}")
        return None, None

def add_circular_lightning_to_frame(original_frame, frame_index=0):
    """إضافة تأثير البرق الدائري لإطار موجود"""
    
    # إنشاء نسخة من الإطار الأصلي
    frame = original_frame.copy()
    width, height = frame.size
    
    # إنشاء طبقة للبرق
    lightning_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(lightning_layer)
    
    # حساب المركز والأبعاد
    center_x = width // 2
    center_y = height // 2
    
    # تحديد نصف القطر بناءً على حجم الإطار
    max_radius = min(width, height) // 2 - 10
    min_radius = max_radius - 20
    
    # ألوان البرق
    lightning_colors = [
        (255, 215, 0, 180),    # ذهبي
        (255, 255, 255, 200),  # أبيض
        (135, 206, 250, 160),  # أزرق فاتح
        (255, 140, 0, 170),    # برتقالي ذهبي
        (255, 20, 147, 150),   # وردي لامع
    ]
    
    # إضافة دوران بناءً على رقم الإطار
    rotation_offset = frame_index * 30  # 30 درجة لكل إطار
    
    # رسم البروق الدائرية
    num_bolts = 8
    for i in range(num_bolts):
        angle = (2 * math.pi * i) / num_bolts + math.radians(rotation_offset)
        
        # نقطة البداية على الحافة الخارجية
        start_x = center_x + int(max_radius * math.cos(angle))
        start_y = center_y + int(max_radius * math.sin(angle))
        
        # إنشاء مسار البرق المتعرج
        points = [(start_x, start_y)]
        
        num_segments = random.randint(4, 6)
        for j in range(1, num_segments + 1):
            progress = j / num_segments
            current_radius = max_radius - (progress * (max_radius - min_radius))
            
            # إضافة تعرج
            zigzag = random.uniform(-0.3, 0.3)
            segment_angle = angle + zigzag
            
            x = center_x + int(current_radius * math.cos(segment_angle))
            y = center_y + int(current_radius * math.sin(segment_angle))
            
            # إضافة عشوائية إضافية
            x += random.randint(-5, 5)
            y += random.randint(-5, 5)
            
            points.append((x, y))
        
        # رسم البرق
        color = random.choice(lightning_colors)
        
        # رسم توهج خارجي
        glow_color = (color[0], color[1], color[2], color[3] // 3)
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=glow_color, width=8)
        
        # رسم البرق الرئيسي
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=color, width=3)
        
        # رسم خط أبيض رفيع للإضاءة
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=(255, 255, 255, 255), width=1)
    
    # إضافة شرارات حول الإطار
    num_sparks = 12
    for i in range(num_sparks):
        spark_angle = (2 * math.pi * i) / num_sparks + math.radians(rotation_offset * 2)
        spark_distance = max_radius + random.randint(5, 15)
        
        spark_x = center_x + int(spark_distance * math.cos(spark_angle))
        spark_y = center_y + int(spark_distance * math.sin(spark_angle))
        
        spark_size = random.randint(2, 4)
        spark_color = random.choice(lightning_colors)
        
        draw.ellipse([spark_x - spark_size, spark_y - spark_size,
                      spark_x + spark_size, spark_y + spark_size],
                     fill=spark_color)
    
    # دمج طبقة البرق مع الإطار الأصلي
    combined = Image.alpha_composite(frame, lightning_layer)
    
    return combined

def modify_gif_with_lightning(input_path, output_path):
    """تعديل الـ GIF الموجود بإضافة تأثير البرق"""
    
    print("⚡ بدء تعديل الـ GIF الموجود...")
    
    # استخراج الإطارات الموجودة
    original_frames, durations = extract_frames_from_gif(input_path)
    
    if original_frames is None:
        print("❌ فشل في استخراج الإطارات")
        return False
    
    # تعديل كل إطار
    modified_frames = []
    for i, frame in enumerate(original_frames):
        print(f"⚡ إضافة البرق للإطار {i + 1}/{len(original_frames)}")
        
        # تعيين بذرة عشوائية لكل إطار
        random.seed(i * 42 + 123)
        
        # إضافة تأثير البرق
        modified_frame = add_circular_lightning_to_frame(frame, i)
        modified_frames.append(modified_frame)
    
    # حفظ الـ GIF المعدل
    print(f"💾 حفظ الملف المعدل: {output_path}")
    
    # استخدام المدة الأصلية أو قيمة افتراضية
    frame_duration = durations[0] if durations else 100
    
    modified_frames[0].save(
        output_path,
        save_all=True,
        append_images=modified_frames[1:],
        duration=frame_duration,
        loop=0,
        optimize=True,
        transparency=0
    )
    
    print("✅ تم تعديل الـ GIF بنجاح!")
    return True

def main():
    """الدالة الرئيسية"""
    input_file = "client/public/frames/frame41_animated.gif"
    backup_file = "client/public/frames/frame41_animated_backup.gif"
    
    print("🔄 تعديل ملف frame41_animated.gif الموجود...")
    
    # إنشاء نسخة احتياطية
    try:
        original = Image.open(input_file)
        original.save(backup_file, save_all=True)
        print(f"💾 تم إنشاء نسخة احتياطية: {backup_file}")
    except Exception as e:
        print(f"⚠️ تحذير: لم يتم إنشاء نسخة احتياطية: {e}")
    
    # تعديل الملف
    success = modify_gif_with_lightning(input_file, input_file)
    
    if success:
        print("🎉 تم تعديل الإطار بنجاح!")
        print("⚡ الآن يحتوي على تأثير البرق الدائري")
        print(f"🔒 النسخة الأصلية محفوظة في: {backup_file}")
    else:
        print("❌ فشل في تعديل الإطار")

if __name__ == "__main__":
    main()
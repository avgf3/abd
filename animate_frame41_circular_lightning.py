#!/usr/bin/env python3
"""
إنشاء تأثير البرق الدائري للإطار 41
Creates circular lightning effect for frame 41
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math
import random

def create_circular_lightning_frame():
    """إنشاء إطار مع تأثير البرق الدائري"""
    
    # إعدادات الإطار
    size = 200
    center = size // 2
    
    # إنشاء صورة شفافة
    frame = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    
    # ألوان البرق الذهبية والزرقاء
    lightning_colors = [
        (255, 215, 0, 200),    # ذهبي
        (255, 255, 255, 220),  # أبيض
        (135, 206, 250, 180),  # أزرق فاتح
        (255, 140, 0, 190),    # برتقالي ذهبي
        (173, 216, 230, 160),  # أزرق باهت
    ]
    
    # رسم الإطار الأساسي (دائري)
    outer_radius = 90
    inner_radius = 75
    
    # إطار دائري ذهبي
    draw.ellipse([center-outer_radius, center-outer_radius, 
                  center+outer_radius, center+outer_radius], 
                 fill=(255, 215, 0, 100), outline=(255, 215, 0, 200), width=3)
    
    draw.ellipse([center-inner_radius, center-inner_radius, 
                  center+inner_radius, center+inner_radius], 
                 fill=None, outline=(255, 255, 255, 150), width=2)
    
    # إضافة تأثيرات البرق الدائرية
    num_lightning_bolts = 8
    for i in range(num_lightning_bolts):
        angle = (2 * math.pi * i) / num_lightning_bolts
        
        # نقطة البداية على الدائرة الخارجية
        start_x = center + int((outer_radius - 10) * math.cos(angle))
        start_y = center + int((outer_radius - 10) * math.sin(angle))
        
        # إنشاء مسار البرق المتعرج
        points = [(start_x, start_y)]
        
        # عدد النقاط في البرق
        num_points = random.randint(5, 8)
        
        for j in range(1, num_points):
            # تقليل المسافة تدريجياً نحو المركز
            radius = outer_radius - (j * (outer_radius - inner_radius) / num_points)
            
            # إضافة تعرج عشوائي
            angle_offset = random.uniform(-0.3, 0.3)
            new_angle = angle + angle_offset
            
            x = center + int(radius * math.cos(new_angle))
            y = center + int(radius * math.sin(new_angle))
            
            # إضافة تعرج إضافي
            x += random.randint(-8, 8)
            y += random.randint(-8, 8)
            
            points.append((x, y))
        
        # رسم البرق
        color = random.choice(lightning_colors)
        
        # رسم خط البرق الرئيسي
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=color, width=3)
        
        # إضافة توهج للبرق
        glow_color = (color[0], color[1], color[2], color[3] // 2)
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=glow_color, width=6)
    
    # إضافة شرارات صغيرة حول الإطار
    for _ in range(12):
        spark_angle = random.uniform(0, 2 * math.pi)
        spark_radius = random.randint(outer_radius + 5, outer_radius + 20)
        
        spark_x = center + int(spark_radius * math.cos(spark_angle))
        spark_y = center + int(spark_radius * math.sin(spark_angle))
        
        # رسم شرارة صغيرة
        spark_size = random.randint(2, 5)
        spark_color = random.choice(lightning_colors)
        
        draw.ellipse([spark_x - spark_size, spark_y - spark_size,
                      spark_x + spark_size, spark_y + spark_size],
                     fill=spark_color)
    
    # إضافة توهج عام للإطار
    enhancer = ImageEnhance.Brightness(frame)
    frame = enhancer.enhance(1.1)
    
    return frame

def create_animated_frames():
    """إنشاء إطارات متحركة متعددة"""
    frames = []
    
    # إنشاء 8 إطارات مختلفة للحركة
    for frame_num in range(8):
        # تعيين البذرة العشوائية لكل إطار
        random.seed(frame_num * 42)
        
        frame = create_circular_lightning_frame()
        
        # إضافة تأثير دوران للبرق
        rotation_angle = frame_num * 45  # دوران 45 درجة لكل إطار
        if rotation_angle > 0:
            frame = frame.rotate(rotation_angle, expand=False)
        
        frames.append(frame)
    
    return frames

def main():
    """الدالة الرئيسية"""
    print("🔥 إنشاء تأثير البرق الدائري للإطار 41...")
    
    # إنشاء الإطارات المتحركة
    frames = create_animated_frames()
    
    # حفظ كـ GIF متحرك
    output_path = "client/public/frames/frame41_animated.gif"
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=150,  # 150ms لكل إطار
        loop=0,        # تكرار لا نهائي
        optimize=True,
        transparency=0
    )
    
    print(f"✅ تم إنشاء الإطار المتحرك بنجاح: {output_path}")
    print("🌟 الإطار يحتوي على تأثير البرق الدائري مع الدوران!")

if __name__ == "__main__":
    main()
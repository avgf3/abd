#!/usr/bin/env python3
"""
تحسين تأثير البرق الدائري للإطار 41 مع تأثيرات متقدمة
Enhanced circular lightning effect for frame 41 with advanced effects
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math
import random
import colorsys

def create_enhanced_lightning_frame(frame_index=0, total_frames=12):
    """إنشاء إطار محسّن مع تأثير البرق الدائري المتقدم"""
    
    # إعدادات الإطار
    size = 200
    center = size // 2
    
    # إنشاء صورة شفافة
    frame = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    
    # ألوان البرق المتدرجة مع تأثير قوس قزح
    base_hue = (frame_index * 30) % 360  # تغيير اللون مع كل إطار
    
    lightning_colors = []
    for i in range(6):
        hue = (base_hue + i * 60) % 360
        rgb = colorsys.hsv_to_rgb(hue/360, 0.8, 1.0)
        color = (int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255), 200)
        lightning_colors.append(color)
    
    # إضافة ألوان ثابتة مميزة
    lightning_colors.extend([
        (255, 215, 0, 220),    # ذهبي
        (255, 255, 255, 240),  # أبيض لامع
        (135, 206, 250, 200),  # أزرق سماوي
        (255, 140, 0, 210),    # برتقالي ذهبي
        (255, 20, 147, 180),   # وردي لامع
        (0, 255, 255, 190),    # سيان
    ])
    
    # رسم الإطار الأساسي مع تدرج دائري
    outer_radius = 90
    inner_radius = 70
    
    # إطار دائري متدرج
    for r in range(inner_radius, outer_radius, 2):
        alpha = int(255 * (1 - (r - inner_radius) / (outer_radius - inner_radius)))
        color = (255, 215, 0, alpha // 3)
        draw.ellipse([center-r, center-r, center+r, center+r], 
                     outline=color, width=1)
    
    # الإطار الخارجي الرئيسي
    draw.ellipse([center-outer_radius, center-outer_radius, 
                  center+outer_radius, center+outer_radius], 
                 outline=(255, 215, 0, 255), width=4)
    
    # الإطار الداخلي
    draw.ellipse([center-inner_radius, center-inner_radius, 
                  center+inner_radius, center+inner_radius], 
                 outline=(255, 255, 255, 200), width=3)
    
    # إضافة تأثيرات البرق الدائرية المحسّنة
    num_main_bolts = 12  # زيادة عدد البروق الرئيسية
    rotation_offset = (frame_index * 15) % 360  # دوران مستمر
    
    for i in range(num_main_bolts):
        angle = (2 * math.pi * i) / num_main_bolts + math.radians(rotation_offset)
        
        # نقطة البداية على الدائرة الخارجية
        start_radius = outer_radius - 5
        start_x = center + int(start_radius * math.cos(angle))
        start_y = center + int(start_radius * math.sin(angle))
        
        # إنشاء مسار البرق المتعرج المحسّن
        points = [(start_x, start_y)]
        
        # عدد النقاط في البرق (متغير)
        num_points = random.randint(6, 10)
        
        for j in range(1, num_points):
            # تقليل المسافة تدريجياً نحو المركز
            progress = j / num_points
            radius = start_radius - (progress * (start_radius - inner_radius - 10))
            
            # إضافة تعرج عشوائي أكثر تعقيداً
            zigzag_intensity = 0.4 * (1 - progress)  # تقليل التعرج كلما اقتربنا من المركز
            angle_offset = random.uniform(-zigzag_intensity, zigzag_intensity)
            new_angle = angle + angle_offset
            
            x = center + int(radius * math.cos(new_angle))
            y = center + int(radius * math.sin(new_angle))
            
            # إضافة تعرج إضافي
            zigzag_range = int(12 * (1 - progress))
            x += random.randint(-zigzag_range, zigzag_range)
            y += random.randint(-zigzag_range, zigzag_range)
            
            points.append((x, y))
        
        # رسم البرق مع تأثيرات متعددة الطبقات
        color = random.choice(lightning_colors)
        
        # الطبقة الخارجية (توهج)
        glow_color = (color[0], color[1], color[2], color[3] // 4)
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=glow_color, width=12)
        
        # الطبقة المتوسطة
        mid_color = (color[0], color[1], color[2], color[3] // 2)
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=mid_color, width=6)
        
        # الطبقة الداخلية (البرق الرئيسي)
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=color, width=3)
        
        # خط أبيض رفيع في المنتصف للإضاءة
        bright_color = (255, 255, 255, 255)
        for k in range(len(points) - 1):
            draw.line([points[k], points[k + 1]], fill=bright_color, width=1)
    
    # إضافة بروق ثانوية أصغر
    num_secondary_bolts = 8
    for i in range(num_secondary_bolts):
        angle = (2 * math.pi * i) / num_secondary_bolts + math.radians(rotation_offset + 22.5)
        
        start_radius = (outer_radius + inner_radius) // 2
        start_x = center + int(start_radius * math.cos(angle))
        start_y = center + int(start_radius * math.sin(angle))
        
        end_radius = inner_radius + 10
        end_x = center + int(end_radius * math.cos(angle))
        end_y = center + int(end_radius * math.sin(angle))
        
        # برق ثانوي أقصر
        color = random.choice(lightning_colors[:4])  # ألوان أكثر هدوءاً
        
        # رسم البرق الثانوي
        draw.line([(start_x, start_y), (end_x, end_y)], fill=color, width=2)
    
    # إضافة شرارات متحركة حول الإطار
    num_sparks = 16
    for i in range(num_sparks):
        spark_angle = (2 * math.pi * i) / num_sparks + math.radians(rotation_offset * 2)
        
        # مسافة متغيرة للشرارات
        base_distance = outer_radius + 8
        distance_variation = 15 * math.sin(frame_index * 0.5 + i)
        spark_radius = base_distance + distance_variation
        
        spark_x = center + int(spark_radius * math.cos(spark_angle))
        spark_y = center + int(spark_radius * math.sin(spark_angle))
        
        # رسم شرارة متحركة
        spark_size = random.randint(2, 6)
        spark_color = random.choice(lightning_colors)
        
        # شرارة مع توهج
        draw.ellipse([spark_x - spark_size*2, spark_y - spark_size*2,
                      spark_x + spark_size*2, spark_y + spark_size*2],
                     fill=(spark_color[0], spark_color[1], spark_color[2], spark_color[3]//3))
        
        draw.ellipse([spark_x - spark_size, spark_y - spark_size,
                      spark_x + spark_size, spark_y + spark_size],
                     fill=spark_color)
    
    # إضافة نقاط ضوء في المركز
    center_glow_size = 8 + int(4 * math.sin(frame_index * 0.3))
    center_colors = [(255, 255, 255, 200), (255, 215, 0, 150), (135, 206, 250, 100)]
    
    for i, glow_color in enumerate(center_colors):
        size = center_glow_size - i * 2
        draw.ellipse([center - size, center - size, center + size, center + size],
                     fill=glow_color)
    
    # تطبيق مرشح للتنعيم والتوهج
    frame = frame.filter(ImageFilter.GaussianBlur(radius=0.5))
    
    # تحسين السطوع والتباين
    enhancer = ImageEnhance.Brightness(frame)
    frame = enhancer.enhance(1.15)
    
    enhancer = ImageEnhance.Contrast(frame)
    frame = enhancer.enhance(1.1)
    
    return frame

def create_enhanced_animated_frames():
    """إنشاء إطارات متحركة محسّنة"""
    frames = []
    total_frames = 12  # زيادة عدد الإطارات للحصول على حركة أكثر سلاسة
    
    print("🔥 إنشاء الإطارات المحسّنة...")
    
    for frame_num in range(total_frames):
        print(f"   📸 إطار {frame_num + 1}/{total_frames}")
        
        # تعيين بذرة عشوائية مختلفة لكل إطار
        random.seed(frame_num * 123 + 456)
        
        frame = create_enhanced_lightning_frame(frame_num, total_frames)
        frames.append(frame)
    
    return frames

def main():
    """الدالة الرئيسية"""
    print("⚡ إنشاء تأثير البرق الدائري المحسّن للإطار 41...")
    
    # إنشاء الإطارات المتحركة المحسّنة
    frames = create_enhanced_animated_frames()
    
    # حفظ كـ GIF متحرك محسّن
    output_path = "client/public/frames/frame41_animated.gif"
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=100,  # 100ms لكل إطار (أسرع وأكثر سلاسة)
        loop=0,        # تكرار لا نهائي
        optimize=True,
        transparency=0
    )
    
    print(f"✅ تم إنشاء الإطار المحسّن بنجاح: {output_path}")
    print("🌟 المميزات الجديدة:")
    print("   ⚡ 12 إطار للحركة السلسة")
    print("   🌈 ألوان متدرجة ومتغيرة")
    print("   💫 تأثيرات توهج متقدمة")
    print("   🔄 دوران مستمر للبروق")
    print("   ✨ شرارات متحركة")
    print("   💎 جودة عالية محسّنة")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
تأثير البرق البسيط مثل الملفات الشخصية
"""

from PIL import Image, ImageDraw
import math
import os

def create_lightning_frames(image, num_frames=12):
    """إنشاء إطارات تأثير البرق"""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    frames = []
    width, height = image.size
    center_x, center_y = width // 2, height // 2
    
    for frame_idx in range(num_frames):
        # نسخة من الصورة الأصلية
        frame = image.copy()
        
        # إنشاء طبقة البرق
        lightning_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(lightning_layer)
        
        # حساب موقع البرق (يدور حول الإطار)
        angle = (frame_idx / num_frames) * 2 * math.pi
        
        # رسم خطوط البرق حول الحافة
        radius = min(width, height) * 0.4
        
        # 3 خطوط برق
        for i in range(3):
            lightning_angle = angle + (i * 2 * math.pi / 3)
            
            # نقطة البداية (على الحافة)
            start_x = center_x + math.cos(lightning_angle) * radius
            start_y = center_y + math.sin(lightning_angle) * radius
            
            # نقطة النهاية (أبعد قليلاً)
            end_x = center_x + math.cos(lightning_angle) * (radius + 20)
            end_y = center_y + math.sin(lightning_angle) * (radius + 20)
            
            # رسم البرق الأبيض
            draw.line([start_x, start_y, end_x, end_y], 
                     fill=(255, 255, 255, 200), width=3)
            
            # خط أرفع أكثر سطوعاً
            draw.line([start_x, start_y, end_x, end_y], 
                     fill=(255, 255, 255, 255), width=1)
        
        # دمج مع الصورة الأصلية
        frame = Image.alpha_composite(frame, lightning_layer)
        frames.append(frame)
    
    return frames

def save_animated_webp(frames, output_path):
    """حفظ كـ WebP متحرك"""
    if not frames:
        return False
    
    try:
        frames[0].save(
            output_path,
            'WebP',
            save_all=True,
            append_images=frames[1:],
            duration=100,  # 100ms
            loop=0,
            quality=95,
            method=6
        )
        return True
    except Exception as e:
        print(f"خطأ: {e}")
        return False

def main():
    """الدالة الرئيسية"""
    input_path = "client/public/frames/frame13.webp"
    
    if not os.path.exists(input_path):
        print(f"❌ الملف غير موجود: {input_path}")
        return
    
    try:
        print("⚡ إنشاء تأثير البرق...")
        
        with Image.open(input_path) as original_img:
            # إنشاء إطارات البرق
            frames = create_lightning_frames(original_img)
            
            if save_animated_webp(frames, input_path):
                print("✅ تم إنشاء تأثير البرق بنجاح!")
                print("⚡ البرق يدور حول الإطار مثل الملفات الشخصية!")
            else:
                print("❌ فشل في الحفظ")
                
    except Exception as e:
        print(f"❌ خطأ: {e}")

if __name__ == "__main__":
    main()
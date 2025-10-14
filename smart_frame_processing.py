#!/usr/bin/env python3
"""
معالجة ذكية للإطارات - تحديد الإطار بدقة وتغميقه قبل إزالة الخلفية
Smart Frame Processing - Precisely detect frame and darken before background removal
"""

from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import cv2
from scipy import ndimage
import os

def smart_detect_frame(img_array):
    """
    تحديد الإطار بذكاء باستخدام edge detection و morphology
    Smart frame detection using edge detection and morphology
    """
    h, w = img_array.shape[:2]
    
    # تحويل إلى grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array[:, :, :3], cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Gaussian blur للتقليل من الضوضاء
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Canny edge detection
    edges = cv2.Canny(blurred, 30, 100)
    
    # Morphological operations لتحسين الحواف
    kernel = np.ones((3, 3), np.uint8)
    edges_dilated = cv2.dilate(edges, kernel, iterations=2)
    
    # إيجاد الcontours
    contours, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # إنشاء mask للإطار
    frame_mask = np.zeros((h, w), dtype=np.uint8)
    
    # نرسم الcontours على الماسك
    if contours:
        # نأخذ أكبر contour (عادة يكون الإطار الخارجي)
        contours_sorted = sorted(contours, key=cv2.contourArea, reverse=True)
        
        # نرسم أكبر عدة contours
        for i, contour in enumerate(contours_sorted[:5]):
            area = cv2.contourArea(contour)
            if area > 100:  # نتجاهل الcontours الصغيرة جداً
                cv2.drawContours(frame_mask, [contour], -1, 255, thickness=20)
    
    # Morphological closing لملء الفراغات
    kernel_large = np.ones((15, 15), np.uint8)
    frame_mask = cv2.morphologyEx(frame_mask, cv2.MORPH_CLOSE, kernel_large)
    
    # إضافة منطقة الحواف (الإطار عادة في الحواف)
    border_width = 60
    frame_mask[:border_width, :] = 255
    frame_mask[-border_width:, :] = 255
    frame_mask[:, :border_width] = 255
    frame_mask[:, -border_width:] = 255
    
    return frame_mask > 0

def detect_background_smartly(img_array, frame_mask):
    """
    تحديد الخلفية بذكاء - فقط المناطق الفاتحة التي ليست جزء من الإطار
    Smart background detection - only bright areas that are not part of the frame
    """
    # حساب السطوع
    brightness = np.mean(img_array[:, :, :3], axis=2)
    
    # الخلفية = مناطق فاتحة جداً (> 235) وليست جزء من الإطار
    very_bright = brightness > 235
    background_mask = very_bright & (~frame_mask)
    
    # توسيع منطقة الخلفية قليلاً باستخدام dilation
    kernel = np.ones((5, 5), np.uint8)
    background_mask = cv2.dilate(background_mask.astype(np.uint8), kernel, iterations=1)
    
    return background_mask > 0

def darken_frame_only(img_array, frame_mask, darken_factor=0.55):
    """
    تغميق الإطار فقط (المناطق المحددة بالماسك)
    Darken only the frame (areas specified by mask)
    """
    # نغمق فقط المناطق الفاتحة في الإطار
    brightness = np.mean(img_array[:, :, :3], axis=2)
    bright_frame = frame_mask & (brightness > 180)
    
    # تغميق
    img_array[bright_frame, :3] = (img_array[bright_frame, :3] * darken_factor).astype(np.uint8)
    
    return img_array

def process_frame_smart(frame_img, darken_factor=0.55):
    """
    معالجة إطار واحد بذكاء
    Process single frame intelligently
    """
    # تحويل إلى numpy array
    img_array = np.array(frame_img, dtype=np.uint8)
    h, w = img_array.shape[:2]
    
    # Step 1: تحديد الإطار بذكاء
    print(f"      1️⃣ تحديد الإطار بـ Edge Detection...")
    frame_mask = smart_detect_frame(img_array)
    frame_pixels = frame_mask.sum()
    print(f"         ✓ تم تحديد {frame_pixels:,} بكسل كإطار ({frame_pixels/(h*w)*100:.1f}%)")
    
    # Step 2: تغميق الإطار فقط
    print(f"      2️⃣ تغميق الإطار فقط (factor: {darken_factor})...")
    img_array = darken_frame_only(img_array, frame_mask, darken_factor)
    
    # Step 3: تحديد الخلفية
    print(f"      3️⃣ تحديد الخلفية بذكاء...")
    background_mask = detect_background_smartly(img_array, frame_mask)
    bg_pixels = background_mask.sum()
    print(f"         ✓ تم تحديد {bg_pixels:,} بكسل كخلفية ({bg_pixels/(h*w)*100:.1f}%)")
    
    # Step 4: إزالة الخلفية
    print(f"      4️⃣ إزالة الخلفية...")
    if img_array.shape[2] == 4:
        img_array[background_mask, 3] = 0  # جعل الخلفية شفافة
    
    processed_frame = Image.fromarray(img_array)
    return processed_frame

def process_gif_smart(input_path, output_path, darken_factor=0.55):
    """
    معالجة GIF بالكامل بذكاء
    Process entire GIF intelligently
    """
    print(f"\n{'='*70}")
    print(f"🧠 معالجة ذكية: {os.path.basename(input_path)}")
    print(f"{'='*70}\n")
    
    gif = Image.open(input_path)
    frames_processed = []
    durations = []
    frame_count = 0
    
    try:
        # معالجة الإطار الأول بشكل مفصل
        frame = gif.copy()
        duration = frame.info.get('duration', 50)
        durations.append(duration)
        
        if frame.mode != 'RGBA':
            frame = frame.convert('RGBA')
        
        print(f"🔧 الإطار 1 (معالجة تفصيلية):")
        processed = process_frame_smart(frame, darken_factor)
        frames_processed.append(processed)
        frame_count = 1
        
        # معالجة باقي الإطارات بسرعة
        while True:
            gif.seek(gif.tell() + 1)
            frame = gif.copy()
            duration = frame.info.get('duration', 50)
            durations.append(duration)
            
            if frame.mode != 'RGBA':
                frame = frame.convert('RGBA')
            
            frame_count += 1
            if frame_count % 10 == 0:
                print(f"   ... معالجة الإطار {frame_count}")
            
            # معالجة ذكية
            img_array = np.array(frame, dtype=np.uint8)
            frame_mask = smart_detect_frame(img_array)
            img_array = darken_frame_only(img_array, frame_mask, darken_factor)
            background_mask = detect_background_smartly(img_array, frame_mask)
            if img_array.shape[2] == 4:
                img_array[background_mask, 3] = 0
            processed = Image.fromarray(img_array)
            frames_processed.append(processed)
            
    except EOFError:
        pass
    
    print(f"\n💾 حفظ {frame_count} إطار...")
    
    frames_processed[0].save(
        output_path,
        save_all=True,
        append_images=frames_processed[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
        transparency=0
    )
    
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\n✅ تم الحفظ!")
    print(f"📁 {output_path}")
    print(f"📊 الحجم: {size_mb:.2f} MB")
    print(f"🎬 عدد الإطارات: {frame_count}\n")
    
    return True

def test_on_single_frame():
    """
    اختبار على إطار واحد
    Test on single frame
    """
    print("\n" + "🧪 " + "="*68)
    print("🧪  اختبار المعالجة الذكية على frame10")
    print("🧪 " + "="*68 + "\n")
    
    input_file = '/workspace/client/public/frames/frame10_animated.gif'
    output_file = '/workspace/client/public/frames/frame10_SMART_TEST.gif'
    
    # نسخة احتياطية أولاً
    import shutil
    backup_file = input_file.replace('.gif', '_BACKUP.gif')
    if not os.path.exists(backup_file):
        print(f"💾 إنشاء نسخة احتياطية...")
        shutil.copy(input_file, backup_file)
    
    success = process_gif_smart(input_file, output_file, darken_factor=0.55)
    
    if success:
        print("="*70)
        print("✅ الاختبار نجح! تحقق من النتيجة:")
        print(f"   📁 الأصلي: {input_file}")
        print(f"   📁 النتيجة: {output_file}")
        print(f"   📁 النسخة الاحتياطية: {backup_file}")
        print("="*70 + "\n")
    
    return success

if __name__ == '__main__':
    test_on_single_frame()

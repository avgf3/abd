#!/usr/bin/env python3
"""
تغميق الأطر وإزالة الخلفية للإطارات من 10 إلى 42
Darken borders and remove background for frames 10-42

الهدف: تغميق الأطر أولاً لمنع اختفائها، ثم إزالة الخلفية
Goal: Darken borders first to prevent them from disappearing, then remove background
"""

from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import os
import sys

def detect_and_darken_borders(img_array, darken_factor=0.65):
    """
    تحديد وتغميق الأطر الفاتحة
    Detect and darken bright borders
    
    Args:
        img_array: numpy array of the image (RGBA)
        darken_factor: factor to darken (0.5 = 50% darker, 1.0 = no change)
    """
    height, width = img_array.shape[:2]
    
    # تحديد البكسلات الفاتحة جداً (الأطر المشعة)
    # Identify very bright pixels (glowing borders)
    if img_array.shape[2] == 4:  # RGBA
        # البكسلات غير الشفافة
        # Non-transparent pixels
        alpha_mask = img_array[:, :, 3] > 50
        
        # البكسلات الفاتحة (السطوع العالي)
        # Bright pixels (high brightness)
        brightness = np.mean(img_array[:, :, :3], axis=2)
        bright_mask = brightness > 200  # Very bright pixels
        
        # الأطر الفاتحة = بكسلات فاتحة وغير شفافة
        # Bright borders = bright and non-transparent pixels
        border_mask = alpha_mask & bright_mask
        
        # تغميق الأطر الفاتحة
        # Darken bright borders
        img_array[border_mask, :3] = (img_array[border_mask, :3] * darken_factor).astype(np.uint8)
        
    return img_array

def remove_background_smart(img_array, threshold=240):
    """
    إزالة الخلفية البيضاء/الفاتحة مع الحفاظ على الأطر المغمقة
    Remove white/light background while preserving darkened borders
    
    Args:
        img_array: numpy array of the image (RGBA)
        threshold: brightness threshold for background detection
    """
    height, width = img_array.shape[:2]
    
    # حساب السطوع لكل بكسل
    # Calculate brightness for each pixel
    brightness = np.mean(img_array[:, :, :3], axis=2)
    
    # البكسلات الفاتحة جداً = خلفية
    # Very bright pixels = background
    background_mask = brightness > threshold
    
    # جعل الخلفية شفافة
    # Make background transparent
    if img_array.shape[2] == 4:  # RGBA
        img_array[background_mask, 3] = 0  # Set alpha to 0
    
    return img_array

def process_gif_frame_by_frame(input_path, output_path, darken_factor=0.65, bg_threshold=240):
    """
    معالجة كل إطار في GIF: تغميق الأطر ثم إزالة الخلفية
    Process each frame in GIF: darken borders then remove background
    """
    print(f"\n{'='*70}")
    print(f"معالجة: {os.path.basename(input_path)}")
    print(f"Processing: {os.path.basename(input_path)}")
    print(f"{'='*70}\n")
    
    # فتح الملف
    # Open file
    try:
        gif = Image.open(input_path)
    except Exception as e:
        print(f"❌ خطأ في فتح الملف / Error opening file: {e}")
        return False
    
    frames_processed = []
    frame_count = 0
    durations = []
    
    try:
        while True:
            # نسخ الإطار الحالي
            # Copy current frame
            frame = gif.copy()
            
            # الحصول على مدة الإطار
            # Get frame duration
            duration = frame.info.get('duration', 50)
            durations.append(duration)
            
            # تحويل إلى RGBA
            # Convert to RGBA
            if frame.mode != 'RGBA':
                frame = frame.convert('RGBA')
            
            # تحويل إلى numpy array
            # Convert to numpy array
            img_array = np.array(frame, dtype=np.uint8)
            
            print(f"🔧 الإطار {frame_count + 1} / Frame {frame_count + 1}")
            
            # الخطوة 1: تغميق الأطر
            # Step 1: Darken borders
            print(f"   ⚫ تغميق الأطر / Darkening borders (factor: {darken_factor})")
            img_array = detect_and_darken_borders(img_array, darken_factor)
            
            # الخطوة 2: إزالة الخلفية
            # Step 2: Remove background
            print(f"   🗑️  إزالة الخلفية / Removing background (threshold: {bg_threshold})")
            img_array = remove_background_smart(img_array, bg_threshold)
            
            # تحويل مرة أخرى إلى صورة
            # Convert back to image
            processed_frame = Image.fromarray(img_array, 'RGBA')
            frames_processed.append(processed_frame)
            
            frame_count += 1
            
            # الانتقال إلى الإطار التالي
            # Move to next frame
            gif.seek(gif.tell() + 1)
            
    except EOFError:
        # انتهت جميع الإطارات
        # All frames processed
        pass
    
    if not frames_processed:
        print("❌ لم يتم معالجة أي إطار / No frames processed")
        return False
    
    print(f"\n💾 حفظ {frame_count} إطار / Saving {frame_count} frames...")
    
    # حفظ GIF المعالج
    # Save processed GIF
    try:
        frames_processed[0].save(
            output_path,
            save_all=True,
            append_images=frames_processed[1:],
            duration=durations,
            loop=0,
            disposal=2,  # Clear frame before next
            optimize=False,  # Keep quality
            transparency=0
        )
        
        # حجم الملف
        # File size
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n✅ تم الحفظ بنجاح / Successfully saved!")
        print(f"📁 {output_path}")
        print(f"📊 الحجم / Size: {size_mb:.2f} MB")
        print(f"🎬 عدد الإطارات / Frames: {frame_count}\n")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في الحفظ / Error saving: {e}")
        return False

def process_frames_10_to_42(darken_factor=0.65, bg_threshold=240):
    """
    معالجة الإطارات من 10 إلى 42
    Process frames 10 to 42
    """
    frames_dir = '/workspace/client/public/frames'
    
    print("\n" + "="*70)
    print("🎯 معالجة الإطارات من 10 إلى 42")
    print("🎯 Processing frames 10 to 42")
    print("="*70)
    print(f"\n⚙️ الإعدادات / Settings:")
    print(f"   • تغميق الأطر / Darken factor: {darken_factor} (0.65 = 35% أغمق / 35% darker)")
    print(f"   • عتبة الخلفية / Background threshold: {bg_threshold}")
    print()
    
    success_count = 0
    failed_count = 0
    failed_files = []
    
    for frame_num in range(10, 43):  # 10 to 42 inclusive
        input_file = f'{frames_dir}/frame{frame_num}_animated.gif'
        output_file = f'{frames_dir}/frame{frame_num}_animated.gif'
        
        if not os.path.exists(input_file):
            print(f"⚠️  تخطي: {os.path.basename(input_file)} (غير موجود)")
            print(f"⚠️  Skip: {os.path.basename(input_file)} (not found)")
            continue
        
        # نسخة احتياطية
        # Backup
        backup_file = f'{frames_dir}/frame{frame_num}_animated_BACKUP.gif'
        if not os.path.exists(backup_file):
            print(f"💾 نسخة احتياطية / Backup: {os.path.basename(backup_file)}")
            Image.open(input_file).save(backup_file)
        
        # معالجة
        # Process
        success = process_gif_frame_by_frame(
            input_file,
            output_file,
            darken_factor=darken_factor,
            bg_threshold=bg_threshold
        )
        
        if success:
            success_count += 1
        else:
            failed_count += 1
            failed_files.append(f"frame{frame_num}_animated.gif")
        
        print()
    
    # ملخص
    # Summary
    print("="*70)
    print("📊 الملخص النهائي / Final Summary")
    print("="*70)
    print(f"✅ نجح / Succeeded: {success_count}")
    print(f"❌ فشل / Failed: {failed_count}")
    
    if failed_files:
        print(f"\n⚠️  الملفات الفاشلة / Failed files:")
        for f in failed_files:
            print(f"   • {f}")
    
    print("\n" + "="*70)
    print("🎉 اكتمل! / Completed!")
    print("="*70 + "\n")

def main():
    """
    البرنامج الرئيسي
    Main program
    """
    print("\n" + "🎨 " + "="*68)
    print("🎨  تغميق الأطر وإزالة الخلفية للإطارات 10-42")
    print("🎨  Darken Borders & Remove Background for Frames 10-42")
    print("🎨 " + "="*68 + "\n")
    
    # إعدادات قابلة للتعديل
    # Adjustable settings
    darken_factor = 0.65  # 0.65 = 35% أغمق / 35% darker (يمكن تغييره / can be changed)
    bg_threshold = 240    # عتبة السطوع للخلفية / brightness threshold for background
    
    # يمكن تغيير الإعدادات من سطر الأوامر
    # Can change settings from command line
    if len(sys.argv) > 1:
        try:
            darken_factor = float(sys.argv[1])
            print(f"📝 استخدام darken_factor من سطر الأوامر: {darken_factor}")
        except:
            print(f"⚠️  قيمة darken_factor غير صحيحة، استخدام الافتراضي: {darken_factor}")
    
    if len(sys.argv) > 2:
        try:
            bg_threshold = int(sys.argv[2])
            print(f"📝 استخدام bg_threshold من سطر الأوامر: {bg_threshold}")
        except:
            print(f"⚠️  قيمة bg_threshold غير صحيحة، استخدام الافتراضي: {bg_threshold}")
    
    print()
    
    # معالجة الإطارات
    # Process frames
    process_frames_10_to_42(darken_factor=darken_factor, bg_threshold=bg_threshold)

if __name__ == '__main__':
    main()

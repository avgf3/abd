#!/usr/bin/env python3
"""
تحويل مباشر من PNG إلى GIF - نفس الصورة بالضبط
Direct conversion from PNG to GIF - exact same image
"""

from pathlib import Path
from PIL import Image

def convert_png_to_gif(input_path, output_path):
    """
    تحويل PNG إلى GIF مع الحفاظ على الجودة الكاملة
    """
    try:
        # فتح الصورة الأصلية
        img = Image.open(input_path)
        
        # التأكد من وجود قناة ألفا
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # حفظ كـ GIF مع أعلى جودة ممكنة
        img.save(
            output_path,
            'GIF',
            save_all=False,  # صورة ثابتة وليست متحركة
            optimize=False,  # عدم التحسين للحفاظ على الجودة
            quality=100
        )
        
        return True
    except Exception as e:
        print(f"خطأ: {e}")
        return False

def convert_all_frames(
    frames_dir="client/public/frames",
    start_frame=10,
    end_frame=42
):
    """
    تحويل جميع الإطارات من PNG إلى GIF
    """
    
    frames_path = Path(frames_dir)
    
    print(f"🔄 تحويل الإطارات من {start_frame} إلى {end_frame}")
    print(f"📝 التحويل: PNG → GIF (نفس الصورة بالضبط)")
    print("=" * 60)
    
    converted_count = 0
    failed_count = 0
    
    for i in range(start_frame, end_frame + 1):
        png_file = frames_path / f"frame{i}.png"
        
        if not png_file.exists():
            print(f"⚠️ غير موجود: frame{i}.png")
            failed_count += 1
            continue
        
        output_file = frames_path / f"frame{i}.gif"
        
        print(f"🔄 {i}: frame{i}.png → frame{i}.gif ... ", end="", flush=True)
        
        success = convert_png_to_gif(png_file, output_file)
        
        if success:
            png_size = png_file.stat().st_size / 1024
            gif_size = output_file.stat().st_size / 1024
            print(f"✅ (PNG: {png_size:.0f}KB → GIF: {gif_size:.0f}KB)")
            converted_count += 1
        else:
            print(f"❌")
            failed_count += 1
    
    print("=" * 60)
    print(f"✅ تم التحويل: {converted_count} إطار")
    if failed_count > 0:
        print(f"❌ فشل: {failed_count} إطار")
    
    return converted_count > 0

def main():
    print("=" * 60)
    print("🖼️ تحويل إطارات PNG إلى GIF")
    print("=" * 60)
    print()
    
    success = convert_all_frames(
        frames_dir="client/public/frames",
        start_frame=10,
        end_frame=42
    )
    
    if success:
        print("\n🎉 تم التحويل بنجاح!")
        print("📂 الملفات: client/public/frames/")
        print("✅ الآن جاهز لإضافة التأثيرات")
    else:
        print("\n❌ فشلت العملية!")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())

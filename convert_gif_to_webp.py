#!/usr/bin/env python3
"""
تحويل GIF إلى WebP - استخراج أول frame بأعلى جودة
"""

from PIL import Image
import os
import sys

def convert_gif_to_webp(gif_path, webp_path):
    """
    استخراج أول frame من GIF وحفظه كـ WebP بجودة عالية
    """
    try:
        # فتح GIF
        gif = Image.open(gif_path)
        
        # أخذ أول frame
        gif.seek(0)
        first_frame = gif.convert('RGBA')
        
        # حفظ كـ WebP بأعلى جودة
        first_frame.save(webp_path, 'WEBP', quality=100, method=6)
        
        file_size_kb = os.path.getsize(webp_path) / 1024
        width, height = first_frame.size
        
        print(f"✓ {os.path.basename(gif_path)} → {os.path.basename(webp_path)}")
        print(f"  {width}x{height}px, {file_size_kb:.1f} KB")
        
        return True
    except Exception as e:
        print(f"✗ {os.path.basename(gif_path)}: {e}")
        return False

def main():
    base_path = '/workspace/client/public/frames'
    
    print("\n" + "=" * 70)
    print("تحويل GIF → WebP (الإطارات 10-42)")
    print("=" * 70 + "\n")
    
    success = 0
    failed = 0
    
    for i in range(10, 43):
        gif_path = f'{base_path}/frame{i}_animated.gif'
        webp_path = f'{base_path}/frame{i}.webp'
        
        if os.path.exists(gif_path):
            if convert_gif_to_webp(gif_path, webp_path):
                success += 1
            else:
                failed += 1
        else:
            print(f"✗ frame{i}_animated.gif غير موجود")
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"✅ نجح: {success}")
    print(f"❌ فشل: {failed}")
    print("=" * 70 + "\n")

if __name__ == '__main__':
    main()

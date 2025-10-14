#!/usr/bin/env python3
"""
معالجة ذكية لجميع الإطارات من 10 إلى 42
Smart processing for all frames 10-42
"""

from smart_frame_processing import process_gif_smart
import os
import shutil

def process_all_frames(darken_factor=0.55):
    """معالجة جميع الإطارات من 10 إلى 42"""
    
    print("\n" + "🎯 " + "="*68)
    print("🎯  معالجة ذكية لجميع الإطارات من 10 إلى 42")
    print("🎯  Smart Processing for Frames 10-42")
    print("🎯 " + "="*68 + "\n")
    
    print(f"⚙️ الإعدادات:")
    print(f"   • darken_factor: {darken_factor} (0.55 = 45% أغمق)")
    print(f"   • Edge Detection + Morphology لتحديد الإطار")
    print(f"   • إزالة خلفية ذكية\n")
    
    frames_dir = '/workspace/client/public/frames'
    success_count = 0
    failed_count = 0
    failed_files = []
    
    for frame_num in range(10, 43):  # 10 to 42
        input_file = f'{frames_dir}/frame{frame_num}_animated.gif'
        
        if not os.path.exists(input_file):
            print(f"⚠️ تخطي frame{frame_num} (غير موجود)\n")
            continue
        
        # نسخة احتياطية
        backup_file = input_file.replace('.gif', '_ORIGINAL_BACKUP.gif')
        if not os.path.exists(backup_file):
            print(f"💾 نسخة احتياطية: frame{frame_num}_animated_ORIGINAL_BACKUP.gif")
            shutil.copy(input_file, backup_file)
        
        # معالجة
        print(f"\n{'='*70}")
        print(f"🎨 معالجة frame{frame_num}...")
        print(f"{'='*70}")
        
        try:
            # معالجة بذكاء
            success = process_gif_smart(input_file, input_file, darken_factor=darken_factor)
            
            if success:
                size_mb = os.path.getsize(input_file) / (1024 * 1024)
                print(f"✅ frame{frame_num} - نجح! الحجم: {size_mb:.2f} MB\n")
                success_count += 1
            else:
                failed_count += 1
                failed_files.append(f"frame{frame_num}")
                print(f"❌ frame{frame_num} - فشل!\n")
                
        except Exception as e:
            failed_count += 1
            failed_files.append(f"frame{frame_num}")
            print(f"❌ frame{frame_num} - خطأ: {str(e)}\n")
    
    # ملخص نهائي
    print("\n" + "="*70)
    print("📊 الملخص النهائي")
    print("="*70)
    print(f"✅ نجح: {success_count} إطار")
    print(f"❌ فشل: {failed_count} إطار")
    
    if failed_files:
        print(f"\n⚠️ الإطارات الفاشلة:")
        for f in failed_files:
            print(f"   • {f}")
    
    print("\n" + "="*70)
    print("🎉 اكتمل!")
    print("="*70 + "\n")
    
    print("📝 ملاحظات:")
    print("   • النسخ الاحتياطية محفوظة في *_ORIGINAL_BACKUP.gif")
    print("   • تم استخدام Edge Detection لتحديد الإطار بدقة")
    print("   • تم تغميق الإطار فقط (45% أغمق)")
    print("   • تم إزالة الخلفية بذكاء\n")

if __name__ == '__main__':
    process_all_frames(darken_factor=0.55)

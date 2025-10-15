#!/usr/bin/env python3
"""
زيادة شدة الحركة الأفقية للأجنحة
"""

import subprocess
import os
import math
import shutil

INPUT_FILE = "./client/public/frames/frame11.png"
OUTPUT_FILE = "./client/public/frames/frame11.webp"
TEMP_DIR = "/tmp/frame11_more_motion"

os.makedirs(TEMP_DIR, exist_ok=True)

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("  🦅 زيادة شدة الحركة الأفقية للأجنحة 🦅")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()

TOTAL_FRAMES = 14

for i in range(TOTAL_FRAMES):
    cycle = (2 * math.pi * i) / TOTAL_FRAMES
    
    # وميض
    brightness = 100 + 12 * math.sin(cycle)
    
    # حركة الأجنحة - زيادة الشدة!
    wing_phase = math.sin(cycle)
    
    # barrel distortion أقوى (من 0.15 إلى 0.30)
    barrel_amount = 0.30 * wing_phase  # ضعف الحركة السابقة!
    
    frame_path = f"{TEMP_DIR}/frame_{i:02d}.png"
    
    subprocess.run([
        "convert", INPUT_FILE,
        "-modulate", f"{brightness:.1f},105,100",
        "(", "+clone",
        "-crop", "505x200+0+305",
        "-virtual-pixel", "transparent",
        "-distort", "Barrel", f"0 0 0 {barrel_amount}",
        ")",
        "-gravity", "south",
        "-composite",
        "-quality", "95",
        frame_path
    ], check=True, capture_output=True)
    
    if wing_phase > 0.3:
        status = "↔️↔️ مفتوحة"
    elif wing_phase < -0.3:
        status = "→← مغلقة"
    else:
        status = "➡️ وسط"
    
    print(f"🦅 {i+1:2d}/{TOTAL_FRAMES} | وميض: {brightness:5.1f}% | {status:12s} | شدة: {barrel_amount:+.3f}")

print()
print("🔄 دمج الإطارات...")
print()

frames = [f"{TEMP_DIR}/frame_{i:02d}.png" for i in range(TOTAL_FRAMES)]

subprocess.run([
    "img2webp",
    "-o", OUTPUT_FILE,
    "-q", "85",
    "-d", "71",
    "-loop", "0",
    "-mixed"
] + frames, check=True, capture_output=True)

if os.path.exists(OUTPUT_FILE):
    size = os.path.getsize(OUTPUT_FILE)
    
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("         ✅ تم زيادة الحركة!")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print()
    print(f"  📁 حجم: {size / 1024:.1f} KB")
    print(f"  🎬 إطارات: {TOTAL_FRAMES}")
    print(f"  🦅 شدة الحركة: ضعف السابقة!")
    print(f"  ↔️ الأجنحة تفتح وتقفل بشكل أوضح")
    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

shutil.rmtree(TEMP_DIR)

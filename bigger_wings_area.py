#!/usr/bin/env python3
"""
زيادة حجم منطقة الأجنحة المتحركة
"""

import subprocess
import os
import math
import shutil

INPUT_FILE = "./client/public/frames/frame11.png"
OUTPUT_FILE = "./client/public/frames/frame11.webp"
TEMP_DIR = "/tmp/frame11_bigger_wings"

os.makedirs(TEMP_DIR, exist_ok=True)

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("  🦅 زيادة حجم منطقة الأجنحة المتحركة 🦅")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()

TOTAL_FRAMES = 14

for i in range(TOTAL_FRAMES):
    cycle = (2 * math.pi * i) / TOTAL_FRAMES
    
    brightness = 100 + 12 * math.sin(cycle)
    wing_phase = math.sin(cycle)
    
    # نفس الشدة، لكن منطقة أكبر
    barrel_amount = 0.20 * wing_phase
    
    frame_path = f"{TEMP_DIR}/frame_{i:02d}.png"
    
    # زيادة حجم المنطقة من 200 إلى 250 بكسل
    subprocess.run([
        "convert", INPUT_FILE,
        "-modulate", f"{brightness:.1f},105,100",
        "(", "+clone",
        "-crop", "505x250+0+255",  # منطقة أكبر! (250 بدل 200)
        "-virtual-pixel", "transparent",
        "-distort", "Barrel", f"0 0 0 {barrel_amount}",
        ")",
        "-gravity", "south",
        "-composite",
        "-quality", "95",
        frame_path
    ], check=True, capture_output=True)
    
    if wing_phase > 0.3:
        status = "↔️ مفتوحة"
    elif wing_phase < -0.3:
        status = "→← مغلقة"
    else:
        status = "➡️ وسط"
    
    print(f"🦅 {i+1:2d}/{TOTAL_FRAMES} | وميض: {brightness:5.1f}% | {status:10s}")

print()
print("🔄 دمج...")
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
    print(f"\n✅ تم! حجم: {size / 1024:.1f} KB")
    print("🦅 منطقة الأجنحة أكبر (250px بدل 200px)")

shutil.rmtree(TEMP_DIR)

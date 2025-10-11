#!/usr/bin/env python3
"""
🧠 SMART INTERNAL CLEANER 🧠
Efficient and intelligent internal artifact removal
Optimized for memory and maximum effectiveness
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
import argparse

class SmartInternalCleaner:
    """🧠 Smart and efficient internal artifact cleaner"""
    
    def __init__(self):
        print("🧠 SMART INTERNAL CLEANER INITIALIZED")
        print("🎯 TARGET: DESTROY ALL INTERNAL ARTIFACTS EFFICIENTLY")
    
    def detect_internal_artifacts_smart(self, img_array):
        """🧠 Smart detection of internal artifacts"""
        print("   🔍 Smart internal artifact detection...")
        
        rgb = img_array[:, :, :3]
        alpha = img_array[:, :, 3]
        
        # Convert to HSV for better analysis
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        
        # Method 1: Low saturation artifacts in opaque areas
        opaque_areas = alpha > 100
        low_saturation = hsv[:, :, 1] < 25  # Very low saturation (grayish)
        artifacts_method1 = opaque_areas & low_saturation
        
        # Method 2: Extreme brightness artifacts
        very_bright = (hsv[:, :, 2] > 235) & (alpha > 0)
        very_dark = (hsv[:, :, 2] < 25) & (alpha > 0)
        artifacts_method2 = very_bright | very_dark
        
        # Method 3: Color inconsistencies
        # Apply median filter and find large deviations
        rgb_median = cv2.medianBlur(rgb, 5)
        color_diff = np.sum(np.abs(rgb.astype(np.int16) - rgb_median.astype(np.int16)), axis=2)
        artifacts_method3 = (color_diff > 60) & (alpha > 0) & (alpha < 200)
        
        # Method 4: Statistical outliers using local analysis
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        
        # Local standard deviation
        kernel = np.ones((5, 5), np.float32) / 25
        local_mean = cv2.filter2D(gray.astype(np.float32), -1, kernel)
        local_sq_mean = cv2.filter2D((gray.astype(np.float32))**2, -1, kernel)
        local_std = np.sqrt(local_sq_mean - local_mean**2)
        
        # Pixels that deviate significantly from local statistics
        deviation = np.abs(gray.astype(np.float32) - local_mean)
        artifacts_method4 = (deviation > local_std * 2.5) & (alpha > 0) & (local_std > 5)
        
        # Combine all methods
        all_artifacts = artifacts_method1 | artifacts_method2 | artifacts_method3 | artifacts_method4
        
        # Clean up - remove very small isolated artifacts
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        all_artifacts = cv2.morphologyEx(all_artifacts.astype(np.uint8), 
                                        cv2.MORPH_OPEN, kernel).astype(bool)
        
        detected = np.sum(all_artifacts)
        print(f"      🎯 Detected {detected} internal artifacts")
        print(f"         Method 1 (Low saturation): {np.sum(artifacts_method1)}")
        print(f"         Method 2 (Extreme brightness): {np.sum(artifacts_method2)}")
        print(f"         Method 3 (Color inconsistency): {np.sum(artifacts_method3)}")
        print(f"         Method 4 (Statistical outliers): {np.sum(artifacts_method4)}")
        
        return all_artifacts
    
    def smart_artifact_removal(self, img_array, artifact_mask):
        """🧠 Smart removal of internal artifacts"""
        print("   🧹 Smart artifact removal...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        rgb = img_array[:, :, :3].astype(np.float32)
        
        artifact_coords = np.where(artifact_mask)
        
        if len(artifact_coords[0]) == 0:
            return img_array
        
        # Process artifacts in batches for efficiency
        batch_size = 1000
        total_processed = 0
        
        for batch_start in range(0, len(artifact_coords[0]), batch_size):
            batch_end = min(batch_start + batch_size, len(artifact_coords[0]))
            
            for i in range(batch_start, batch_end):
                y, x = artifact_coords[0][i], artifact_coords[1][i]
                
                # Get local neighborhood (5x5)
                y_start, y_end = max(0, y-2), min(alpha.shape[0], y+3)
                x_start, x_end = max(0, x-2), min(alpha.shape[1], x+3)
                
                local_alpha = alpha[y_start:y_end, x_start:x_end]
                local_rgb = rgb[y_start:y_end, x_start:x_end]
                local_artifacts = artifact_mask[y_start:y_end, x_start:x_end]
                
                # Find good reference pixels
                good_pixels = (local_alpha > 120) & (~local_artifacts)
                
                if np.any(good_pixels):
                    # Use weighted average of good pixels
                    good_alpha = local_alpha[good_pixels]
                    good_rgb = local_rgb[good_pixels]
                    
                    # Simple average (efficient)
                    new_alpha = np.mean(good_alpha)
                    new_rgb = np.mean(good_rgb, axis=0)
                    
                    alpha[y, x] = new_alpha
                    rgb[y, x] = new_rgb
                else:
                    # No good pixels - reduce alpha significantly
                    alpha[y, x] = alpha[y, x] * 0.3
                
                total_processed += 1
        
        print(f"      🧠 Smart processed {total_processed} internal artifacts")
        
        img_array[:, :, :3] = rgb.astype(np.uint8)
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def final_smart_polish(self, img_array):
        """🧠 Final smart polishing"""
        print("   ✨ Final smart polish...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Apply smart smoothing
        # Use Gaussian blur with very small kernel
        alpha_smooth = cv2.GaussianBlur(alpha, (3, 3), 0.5)
        
        # Only apply to semi-transparent areas (likely artifact boundaries)
        semi_mask = (alpha > 10) & (alpha < 240)
        alpha[semi_mask] = alpha_smooth[semi_mask]
        
        # Final threshold for very weak pixels
        alpha[alpha < 12] = 0
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def smart_clean_image(self, input_path, output_path):
        """🧠 Smart clean a single image"""
        print(f"\n🧠 SMART INTERNAL CLEANING: {Path(input_path).name}")
        
        try:
            # Load image
            img = Image.open(input_path).convert('RGBA')
            img_array = np.array(img)
            
            # Step 1: Detect internal artifacts
            artifact_mask = self.detect_internal_artifacts_smart(img_array)
            
            # Step 2: Smart artifact removal
            img_array = self.smart_artifact_removal(img_array, artifact_mask)
            
            # Step 3: Final smart polish
            img_array = self.final_smart_polish(img_array)
            
            # Save result
            final_img = Image.fromarray(img_array, 'RGBA')
            final_img.save(output_path, format='WebP', quality=95, method=6)
            
            artifacts_found = np.sum(artifact_mask)
            print(f"   🧠 SMART CLEANING COMPLETE:")
            print(f"      💥 Internal artifacts destroyed: {artifacts_found}")
            print(f"   ✅ SAVED: {Path(output_path).name}")
            
            return True, artifacts_found
            
        except Exception as e:
            print(f"❌ Smart cleaning failed for {Path(input_path).name}: {e}")
            return False, 0
    
    def batch_smart_clean(self, input_dir):
        """🧠 Batch smart cleaning of internal artifacts"""
        print("🧠 STARTING SMART INTERNAL ARTIFACT DESTRUCTION")
        print("⚡ OPTIMIZED FOR: Maximum efficiency + Perfect results")
        
        input_path = Path(input_dir)
        
        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"🧠 Found {len(image_files)} images for SMART INTERNAL CLEANING")
        
        results = {'success': 0, 'failed': 0, 'total_destroyed': 0, 'cleaned_files': []}
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n🧠 SMART PROGRESS: {i}/{len(image_files)}")
            
            temp_output = img_file.parent / f"smart_clean_{img_file.name}"
            
            success, artifacts_destroyed = self.smart_clean_image(str(img_file), str(temp_output))
            
            if success:
                temp_output.replace(img_file)
                results['success'] += 1
                results['total_destroyed'] += artifacts_destroyed
                results['cleaned_files'].append({
                    'file': img_file.name,
                    'artifacts': artifacts_destroyed
                })
            else:
                results['failed'] += 1
                if temp_output.exists():
                    temp_output.unlink()
        
        print(f"\n🧠 SMART INTERNAL CLEANING COMPLETE!")
        print(f"✅ Successfully cleaned: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        print(f"💥 Total internal artifacts destroyed: {results['total_destroyed']}")
        
        if results['cleaned_files']:
            print(f"\n🧠 SMART CLEANING RESULTS:")
            for file_result in results['cleaned_files']:
                print(f"   💥 {file_result['file']}: {file_result['artifacts']} internal artifacts destroyed")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='🧠 Smart Internal Artifact Cleaner')
    parser.add_argument('input', help='Input directory')
    
    args = parser.parse_args()
    
    cleaner = SmartInternalCleaner()
    cleaner.batch_smart_clean(args.input)

if __name__ == '__main__':
    main()
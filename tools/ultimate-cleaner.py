#!/usr/bin/env python3
"""
Ultimate Artifact Cleaner
Most aggressive cleaning while preserving main design elements
Final solution for complete artifact removal
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from pathlib import Path
import argparse

class UltimateArtifactCleaner:
    """Ultimate cleaning system - most aggressive approach"""
    
    def __init__(self):
        pass
    
    def identify_main_subject(self, img_array):
        """Identify and protect the main subject"""
        print("   🎯 Identifying main subject...")
        
        alpha = img_array[:, :, 3]
        rgb = img_array[:, :, :3]
        
        # Create strong subject mask (high alpha values)
        strong_subject = (alpha > 150).astype(np.uint8)
        
        # Find the largest connected component
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(strong_subject, connectivity=8)
        
        if num_labels > 1:
            # Get the largest component (main subject)
            largest_idx = np.argmax(stats[1:, cv2.CC_STAT_AREA]) + 1
            main_subject_mask = (labels == largest_idx)
            
            # Expand the main subject slightly
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            main_subject_mask = cv2.dilate(main_subject_mask.astype(np.uint8), kernel, iterations=2)
            
            print(f"      - Protected main subject: {np.sum(main_subject_mask)} pixels")
            return main_subject_mask.astype(bool)
        
        # Fallback: protect all high-alpha areas
        return (alpha > 100).astype(bool)
    
    def aggressive_artifact_removal(self, img_array, main_subject_mask):
        """Apply aggressive artifact removal outside main subject"""
        print("   🔥 Applying aggressive artifact removal...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        rgb = img_array[:, :, :3]
        
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # Create artifact mask (areas to clean aggressively)
        artifact_mask = ~main_subject_mask
        
        # In artifact areas, be very aggressive
        artifact_coords = np.where(artifact_mask)
        
        if len(artifact_coords[0]) > 0:
            # Get colors and alpha values in artifact areas
            artifact_alpha = alpha[artifact_coords]
            artifact_hsv = hsv[artifact_coords]
            
            # Remove pixels with low saturation (grayish)
            low_sat_mask = artifact_hsv[:, 1] < 50
            
            # Remove pixels with extreme brightness
            extreme_bright_mask = artifact_hsv[:, 2] > 230
            extreme_dark_mask = artifact_hsv[:, 2] < 30
            
            # Remove pixels with low alpha
            low_alpha_mask = artifact_alpha < 100
            
            # Combine all removal criteria
            remove_mask = low_sat_mask | extreme_bright_mask | extreme_dark_mask | low_alpha_mask
            
            # Apply removal
            removal_coords = (artifact_coords[0][remove_mask], artifact_coords[1][remove_mask])
            alpha[removal_coords] = 0
            
            print(f"      - Removed {np.sum(remove_mask)} artifact pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def clean_semi_transparent_areas(self, img_array, main_subject_mask):
        """Clean semi-transparent areas more aggressively"""
        print("   🌫️ Cleaning semi-transparent areas...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Find semi-transparent areas
        semi_mask = (alpha > 0) & (alpha < 200) & (~main_subject_mask)
        
        if np.any(semi_mask):
            # Apply strong threshold to semi-transparent areas
            semi_coords = np.where(semi_mask)
            semi_alpha = alpha[semi_coords]
            
            # Very aggressive threshold
            threshold = 80
            weak_mask = semi_alpha < threshold
            
            # Remove weak semi-transparent pixels
            weak_coords = (semi_coords[0][weak_mask], semi_coords[1][weak_mask])
            alpha[weak_coords] = 0
            
            # Strengthen remaining semi-transparent pixels
            strong_mask = semi_alpha >= threshold
            strong_coords = (semi_coords[0][strong_mask], semi_coords[1][strong_mask])
            alpha[strong_coords] = np.minimum(alpha[strong_coords] * 1.5, 255)
            
            print(f"      - Removed {np.sum(weak_mask)} weak semi-transparent pixels")
            print(f"      - Strengthened {np.sum(strong_mask)} remaining pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def remove_noise_and_isolated_pixels(self, img_array, main_subject_mask):
        """Remove all noise and isolated pixels"""
        print("   🧹 Removing noise and isolated pixels...")
        
        alpha = img_array[:, :, 3]
        
        # Create binary mask
        binary_mask = (alpha > 0).astype(np.uint8)
        
        # Apply aggressive morphological operations
        # Remove small isolated regions
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        opened = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel_small, iterations=2)
        
        # Fill small holes in main subject
        kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_medium, iterations=1)
        
        # Protect main subject from over-cleaning
        protected_mask = closed.copy()
        protected_mask[main_subject_mask] = binary_mask[main_subject_mask]
        
        # Apply cleaned mask
        alpha[protected_mask == 0] = 0
        
        removed_pixels = np.sum(binary_mask) - np.sum(protected_mask)
        print(f"      - Removed {removed_pixels} noise pixels")
        
        img_array[:, :, 3] = alpha
        return img_array
    
    def enhance_main_subject_edges(self, img_array, main_subject_mask):
        """Enhance edges of main subject"""
        print("   ✨ Enhancing main subject edges...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Find edges of main subject
        subject_binary = main_subject_mask.astype(np.uint8) * 255
        edges = cv2.Canny(subject_binary, 50, 150)
        
        # Dilate edges slightly
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edge_region = cv2.dilate(edges, kernel, iterations=1)
        
        # Enhance alpha in edge regions of main subject
        edge_coords = np.where((edge_region > 0) & main_subject_mask & (alpha > 0))
        
        if len(edge_coords[0]) > 0:
            alpha[edge_coords] = np.minimum(alpha[edge_coords] * 1.2, 255)
            print(f"      - Enhanced {len(edge_coords[0])} edge pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def final_cleanup_pass(self, img_array):
        """Final cleanup pass"""
        print("   🏁 Final cleanup pass...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Remove very weak alpha values
        alpha[alpha < 15] = 0
        
        # Apply gentle smoothing only to semi-transparent areas
        semi_mask = (alpha > 0) & (alpha < 255)
        if np.any(semi_mask):
            alpha_smooth = cv2.GaussianBlur(alpha, (3, 3), 0.5)
            alpha[semi_mask] = alpha_smooth[semi_mask]
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def ultimate_clean(self, input_path, output_path):
        """Apply ultimate cleaning to remove all artifacts"""
        print(f"\n🔥 ULTIMATE CLEANING: {Path(input_path).name}")
        
        try:
            # Load image
            img = Image.open(input_path).convert('RGBA')
            img_array = np.array(img)
            
            # Store original stats
            original_alpha = img_array[:, :, 3].copy()
            original_non_zero = np.sum(original_alpha > 0)
            original_artifacts = np.sum((original_alpha > 0) & (original_alpha < 100))
            
            # Step 1: Identify main subject
            main_subject_mask = self.identify_main_subject(img_array)
            
            # Step 2: Aggressive artifact removal
            img_array = self.aggressive_artifact_removal(img_array, main_subject_mask)
            
            # Step 3: Clean semi-transparent areas
            img_array = self.clean_semi_transparent_areas(img_array, main_subject_mask)
            
            # Step 4: Remove noise and isolated pixels
            img_array = self.remove_noise_and_isolated_pixels(img_array, main_subject_mask)
            
            # Step 5: Enhance main subject edges
            img_array = self.enhance_main_subject_edges(img_array, main_subject_mask)
            
            # Step 6: Final cleanup
            img_array = self.final_cleanup_pass(img_array)
            
            # Calculate results
            final_alpha = img_array[:, :, 3]
            final_non_zero = np.sum(final_alpha > 0)
            final_artifacts = np.sum((final_alpha > 0) & (final_alpha < 100))
            
            artifacts_removed = max(0, original_artifacts - final_artifacts)
            pixels_removed = max(0, original_non_zero - final_non_zero)
            
            # Save result
            cleaned_img = Image.fromarray(img_array, 'RGBA')
            cleaned_img.save(output_path, format='WebP', quality=95, method=6)
            
            print(f"   📊 Results:")
            print(f"      - Artifacts removed: {artifacts_removed}")
            print(f"      - Total pixels removed: {pixels_removed}")
            print(f"      - Remaining non-zero pixels: {final_non_zero}")
            print(f"   ✅ ULTIMATE CLEAN COMPLETE: {Path(output_path).name}")
            
            return True
            
        except Exception as e:
            print(f"❌ Ultimate cleaning failed for {Path(input_path).name}: {e}")
            return False
    
    def batch_ultimate_clean(self, input_dir):
        """Apply ultimate cleaning to all images"""
        print("🔥 STARTING ULTIMATE ARTIFACT CLEANING")
        print("⚠️  WARNING: MOST AGGRESSIVE CLEANING MODE")
        print("🎯 TARGET: COMPLETE ARTIFACT ELIMINATION")
        
        input_path = Path(input_dir)
        
        # Find all image files (excluding backup)
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Found {len(image_files)} images for ULTIMATE CLEANING")
        
        results = {'success': 0, 'failed': 0, 'cleaned': []}
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n🔥 ULTIMATE PROGRESS: {i}/{len(image_files)}")
            
            # Create temporary output
            temp_output = img_file.parent / f"ultimate_clean_{img_file.name}"
            
            success = self.ultimate_clean(str(img_file), str(temp_output))
            
            if success:
                # Replace original with cleaned version
                temp_output.replace(img_file)
                results['success'] += 1
                results['cleaned'].append(img_file.name)
            else:
                results['failed'] += 1
                # Remove temp file if it exists
                if temp_output.exists():
                    temp_output.unlink()
        
        print(f"\n🔥 ULTIMATE CLEANING COMPLETE!")
        print(f"✅ Successfully cleaned: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        
        if results['cleaned']:
            print(f"🧹 ULTIMATE CLEANED FILES:")
            for filename in results['cleaned']:
                print(f"   🔥 {filename}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Ultimate Artifact Cleaner')
    parser.add_argument('input', help='Input directory with images to clean')
    
    args = parser.parse_args()
    
    cleaner = UltimateArtifactCleaner()
    cleaner.batch_ultimate_clean(args.input)

if __name__ == '__main__':
    main()